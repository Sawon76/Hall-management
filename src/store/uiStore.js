import { create } from 'zustand'

export const useUiStore = create((set) => ({
  sidebarOpen: false,
  activeModal: null,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setActiveModal: (activeModal) => set({ activeModal }),
  closeModal: () => set({ activeModal: null }),
}))