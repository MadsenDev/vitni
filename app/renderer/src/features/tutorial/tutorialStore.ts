import { create } from 'zustand';

export const TUTORIAL_STEP_COUNT = 8;

type TutorialStore = {
  active: boolean;
  step: number;
  spotlightSuppressed: boolean;
  start: () => void;
  advance: () => void;
  skip: () => void;
  setSpotlightSuppressed: (value: boolean) => void;
};

export const useTutorialStore = create<TutorialStore>((set) => ({
  active: false,
  step: 0,
  spotlightSuppressed: false,
  start: () => set({ active: true, step: 0 }),
  advance: () =>
    set((s) => {
      const next = s.step + 1;
      if (next >= TUTORIAL_STEP_COUNT) return { active: false, step: 0 };
      return { step: next };
    }),
  skip: () => set({ active: false, step: 0 }),
  setSpotlightSuppressed: (value) => set({ spotlightSuppressed: value }),
}));
