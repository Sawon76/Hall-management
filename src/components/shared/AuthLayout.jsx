import { Outlet } from 'react-router-dom'

import { ROLES } from '../../constants'
import ProvostSidebar from './ProvostSidebar'
import StaffSidebar from './StaffSidebar'
import StudentSidebar from './StudentSidebar'
import TopBar from './TopBar'

export default function AuthLayout({ role, children }) {
  const renderSidebar = () => {
    if (role === ROLES.PROVOST) {
      return <ProvostSidebar />
    }

    if (role === ROLES.STAFF) {
      return <StaffSidebar />
    }

    return <StudentSidebar />
  }

  return (
    <div className="flex h-screen bg-slate-100">
      {renderSidebar()}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <TopBar role={role} />
        <main className="mt-16 min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  )
}