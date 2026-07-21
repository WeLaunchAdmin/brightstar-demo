import { useEffect, useId, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  PRODUCT_GUIDE_HREF,
  getPageTourForPath,
} from './registry'
import {
  destroyActiveTour,
  runPageTour,
  runPlatformOverview,
} from './tourEngine'
import {
  isAutoGuidesEnabled,
  resetAllGuideFlags,
  setAutoGuidesEnabled,
} from './storage'
import { AgentsModal } from './AgentsModal'

type HelpMenuProps = {
  onToast?: (message: string) => void
}

export function HelpMenu({ onToast }: HelpMenuProps) {
  const [open, setOpen] = useState(false)
  const [agentsOpen, setAgentsOpen] = useState(false)
  const [autoGuides, setAutoGuides] = useState(() => isAutoGuidesEnabled())
  const rootRef = useRef<HTMLDivElement>(null)
  const menuId = useId()
  const navigate = useNavigate()
  const location = useLocation()

  const pageTour = getPageTourForPath(location.pathname)
  const pageTitle = pageTour?.title ?? 'This page'

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function closeMenu() {
    setOpen(false)
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        title="Help"
        aria-label="Help menu"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold border transition-colors ${
          open
            ? 'bg-gray-900 text-white border-gray-900'
            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800 border-transparent hover:border-gray-200'
        }`}
      >
        ?
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute left-full bottom-0 ml-2 w-64 rounded-xl border border-gray-200 bg-white shadow-xl z-[60] py-1.5 overflow-hidden"
        >
          <MenuItem
            icon={<CompassIcon />}
            label="Platform overview"
            onClick={() => {
              closeMenu()
              destroyActiveTour()
              void runPlatformOverview(navigate)
            }}
          />
          <MenuItem
            icon={<MapIcon />}
            label="Tour this page"
            subtitle={pageTour ? pageTitle : 'No tour for this page'}
            disabled={!pageTour}
            onClick={() => {
              if (!pageTour) return
              closeMenu()
              destroyActiveTour()
              void runPageTour(navigate, pageTour)
            }}
          />
          <MenuItem
            icon={<UsersIcon />}
            label="Meet all agents"
            onClick={() => {
              closeMenu()
              setAgentsOpen(true)
            }}
          />

          <div className="my-1.5 border-t border-gray-100" />

          <div
            role="menuitem"
            className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-800"
          >
            <span className="w-5 h-5 text-gray-500 flex items-center justify-center shrink-0">
              <SparkIcon />
            </span>
            <span className="flex-1 font-medium">Auto guides</span>
            <button
              type="button"
              role="switch"
              aria-checked={autoGuides}
              onClick={() => {
                const next = !autoGuides
                setAutoGuides(next)
                setAutoGuidesEnabled(next)
              }}
              className={`relative w-9 h-5 rounded-full transition-colors ${
                autoGuides ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  autoGuides ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <MenuItem
            icon={<ResetIcon />}
            label="Reset all guides"
            onClick={() => {
              resetAllGuideFlags()
              closeMenu()
              onToast?.('Guides reset — tours will run again on first visit.')
            }}
          />

          <div className="my-1.5 border-t border-gray-100" />

          <a
            role="menuitem"
            href={PRODUCT_GUIDE_HREF}
            target="_blank"
            rel="noreferrer"
            onClick={closeMenu}
            className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-800 hover:bg-gray-50"
          >
            <span className="w-5 h-5 text-gray-500 flex items-center justify-center shrink-0">
              <BookIcon />
            </span>
            <span className="flex-1 font-medium">Product guide</span>
            <ExternalIcon />
          </a>
        </div>
      )}

      {agentsOpen && <AgentsModal onClose={() => setAgentsOpen(false)} />}
    </div>
  )
}

function MenuItem({
  icon,
  label,
  subtitle,
  disabled,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  subtitle?: string
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={`w-full flex items-start gap-2.5 px-3 py-2 text-left transition-colors ${
        disabled
          ? 'opacity-40 cursor-not-allowed'
          : 'hover:bg-gray-50 text-gray-800'
      }`}
    >
      <span className="w-5 h-5 mt-0.5 text-gray-500 flex items-center justify-center shrink-0">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        {subtitle && (
          <span className="block text-[11px] text-gray-500 mt-0.5 truncate">
            {subtitle}
          </span>
        )}
      </span>
    </button>
  )
}

function CompassIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M14.5 9.5l-2 5-5 2 2-5 5-2z" strokeLinejoin="round" />
    </svg>
  )
}

function MapIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 4l-5 2v14l5-2 6 2 5-2V4l-5 2-6-2z" strokeLinejoin="round" />
      <path d="M9 4v14M15 6v14" />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="9" cy="8" r="3" />
      <path d="M3 19c0-2.5 2.5-4.5 6-4.5s6 2 6 4.5" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M21 19c0-2-1.8-3.5-4-3.8" />
    </svg>
  )
}

function SparkIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l1.2 6.3L19 10l-5.8 1.7L12 18l-1.2-6.3L5 10l5.8-1.7L12 2z" />
    </svg>
  )
}

function ResetIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 12a9 9 0 1 0 3-6.7" strokeLinecap="round" />
      <path d="M3 4v5h5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function BookIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2V5z" />
      <path d="M8 3v16" />
    </svg>
  )
}

function ExternalIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 4h6v6M10 14L20 4M20 14v6H4V4h6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
