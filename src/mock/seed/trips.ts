import { assets } from './assets'
import { workOrders } from './workOrders'
import { DEMO_NOW } from '../constants'
import { addMinutes, minutesBetween, randomInt, pick } from '../helpers'
import type { Trip } from '../types'

export const trips: Trip[] = []

const activeAssets = assets.filter((a) => a.active)

const inProgressAssets = activeAssets.slice(0, 24)
const completedAssets = activeAssets.slice(24, 30)
const scheduledAssets = activeAssets.slice(30, 35)

const todayInProgressStarts = ['2026-07-21T04:00:00-04:00', '2026-07-21T05:00:00-04:00', '2026-07-21T06:00:00-04:00']
const todayCompletedStarts = ['2026-07-21T03:00:00-04:00', '2026-07-21T04:00:00-04:00']
const yesterdayStarts = ['2026-07-20T06:00:00-04:00', '2026-07-20T07:00:00-04:00', '2026-07-20T08:00:00-04:00']

function nextTripId(index: number) {
  return `trip-${String(index + 1).padStart(4, '0')}`
}

let tripCounter = 0

function assignWo(): string {
  return pick(workOrders).woId
}

// Early completed trips for Day Analysis evidence assets (first 6).
// Deterministic — no RNG — so the shared stream stays stable for later seed files.
for (let i = 0; i < 6; i++) {
  const asset = activeAssets[i]
  const wo = workOrders[i % workOrders.length]
  const checkIn = `2026-07-21T0${3 + (i % 2)}:${String(5 + i * 7).padStart(2, '0')}:00-04:00`
  const onSite = 75 + i * 18
  const checkOut = addMinutes(checkIn, onSite)
  const safeCheckOut = new Date(
    Math.min(new Date(checkOut).getTime(), new Date(DEMO_NOW).getTime() - 30 * 60000),
  ).toISOString()
  const scheduledStart = addMinutes(checkIn, -10)
  trips.push({
    tripId: nextTripId(tripCounter++),
    woId: wo.woId,
    assetId: asset.assetId,
    scheduledStart,
    scheduledEnd: addMinutes(scheduledStart, 180),
    checkInAt: checkIn,
    checkOutAt: safeCheckOut,
    onSiteMinutes: minutesBetween(checkIn, safeCheckOut),
  })
}

// Yesterday trips: completed
for (const asset of activeAssets) {
  if (randomInt(0, 100) > 40) continue
  const start = addMinutes(pick(yesterdayStarts), randomInt(0, 60))
  const checkIn = addMinutes(start, randomInt(-5, 10))
  const checkOut = addMinutes(checkIn, randomInt(60, 300))
  trips.push({
    tripId: nextTripId(tripCounter++),
    woId: assignWo(),
    assetId: asset.assetId,
    scheduledStart: start,
    scheduledEnd: addMinutes(start, 180),
    checkInAt: checkIn,
    checkOutAt: checkOut,
    onSiteMinutes: minutesBetween(checkIn, checkOut),
  })
}

// Today in-progress trips
for (const asset of inProgressAssets) {
  const start = addMinutes(pick(todayInProgressStarts), randomInt(0, 60))
  const checkIn = addMinutes(start, randomInt(-5, 10))
  const safeCheckIn = new Date(Math.min(new Date(checkIn).getTime(), new Date(DEMO_NOW).getTime() - 5 * 60000)).toISOString()
  trips.push({
    tripId: nextTripId(tripCounter++),
    woId: assignWo(),
    assetId: asset.assetId,
    scheduledStart: start,
    scheduledEnd: addMinutes(start, 240),
    checkInAt: safeCheckIn,
    onSiteMinutes: minutesBetween(safeCheckIn, DEMO_NOW),
  })
}

// Today completed trips
for (const asset of completedAssets) {
  const start = addMinutes(pick(todayCompletedStarts), randomInt(0, 60))
  const checkIn = addMinutes(start, randomInt(-5, 10))
  const rawCheckOut = addMinutes(checkIn, randomInt(60, 240))
  const checkOut = new Date(Math.min(new Date(rawCheckOut).getTime(), new Date(DEMO_NOW).getTime())).toISOString()
  trips.push({
    tripId: nextTripId(tripCounter++),
    woId: assignWo(),
    assetId: asset.assetId,
    scheduledStart: start,
    scheduledEnd: addMinutes(start, 180),
    checkInAt: checkIn,
    checkOutAt: checkOut,
    onSiteMinutes: minutesBetween(checkIn, checkOut),
  })
}

// Today scheduled trips
for (const asset of scheduledAssets) {
  const start = addMinutes(DEMO_NOW, randomInt(30, 300))
  trips.push({
    tripId: nextTripId(tripCounter++),
    woId: assignWo(),
    assetId: asset.assetId,
    scheduledStart: start,
    scheduledEnd: addMinutes(start, 180),
    onSiteMinutes: 0,
  })
}

// Future scheduled trips
for (let d = 0; d < 5; d++) {
  const dayStart = `2026-07-${String(22 + d).padStart(2, '0')}T07:00:00-04:00`
  for (const asset of activeAssets) {
    if (randomInt(0, 100) > 60) continue
    const start = addMinutes(dayStart, randomInt(0, 120))
    trips.push({
      tripId: nextTripId(tripCounter++),
      woId: assignWo(),
      assetId: asset.assetId,
      scheduledStart: start,
      scheduledEnd: addMinutes(start, 180),
      onSiteMinutes: 0,
    })
  }
}
