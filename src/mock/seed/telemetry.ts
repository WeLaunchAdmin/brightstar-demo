import { assets } from './assets'
import { trips } from './trips'
import { workOrders } from './workOrders'
import { DEMO_NOW } from '../constants'
import { addMinutes, minutesBetween, randomInt, pickWeighted, getSiteCoordinate, jitterCoordinate } from '../helpers'
import type { Telemetry, GpsStatus } from '../types'

const activeAssets = assets.filter((a) => a.active)
const DEPOT_COORD = { lat: 40.7282, lng: -73.7949 }

function findTodayTrip(assetId: string) {
  return trips.find((t) => t.assetId === assetId && t.scheduledStart.startsWith('2026-07-21'))
}

function findWorkOrder(woId: string) {
  return workOrders.find((wo) => wo.woId === woId)
}

export const telemetry: Telemetry[] = activeAssets.map((asset) => {
  const todayTrip = findTodayTrip(asset.assetId)
  let lat = DEPOT_COORD.lat
  let lng = DEPOT_COORD.lng
  let address = 'BrightStar Depot, Queens, NY'
  let speed = 0
  let engineOn = false
  let idleMinutes = 0
  let lastPingAt = addMinutes(DEMO_NOW, -randomInt(5, 60))
  let gpsStatus: GpsStatus = 'parked'

  if (todayTrip) {
    const wo = findWorkOrder(todayTrip.woId)
    const woIndex = workOrders.findIndex((w) => w.woId === todayTrip.woId)
    const siteCoord = woIndex >= 0 ? getSiteCoordinate(woIndex) : DEPOT_COORD

    if (todayTrip.checkOutAt) {
      // Completed trip today: back toward depot or next job
      const jittered = jitterCoordinate(DEPOT_COORD.lat, DEPOT_COORD.lng, 0.5)
      lat = jittered.lat
      lng = jittered.lng
      address = 'En route to depot'
      speed = randomInt(15, 45)
      engineOn = true
      idleMinutes = 0
      lastPingAt = new Date(
        Math.min(
          new Date(todayTrip.checkOutAt).getTime() + randomInt(5, 30) * 60000,
          new Date(DEMO_NOW).getTime(),
        ),
      ).toISOString()
      gpsStatus = 'moving'
    } else if (todayTrip.checkInAt) {
      // In progress
      const jittered = jitterCoordinate(siteCoord.lat, siteCoord.lng, 0.15)
      lat = jittered.lat
      lng = jittered.lng
      address = wo?.address ?? 'On site'
      speed = 0
      engineOn = true
      idleMinutes = Math.min(120, minutesBetween(todayTrip.checkInAt, DEMO_NOW))
      lastPingAt = addMinutes(DEMO_NOW, -randomInt(0, 10))
      gpsStatus = idleMinutes > 30 ? 'idling' : 'parked'
    } else {
      // Scheduled, not yet started
      const jittered = jitterCoordinate(DEPOT_COORD.lat, DEPOT_COORD.lng, 0.5)
      lat = jittered.lat
      lng = jittered.lng
      address = 'BrightStar Depot, Queens, NY'
      speed = 0
      engineOn = false
      idleMinutes = 0
      lastPingAt = addMinutes(DEMO_NOW, -randomInt(10, 60))
      gpsStatus = 'parked'
    }
  } else {
    const jittered = jitterCoordinate(DEPOT_COORD.lat, DEPOT_COORD.lng, 0.8)
    lat = jittered.lat
    lng = jittered.lng
    lastPingAt = addMinutes(DEMO_NOW, -randomInt(30, 120))
    gpsStatus = pickWeighted(['parked', 'stale'] as GpsStatus[], [0.7, 0.3])
  }

  return {
    assetId: asset.assetId,
    lat,
    lng,
    speed,
    engineOn,
    idleMinutes,
    address,
    lastPingAt,
    gpsStatus,
  }
})

// Deterministic post-pass for Idle Monitoring filter chips (no RNG — does not shift seed stream)
{
  const idlers = telemetry.filter((t) => t.gpsStatus === 'idling')
  for (const t of idlers.slice(0, 2)) {
    t.idleMinutes = 4
  }
  const parkers = telemetry.filter((t) => t.gpsStatus === 'parked')
  for (const t of parkers.slice(0, 3)) {
    t.gpsStatus = 'stale'
    t.engineOn = false
    t.speed = 0
    t.idleMinutes = 0
  }
}
