import { driver, type DriveStep } from 'driver.js'
import 'driver.js/dist/driver.css'
import type { NavigateFunction } from 'react-router-dom'
import type { PageTourDef, TourStepDef } from './registry'
import {
  PLATFORM_OVERVIEW_STEPS,
  TOUR_BY_ROUTE,
  getPageTourForPath,
} from './registry'
import { markPageTourSeen, markPlatformTourSeen } from './storage'

let activeDriver: ReturnType<typeof driver> | null = null

export function destroyActiveTour(): void {
  try {
    activeDriver?.destroy()
  } catch {
    // ignore
  }
  activeDriver = null
}

export function waitForSelector(
  selector: string,
  timeoutMs: number,
): Promise<Element | null> {
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
    }, 80)
  })
}

function toDriveSteps(steps: TourStepDef[]): DriveStep[] {
  return steps
    .filter((step) => {
      if (!step.selector) return true
      return Boolean(document.querySelector(step.selector))
    })
    .map((step) => ({
      element: step.selector || undefined,
      skipMissingElement: true,
      popover: {
        title: step.title,
        description: step.description,
        side: 'bottom',
        align: 'start',
      },
    }))
}

function launchDriver(steps: DriveStep[], onDone: () => void): void {
  destroyActiveTour()
  if (steps.length === 0) {
    onDone()
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
    waitForElement: 1500,
    steps,
    onDestroyed: () => {
      if (activeDriver === d) activeDriver = null
      onDone()
    },
  })
  activeDriver = d
  d.drive()
}

/** Run the tour for a specific page (navigates to its route if needed). */
export async function runPageTour(
  navigate: NavigateFunction,
  tour: PageTourDef,
  options?: { markSeen?: boolean },
): Promise<void> {
  const markSeen = options?.markSeen !== false
  destroyActiveTour()

  if (window.location.pathname !== tour.route) {
    navigate(tour.route)
  }

  const firstSelector = tour.steps[0]?.selector
  if (firstSelector) {
    await waitForSelector(firstSelector, 4000)
  }
  await new Promise((r) => window.setTimeout(r, 350))

  const steps = toDriveSteps(tour.steps)
  launchDriver(steps, () => {
    if (markSeen) markPageTourSeen(tour.id)
  })
}

export async function runTourForCurrentPath(
  navigate: NavigateFunction,
  pathname: string,
): Promise<void> {
  const tour = getPageTourForPath(pathname)
  if (!tour) return
  await runPageTour(navigate, tour)
}

export function getTourForPath(pathname: string): PageTourDef | undefined {
  return getPageTourForPath(pathname) ?? TOUR_BY_ROUTE[pathname]
}

type StepAction = 'next' | 'prev' | 'close'

function presentSingleStep(
  step: TourStepDef,
  meta: { index: number; total: number },
): Promise<StepAction> {
  return new Promise((resolve) => {
    destroyActiveTour()

    const el = step.selector ? document.querySelector(step.selector) : null
    if (step.selector && !el) {
      resolve('next')
      return
    }

    let settled = false
    const finish = (action: StepAction) => {
      if (settled) return
      settled = true
      try {
        d.destroy()
      } catch {
        // ignore
      }
      resolve(action)
    }

    const d = driver({
      animate: true,
      overlayOpacity: 0.55,
      stagePadding: 8,
      stageRadius: 10,
      allowClose: true,
      smoothScroll: true,
      showProgress: true,
      progressText: `${meta.index + 1} of ${meta.total}`,
      showButtons: ['next', 'previous', 'close'],
      nextBtnText: meta.index + 1 >= meta.total ? 'Done' : 'Next',
      prevBtnText: 'Back',
      doneBtnText: 'Done',
      popoverClass: 'brightstar-tour-popover',
      steps: [
        {
          element: step.selector || undefined,
          skipMissingElement: true,
          popover: {
            title: step.title,
            description: step.description,
            side: 'bottom',
            align: 'start',
            onNextClick: () => finish('next'),
            onPrevClick: () => finish('prev'),
            onCloseClick: () => finish('close'),
          },
        },
      ],
      onDestroyed: () => {
        if (!settled) {
          settled = true
          resolve('close')
        }
        if (activeDriver === d) activeDriver = null
      },
    })
    activeDriver = d
    d.drive()
  })
}

/** Cross-screen tour: navigates Dispatch → … → Jarvis with 1–2 steps each. */
export async function runPlatformOverview(
  navigate: NavigateFunction,
  options?: { markSeen?: boolean },
): Promise<void> {
  const markSeen = options?.markSeen !== false
  destroyActiveTour()

  let i = 0
  while (i < PLATFORM_OVERVIEW_STEPS.length) {
    const step = PLATFORM_OVERVIEW_STEPS[i]
    if (step.route && window.location.pathname !== step.route) {
      navigate(step.route)
    }
    if (step.selector) {
      await waitForSelector(step.selector, 4000)
    }
    await new Promise((r) => window.setTimeout(r, 320))

    // Skip missing targets without breaking the walk
    if (step.selector && !document.querySelector(step.selector)) {
      i += 1
      continue
    }

    const action = await presentSingleStep(step, {
      index: i,
      total: PLATFORM_OVERVIEW_STEPS.length,
    })

    if (action === 'close') break
    if (action === 'prev') i = Math.max(0, i - 1)
    else i += 1
  }

  if (markSeen) markPlatformTourSeen()
}
