import { create } from 'zustand'

export const useHallStore = create((set) => ({
  halls: [],
  currentHall: null,
  setHalls: (halls) => set({ halls }),
  setCurrentHall: (currentHall) => set({ currentHall }),
}))