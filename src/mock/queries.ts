import {
  assets,
  workOrders,
  trips,
  punches,
  telemetry,
  dayEvidence,
  checkoutWatches,
  geofences,
  idleAlerts,
  checkoutAlerts,
} from './seed'
import { DEMO_NOW } from './constants'
import { haversineMi, toEastDate } from './helpers'
import type {
  Asset,
  Trade,
  WorkOrder,
  Trip,
  Telemetry,
  DayEvidence,
  CheckoutWatch,
  Geofence,
  CheckoutAlert,
  CheckoutAlertStatus,
  IdleAlert,
  IdleAlertCallStatus,
} from './types'

export type OvertimeMetric = 'max' | 'min' | 'homeToHome'

export interface OpenWorkOrderRow extends WorkOrder {
  typeLabel: string
}

export interface IdleTechnicianRow extends Asset {
  lat: number
  lng: number
  idleMinutes: number
  lastPingAt: string
  minutesAgo: number
}

export interface TodaysScheduleRow extends Trip {
  techName: string
  trade: Trade
  site: string
  client: string
  statusLabel: string
}

export interface MissedCheckoutRow extends CheckoutWatch {
  techName: string
  site: string
  client: string
  minutesSinceCheckIn: number
}

export interface CheckoutAlertRow extends CheckoutAlert {
  site: string
  address: string
}

export interface OvertimeDayCell {
  date: string
  hours: number
  isAdjusted: boolean
  dayLabel: string
}

export interface OvertimeWeekRow {
  assetId: string
  techName: string
  trade: Trade
  metricValue: number
  totalHours: number
  regularHours: number
  overtimeHours: number
  homeToHomeHours: number
  totalDays: number
  hoursPerDay: number
  days: OvertimeDayCell[]
}

export interface DayAnalysisMapMarker {
  id: string
  kind: 'truck' | 'wo'
  lat: number
  lng: number
  label: string
}

export interface DayAnalysisResult extends DayEvidence {
  assetId: string
  techName: string
  trade: Trade
  date: string
  address: string
  shiftStart: string
  shiftEnd: string
  jobsDone: number
  jobsScheduled: number
  evidencePointCount: number
  mapMarkers: DayAnalysisMapMarker[]
}

export interface FleetTelemetryRow extends Telemetry {
  techName: string
  trade: Trade
  active: boolean
}

export function getOpenWorkOrders(): OpenWorkOrderRow[] {
  return workOrders
    .filter((wo) => wo.status === 'open')
    .map((wo) => ({
      ...wo,
      typeLabel: wo.type,
    }))
}

export function getWorkOrder(woId: string): WorkOrder | undefined {
  return workOrders.find((wo) => wo.woId === woId)
}

export function getTripForWorkOrder(woId: string, date?: string): Trip | undefined {
  const day = date ?? toEastDate(DEMO_NOW)
  const onDay = trips.filter(
    (t) => t.woId === woId && toEastDate(t.scheduledStart) === day,
  )
  if (onDay.length > 0) return onDay[0]
  return trips.find((t) => t.woId === woId)
}

/** Trips for an asset on a given service date — WO ID + site only (no person names). */
export function getTripsForAsset(
  assetId: string,
  date?: string,
): Array<Trip & { site: string }> {
  const day = date ?? toEastDate(DEMO_NOW)
  const woMap = new Map(workOrders.map((wo) => [wo.woId, wo]))
  return trips
    .filter((t) => t.assetId === assetId && toEastDate(t.scheduledStart) === day)
    .sort((a, b) => a.scheduledStart.localeCompare(b.scheduledStart))
    .map((t) => ({
      ...t,
      site: woMap.get(t.woId)?.site ?? t.woId,
    }))
}

export function getAsset(assetId: string): Asset | undefined {
  return assets.find((a) => a.assetId === assetId)
}

export function getIdleTechnicians(): IdleTechnicianRow[] {
  const assetMap = new Map(assets.map((a) => [a.assetId, a]))
  return telemetry
    .filter((t) => {
      const asset = assetMap.get(t.assetId)
      return asset?.active && (t.gpsStatus === 'idling' || t.idleMinutes > 30)
    })
    .map((t) => {
      const asset = assetMap.get(t.assetId)!
      const now = new Date(DEMO_NOW).getTime()
      const ping = new Date(t.lastPingAt).getTime()
      return {
        ...asset,
        lat: t.lat,
        lng: t.lng,
        idleMinutes: t.idleMinutes,
        lastPingAt: t.lastPingAt,
        minutesAgo: Math.max(0, Math.round((now - ping) / 60000)),
      }
    })
}

export function getTodaysSchedule(date?: string): TodaysScheduleRow[] {
  const day = date ?? toEastDate(DEMO_NOW)
  const assetMap = new Map(assets.map((a) => [a.assetId, a]))
  const woMap = new Map(workOrders.map((wo) => [wo.woId, wo]))

  return trips
    .filter((t) => toEastDate(t.scheduledStart) === day)
    .map((t) => {
      const asset = assetMap.get(t.assetId)!
      const wo = woMap.get(t.woId)!
      let statusLabel = 'Scheduled'
      if (t.checkOutAt) statusLabel = 'Completed'
      else if (t.checkInAt) statusLabel = 'In progress'

      return {
        ...t,
        techName: asset.techName,
        trade: asset.trade,
        site: wo.site,
        client: wo.client,
        statusLabel,
      }
    })
}

/** Alias for dated schedule lookups used by Daily Dispatch. */
export function getScheduleForDate(date: string): TodaysScheduleRow[] {
  return getTodaysSchedule(date)
}

export function getMissedCheckouts(): MissedCheckoutRow[] {
  const assetMap = new Map(assets.map((a) => [a.assetId, a]))
  const woMap = new Map(workOrders.map((wo) => [wo.woId, wo]))
  const now = new Date(DEMO_NOW).getTime()

  return checkoutWatches
    .filter((w) => w.status === 'issues' || w.status === 'stale gps')
    .map((w) => {
      const asset = assetMap.get(w.assetId)!
      const wo = woMap.get(w.woId)!
      const checkIn = new Date(w.checkInAt).getTime()
      return {
        ...w,
        techName: asset.techName,
        site: wo.site,
        client: wo.client,
        minutesSinceCheckIn: Math.max(0, Math.round((now - checkIn) / 60000)),
      }
    })
}

export function getOvertimeWeek(
  range: readonly string[],
  tradeFilter?: Trade | 'all',
  metric: OvertimeMetric = 'homeToHome',
): OvertimeWeekRow[] {
  const filteredAssets =
    tradeFilter && tradeFilter !== 'all'
      ? assets.filter((a) => a.active && a.trade === tradeFilter)
      : assets.filter((a) => a.active)

  const rows = filteredAssets.map((asset) => {
    const assetPunches = punches.filter(
      (p) => p.assetId === asset.assetId && range.includes(p.date),
    )
    const regularHours = assetPunches.reduce((sum, p) => sum + p.regularHours, 0)
    const overtimeHours = assetPunches.reduce((sum, p) => sum + p.overtimeHours, 0)

    const days = range.map((date) => {
      const p = assetPunches.find((x) => x.date === date)
      const dayLabel = new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short' })
      if (!p) {
        return { date, hours: 0, isAdjusted: false, dayLabel }
      }

      // Minimum: sum of on-site punch hours (regular + OT paid)
      const minHours = p.regularHours + p.overtimeHours
      // Maximum: earliest site check-in → latest site check-out
      const maxHours =
        (new Date(p.clockOut).getTime() - new Date(p.clockIn).getTime()) / 3600000
      // Home-to-Home: night-aware garage-to-garage span
      const homeToHomeDayHours =
        (new Date(p.returnToGarageAt).getTime() - new Date(p.departFromGarageAt).getTime()) /
        3600000

      let hours = homeToHomeDayHours
      if (metric === 'min') hours = minHours
      else if (metric === 'max') hours = maxHours

      const isAdjusted = Math.abs(maxHours - minHours) > 0.01

      return {
        date,
        hours: Math.round(hours * 100) / 100,
        isAdjusted,
        dayLabel,
      }
    })

    const totalDays = days.filter((d) => d.hours > 0).length
    const totalHours = days.reduce((sum, d) => sum + d.hours, 0)
    const hoursPerDay = totalDays > 0 ? totalHours / totalDays : 0

    const homeToHomeHours = assetPunches.reduce(
      (sum, p) =>
        sum +
        (new Date(p.returnToGarageAt).getTime() - new Date(p.departFromGarageAt).getTime()) /
          3600000,
      0,
    )

    return {
      assetId: asset.assetId,
      techName: asset.techName,
      trade: asset.trade,
      metricValue: Math.round(totalHours * 100) / 100,
      totalHours: Math.round(totalHours * 100) / 100,
      regularHours: Math.round(regularHours * 100) / 100,
      overtimeHours: Math.round(overtimeHours * 100) / 100,
      homeToHomeHours: Math.round(homeToHomeHours * 100) / 100,
      totalDays,
      hoursPerDay: Math.round(hoursPerDay * 100) / 100,
      days,
    }
  })

  return rows.sort((a, b) => b.totalHours - a.totalHours)
}

export function getDayAnalysis(assetId: string, date: string): DayAnalysisResult | undefined {
  const evidence = dayEvidence.find((e) => e.assetId === assetId && e.date === date)
  if (!evidence) return undefined

  const asset = assets.find((a) => a.assetId === assetId)
  if (!asset) return undefined

  const punch = punches.find((p) => p.assetId === assetId && p.date === date)
  const tel = telemetry.find((t) => t.assetId === assetId)
  const dayTrips = trips.filter(
    (t) => t.assetId === assetId && t.scheduledStart.startsWith(date),
  )
  const jobsDone = dayTrips.filter((t) => t.checkInAt && t.checkOutAt).length
  const jobsScheduled = dayTrips.length

  const mapMarkers: DayAnalysisMapMarker[] = []
  const seenWo = new Set<string>()
  for (const trip of dayTrips) {
    if (seenWo.has(trip.woId)) continue
    seenWo.add(trip.woId)
    const woIndex = workOrders.findIndex((w) => w.woId === trip.woId)
    if (woIndex < 0) continue
    const center = geofences.find((g) => g.woId === trip.woId)?.center
    const pingFallback = evidence.gpsPings[0]
    mapMarkers.push({
      id: `wo-${trip.woId}`,
      kind: 'wo',
      lat: center?.lat ?? pingFallback?.lat ?? 40.7128,
      lng: center?.lng ?? pingFallback?.lng ?? -74.006,
      label: trip.woId,
    })
  }

  const lastPing = evidence.gpsPings[evidence.gpsPings.length - 1]
  mapMarkers.push({
    id: `truck-${assetId}`,
    kind: 'truck',
    lat: tel?.lat ?? lastPing?.lat ?? 40.7282,
    lng: tel?.lng ?? lastPing?.lng ?? -73.7949,
    label: asset.techName,
  })

  return {
    ...evidence,
    assetId: asset.assetId,
    techName: asset.techName,
    trade: asset.trade,
    date: evidence.date,
    address: tel?.address ?? 'BrightStar Depot, Queens, NY',
    shiftStart: punch?.departFromGarageAt ?? punch?.clockIn ?? evidence.timeline[0]?.at ?? '',
    shiftEnd: punch?.returnToGarageAt ?? punch?.clockOut ?? evidence.timeline[evidence.timeline.length - 1]?.at ?? '',
    jobsDone,
    jobsScheduled,
    evidencePointCount: evidence.supportingEvidence.length,
    mapMarkers,
  }
}

export function getAssetsWithDayEvidence(date: string): string[] {
  return dayEvidence.filter((e) => e.date === date).map((e) => e.assetId)
}

export function getCheckoutWatches(filter?: { status?: string; assetId?: string }): CheckoutWatch[] {
  if (!filter) return checkoutWatches
  return checkoutWatches.filter((w) => {
    if (filter.status && w.status !== filter.status) return false
    if (filter.assetId && w.assetId !== filter.assetId) return false
    return true
  })
}

export function getFleetTelemetry(filter?: { active?: boolean; status?: string }): FleetTelemetryRow[] {
  const assetMap = new Map(assets.map((a) => [a.assetId, a]))

  return telemetry
    .filter((t) => {
      const asset = assetMap.get(t.assetId)
      if (filter?.active !== undefined && asset?.active !== filter.active) return false
      if (filter?.status && t.gpsStatus !== filter.status) return false
      return true
    })
    .map((t) => ({
      ...t,
      techName: assetMap.get(t.assetId)?.techName ?? '',
      trade: assetMap.get(t.assetId)?.trade ?? 'Sprinkler',
      active: assetMap.get(t.assetId)?.active ?? false,
    }))
}

/** UI crew chips → mock trade (same mapping as dispatch store). */
export type NearbyCrewFilter = 'all' | 'Maintenance' | 'Nassau' | 'FP'

const NEARBY_CREW_TO_TRADE: Record<Exclude<NearbyCrewFilter, 'all'>, Trade> = {
  Maintenance: 'Sprinkler',
  Nassau: 'Inspector',
  FP: 'Fire Alarm',
}

export type NearbyTechnician = {
  assetId: string
  distanceMi: number
  lat: number
  lng: number
  tripsToday: number
  currentLocation: string
  lastPingAt: string
}

/**
 * Nearest active techs to (lat,lng) by Haversine miles.
 * Pure / deterministic — no network. Caps at 24 for Matrix API coordinate limits.
 */
export function getNearbyTechnicians(
  lat: number,
  lng: number,
  crewFilter: NearbyCrewFilter = 'all',
): NearbyTechnician[] {
  const trade =
    crewFilter === 'all' ? null : NEARBY_CREW_TO_TRADE[crewFilter]
  const day = toEastDate(DEMO_NOW)

  const rows = getFleetTelemetry({ active: true })
    .filter((t) => (trade ? t.trade === trade : true))
    .map((t) => {
      const tripsToday = getTripsForAsset(t.assetId, day).length
      return {
        assetId: t.assetId,
        distanceMi: haversineMi(lat, lng, t.lat, t.lng),
        lat: t.lat,
        lng: t.lng,
        tripsToday,
        currentLocation: t.address || 'Unknown location',
        lastPingAt: t.lastPingAt,
      }
    })
    .sort((a, b) => a.distanceMi - b.distanceMi || a.assetId.localeCompare(b.assetId))

  return rows.slice(0, 24)
}

export function getWorkOrderGeofence(woId: string): Geofence | undefined {
  return geofences.find((g) => g.woId === woId)
}

export function getIdleAlerts(filter?: {
  status?: IdleAlertCallStatus | string
  date?: string
}): IdleAlert[] {
  const day = filter?.date
  return idleAlerts.filter((a) => {
    if (filter?.status && a.callStatus !== filter.status) return false
    if (day && toEastDate(a.idleDetectedAt) !== day) return false
    return true
  })
}

export function getIdleAlertStatusCounts(date?: string): Record<'all' | IdleAlertCallStatus, number> {
  const rows = getIdleAlerts(date ? { date } : undefined)
  const counts: Record<'all' | IdleAlertCallStatus, number> = {
    all: rows.length,
    'Pending call': 0,
    Completed: 0,
    'No answer': 0,
    Busy: 0,
    Failed: 0,
    Canceled: 0,
    'Legacy notified': 0,
    'No phone': 0,
  }
  for (const row of rows) {
    counts[row.callStatus] += 1
  }
  return counts
}

/** Live telemetry buckets for Idle Monitoring filter chips. */
export function getIdleMonitorCounts(activeOnly = true) {
  const rows = getFleetTelemetry(activeOnly ? { active: true } : undefined)
  const atThreshold = rows.filter((r) => r.gpsStatus === 'idling' && r.idleMinutes >= 8).length
  const idlingUnder = rows.filter(
    (r) => r.gpsStatus === 'idling' && r.idleMinutes > 0 && r.idleMinutes < 8,
  ).length
  const parked = rows.filter((r) => r.gpsStatus === 'parked').length
  const stale = rows.filter((r) => r.gpsStatus === 'stale').length
  const issues = rows.filter(
    (r) => r.gpsStatus === 'stale' || (r.gpsStatus === 'idling' && r.idleMinutes >= 8),
  ).length
  return {
    all: rows.length,
    atThreshold,
    idlingUnder,
    parked,
    stale,
    issues,
  }
}

export function getCheckoutAlerts(filter?: {
  status?: string
  date?: string
}): CheckoutAlertRow[] {
  const woMap = new Map(workOrders.map((wo) => [wo.woId, wo]))
  const day = filter?.date

  return checkoutAlerts
    .filter((a) => {
      if (filter?.status && a.status !== filter.status) return false
      if (day && toEastDate(a.detectedAt) !== day) return false
      return true
    })
    .map((a) => {
      const wo = woMap.get(a.woId)
      return {
        ...a,
        site: wo?.site ?? a.woId,
        address: wo?.address ?? '',
      }
    })
}

export function getCheckoutAlertStatusCounts(date?: string): Record<
  'all' | CheckoutAlertStatus,
  number
> {
  const rows = getCheckoutAlerts(date ? { date } : undefined)
  const counts = {
    all: rows.length,
    'Pending call': 0,
    Completed: 0,
    'No answer': 0,
    Failed: 0,
  } satisfies Record<'all' | CheckoutAlertStatus, number>
  for (const row of rows) {
    counts[row.status] += 1
  }
  return counts
}
