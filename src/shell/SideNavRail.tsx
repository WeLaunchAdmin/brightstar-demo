import {
  CirclePause,
  MapPinned,
  MessageSquare,
  ShieldAlert,
  Timer,
} from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { HelpMenu } from '../onboarding/HelpMenu'
import { showHelpToast } from '../onboarding/helpToast'

type NavItem = {
  to: string
  label: string
  icon: React.ReactNode
  tourId?: string
}

const iconClass = 'w-[18px] h-[18px]'

const navItems: NavItem[] = [
  {
    to: '/supervisor/dispatch',
    label: 'Daily Dispatch',
    icon: <MapPinned className={iconClass} strokeWidth={2} />,
  },
  {
    to: '/supervisor/overtime',
    label: 'Overtime',
    icon: <Timer className={iconClass} strokeWidth={2} />,
  },
  {
    to: '/supervisor/checkout',
    label: 'Checkout',
    icon: <ShieldAlert className={iconClass} strokeWidth={2} />,
  },
  {
    to: '/supervisor/idle',
    label: 'Idle',
    icon: <CirclePause className={iconClass} strokeWidth={2} />,
  },
  {
    to: '/supervisor/chat',
    label: 'Jarvis',
    tourId: 'nav-jarvis',
    icon: <MessageSquare className={iconClass} strokeWidth={2} />,
  },
]

export function SideNavRail() {
  const location = useLocation()

  return (
    <nav
      data-tour="nav-rail"
      className="w-16 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col items-center py-4 gap-2"
    >
      <div className="w-10 h-10 rounded-xl overflow-hidden bg-white border border-gray-200 shadow-sm mb-4 flex items-center justify-center">
        <img
          src="/facility19-logo.jpeg"
          alt=""
          width={40}
          height={40}
          className="w-full h-full object-cover"
        />
      </div>
      {navItems.map((item) => {
        const isActive = location.pathname === item.to
        return (
          <NavLink
            key={item.to}
            to={item.to}
            title={item.label}
            {...(item.tourId ? { 'data-tour': item.tourId } : {})}
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
        <HelpMenu onToast={showHelpToast} />
      </div>
    </nav>
  )
}
