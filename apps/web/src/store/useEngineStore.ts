import { create } from 'zustand';

export interface MultiPvInfo {
  multipv: number;
  scoreCp: number;
  depth: number;
  pv: string[];
}

interface EngineState {
  activeLevelId: number;
  isThinking: boolean;
  evalCp: number;
  isMate: boolean;
  mateIn: number | null;
  depth: number;
  nodes: number;
  nps: number;
  currentPv: string[];
  multiPvLines: MultiPvInfo[];

  setActiveLevelId: (id: number) => void;
  setThinking: (thinking: boolean) => void;
  updateEngineInfo: (info: {
    depth?: number;
    nodes?: number;
    nps?: number;
    scoreCp?: number;
    isMate?: boolean;
    mateIn?: number | null;
    pv?: string[];
    multipv?: number;
  }) => void;
  resetEngineState: () => void;
}

export const useEngineStore = create<EngineState>((set) => ({
  activeLevelId: 5,
  isThinking: false,
  evalCp: 0,
  isMate: false,
  mateIn: null,
  depth: 0,
  nodes: 0,
  nps: 0,
  currentPv: [],
  multiPvLines: [],

  setActiveLevelId: (id) => set({ activeLevelId: Math.max(1, Math.min(20, id)) }),
  setThinking: (thinking) => set({ isThinking: thinking }),

  updateEngineInfo: (info) => set((state) => {
    let updatedMultiPv = [...state.multiPvLines];
    if (info.multipv && info.pv && info.pv.length > 0) {
      const existingIdx = updatedMultiPv.findIndex(m => m.multipv === info.multipv);
      const entry: MultiPvInfo = {
        multipv: info.multipv,
        scoreCp: info.scoreCp ?? state.evalCp,
        depth: info.depth ?? state.depth,
        pv: info.pv
      };
      if (existingIdx !== -1) {
        updatedMultiPv[existingIdx] = entry;
      } else {
        updatedMultiPv.push(entry);
      }
      updatedMultiPv.sort((a, b) => a.multipv - b.multipv);
    }

    return {
      depth: info.depth ?? state.depth,
      nodes: info.nodes ?? state.nodes,
      nps: info.nps ?? state.nps,
      evalCp: info.scoreCp !== undefined ? info.scoreCp : state.evalCp,
      isMate: info.isMate !== undefined ? info.isMate : state.isMate,
      mateIn: info.mateIn !== undefined ? info.mateIn : state.mateIn,
      currentPv: info.pv && (!info.multipv || info.multipv === 1) ? info.pv : state.currentPv,
      multiPvLines: updatedMultiPv
    };
  }),

  resetEngineState: () => set({
    isThinking: false,
    evalCp: 0,
    isMate: false,
    mateIn: null,
    depth: 0,
    nodes: 0,
    nps: 0,
    currentPv: [],
    multiPvLines: []
  })
}));
