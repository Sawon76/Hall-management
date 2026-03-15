import { create } from 'zustand'

const STUDENT_SESSION_KEY = 'hall-management-student-session'

const getStoredStudentSession = () => {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const storedValue = window.localStorage.getItem(STUDENT_SESSION_KEY)
    return storedValue ? JSON.parse(storedValue) : null
  } catch {
    return null
  }
}

export const useAuthStore = create((set) => ({
  user: null,
  studentSession: getStoredStudentSession(),
  loading: false,
  setUser: (user) => set({ user }),
  setStudentSession: (studentSession) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        STUDENT_SESSION_KEY,
        JSON.stringify(studentSession),
      )
    }

    set({ studentSession })
  },
  clearAuth: () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STUDENT_SESSION_KEY)
    }

    set({ user: null, studentSession: null, loading: false })
  },
  setLoading: (loading) => set({ loading }),
}))