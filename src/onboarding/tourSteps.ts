export const TOUR_SEEN_KEY = 'brightstar_tour_seen'

export type TourStepDef = {
  selector: string
  title: string
  description: string
}

/** Data-driven onboarding steps — edit here to change the tour. */
export const TOUR_STEPS: TourStepDef[] = [
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
