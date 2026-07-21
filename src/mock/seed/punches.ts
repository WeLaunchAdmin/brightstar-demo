import { assets } from './assets'
import { addHours, addMinutes, pickWeighted } from '../helpers'
import { rng } from '../constants'
import type { Punch } from '../types'

const WEEK_DAYS = [
  '2026-07-20',
  '2026-07-21',
  '2026-07-22',
  '2026-07-23',
  '2026-07-24',
  '2026-07-25',
  '2026-07-26',
]

const activeAssets = assets.filter((a) => a.active)

/** Deterministic travel minutes without consuming the shared RNG stream. */
function travelMinutes(assetId: string, date: string, salt: number): number {
  let h = salt >>> 0
  const key = `${assetId}|${date}`
  for (let i = 0; i < key.length; i++) {
    h = (Math.imul(h, 31) + key.charCodeAt(i)) >>> 0
  }
  return 15 + (h % 46) // 15–60 minutes
}

export const punches: Punch[] = activeAssets.flatMap((asset) =>
  WEEK_DAYS.map((date) => {
    const dayOffset = new Date(date).getUTCDate() - 20
    const clockIn = `${date}T0${6 + (dayOffset % 3)}:00:00-04:00`
    const paidHours = pickWeighted([8, 9, 10, 11, 12], [0.45, 0.25, 0.15, 0.1, 0.05])
    const regularHours = Math.min(8, paidHours)
    const overtimeHours = paidHours - regularHours

    // Max span: earliest site check-in → latest site check-out (may exceed paid / clamped hours)
    const siteBufferHours = rng() > 0.7 ? rng() * 2 : 0
    const siteSpanHours = paidHours + siteBufferHours
    const clockOut = addHours(clockIn, siteSpanHours)

    // Home-to-home bookends: travel from/to garage beyond the site window.
    const morningTravelMin = travelMinutes(asset.assetId, date, 17)
    const eveningTravelMin = travelMinutes(asset.assetId, date, 41)
    const departFromGarageAt = addMinutes(clockIn, -morningTravelMin)
    const returnToGarageAt = addMinutes(clockOut, eveningTravelMin)

    return {
      punchId: `punch-${asset.assetId}-${date}`,
      assetId: asset.assetId,
      date,
      clockIn,
      clockOut,
      departFromGarageAt,
      returnToGarageAt,
      regularHours,
      overtimeHours,
    }
  }),
)
