import { create } from "zustand";

export const useModerationStore = create((set) => ({
  moderationStatus: null,
  isModerating: false,
  setModerationStatus: (status) => set({ moderationStatus: status }),
  clearModerationStatus: () => set({ moderationStatus: null }),
  setIsModerating: (status) => set({ isModerating: status }),
}));