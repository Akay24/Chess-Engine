import { StyleVector } from './style-features';

export interface PositionContext {
  fen: string;
  ply: number;
  isEngineWhite: boolean;
  humanColor: 'w' | 'b';
  eco?: string;
  openingFamily?: string;
}

export interface AdaptationPlan {
  weights: {
    /** [-1.0, 1.0]: positive prefers closed pawn structures, negative prefers open */
    closedPosition: number;
    /** [-1.0, 1.0]: negative prefers solid/low-variance, positive sharp complications */
    tacticalSharpness: number;
    /** [-1.0, 1.0]: positive prefers trading pieces to defuse opponent attacking potential */
    pieceTrades: number;
    /** [0.0, 1.0]: weight for preserving king shield integrity and avoiding king exposure */
    kingDefense: number;
  };
  preferredStructure: 'open' | 'closed' | 'semi-open' | 'neutral';
  explanation: string;
}

export interface StyleModel {
  plan(v: StyleVector, ctx: PositionContext): Promise<AdaptationPlan>;
}

/**
 * HeuristicStyleModel
 * Rule-based adaptation model requiring zero pre-trained neural weights.
 * Applies strategic chess principles:
 * - Against aggressive / tactical opponents: steers into closed, low-variance positions and piece trades.
 * - Against passive opponents: opens the position and maintains tactical tension.
 * - Against high-error opponents: increases tactical sharpness to provoke blunders.
 */
export class HeuristicStyleModel implements StyleModel {
  async plan(v: StyleVector, ctx: PositionContext): Promise<AdaptationPlan> {
    // Confidence-weighted effective dimensions
    const effAggression = v.aggression.confidence > 0
      ? v.aggression.value * v.aggression.confidence + 0.5 * (1 - v.aggression.confidence)
      : 0.5;

    const effTactical = v.tactical.confidence > 0
      ? v.tactical.value * v.tactical.confidence + 0.5 * (1 - v.tactical.confidence)
      : 0.5;

    const effOpenness = v.openness.confidence > 0
      ? v.openness.value * v.openness.confidence + 0.5 * (1 - v.openness.confidence)
      : 0.5;

    const effBlunder = v.blunderRate.confidence > 0
      ? v.blunderRate.value * v.blunderRate.confidence
      : 0;

    const weights = {
      closedPosition: 0.0,
      tacticalSharpness: 0.0,
      pieceTrades: 0.0,
      kingDefense: 0.5
    };

    let preferredStructure: 'open' | 'closed' | 'semi-open' | 'neutral' = 'neutral';
    const explanations: string[] = [];

    // Case 1: Aggressive or highly tactical opponent
    if (effAggression > 0.55 || effTactical > 0.55) {
      weights.closedPosition = 0.6;
      weights.tacticalSharpness = -0.5;
      weights.pieceTrades = 0.7;
      weights.kingDefense = 0.85;
      preferredStructure = 'closed';
      explanations.push('Opponent plays aggressively — steering toward solid, closed structures and favorable piece trades.');
    }
    // Case 2: Passive or quiet opponent
    else if (effAggression < 0.45 && effTactical < 0.45 && v.aggression.confidence > 0.2) {
      weights.closedPosition = -0.6;
      weights.tacticalSharpness = 0.6;
      weights.pieceTrades = -0.4;
      weights.kingDefense = 0.3;
      preferredStructure = 'open';
      explanations.push('Opponent plays passively — opening the position and maintaining tactical tension.');
    }
    // Case 3: Balanced or early game
    else {
      weights.closedPosition = 0.0;
      weights.tacticalSharpness = 0.0;
      weights.pieceTrades = 0.0;
      weights.kingDefense = 0.5;
      preferredStructure = 'neutral';
      explanations.push('Opponent style is balanced — playing solid, principled chess.');
    }

    // High blunder rate adjustment: create more complex tactical positions
    if (effBlunder > 0.5 && v.blunderRate.confidence > 0.2) {
      weights.tacticalSharpness = Math.min(1.0, weights.tacticalSharpness + 0.35);
      explanations.push('Exploiting opponent error rate with increased tactical pressure.');
    }

    return {
      weights,
      preferredStructure,
      explanation: explanations.join(' ')
    };
  }
}

/**
 * OnnxStyleModel
 * Evaluates neural style preferences using an ONNX runtime session.
 * Contract:
 * - Input tensor 'style_vector': shape [1, 5] (float32: aggression, tactical, openness, kingSafety, blunderRate)
 * - Output tensor 'adaptation_weights': shape [1, 4] (float32: closedPosition, tacticalSharpness, pieceTrades, kingDefense)
 * Falls back transparently to HeuristicStyleModel if model loading or inference fails.
 */
export class OnnxStyleModel implements StyleModel {
  private fallbackModel: HeuristicStyleModel;
  private modelPath: string;
  private session: any = null;
  private isLoaded: boolean = false;
  private loadFailed: boolean = false;
  private sessionFactory?: (path: string) => Promise<any>;

  constructor(
    modelPath: string = '/models/style-model.onnx',
    sessionFactory?: (path: string) => Promise<any>
  ) {
    this.modelPath = modelPath;
    this.sessionFactory = sessionFactory;
    this.fallbackModel = new HeuristicStyleModel();
  }

  /**
   * Lazily loads the ONNX session without blocking initialization.
   */
  async loadModel(): Promise<boolean> {
    if (this.isLoaded) return true;
    if (this.loadFailed) return false;

    try {
      if (this.sessionFactory) {
        this.session = await this.sessionFactory(this.modelPath);
      } else {
        // Attempt dynamic import of onnxruntime-web in supported environments
        const ort = await import('onnxruntime-web' as any).catch(() => null);
        if (!ort || !ort.InferenceSession) {
          throw new Error('onnxruntime-web not available in current environment');
        }
        this.session = await ort.InferenceSession.create(this.modelPath);
      }
      this.isLoaded = true;
      return true;
    } catch (err) {
      // Graceful fallback: do not throw or halt execution
      this.loadFailed = true;
      return false;
    }
  }

  async plan(v: StyleVector, ctx: PositionContext): Promise<AdaptationPlan> {
    const loaded = await this.loadModel();
    if (!loaded || !this.session) {
      return this.fallbackModel.plan(v, ctx);
    }

    try {
      // Prepare float32 input vector: [aggression, tactical, openness, kingSafety, blunderRate]
      const inputData = new Float32Array([
        v.aggression.value,
        v.tactical.value,
        v.openness.value,
        v.kingSafety.value,
        v.blunderRate.value
      ]);

      const feeds: Record<string, any> = {
        style_vector: {
          data: inputData,
          dims: [1, 5],
          type: 'float32'
        }
      };

      const results = await this.session.run(feeds);
      const outputTensor = results.adaptation_weights || results[Object.keys(results)[0]];
      const outData = outputTensor.data as Float32Array;

      const closed = Math.max(-1, Math.min(1, outData[0]));
      const sharpness = Math.max(-1, Math.min(1, outData[1]));
      const trades = Math.max(-1, Math.min(1, outData[2]));
      const kingDef = Math.max(0, Math.min(1, outData[3]));

      let preferredStructure: 'open' | 'closed' | 'semi-open' | 'neutral' = 'neutral';
      if (closed > 0.3) preferredStructure = 'closed';
      else if (closed < -0.3) preferredStructure = 'open';

      return {
        weights: {
          closedPosition: closed,
          tacticalSharpness: sharpness,
          pieceTrades: trades,
          kingDefense: kingDef
        },
        preferredStructure,
        explanation: `ONNX Model: Bias set to ${preferredStructure} structure (sharpness: ${sharpness > 0 ? 'high' : 'low'}).`
      };
    } catch (err) {
      // Fallback on inference error
      return this.fallbackModel.plan(v, ctx);
    }
  }
}
