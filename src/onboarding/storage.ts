import {
  AUTO_GUIDES_KEY,
  PLATFORM_TOUR_SEEN_KEY,
  PAGE_TOURS,
  allTourSeenKeys,
  pageTourSeenKey,
} from './registry'

export function isAutoGuidesEnabled(): boolean {
  try {
    const raw = localStorage.getItem(AUTO_GUIDES_KEY)
    if (raw === null) return true
    return raw !== '0'
  } catch {
    return true
  }
}

export function setAutoGuidesEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(AUTO_GUIDES_KEY, enabled ? '1' : '0')
  } catch {
    // ignore
  }
}

export function hasSeenPageTour(tourId: string): boolean {
  try {
    return localStorage.getItem(pageTourSeenKey(tourId)) === '1'
  } catch {
    return false
  }
}

export function markPageTourSeen(tourId: string): void {
  try {
    localStorage.setItem(pageTourSeenKey(tourId), '1')
  } catch {
    // ignore
  }
}

export function hasSeenPlatformTour(): boolean {
  try {
    return localStorage.getItem(PLATFORM_TOUR_SEEN_KEY) === '1'
  } catch {
    return false
  }
}

export function markPlatformTourSeen(): void {
  try {
    localStorage.setItem(PLATFORM_TOUR_SEEN_KEY, '1')
  } catch {
    // ignore
  }
}

export function resetAllGuideFlags(): void {
  try {
    for (const key of allTourSeenKeys(PAGE_TOURS.map((t) => t.id))) {
      localStorage.removeItem(key)
    }
  } catch {
    // ignore
  }
}
