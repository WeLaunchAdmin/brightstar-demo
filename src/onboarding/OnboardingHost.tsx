import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getPageTourForPath } from './registry'
import { runPageTour } from './tourEngine'
import { hasSeenPageTour, isAutoGuidesEnabled } from './storage'
import { HELP_TOAST_EVENT } from './helpToast'

/** Auto-runs the current page tour once when Auto guides is ON and the page is unseen. */
export function OnboardingHost() {
  const navigate = useNavigate()
  const location = useLocation()
  const firedForPath = useRef<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!isAutoGuidesEnabled()) return
    const tour = getPageTourForPath(location.pathname)
    if (!tour) return
    if (hasSeenPageTour(tour.id)) return
    if (firedForPath.current === tour.route) return
    firedForPath.current = tour.route

    const timer = window.setTimeout(() => {
      if (!isAutoGuidesEnabled()) return
      if (hasSeenPageTour(tour.id)) return
      void runPageTour(navigate, tour, { markSeen: true })
    }, 800)

    return () => window.clearTimeout(timer)
  }, [location.pathname, navigate])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 3200)
    return () => window.clearTimeout(t)
  }, [toast])

  useEffect(() => {
    function onToast(e: Event) {
      const detail = (e as CustomEvent<string>).detail
      if (typeof detail === 'string') setToast(detail)
    }
    window.addEventListener(HELP_TOAST_EVENT, onToast)
    return () => window.removeEventListener(HELP_TOAST_EVENT, onToast)
  }, [])

  if (!toast) return null

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[90] px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm shadow-lg max-w-sm text-center">
      {toast}
    </div>
  )
}
