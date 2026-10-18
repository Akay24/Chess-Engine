# ONNX Style Model Contract

This document defines the input/output interface, tensor formats, and fallback semantics for the neural opponent style model (`OnnxStyleModel`) in TwentyFish.

## 1. Input Tensor Specification

- **Input Name:** `style_vector`
- **Data Type:** `Float32`
- **Tensor Shape:** `[1, 5]` (batch size 1, 5 style dimensions)

### Dimension Ordering

| Index | Feature | Description | Range |
| :---: | :--- | :--- | :---: |
| `0` | **Aggression** | Captures rate, deep pawn pushes, early queen/minor sorties, checks | `[0.0, 1.0]` |
| `1` | **Tactical** | Forcing moves (checks, captures, direct attacks) vs positional maneuvers | `[0.0, 1.0]` |
| `2` | **Openness** | Open vs closed pawn structures, center pawn exchanges | `[0.0, 1.0]` |
| `3` | **King Safety** | Castling timing and pawn shield integrity | `[0.0, 1.0]` |
| `4` | **Blunder Rate** | Normalized centipawn loss across recent human moves | `[0.0, 1.0]` |

*Note on Time Pressure:* If clock data is absent, the model evaluates on the standard 5-dimensional vector without extrapolating dummy time values.

---

## 2. Output Tensor Specification

- **Output Name:** `adaptation_weights`
- **Data Type:** `Float32`
- **Tensor Shape:** `[1, 4]`

### Output Weight Semantics

| Index | Output Weight | Semantics | Range |
| :---: | :--- | :--- | :---: |
| `0` | `closedPosition` | Preference for closed pawn structures (`+1.0`) vs open board lines (`-1.0`) | `[-1.0, 1.0]` |
| `1` | `tacticalSharpness` | Preference for sharp, complex complications (`+1.0`) vs solid low-variance (`-1.0`) | `[-1.0, 1.0]` |
| `2` | `pieceTrades` | Preference for trading pieces to defuse opponent attack (`+1.0`) vs maintaining tension (`-1.0`) | `[-1.0, 1.0]` |
| `3` | `kingDefense` | Weight placed on king safety preservation and defensive prophylaxis | `[0.0, 1.0]` |

---

## 3. Position Structure Mapping

From `closedPosition`:
- If `closedPosition > 0.3`: `preferredStructure = 'closed'`
- If `closedPosition < -0.3`: `preferredStructure = 'open'`
- Otherwise: `preferredStructure = 'neutral'`

---

## 4. Fallback Guarantees

1. **Lazy Loading:** Model initialization does not block the engine's first move search.
2. **Deterministic Fallback:** If the `.onnx` file fails to load, `onnxruntime-web` is unavailable, or tensor execution throws an error, `OnnxStyleModel` immediately and transparently delegates inference to `HeuristicStyleModel`.
3. **Hard Bounds:** All outputs are strictly clamped to their valid ranges before being passed to `MoveSelector`.
