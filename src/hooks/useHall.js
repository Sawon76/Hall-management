import { useHallStore } from '../store/hallStore'

export const useHall = () => useHallStore((state) => state)