import { CalendarOff, FileSpreadsheet, History, LayoutDashboard, UserPlus, X } from 'lucide-react'
import { NavLink } from 'react-router-dom'

import { useUiStore } from '../../store/uiStore'

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, route: '/staff/dashboard' },
  { label: 'Create Account', icon: UserPlus, route: '/staff/create-account' },
  { label: 'Payment Generator', icon: FileSpreadsheet, route: '/staff/payment-generator' },
  { label: 'Hall Closure', icon: CalendarOff, route: '/staff/hall-closure' },
  { label: 'Payment History', icon: History, route: '/staff/payment-history' },
]

export default function StaffSidebar() {
  const sidebarOpen = useUiStore((state) => state.sidebarOpen)
  const toggleSidebar = useUiStore((state) => state.toggleSidebar)

  return (
    <>
      <aside className="hidden h-screen w-64 bg-slate-900 px-4 py-6 lg:fixed lg:block">
        <SidebarContent onNavigate={null} />
      </aside>

      <div
        className={`fixed inset-0 z-40 bg-slate-900/50 transition-opacity lg:hidden ${
          sidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={toggleSidebar}
      />

      <aside
        className={`fixed left-0 top-0 z-50 h-screen w-64 bg-slate-900 px-4 py-6 transition-transform lg:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          type="button"
          onClick={toggleSidebar}
          className="mb-4 inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 text-slate-300"
          aria-label="Close sidebar"
        >
          <X className="h-4 w-4" />
        </button>
        <SidebarContent onNavigate={toggleSidebar} />
      </aside>
    </>
  )
}

function SidebarContent({ onNavigate }) {
  return (
    <div className="flex h-full flex-col">
      <h2 className="mb-6 px-2 text-sm font-semibold uppercase tracking-wider text-slate-300">
        Staff Panel
      </h2>

      <nav className="space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.route}
            to={item.route}
            onClick={onNavigate || undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                isActive
                  ? 'bg-blue-700 text-white'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}