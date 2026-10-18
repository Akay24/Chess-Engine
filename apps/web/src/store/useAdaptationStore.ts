import { create } from 'zustand';
import { StyleVector } from '@twentyfish/engine';
import { AdaptationPlan } from '@twentyfish/engine';

interface AdaptationState {
  adaptationEnabled: boolean;
  styleVector: StyleVector | null;
  plan: AdaptationPlan | null;
  statusText: string;
  setAdaptationEnabled: (enabled: boolean) => void;
  toggleAdaptation: () => void;
  updateStyle: (vector: StyleVector, plan: AdaptationPlan, status: string) => void;
  resetAdaptation: () => void;
}

const DEFAULT_STATUS = 'Style profiling active — evaluating human opening and tactical tendencies.';

export const useAdaptationStore = create<AdaptationState>((set) => ({
  adaptationEnabled: false,
  styleVector: null,
  plan: null,
  statusText: DEFAULT_STATUS,

  setAdaptationEnabled: (enabled) => set({ adaptationEnabled: enabled }),
  toggleAdaptation: () => set((state) => ({ adaptationEnabled: !state.adaptationEnabled })),

  updateStyle: (vector, plan, status) => set({
    styleVector: vector,
    plan,
    statusText: status || DEFAULT_STATUS
  }),

  resetAdaptation: () => set({
    styleVector: null,
    plan: null,
    statusText: DEFAULT_STATUS
  })
}));
