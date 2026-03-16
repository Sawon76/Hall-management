import WeeklyMenuReadOnly from '../../components/menu/WeeklyMenuReadOnly'
import { useAuthStore } from '../../store/authStore'

export default function WeeklyMenuView() {
  const user = useAuthStore((state) => state.user)

  return <WeeklyMenuReadOnly hallId={user?.hall_id} portalLabel="Provost" />
}