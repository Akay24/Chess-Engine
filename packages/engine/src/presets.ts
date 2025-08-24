/**
 * 20 calibrated Stockfish level presets
 * Each level is approximately 200 Elo apart
 */

export interface LevelPreset {
  id: number;
  name: string;
  targetElo: number;
  uci: {
    UCI_LimitStrength: boolean;
    UCI_Elo?: number;
    Skill?: number;
    Contempt?: number;
    MoveOverhead?: number;
  };
  searchCaps: {
    depth?: number;
    nodes?: number;
    movetimeMs?: number;
  };
  stochasticity?: {
    enable: boolean;
    evalWindowCp: number;
    mistakeRate: number;
  };
}

/**
 * Difficulty level presets, targeting approximately 200 Elo separation
 * Note: UCI_Elo is capped at engine's supported max (commonly ~2850)
 * Beyond that, depth/time handicaps achieve separation
 */
export const LEVEL_PRESETS: LevelPreset[] = [
  {
    id: 1,
    name: 'L1 – Beginner',
    targetElo: 800,
    uci: { 
      UCI_LimitStrength: true, 
      UCI_Elo: 800, 
      Skill: 0,
      Contempt: 0,
      MoveOverhead: 300
    },
    searchCaps: { 
      depth: 2, 
      movetimeMs: 50 
    },
    stochasticity: { 
      enable: true, 
      evalWindowCp: 100, 
      mistakeRate: 0.2 
    }
  },
  {
    id: 2,
    name: 'L2 – Casual',
    targetElo: 1000,
    uci: { 
      UCI_LimitStrength: true, 
      UCI_Elo: 1000, 
      Skill: 2,
      Contempt: 0,
      MoveOverhead: 250
    },
    searchCaps: { 
      depth: 3, 
      movetimeMs: 75 
    },
    stochasticity: { 
      enable: true, 
      evalWindowCp: 80, 
      mistakeRate: 0.15 
    }
  },
  {
    id: 3,
    name: 'L3 – Novice',
    targetElo: 1200,
    uci: { 
      UCI_LimitStrength: true, 
      UCI_Elo: 1200, 
      Skill: 3,
      Contempt: 0,
      MoveOverhead: 200
    },
    searchCaps: { 
      depth: 4, 
      movetimeMs: 100 
    },
    stochasticity: { 
      enable: true, 
      evalWindowCp: 60, 
      mistakeRate: 0.12 
    }
  },
  {
    id: 4,
    name: 'L4 – Improving',
    targetElo: 1400,
    uci: { 
      UCI_LimitStrength: true, 
      UCI_Elo: 1400, 
      Skill: 4,
      Contempt: 0,
      MoveOverhead: 150
    },
    searchCaps: { 
      depth: 5, 
      movetimeMs: 120 
    },
    stochasticity: { 
      enable: true, 
      evalWindowCp: 50, 
      mistakeRate: 0.1 
    }
  },
  {
    id: 5,
    name: 'L5 – Club Player',
    targetElo: 1600,
    uci: { 
      UCI_LimitStrength: true, 
      UCI_Elo: 1600, 
      Skill: 5,
      Contempt: 0,
      MoveOverhead: 120
    },
    searchCaps: { 
      depth: 6, 
      movetimeMs: 150 
    },
    stochasticity: { 
      enable: true, 
      evalWindowCp: 40, 
      mistakeRate: 0.08 
    }
  },
  {
    id: 6,
    name: 'L6 – Strong Club',
    targetElo: 1800,
    uci: { 
      UCI_LimitStrength: true, 
      UCI_Elo: 1800, 
      Skill: 6,
      Contempt: 0,
      MoveOverhead: 100
    },
    searchCaps: { 
      depth: 7, 
      movetimeMs: 180 
    },
    stochasticity: { 
      enable: true, 
      evalWindowCp: 30, 
      mistakeRate: 0.06 
    }
  },
  {
    id: 7,
    name: 'L7 – Expert',
    targetElo: 2000,
    uci: { 
      UCI_LimitStrength: true, 
      UCI_Elo: 2000, 
      Skill: 7,
      Contempt: 0,
      MoveOverhead: 80
    },
    searchCaps: { 
      depth: 8, 
      movetimeMs: 220 
    },
    stochasticity: { 
      enable: true, 
      evalWindowCp: 25, 
      mistakeRate: 0.05 
    }
  },
  {
    id: 8,
    name: 'L8 – Candidate Master',
    targetElo: 2200,
    uci: { 
      UCI_LimitStrength: true, 
      UCI_Elo: 2200, 
      Skill: 8,
      Contempt: 0,
      MoveOverhead: 60
    },
    searchCaps: { 
      depth: 9, 
      movetimeMs: 260 
    },
    stochasticity: { 
      enable: true, 
      evalWindowCp: 20, 
      mistakeRate: 0.04 
    }
  },
  {
    id: 9,
    name: 'L9 – FIDE Master',
    targetElo: 2400,
    uci: { 
      UCI_LimitStrength: true, 
      UCI_Elo: 2400, 
      Skill: 9,
      Contempt: 0,
      MoveOverhead: 50
    },
    searchCaps: { 
      depth: 10, 
      movetimeMs: 300 
    },
    stochasticity: { 
      enable: true, 
      evalWindowCp: 15, 
      mistakeRate: 0.03 
    }
  },
  {
    id: 10,
    name: 'L10 – International Master',
    targetElo: 2600,
    uci: { 
      UCI_LimitStrength: true, 
      UCI_Elo: 2600, 
      Skill: 10,
      Contempt: 0,
      MoveOverhead: 40
    },
    searchCaps: { 
      depth: 11, 
      movetimeMs: 350 
    },
    stochasticity: { 
      enable: true, 
      evalWindowCp: 12, 
      mistakeRate: 0.02 
    }
  },
  {
    id: 11,
    name: 'L11 – Grandmaster',
    targetElo: 2800,
    uci: { 
      UCI_LimitStrength: true, 
      UCI_Elo: 2800, 
      Skill: 11,
      Contempt: 0,
      MoveOverhead: 30
    },
    searchCaps: { 
      depth: 12, 
      movetimeMs: 425 
    },
    stochasticity: { 
      enable: true, 
      evalWindowCp: 10, 
      mistakeRate: 0.015 
    }
  },
  {
    id: 12,
    name: 'L12 – Strong GM',
    targetElo: 3000,
    uci: { 
      UCI_LimitStrength: true, 
      UCI_Elo: 2850, // Capped at engine's supported max
      Skill: 12,
      Contempt: 0,
      MoveOverhead: 25
    },
    searchCaps: { 
      depth: 13, 
      movetimeMs: 500 
    },
    stochasticity: { 
      enable: true, 
      evalWindowCp: 8, 
      mistakeRate: 0.01 
    }
  },
  {
    id: 13,
    name: 'L13 – Elite GM',
    targetElo: 3200,
    uci: { 
      UCI_LimitStrength: true, 
      UCI_Elo: 2850, // Capped
      Skill: 13,
      Contempt: 0,
      MoveOverhead: 20
    },
    searchCaps: { 
      depth: 14, 
      movetimeMs: 650 
    },
    stochasticity: { 
      enable: true, 
      evalWindowCp: 6, 
      mistakeRate: 0.008 
    }
  },
  {
    id: 14,
    name: 'L14 – Super GM',
    targetElo: 3400,
    uci: { 
      UCI_LimitStrength: true, 
      UCI_Elo: 2850, // Capped
      Skill: 14,
      Contempt: 0,
      MoveOverhead: 15
    },
    searchCaps: { 
      depth: 15, 
      movetimeMs: 800 
    },
    stochasticity: { 
      enable: true, 
      evalWindowCp: 5, 
      mistakeRate: 0.006 
    }
  },
  {
    id: 15,
    name: 'L15 – World Champion',
    targetElo: 3600,
    uci: { 
      UCI_LimitStrength: true, 
      UCI_Elo: 2850, // Capped
      Skill: 15,
      Contempt: 0,
      MoveOverhead: 10
    },
    searchCaps: { 
      depth: 16, 
      movetimeMs: 1000 
    },
    stochasticity: { 
      enable: true, 
      evalWindowCp: 4, 
      mistakeRate: 0.004 
    }
  },
  {
    id: 16,
    name: 'L16 – Superhuman',
    targetElo: 3800,
    uci: { 
      UCI_LimitStrength: true, 
      UCI_Elo: 2850, // Capped
      Skill: 16,
      Contempt: 0,
      MoveOverhead: 8
    },
    searchCaps: { 
      depth: 18, 
      movetimeMs: 1300 
    },
    stochasticity: { 
      enable: true, 
      evalWindowCp: 3, 
      mistakeRate: 0.003 
    }
  },
  {
    id: 17,
    name: 'L17 – Stockfish Pro',
    targetElo: 4000,
    uci: { 
      UCI_LimitStrength: true, 
      UCI_Elo: 2850, // Capped
      Skill: 17,
      Contempt: 0,
      MoveOverhead: 6
    },
    searchCaps: { 
      depth: 20, 
      movetimeMs: 1700 
    },
    stochasticity: { 
      enable: true, 
      evalWindowCp: 2, 
      mistakeRate: 0.002 
    }
  },
  {
    id: 18,
    name: 'L18 – Stockfish Elite',
    targetElo: 4200,
    uci: { 
      UCI_LimitStrength: true, 
      UCI_Elo: 2850, // Capped
      Skill: 18,
      Contempt: 0,
      MoveOverhead: 4
    },
    searchCaps: { 
      depth: 22, 
      movetimeMs: 2200 
    },
    stochasticity: { 
      enable: true, 
      evalWindowCp: 1, 
      mistakeRate: 0.001 
    }
  },
  {
    id: 19,
    name: 'L19 – Stockfish Master',
    targetElo: 4400,
    uci: { 
      UCI_LimitStrength: true, 
      UCI_Elo: 2850, // Capped
      Skill: 19,
      Contempt: 0,
      MoveOverhead: 2
    },
    searchCaps: { 
      depth: 24, 
      movetimeMs: 2800 
    },
    stochasticity: { 
      enable: false, 
      evalWindowCp: 0, 
      mistakeRate: 0 
    }
  },
  {
    id: 20,
    name: 'L20 – Stockfish Maximum',
    targetElo: 4600,
    uci: { 
      UCI_LimitStrength: false, // Full strength
      Skill: 20,
      Contempt: 0,
      MoveOverhead: 0
    },
    searchCaps: { 
      depth: 30, 
      movetimeMs: 3500 
    },
    stochasticity: { 
      enable: false, 
      evalWindowCp: 0, 
      mistakeRate: 0 
    }
  }
];
