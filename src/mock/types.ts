export type Trade = 'Sprinkler' | 'Fire Alarm' | 'Inspector'
export type GpsStatus = 'moving' | 'parked' | 'stale' | 'idling'
export type WoType = 'ITM' | 'repair' | 'emergency' | 'survey' | 'service' | 'FDNY'
export type WoStatus = 'open' | 'assigned' | 'in progress' | 'completed'
export type EvidenceVerdict = 'OT MIXED' | 'INCONCLUSIVE' | 'CLEAN'
export type CheckoutStatus = 'on site' | 'en route' | 'issues' | 'stale gps'

export interface Asset {
  assetId: string
  techName: string
  trade: Trade
  workCell: string
  active: boolean
}

export interface Telemetry {
  assetId: string
  lat: number
  lng: number
  speed: number
  engineOn: boolean
  idleMinutes: number
  address: string
  lastPingAt: string
  gpsStatus: GpsStatus
}

export interface WorkOrder {
  woId: string
  site: string
  address: string
  client: string
  type: WoType
  assetId?: string
  status: WoStatus
  description?: string
}

export interface Trip {
  tripId: string
  woId: string
  assetId: string
  scheduledStart: string
  scheduledEnd: string
  checkInAt?: string
  checkOutAt?: string
  onSiteMinutes: number
}

export interface Punch {
  punchId: string
  assetId: string
  date: string
  /** On-site / paid-day window start (earliest site check-in) */
  clockIn: string
  /** On-site / paid-day window end (latest site check-out) */
  clockOut: string
  /** Garage depart — start of home-to-home span */
  departFromGarageAt: string
  /** Garage return — end of home-to-home span */
  returnToGarageAt: string
  regularHours: number
  overtimeHours: number
}

export type EvidenceEventKind =
  | 'shift-started'
  | 'depart'
  | 'check-in'
  | 'scheduled'
  | 'check-out'
  | 'update'

export interface EvidenceEvent {
  at: string
  label: string
  kind: EvidenceEventKind
  woId?: string
  site?: string
  address?: string
  tags?: string[]
}

export interface GpsPing {
  at: string
  lat: number
  lng: number
}

export interface DayEvidence {
  evidenceId: string
  assetId: string
  date: string
  techName: string
  timeline: EvidenceEvent[]
  gpsPings: GpsPing[]
  distanceMi: number
  movingMin: number
  onSiteMinutes: number
  supportingEvidence: string[]
  verdict: EvidenceVerdict
  summary: string
}

export interface CheckoutWatch {
  watchId: string
  woId: string
  assetId: string
  checkInAt: string
  checkInLoc: { lat: number; lng: number }
  lastKnownLoc: { lat: number; lng: number }
  geofenceMiles: number
  status: CheckoutStatus
}

export interface Geofence {
  woId: string
  center: { lat: number; lng: number }
  radiusMiles: number
}

export type IdleAlertCallStatus =
  | 'Pending call'
  | 'Completed'
  | 'No answer'
  | 'Busy'
  | 'Failed'
  | 'Canceled'
  | 'Legacy notified'
  | 'No phone'

export interface IdleAlert {
  alertId: string
  assetId: string
  /** Idle duration in minutes (≥ 8 when alerted) */
  minutes: number
  location: string
  callStatus: IdleAlertCallStatus
  sessionEnded: boolean
  /** Acknowledgement timestamp when notified; omit = "—" */
  notifiedAckAt?: string
  idleSinceAt: string
  idleDetectedAt: string
  stoppedIdlingAt?: string
}

export type CheckoutAlertCase = 'Off-site check-in' | 'Left site'
export type CheckoutAlertStatus = 'Pending call' | 'Completed' | 'No answer' | 'Failed'
export type CheckoutAlertTier = 'ALERT 1 (0.5 mi)' | 'ALERT 2 (1 mi)' | 'ALERT 3 (2 mi)'

export interface CheckoutAlert {
  alertId: string
  watchId: string
  assetId: string
  woId: string
  caseType: CheckoutAlertCase
  tierLabel: CheckoutAlertTier
  distanceMi: number
  thresholdMi: number
  status: CheckoutAlertStatus
  notified: 'Technician' | '—'
  detectedAt: string
  /** ISO timestamp when call was placed; omit / undefined = not called */
  calledAt?: string
  /** ISO checkout timestamp; omit = still "Not checked out" */
  checkoutAt?: string
}
