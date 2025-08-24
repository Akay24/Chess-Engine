import { Chess, Move, Square } from 'chess.js';

export type GameResult = 'white' | 'black' | 'draw' | null;

export class GameManager {
  private chess: Chess;
  private moveHistory: string[] = [];

  /**
   * Creates a new GameManager instance
   * @param fen Optional FEN string to initialize the board
   */
  constructor(fen?: string) {
    this.chess = new Chess(fen);
  }

  /**
   * Gets all legal moves for the current position
   * @param square Optional square to get moves for (e.g., 'e2')
   * @returns Array of legal moves in SAN format
   */
  getLegalMoves(square?: Square): string[] {
    if (square) {
      return this.chess.moves({ square, verbose: false });
    }
    return this.chess.moves();
  }

  /**
   * Makes a move on the board
   * @param move Move in SAN or UCI format
   * @returns The move object if successful, null if illegal
   */
  move(move: string): Move | null {
    try {
      const result = this.chess.move(move);
      if (result) {
        this.moveHistory.push(move);
      }
      return result;
    } catch (e) {
      console.error('Invalid move:', move);
      return null;
    }
  }

  /**
   * Gets the current game state in PGN format
   * @returns PGN string
   */
  getPGN(): string {
    return this.chess.pgn();
  }

  /**
   * Gets the current position in FEN format
   * @returns FEN string
   */
  getFEN(): string {
    return this.chess.fen();
  }

  /**
   * Checks if the game is over
   * @returns True if the game is over
   */
  isGameOver(): boolean {
    return this.chess.isGameOver();
  }

  /**
   * Gets the result of the game
   * @returns 'white', 'black', 'draw', or null if game is ongoing
   */
  getResult(): GameResult {
    if (!this.chess.isGameOver()) return null;
    
    if (this.chess.isCheckmate()) {
      return this.chess.turn() === 'w' ? 'black' : 'white';
    }
    
    if (this.chess.isDraw()) {
      return 'draw';
    }
    
    return null;
  }

  /**
   * Undoes the last move
   * @returns The move that was undone, or null if no moves to undo
   */
  undo(): Move | null {
    const move = this.chess.undo();
    if (move) {
      this.moveHistory.pop();
    }
    return move;
  }

  /**
   * Resets the board to the initial position
   */
  reset(): void {
    this.chess.reset();
    this.moveHistory = [];
  }

  /**
   * Gets the current turn
   * @returns 'w' for white, 'b' for black
   */
  getTurn(): 'w' | 'b' {
    return this.chess.turn();
  }

  /**
   * Loads a position from a FEN string
   * @param fen FEN string
   * @returns True if successful, false otherwise
   */
  loadFEN(fen: string): boolean {
    try {
      this.chess.load(fen);
      this.moveHistory = [];
      return true;
    } catch (e) {
      console.error('Invalid FEN:', fen);
      return false;
    }
  }

  /**
   * Loads a game from PGN
   * @param pgn PGN string
   * @returns True if successful, false otherwise
   */
  loadPGN(pgn: string): boolean {
    try {
      const success = this.chess.loadPgn(pgn);
      if (success) {
        this.moveHistory = this.chess.history();
      }
      return success;
    } catch (e) {
      console.error('Invalid PGN:', pgn);
      return false;
    }
  }
}
