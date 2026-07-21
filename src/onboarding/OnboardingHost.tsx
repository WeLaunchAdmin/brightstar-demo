import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { hasSeenTour, runOnboardingTour } from './startTour'

/** Auto-starts the guided tour on the user's first visit only. */
export function OnboardingHost() {
  const navigate = useNavigate()
  const startedRef = useRef(false)

  useEffect(() => {
    if (startedRef.current) return
    if (hasSeenTour()) return
    startedRef.current = true

    const timer = window.setTimeout(() => {
      void runOnboardingTour(navigate, { markSeen: true })
    }, 700)

    return () => window.clearTimeout(timer)
  }, [navigate])

  return null
}
