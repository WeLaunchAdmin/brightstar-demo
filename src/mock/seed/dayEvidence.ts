import { assets } from './assets'
import { trips } from './trips'
import { workOrders } from './workOrders'
import { punches } from './punches'
import {
  addMinutes,
  haversineMi,
  hoursBetween,
  randomInt,
  pickWeighted,
  getSiteCoordinate,
  jitterCoordinate,
} from '../helpers'
import type { DayEvidence, EvidenceEvent, GpsPing } from '../types'

const activeAssets = assets.filter((a) => a.active)
const selectedAssets = activeAssets.slice(0, 6)

function completedTripsForDate(assetId: string, date: string) {
  return trips.filter(
    (t) => t.assetId === assetId && t.checkInAt && t.checkOutAt && t.scheduledStart.startsWith(date),
  )
}

function scheduledTripsForDate(assetId: string, date: string) {
  return trips.filter((t) => t.assetId === assetId && t.scheduledStart.startsWith(date))
}

function findPunch(assetId: string, date: string) {
  return punches.find((p) => p.assetId === assetId && p.date === date)
}

export const dayEvidence: DayEvidence[] = selectedAssets.map((asset) => {
  const date = '2026-07-21'
  const completed = completedTripsForDate(asset.assetId, date)
  const scheduled = scheduledTripsForDate(asset.assetId, date)
  const onSiteMinutes = completed.reduce((sum, t) => sum + t.onSiteMinutes, 0)
  const punch = findPunch(asset.assetId, date)
  const totalHours = punch ? hoursBetween(punch.clockIn, punch.clockOut) : 0

  const timeline: EvidenceEvent[] = []
  const gpsPings: GpsPing[] = []
  let totalDistanceMi = 0
  let prevLat = 40.7282
  let prevLng = -73.7949

  const shiftStart = punch?.departFromGarageAt ?? punch?.clockIn ?? `${date}T06:00:00-04:00`
  timeline.push({
    at: shiftStart,
    label: 'Shift started',
    kind: 'shift-started',
    site: 'BrightStar Depot',
    address: 'BrightStar Depot, Queens, NY',
    tags: ['GPS'],
  })
  gpsPings.push({ at: shiftStart, lat: prevLat, lng: prevLng })

  for (const trip of scheduled) {
    const wo = workOrders.find((w) => w.woId === trip.woId)
    const woIndex = workOrders.findIndex((w) => w.woId === trip.woId)
    const siteCoord = woIndex >= 0 ? getSiteCoordinate(woIndex) : { lat: 40.7282, lng: -73.7949 }
    const sitePing = jitterCoordinate(siteCoord.lat, siteCoord.lng, 0.08)

    timeline.push({
      at: trip.scheduledStart,
      label: 'Scheduled',
      kind: 'scheduled',
      woId: trip.woId,
      site: wo?.site,
      address: wo?.address,
      tags: ['OT SCHEDULED'],
    })

    if (trip.checkInAt) {
      const driveStart = addMinutes(trip.checkInAt, -randomInt(12, 35))
      timeline.push({
        at: driveStart,
        label: `Depart for ${wo?.site ?? 'site'}`,
        kind: 'depart',
        woId: trip.woId,
        site: wo?.site,
        address: wo?.address,
        tags: ['GPS'],
      })
      gpsPings.push({ at: driveStart, lat: sitePing.lat, lng: sitePing.lng })
      totalDistanceMi += haversineMi(prevLat, prevLng, sitePing.lat, sitePing.lng)
      prevLat = sitePing.lat
      prevLng = sitePing.lng

      timeline.push({
        at: trip.checkInAt,
        label: 'Check in',
        kind: 'check-in',
        woId: trip.woId,
        site: wo?.site,
        address: wo?.address,
        tags: ['BrightStar Field'],
      })
      gpsPings.push({ at: trip.checkInAt, lat: sitePing.lat, lng: sitePing.lng })
    }

    if (trip.checkOutAt) {
      timeline.push({
        at: trip.checkOutAt,
        label: 'Check out',
        kind: 'check-out',
        woId: trip.woId,
        site: wo?.site,
        address: wo?.address,
        tags: ['OT CHECK-OUT'],
      })
      gpsPings.push({ at: trip.checkOutAt, lat: sitePing.lat, lng: sitePing.lng })
    }
  }

  timeline.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())

  const movingMin = Math.max(1, Math.round((totalDistanceMi / 30) * 60))
  const supportingEvidence = completed.map(
    (t) => `Trip ${t.tripId} on ${t.woId}: ${t.onSiteMinutes} min on site`,
  )
  if (punch) {
    supportingEvidence.push(
      `Punch window ${punch.clockIn} → ${punch.clockOut}: ${punch.regularHours.toFixed(1)} regular + ${punch.overtimeHours.toFixed(1)} OT hours`,
    )
    supportingEvidence.push(
      `Garage span ${punch.departFromGarageAt} → ${punch.returnToGarageAt}`,
    )
  }
  supportingEvidence.push(`${gpsPings.length} Fleet GPS pings · ${totalDistanceMi.toFixed(1)} mi moving`)

  const verdict = pickWeighted(
    ['CLEAN', 'INCONCLUSIVE', 'OT MIXED'] as const,
    [0.35, 0.3, 0.35],
  )

  const summary =
    verdict === 'CLEAN'
      ? `Evidence Analyst review: ${asset.techName} records line up for ${date}. ${onSiteMinutes} min on site across ${completed.length} completed trips with matching Fleet GPS.`
      : verdict === 'OT MIXED'
        ? `Evidence Analyst review: ${asset.techName} shows ${onSiteMinutes} min on site in BrightStar Field, but punch records suggest ${totalHours.toFixed(1)} h total. Overtime pattern is mixed — verify garage travel vs site punches.`
        : `Evidence Analyst review: ${asset.techName} data has gaps for ${date}. On-site minutes and GPS pings are insufficient for a clear finding.`

  return {
    evidenceId: `evidence-${asset.assetId}-${date}`,
    assetId: asset.assetId,
    date,
    techName: asset.techName,
    timeline,
    gpsPings,
    distanceMi: Math.round(totalDistanceMi * 10) / 10,
    movingMin,
    onSiteMinutes,
    supportingEvidence,
    verdict,
    summary,
  }
})
