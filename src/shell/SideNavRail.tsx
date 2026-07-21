import { NavLink, useLocation } from 'react-router-dom'

type NavItem = {
  to: string
  label: string
  icon: React.ReactNode
  tourId?: string
}

const navItems: NavItem[] = [
  {
    to: '/supervisor/dispatch',
    label: 'Daily Dispatch',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
      </svg>
    ),
  },
  {
    to: '/supervisor/overtime',
    label: 'Overtime',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
      </svg>
    ),
  },
  {
    to: '/supervisor/checkout',
    label: 'Checkout',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M10.8 15.9l4.2-4.2 1.4 1.5-5.6 5.6L6.5 14l1.4-1.5 2.9 3.4zM20 7h-4V5c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zm-6 0h-4V5h4v2z" />
      </svg>
    ),
  },
  {
    to: '/supervisor/idle',
    label: 'Idle',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
      </svg>
    ),
  },
  {
    to: '/supervisor/chat',
    label: 'Jarvis',
    tourId: 'nav-jarvis',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
      </svg>
    ),
  },
]

type SideNavRailProps = {
  onHelp?: () => void
}

export function SideNavRail({ onHelp }: SideNavRailProps) {
  const location = useLocation()

  return (
    <nav
      data-tour="nav-rail"
      className="w-16 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col items-center py-4 gap-2"
    >
      <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold mb-4">
        B
      </div>
      {navItems.map((item) => {
        const isActive = location.pathname === item.to
        return (
          <NavLink
            key={item.to}
            to={item.to}
            title={item.label}
            data-tour={item.tourId}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
              isActive
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            }`}
          >
            {item.icon}
          </NavLink>
        )
      })}

      <div className="mt-auto flex flex-col items-center gap-2 pb-1">
        <button
          type="button"
          onClick={onHelp}
          title="Take a tour"
          aria-label="Take a tour"
          className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-800 border border-transparent hover:border-gray-200 text-sm font-bold"
        >
          ?
        </button>
      </div>
    </nav>
  )
}
