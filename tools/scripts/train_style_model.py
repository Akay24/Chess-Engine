#!/usr/bin/env python3
"""
train_style_model.py
Extracts style features from chess dataset (games.csv), trains an opponent adaptation
neural network, and exports it to a standard ONNX model adhering to docs/style-model-contract.md.
"""

import zipfile
import csv
import io
import os
import sys
import numpy as np
import chess
from sklearn.neural_network import MLPRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error
import onnx
from onnx import helper, TensorProto

def extract_game_features(moves_str, winner):
    """
    Extracts (style_vector, target_weights) for White and Black in a game.
    """
    moves = moves_str.strip().split()
    if len(moves) < 8:
        return []

    # Features tracking
    w_captures, b_captures = 0, 0
    w_checks, b_checks = 0, 0
    w_pawn_pushes, b_pawn_pushes = 0, 0
    w_center_pawns, b_center_pawns = 0, 0
    w_castled, b_castled = False, False
    w_castled_ply, b_castled_ply = 50, 50
    w_f_pawn_moved, b_f_pawn_moved = False, False

    board = chess.Board()
    ply = 0

    for san in moves:
        try:
            move = board.parse_san(san)
        except Exception:
            break

        is_white = (board.turn == chess.WHITE)
        is_capture = board.is_capture(move)
        piece_type = board.piece_type_at(move.from_square)

        if is_white:
            if is_capture: w_captures += 1
            if board.gives_check(move): w_checks += 1
            if piece_type == chess.PAWN:
                w_pawn_pushes += 1
                to_file = chess.square_file(move.to_square)
                to_rank = chess.square_rank(move.to_square)
                if to_file in [3, 4]: # d or e file
                    w_center_pawns += 1
                if to_file == 5 and to_rank in [2, 3]: # f-pawn advance
                    w_f_pawn_moved = True
            if board.is_castling(move) and not w_castled:
                w_castled = True
                w_castled_ply = ply
        else:
            if is_capture: b_captures += 1
            if board.gives_check(move): b_checks += 1
            if piece_type == chess.PAWN:
                b_pawn_pushes += 1
                to_file = chess.square_file(move.to_square)
                to_rank = chess.square_rank(move.to_square)
                if to_file in [3, 4]: # d or e file
                    b_center_pawns += 1
                if to_file == 5 and to_rank in [5, 4]: # f-pawn advance
                    b_f_pawn_moved = True
            if board.is_castling(move) and not b_castled:
                b_castled = True
                b_castled_ply = ply

        board.push(move)
        ply += 1
        if ply >= 60: # Analyze up to first 30 full moves (opening + early middlegame)
            break

    total_w_moves = (ply + 1) // 2
    total_b_moves = ply // 2
    if total_w_moves < 4 or total_b_moves < 4:
        return []

    # Normalized 5-dimensional style vector: [aggression, tactical, openness, kingSafety, blunderRate]
    # 1. White style
    w_aggression = min(1.0, max(0.0, (w_captures * 1.5 + w_checks * 1.2) / total_w_moves))
    w_tactical = min(1.0, max(0.0, (w_captures + w_checks * 1.5) / total_w_moves))
    w_openness = min(1.0, max(0.0, (w_center_pawns * 1.2 + w_captures * 0.5) / 6.0))
    w_king_safety = 0.8 if w_castled_ply <= 16 else (0.5 if w_castled else (0.2 if w_f_pawn_moved else 0.35))
    w_blunder_rate = 0.7 if (winner == 'black' and len(moves) <= 25) else (0.4 if winner == 'black' else 0.15)
    w_style = np.array([w_aggression, w_tactical, w_openness, w_king_safety, w_blunder_rate], dtype=np.float32)

    # 2. Black style
    b_aggression = min(1.0, max(0.0, (b_captures * 1.5 + b_checks * 1.2) / total_b_moves))
    b_tactical = min(1.0, max(0.0, (b_captures + b_checks * 1.5) / total_b_moves))
    b_openness = min(1.0, max(0.0, (b_center_pawns * 1.2 + b_captures * 0.5) / 6.0))
    b_king_safety = 0.8 if b_castled_ply <= 16 else (0.5 if b_castled else (0.2 if b_f_pawn_moved else 0.35))
    b_blunder_rate = 0.7 if (winner == 'white' and len(moves) <= 25) else (0.4 if winner == 'white' else 0.15)
    b_style = np.array([b_aggression, b_tactical, b_openness, b_king_safety, b_blunder_rate], dtype=np.float32)

    # Target counter-adaptation weights [closedPosition, tacticalSharpness, pieceTrades, kingDefense]
    # Derived from strategic counter-play against the opponent's style profile:
    def compute_counter_weights(opp_style):
        opp_agg, opp_tact, opp_open, opp_ks, opp_blunder = opp_style
        
        # Against aggressive/tactical: close board (+closed), defuse attack (+trades), prioritize safety (+defense)
        # Against passive/closed: open lines (-closed), sharpen game (+sharpness), keep tension (-trades)
        closed = np.clip(0.6 * (opp_agg - 0.45) + 0.3 * (1.0 - opp_open) - 0.2 * (1.0 - opp_ks), -1.0, 1.0)
        sharpness = np.clip(0.5 * (0.5 - opp_agg) + 0.4 * opp_blunder - 0.3 * opp_tact, -1.0, 1.0)
        trades = np.clip(0.7 * (opp_agg - 0.4) + 0.3 * (opp_tact - 0.4) - 0.3 * opp_blunder, -1.0, 1.0)
        king_def = np.clip(0.3 + 0.5 * opp_agg + 0.3 * (1.0 - opp_ks), 0.0, 1.0)
        return np.array([closed, sharpness, trades, king_def], dtype=np.float32)

    return [
        (w_style, compute_counter_weights(w_style)),
        (b_style, compute_counter_weights(b_style))
    ]

def load_dataset(zip_path, max_games=15000):
    print(f"Loading games from {zip_path} (max: {max_games})...")
    X_list, Y_list = [], []
    
    with zipfile.ZipFile(zip_path, 'r') as z:
        with z.open('games.csv') as f:
            reader = csv.DictReader(io.TextIOWrapper(f, encoding='utf-8'))
            count = 0
            for row in reader:
                moves = row.get('moves', '')
                winner = row.get('winner', 'draw')
                pairs = extract_game_features(moves, winner)
                for x, y in pairs:
                    X_list.append(x)
                    Y_list.append(y)
                count += 1
                if count >= max_games:
                    break

    X = np.array(X_list, dtype=np.float32)
    Y = np.array(Y_list, dtype=np.float32)
    print(f"Processed {count} games -> {len(X)} style-adaptation training pairs.")
    return X, Y

def train_and_export_onnx(X, Y, output_paths):
    X_train, X_test, Y_train, Y_test = train_test_split(X, Y, test_size=0.15, random_state=42)
    
    print("\nTraining MLPRegressor neural network...")
    mlp = MLPRegressor(
        hidden_layer_sizes=(16, 8),
        activation='relu',
        solver='adam',
        max_iter=150,
        random_state=42,
        learning_rate_init=0.005
    )
    mlp.fit(X_train, Y_train)
    
    train_preds = mlp.predict(X_train)
    test_preds = mlp.predict(X_test)
    print(f"Train MSE: {mean_squared_error(Y_train, train_preds):.5f}")
    print(f"Test  MSE: {mean_squared_error(Y_test, test_preds):.5f}")

    # Extract learned weights & biases
    # Layer 1: 5 -> 16
    W1 = mlp.coefs_[0].astype(np.float32)
    b1 = mlp.intercepts_[0].astype(np.float32)
    # Layer 2: 16 -> 8
    W2 = mlp.coefs_[1].astype(np.float32)
    b2 = mlp.intercepts_[1].astype(np.float32)
    # Layer 3: 8 -> 4
    W3 = mlp.coefs_[2].astype(np.float32)
    b3 = mlp.intercepts_[2].astype(np.float32)

    # Build ONNX computation graph adhering to docs/style-model-contract.md
    X_tensor = helper.make_tensor_value_info('style_vector', TensorProto.FLOAT, [1, 5])
    Y_tensor = helper.make_tensor_value_info('adaptation_weights', TensorProto.FLOAT, [1, 4])

    W1_init = helper.make_tensor('W1', TensorProto.FLOAT, W1.shape, W1.flatten())
    b1_init = helper.make_tensor('b1', TensorProto.FLOAT, b1.shape, b1.flatten())
    W2_init = helper.make_tensor('W2', TensorProto.FLOAT, W2.shape, W2.flatten())
    b2_init = helper.make_tensor('b2', TensorProto.FLOAT, b2.shape, b2.flatten())
    W3_init = helper.make_tensor('W3', TensorProto.FLOAT, W3.shape, W3.flatten())
    b3_init = helper.make_tensor('b3', TensorProto.FLOAT, b3.shape, b3.flatten())

    # Bounds: [-1.0, 1.0] for first 3, [0.0, 1.0] for 4th
    clip_min = helper.make_tensor('clip_min', TensorProto.FLOAT, [4], [-1.0, -1.0, -1.0, 0.0])
    clip_max = helper.make_tensor('clip_max', TensorProto.FLOAT, [4], [1.0, 1.0, 1.0, 1.0])

    nodes = [
        helper.make_node('Gemm', ['style_vector', 'W1', 'b1'], ['h1']),
        helper.make_node('Relu', ['h1'], ['h1_relu']),
        helper.make_node('Gemm', ['h1_relu', 'W2', 'b2'], ['h2']),
        helper.make_node('Relu', ['h2'], ['h2_relu']),
        helper.make_node('Gemm', ['h2_relu', 'W3', 'b3'], ['raw_out']),
        helper.make_node('Clip', ['raw_out', 'clip_min', 'clip_max'], ['adaptation_weights'])
    ]

    graph = helper.make_graph(
        nodes,
        'TwentyFishStyleAdaptationModel',
        [X_tensor],
        [Y_tensor],
        [W1_init, b1_init, W2_init, b2_init, W3_init, b3_init, clip_min, clip_max]
    )

    model = helper.make_model(graph, producer_name='TwentyFish-Trainer', opset_imports=[helper.make_opsetid('', 14)])
    onnx.checker.check_model(model)

    for out_path in output_paths:
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        onnx.save(model, out_path)
        print(f"Exported verified ONNX model to: {out_path} ({os.path.getsize(out_path)} bytes)")

    # Sample Archetype Verification
    print("\n--- Archetype Prediction Verification ---")
    archetypes = {
        'Hyper-Aggressive Attacker': np.array([[0.85, 0.80, 0.70, 0.30, 0.20]], dtype=np.float32),
        'Passive Positional': np.array([[0.20, 0.15, 0.30, 0.85, 0.15]], dtype=np.float32),
        'Tactical Blunderer': np.array([[0.65, 0.70, 0.50, 0.25, 0.80]], dtype=np.float32),
        'Solid Balanced': np.array([[0.50, 0.50, 0.50, 0.50, 0.30]], dtype=np.float32),
    }
    for name, vec in archetypes.items():
        pred = mlp.predict(vec)[0]
        closed = np.clip(pred[0], -1.0, 1.0)
        sharp = np.clip(pred[1], -1.0, 1.0)
        trades = np.clip(pred[2], -1.0, 1.0)
        def_k = np.clip(pred[3], 0.0, 1.0)
        struct = 'closed' if closed > 0.3 else ('open' if closed < -0.3 else 'neutral')
        print(f"[{name}] -> closed: {closed:+.2f} ({struct}), sharpness: {sharp:+.2f}, trades: {trades:+.2f}, kingDefense: {def_k:.2f}")

if __name__ == '__main__':
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
    zip_path = os.path.join(repo_root, 'chess dataset.zip')
    
    if not os.path.exists(zip_path):
        print(f"Dataset zip not found at: {zip_path}")
        sys.exit(1)

    X, Y = load_dataset(zip_path, max_games=15000)
    
    targets = [
        os.path.join(repo_root, 'apps/web/public/models/style-model.onnx'),
        os.path.join(repo_root, 'packages/engine/models/style-model.onnx')
    ]
    train_and_export_onnx(X, Y, targets)
