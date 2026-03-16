import WeeklyMenuReadOnly from '../../components/menu/WeeklyMenuReadOnly'
import { useAuthStore } from '../../store/authStore'

export default function StudentWeeklyMenu() {
  const studentSession = useAuthStore((state) => state.studentSession)

  return <WeeklyMenuReadOnly hallId={studentSession?.hall_id} portalLabel="Student" />
}