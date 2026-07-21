import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import type { NavigateFunction } from 'react-router-dom'
import { TOUR_SEEN_KEY, TOUR_STEPS } from './tourSteps'

const DISPATCH_PATH = '/supervisor/dispatch'

function waitForSelector(selector: string, timeoutMs: number): Promise<Element | null> {
  const existing = document.querySelector(selector)
  if (existing) return Promise.resolve(existing)

  return new Promise((resolve) => {
    const started = Date.now()
    const timer = window.setInterval(() => {
      const el = document.querySelector(selector)
      if (el) {
        window.clearInterval(timer)
        resolve(el)
        return
      }
      if (Date.now() - started >= timeoutMs) {
        window.clearInterval(timer)
        resolve(null)
      }
    }, 100)
  })
}

function buildSteps() {
  return TOUR_STEPS.filter((step) => document.querySelector(step.selector)).map((step) => ({
    element: step.selector,
    skipMissingElement: true,
    popover: {
      title: step.title,
      description: step.description,
      side: 'bottom' as const,
      align: 'start' as const,
    },
  }))
}

/** Launch the spotlight tour. Navigates to Dispatch first if needed. */
export async function runOnboardingTour(
  navigate: NavigateFunction,
  options?: { markSeen?: boolean },
): Promise<void> {
  const markSeen = options?.markSeen !== false

  if (!window.location.pathname.includes('/supervisor/dispatch')) {
    navigate(DISPATCH_PATH)
  }

  await waitForSelector('[data-tour="fleet-map"]', 4000)
  // Allow map markers / floating cards one paint cycle to mount
  await new Promise((r) => window.setTimeout(r, 350))

  const steps = buildSteps()
  if (steps.length === 0) {
    if (markSeen) localStorage.setItem(TOUR_SEEN_KEY, '1')
    return
  }

  const d = driver({
    animate: true,
    overlayOpacity: 0.55,
    stagePadding: 8,
    stageRadius: 10,
    allowClose: true,
    smoothScroll: true,
    showProgress: true,
    progressText: '{{current}} of {{total}}',
    showButtons: ['next', 'previous', 'close'],
    nextBtnText: 'Next',
    prevBtnText: 'Back',
    doneBtnText: 'Done',
    popoverClass: 'brightstar-tour-popover',
    skipMissingElement: true,
    waitForElement: 1200,
    steps,
    onDestroyed: () => {
      if (markSeen) localStorage.setItem(TOUR_SEEN_KEY, '1')
    },
  })

  d.drive()
}

export function hasSeenTour(): boolean {
  try {
    return localStorage.getItem(TOUR_SEEN_KEY) === '1'
  } catch {
    return false
  }
}
