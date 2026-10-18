import { HeuristicStyleModel, OnnxStyleModel, PositionContext } from './style-model';
import { StyleVector } from './style-features';

describe('style-model', () => {
  const dummyContext: PositionContext = {
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    ply: 10,
    isEngineWhite: true,
    humanColor: 'b'
  };

  describe('HeuristicStyleModel', () => {
    const model = new HeuristicStyleModel();

    it('generates defensive/closed adaptation against aggressive opponent', async () => {
      const aggressiveVector: StyleVector = {
        aggression: { value: 0.85, confidence: 0.8 },
        tactical: { value: 0.80, confidence: 0.8 },
        openness: { value: 0.5, confidence: 0.5 },
        kingSafety: { value: 0.4, confidence: 0.6 },
        blunderRate: { value: 0.3, confidence: 0.5 }
      };

      const plan = await model.plan(aggressiveVector, dummyContext);
      expect(plan.preferredStructure).toBe('closed');
      expect(plan.weights.closedPosition).toBeGreaterThan(0);
      expect(plan.weights.pieceTrades).toBeGreaterThan(0);
      expect(plan.weights.tacticalSharpness).toBeLessThan(0);
      expect(plan.explanation).toContain('aggressively');
    });

    it('generates sharp/opening adaptation against passive opponent', async () => {
      const passiveVector: StyleVector = {
        aggression: { value: 0.25, confidence: 0.7 },
        tactical: { value: 0.20, confidence: 0.7 },
        openness: { value: 0.5, confidence: 0.5 },
        kingSafety: { value: 0.8, confidence: 0.6 },
        blunderRate: { value: 0.2, confidence: 0.5 }
      };

      const plan = await model.plan(passiveVector, dummyContext);
      expect(plan.preferredStructure).toBe('open');
      expect(plan.weights.closedPosition).toBeLessThan(0);
      expect(plan.weights.tacticalSharpness).toBeGreaterThan(0);
      expect(plan.weights.pieceTrades).toBeLessThan(0);
      expect(plan.explanation).toContain('passively');
    });

    it('remains neutral when confidence is zero or low', async () => {
      const lowConfidenceVector: StyleVector = {
        aggression: { value: 0.9, confidence: 0.05 },
        tactical: { value: 0.9, confidence: 0.05 },
        openness: { value: 0.5, confidence: 0 },
        kingSafety: { value: 0.5, confidence: 0 },
        blunderRate: { value: 0.5, confidence: 0 }
      };

      const plan = await model.plan(lowConfidenceVector, dummyContext);
      expect(plan.preferredStructure).toBe('neutral');
      expect(plan.weights.closedPosition).toBe(0);
      expect(plan.weights.tacticalSharpness).toBe(0);
    });

    it('boosts tactical sharpness when opponent blunder rate is high', async () => {
      const blunderVector: StyleVector = {
        aggression: { value: 0.5, confidence: 0.5 },
        tactical: { value: 0.5, confidence: 0.5 },
        openness: { value: 0.5, confidence: 0.5 },
        kingSafety: { value: 0.5, confidence: 0.5 },
        blunderRate: { value: 0.85, confidence: 0.7 }
      };

      const plan = await model.plan(blunderVector, dummyContext);
      expect(plan.weights.tacticalSharpness).toBeGreaterThan(0.2);
      expect(plan.explanation).toContain('tactical pressure');
    });
  });

  describe('OnnxStyleModel', () => {
    it('executes dummy ONNX session and adheres to contract', async () => {
      // Mock session runner simulating ONNX model output
      const mockSession = {
        run: jest.fn().mockResolvedValue({
          adaptation_weights: {
            data: new Float32Array([0.7, -0.4, 0.6, 0.8]) // closed, sharpness, trades, kingDef
          }
        })
      };
      const sessionFactory = jest.fn().mockResolvedValue(mockSession);

      const onnxModel = new OnnxStyleModel('/dummy-model.onnx', sessionFactory);
      const vector: StyleVector = {
        aggression: { value: 0.8, confidence: 0.8 },
        tactical: { value: 0.7, confidence: 0.8 },
        openness: { value: 0.5, confidence: 0.5 },
        kingSafety: { value: 0.5, confidence: 0.5 },
        blunderRate: { value: 0.3, confidence: 0.5 }
      };

      const plan = await onnxModel.plan(vector, dummyContext);
      expect(sessionFactory).toHaveBeenCalledWith('/dummy-model.onnx');
      expect(mockSession.run).toHaveBeenCalled();
      expect(plan.weights.closedPosition).toBeCloseTo(0.7);
      expect(plan.weights.tacticalSharpness).toBeCloseTo(-0.4);
      expect(plan.preferredStructure).toBe('closed');
      expect(plan.explanation).toContain('ONNX Model');
    });

    it('falls back seamlessly to HeuristicStyleModel when ONNX loading fails', async () => {
      const failingFactory = jest.fn().mockRejectedValue(new Error('WASM model not found'));
      const onnxModel = new OnnxStyleModel('/missing.onnx', failingFactory);

      const vector: StyleVector = {
        aggression: { value: 0.85, confidence: 0.8 },
        tactical: { value: 0.80, confidence: 0.8 },
        openness: { value: 0.5, confidence: 0.5 },
        kingSafety: { value: 0.5, confidence: 0.5 },
        blunderRate: { value: 0.2, confidence: 0.5 }
      };

      const plan = await onnxModel.plan(vector, dummyContext);
      expect(failingFactory).toHaveBeenCalled();
      // Should fall back to heuristic results
      expect(plan.preferredStructure).toBe('closed');
      expect(plan.explanation).toContain('aggressively');
    });

    it('falls back to HeuristicStyleModel when inference throws an error', async () => {
      const brokenSession = {
        run: jest.fn().mockRejectedValue(new Error('Tensor dimension mismatch'))
      };
      const factory = jest.fn().mockResolvedValue(brokenSession);
      const onnxModel = new OnnxStyleModel('/broken.onnx', factory);

      const vector: StyleVector = {
        aggression: { value: 0.2, confidence: 0.8 },
        tactical: { value: 0.2, confidence: 0.8 },
        openness: { value: 0.5, confidence: 0.5 },
        kingSafety: { value: 0.8, confidence: 0.8 },
        blunderRate: { value: 0.1, confidence: 0.5 }
      };

      const plan = await onnxModel.plan(vector, dummyContext);
      expect(plan.preferredStructure).toBe('open');
      expect(plan.explanation).toContain('passively');
    });
  });
});
