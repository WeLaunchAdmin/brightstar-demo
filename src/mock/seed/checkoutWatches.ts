import { trips } from './trips'
import { workOrders } from './workOrders'
import { telemetry } from './telemetry'
import { getSiteCoordinate, pickWeighted } from '../helpers'
import type { CheckoutWatch, CheckoutStatus } from '../types'

const inProgressToday = trips.filter(
  (t) => t.scheduledStart.startsWith('2026-07-21') && t.checkInAt && !t.checkOutAt,
)

const telemetryByAsset = new Map(telemetry.map((t) => [t.assetId, t]))

export const checkoutWatches: CheckoutWatch[] = inProgressToday.map((trip, index) => {
  const woIndex = workOrders.findIndex((w) => w.woId === trip.woId)
  const siteCoord = woIndex >= 0 ? getSiteCoordinate(woIndex) : { lat: 40.7282, lng: -73.7949 }
  const tel = telemetryByAsset.get(trip.assetId)

  const status = pickWeighted(
    ['on site', 'en route', 'issues', 'stale gps'] as CheckoutStatus[],
    [0.65, 0.15, 0.1, 0.1],
  )

  return {
    watchId: `watch-${String(index + 1).padStart(3, '0')}`,
    woId: trip.woId,
    assetId: trip.assetId,
    checkInAt: trip.checkInAt!,
    // Slight deterministic offset so check-in ≠ WO center on the map
    checkInLoc: {
      lat: Math.round((siteCoord.lat + 0.0014 * (((index * 3) % 5) - 2)) * 10000) / 10000,
      lng: Math.round((siteCoord.lng + 0.0016 * (((index * 5) % 5) - 2)) * 10000) / 10000,
    },
    lastKnownLoc: { lat: tel?.lat ?? siteCoord.lat, lng: tel?.lng ?? siteCoord.lng },
    geofenceMiles: 0.5,
    status,
  }
})
