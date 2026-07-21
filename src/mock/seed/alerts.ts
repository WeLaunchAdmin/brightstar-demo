import { DEMO_NOW } from '../constants'
import { addMinutes } from '../helpers'
import type { CheckoutAlert, IdleAlert, IdleAlertCallStatus } from '../types'
import { checkoutWatches } from './checkoutWatches'
import { telemetry } from './telemetry'

/**
 * Deterministic idle-event alerts for Idle Monitoring.
 * References real telemetry asset IDs (prefer idling / long-idle rows). No RNG.
 *
 * Call-status spread: Legacy notified 2 · Pending call 1 · Completed 1 ·
 * No answer 1 · Busy 1 · Failed 1  (= 7)
 */
const idlingAssets = telemetry.filter(
  (t) => t.gpsStatus === 'idling' || t.idleMinutes >= 8,
)

type IdleSpec = Omit<IdleAlert, 'assetId' | 'location'> & { telIndex: number }

const IDLE_SPECS: IdleSpec[] = [
  {
    telIndex: 0,
    alertId: '#IDL-901',
    minutes: 9,
    callStatus: 'Legacy notified',
    sessionEnded: true,
    notifiedAckAt: addMinutes(DEMO_NOW, -130),
    idleSinceAt: addMinutes(DEMO_NOW, -145),
    idleDetectedAt: addMinutes(DEMO_NOW, -136),
    stoppedIdlingAt: addMinutes(DEMO_NOW, -125),
  },
  {
    telIndex: 1,
    alertId: '#IDL-902',
    minutes: 12,
    callStatus: 'Legacy notified',
    sessionEnded: true,
    notifiedAckAt: addMinutes(DEMO_NOW, -95),
    idleSinceAt: addMinutes(DEMO_NOW, -110),
    idleDetectedAt: addMinutes(DEMO_NOW, -100),
    stoppedIdlingAt: addMinutes(DEMO_NOW, -88),
  },
  {
    telIndex: 2,
    alertId: '#IDL-903',
    minutes: 15,
    callStatus: 'Pending call',
    sessionEnded: false,
    idleSinceAt: addMinutes(DEMO_NOW, -22),
    idleDetectedAt: addMinutes(DEMO_NOW, -14),
  },
  {
    telIndex: 3,
    alertId: '#IDL-904',
    minutes: 11,
    callStatus: 'Completed',
    sessionEnded: true,
    notifiedAckAt: addMinutes(DEMO_NOW, -60),
    idleSinceAt: addMinutes(DEMO_NOW, -80),
    idleDetectedAt: addMinutes(DEMO_NOW, -70),
    stoppedIdlingAt: addMinutes(DEMO_NOW, -55),
  },
  {
    telIndex: 4,
    alertId: '#IDL-905',
    minutes: 18,
    callStatus: 'No answer',
    sessionEnded: true,
    notifiedAckAt: addMinutes(DEMO_NOW, -40),
    idleSinceAt: addMinutes(DEMO_NOW, -58),
    idleDetectedAt: addMinutes(DEMO_NOW, -48),
    stoppedIdlingAt: addMinutes(DEMO_NOW, -35),
  },
  {
    telIndex: 5,
    alertId: '#IDL-906',
    minutes: 10,
    callStatus: 'Busy',
    sessionEnded: false,
    notifiedAckAt: addMinutes(DEMO_NOW, -8),
    idleSinceAt: addMinutes(DEMO_NOW, -20),
    idleDetectedAt: addMinutes(DEMO_NOW, -11),
  },
  {
    telIndex: 6,
    alertId: '#IDL-907',
    minutes: 22,
    callStatus: 'Failed',
    sessionEnded: true,
    notifiedAckAt: addMinutes(DEMO_NOW, -160),
    idleSinceAt: addMinutes(DEMO_NOW, -180),
    idleDetectedAt: addMinutes(DEMO_NOW, -170),
    stoppedIdlingAt: addMinutes(DEMO_NOW, -150),
  },
]

export const idleAlerts: IdleAlert[] = IDLE_SPECS.map((spec) => {
  const tel = idlingAssets[spec.telIndex]
  if (!tel) {
    throw new Error(`idleAlerts: missing idling telemetry at index ${spec.telIndex}`)
  }
  const { telIndex: _i, ...rest } = spec
  return {
    ...rest,
    assetId: tel.assetId,
    location: tel.address,
  }
})

/**
 * Deterministic geofence-breach alerts for Checkout Compliance.
 * Each row references a real checkoutWatch (asset + WO). No RNG — fixed table
 * so filter counts stay stable under RNG_SEED / source-of-truth chain.
 *
 * Status spread: Completed 3 · Pending call 2 · No answer 1 · Failed 1
 */
const ALERT_SPECS: Array<Omit<CheckoutAlert, 'watchId' | 'assetId' | 'woId'> & { watchIndex: number }> = [
  {
    watchIndex: 0,
    alertId: '#89850',
    caseType: 'Off-site check-in',
    tierLabel: 'ALERT 1 (0.5 mi)',
    distanceMi: 0.52,
    thresholdMi: 0.5,
    status: 'Completed',
    notified: 'Technician',
    detectedAt: addMinutes(DEMO_NOW, -7),
    calledAt: addMinutes(DEMO_NOW, -5),
    checkoutAt: addMinutes(DEMO_NOW, -2),
  },
  {
    watchIndex: 2,
    alertId: '#89847',
    caseType: 'Left site',
    tierLabel: 'ALERT 2 (1 mi)',
    distanceMi: 1.12,
    thresholdMi: 1.0,
    status: 'Pending call',
    notified: '—',
    detectedAt: addMinutes(DEMO_NOW, -18),
  },
  {
    watchIndex: 3,
    alertId: '#89844',
    caseType: 'Off-site check-in',
    tierLabel: 'ALERT 1 (0.5 mi)',
    distanceMi: 0.61,
    thresholdMi: 0.5,
    status: 'Completed',
    notified: 'Technician',
    detectedAt: addMinutes(DEMO_NOW, -42),
    calledAt: addMinutes(DEMO_NOW, -38),
    checkoutAt: addMinutes(DEMO_NOW, -30),
  },
  {
    watchIndex: 5,
    alertId: '#89841',
    caseType: 'Left site',
    tierLabel: 'ALERT 3 (2 mi)',
    distanceMi: 2.18,
    thresholdMi: 2.0,
    status: 'No answer',
    notified: 'Technician',
    detectedAt: addMinutes(DEMO_NOW, -55),
    calledAt: addMinutes(DEMO_NOW, -50),
  },
  {
    watchIndex: 7,
    alertId: '#89838',
    caseType: 'Off-site check-in',
    tierLabel: 'ALERT 2 (1 mi)',
    distanceMi: 1.05,
    thresholdMi: 1.0,
    status: 'Pending call',
    notified: '—',
    detectedAt: addMinutes(DEMO_NOW, -12),
  },
  {
    watchIndex: 9,
    alertId: '#89835',
    caseType: 'Left site',
    tierLabel: 'ALERT 1 (0.5 mi)',
    distanceMi: 0.74,
    thresholdMi: 0.5,
    status: 'Completed',
    notified: 'Technician',
    detectedAt: addMinutes(DEMO_NOW, -95),
    calledAt: addMinutes(DEMO_NOW, -90),
    checkoutAt: addMinutes(DEMO_NOW, -80),
  },
  {
    watchIndex: 11,
    alertId: '#89832',
    caseType: 'Off-site check-in',
    tierLabel: 'ALERT 3 (2 mi)',
    distanceMi: 2.41,
    thresholdMi: 2.0,
    status: 'Failed',
    notified: 'Technician',
    detectedAt: addMinutes(DEMO_NOW, -110),
    calledAt: addMinutes(DEMO_NOW, -100),
  },
]

export const checkoutAlerts: CheckoutAlert[] = ALERT_SPECS.map((spec) => {
  const watch = checkoutWatches[spec.watchIndex]
  if (!watch) {
    throw new Error(`checkoutAlerts: missing watch at index ${spec.watchIndex}`)
  }
  const { watchIndex: _i, ...rest } = spec
  return {
    ...rest,
    watchId: watch.watchId,
    assetId: watch.assetId,
    woId: watch.woId,
  }
})

/** Exhaustive list used by Idle Alerts filter chips */
export const IDLE_ALERT_CALL_STATUSES: IdleAlertCallStatus[] = [
  'Pending call',
  'Completed',
  'No answer',
  'Busy',
  'Failed',
  'Canceled',
  'Legacy notified',
  'No phone',
]
