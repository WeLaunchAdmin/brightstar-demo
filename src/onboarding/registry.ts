export type TourStepDef = {
  selector: string
  title: string
  description: string
  /** For platform overview: navigate here before highlighting */
  route?: string
}

export type PageTourDef = {
  id: string
  route: string
  title: string
  steps: TourStepDef[]
}

export const AUTO_GUIDES_KEY = 'brightstar_auto_guides'
export const LEGACY_TOUR_SEEN_KEY = 'brightstar_tour_seen'
export const PLATFORM_TOUR_SEEN_KEY = 'brightstar_tour_seen_platform'

export function pageTourSeenKey(tourId: string): string {
  return `brightstar_tour_seen_${tourId}`
}

/** All per-page “seen” keys + platform + legacy — used by Reset. */
export function allTourSeenKeys(pageIds: string[]): string[] {
  return [
    LEGACY_TOUR_SEEN_KEY,
    PLATFORM_TOUR_SEEN_KEY,
    ...pageIds.map(pageTourSeenKey),
  ]
}

export const DISPATCH_TOUR_STEPS: TourStepDef[] = [
  {
    selector: '[data-tour="nav-rail"]',
    title: 'Navigation',
    description:
      'Switch between Dispatch, Overtime, Checkout, Idle, and Jarvis.',
  },
  {
    selector: '[data-tour="fleet-map"]',
    title: 'Fleet map',
    description:
      'Your live fleet. Orange pills are work orders; truck markers are technicians, colored by status.',
  },
  {
    selector: '[data-tour="layer-pills"]',
    title: 'Map layers',
    description: 'Toggle technicians and work orders on the map.',
  },
  {
    selector: '[data-tour="crew-chips"]',
    title: 'Crew filter',
    description: 'Filter the map by crew.',
  },
  {
    selector: '[data-tour="search-route"]',
    title: 'Search & Route',
    description:
      'Search an address to find the nearest technicians by drive time, or route between two points.',
  },
  {
    selector: '[data-tour="wo-pill"]',
    title: 'Work order',
    description:
      'Click any work order for its details and to assign a technician.',
  },
  {
    selector: '[data-tour="open-queues"]',
    title: 'Open job queues',
    description:
      'Browse open work by type: survey, service, FDNY, repair.',
  },
  {
    selector: '[data-tour="nav-jarvis"]',
    title: 'Jarvis',
    description: 'Ask Jarvis about your fleet — by chat or voice.',
  },
]

export const PAGE_TOURS: PageTourDef[] = [
  {
    id: 'dispatch',
    route: '/supervisor/dispatch',
    title: 'Daily Dispatch',
    steps: DISPATCH_TOUR_STEPS,
  },
  {
    id: 'overtime',
    route: '/supervisor/overtime',
    title: 'Overtime',
    steps: [
      {
        selector: '[data-tour="overtime-header"]',
        title: 'Overtime',
        description:
          'Review weekly hours by asset using site-punch rules, and drill into a single day of GPS evidence.',
      },
      {
        selector: '[data-tour="overtime-tabs"]',
        title: 'Fleet hours & Day analysis',
        description:
          'Fleet hours shows the week table. Day analysis maps a technician’s day with Evidence Analyst context.',
      },
      {
        selector: '[data-tour="overtime-body"]',
        title: 'Hours & evidence',
        description:
          'Scan overtime metrics, search by asset ID, and open a day to verify time on site.',
      },
    ],
  },
  {
    id: 'checkout',
    route: '/supervisor/checkout',
    title: 'Checkout Compliance',
    steps: [
      {
        selector: '[data-tour="checkout-header"]',
        title: 'Checkout Compliance',
        description:
          'Checkout Monitor watches today’s check-ins and flags geofence breaches until field check-out.',
      },
      {
        selector: '[data-tour="checkout-tabs"]',
        title: 'Watches & alerts',
        description:
          'Active watches show who is still on site. Alerts lists geofence breaches ready for follow-up.',
      },
      {
        selector: '[data-tour="checkout-body"]',
        title: 'Live watches',
        description:
          'Select an asset to see map context and watch details. Export alerts as CSV when needed.',
      },
    ],
  },
  {
    id: 'idle',
    route: '/supervisor/idle',
    title: 'Idle Monitoring',
    steps: [
      {
        selector: '[data-tour="idle-header"]',
        title: 'Idle Monitoring',
        description:
          'Spot idle assets from live telemetry and review idle events sent to the alerts pipeline.',
      },
      {
        selector: '[data-tour="idle-tabs"]',
        title: 'Monitored & alerts',
        description:
          'Monitored technicians lists live status. Alerts tracks idle events by call status.',
      },
      {
        selector: '[data-tour="idle-body"]',
        title: 'Telemetry table',
        description:
          'Filter by GPS status, jump to an asset ID, and export rows for follow-up.',
      },
    ],
  },
  {
    id: 'chat',
    route: '/supervisor/chat',
    title: 'Jarvis',
    steps: [
      {
        selector: '[data-tour="jarvis-shell"]',
        title: 'Jarvis',
        description:
          'Ask about your fleet in text or switch to voice — answers use live fleet records.',
      },
      {
        selector: '[data-tour="jarvis-sidebar"]',
        title: 'Chat history',
        description:
          'Start a new chat or reopen a past thread. Threads appear after you send a message.',
      },
      {
        selector: '[data-tour="jarvis-composer"]',
        title: 'Ask anything',
        description:
          'Type a question, try a suggestion chip, or tap Jarvis to open voice mode.',
      },
    ],
  },
]

/** High-level walk across every screen (route changes between steps). */
export const PLATFORM_OVERVIEW_STEPS: TourStepDef[] = [
  {
    route: '/supervisor/dispatch',
    selector: '[data-tour="fleet-map"]',
    title: 'Daily Dispatch',
    description:
      'Your live control tower — map work orders and technicians, search nearby assets, and assign open jobs.',
  },
  {
    route: '/supervisor/dispatch',
    selector: '[data-tour="search-route"]',
    title: 'Find & route',
    description:
      'Search an address for nearby technicians by drive time, or build a route between two points.',
  },
  {
    route: '/supervisor/overtime',
    selector: '[data-tour="overtime-header"]',
    title: 'Overtime',
    description:
      'Track weekly hours and run day analysis when you need GPS evidence for a single asset.',
  },
  {
    route: '/supervisor/checkout',
    selector: '[data-tour="checkout-header"]',
    title: 'Checkout Compliance',
    description:
      'Checkout Monitor watches active check-ins and raises geofence alerts until check-out.',
  },
  {
    route: '/supervisor/idle',
    selector: '[data-tour="idle-header"]',
    title: 'Idle Monitoring',
    description:
      'See which assets are idle and review idle events from the alerts pipeline.',
  },
  {
    route: '/supervisor/chat',
    selector: '[data-tour="jarvis-shell"]',
    title: 'Jarvis',
    description:
      'Ask Jarvis about fleet status by chat or voice — verify results before you dispatch.',
  },
  {
    route: '/supervisor/chat',
    selector: '[data-tour="nav-rail"]',
    title: 'You’re set',
    description:
      'Use the left rail anytime to move between screens, or open Help (?) to re-run a tour.',
  },
]

export const TOUR_BY_ROUTE: Record<string, PageTourDef> = Object.fromEntries(
  PAGE_TOURS.map((t) => [t.route, t]),
)

export function getPageTourForPath(pathname: string): PageTourDef | undefined {
  const match = PAGE_TOURS.find(
    (t) => pathname === t.route || pathname.startsWith(`${t.route}/`),
  )
  return match
}

export const PRODUCT_GUIDE_HREF = 'https://docs.brightstar.example/product-guide'
