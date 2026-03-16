import { HelpCircle, Home, Lock, Mail, Receipt, User, X } from 'lucide-react'
import { NavLink } from 'react-router-dom'

import { useUiStore } from '../../store/uiStore'

const navItems = [
  { label: 'Home', icon: Home, route: '/student/home' },
  { label: 'Profile', icon: User, route: '/student/profile' },
  { label: 'Payment Details', icon: Receipt, route: '/student/payments' },
  { label: 'Change Password', icon: Lock, route: '/student/change-password' },
  { label: 'Help', icon: HelpCircle, route: '/student/help' },
  { label: 'Contact', icon: Mail, route: '/student/contact' },
]

export default function StudentSidebar() {
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
        Student Panel
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