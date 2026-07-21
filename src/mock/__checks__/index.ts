import { trips } from '../seed/trips'
import { assets } from '../seed/assets'
import { workOrders } from '../seed/workOrders'
import { checkoutWatches } from '../seed/checkoutWatches'
import { checkoutAlerts, idleAlerts } from '../seed/alerts'
import { telemetry } from '../seed/telemetry'
import { dayEvidence } from '../seed/dayEvidence'
import { getOvertimeWeek } from '../queries'
import { DEMO_NOW } from '../constants'
import { toEastDate } from '../helpers'
import fs from 'fs'
import path from 'path'

export interface CheckResult {
  id: number
  name: string
  ok: boolean
  detail: string
}

function loadBannedTerms(): string[] {
  const rulePath = path.resolve(process.cwd(), '.cursor/rules/branding.mdc')
  const content = fs.readFileSync(rulePath, 'utf-8')
  const terms: string[] = []
  const lines = content.split('\n')
  let inBannedSection = false
  for (const line of lines) {
    if (line.startsWith('BANNED')) {
      inBannedSection = true
      continue
    }
    if (inBannedSection) {
      if (line.trim().startsWith('-')) {
        const match = line.match(/- "([^"]+)"/)
        if (match) terms.push(match[1])
      } else if (line.trim() === '') {
        continue
      } else if (line.startsWith('NAMING') || line.startsWith('MAPS') || line.startsWith('SCOPE')) {
        break
      }
    }
  }
  return terms
}

export function runChecks(): CheckResult[] {
  const results: CheckResult[] = []

  // 1. Trip references resolve
  {
    const assetIds = new Set(assets.map((a) => a.assetId))
    const woIds = new Set(workOrders.map((wo) => wo.woId))
    let bad = 0
    const messages: string[] = []
    for (const trip of trips) {
      if (!assetIds.has(trip.assetId)) {
        bad++
        messages.push(`trip ${trip.tripId} has invalid assetId ${trip.assetId}`)
      }
      if (!woIds.has(trip.woId)) {
        bad++
        messages.push(`trip ${trip.tripId} has invalid woId ${trip.woId}`)
      }
    }
    results.push({
      id: 1,
      name: 'Trip.assetId and trip.woId resolve to real asset and workOrder',
      ok: bad === 0,
      detail: bad === 0 ? `All ${trips.length} trips resolve.` : `${bad} bad reference(s): ${messages.slice(0, 3).join('; ')}`,
    })
  }

  // 2. CheckoutWatch and telemetry rows point to real asset + real WO where applicable
  {
    const assetIds = new Set(assets.map((a) => a.assetId))
    const woIds = new Set(workOrders.map((wo) => wo.woId))
    let bad = 0
    for (const w of checkoutWatches) {
      if (!assetIds.has(w.assetId)) bad++
      if (!woIds.has(w.woId)) bad++
    }
    for (const t of telemetry) {
      if (!assetIds.has(t.assetId)) bad++
    }
    results.push({
      id: 2,
      name: 'CheckoutWatch and telemetry rows point to real asset + WO',
      ok: bad === 0,
      detail: bad === 0
        ? `All ${checkoutWatches.length} watches and ${telemetry.length} telemetry rows resolve.`
        : `${bad} bad reference(s)`,
    })
  }

  // 3. dayEvidence.onSiteMinutes === sum of completed trip onSiteMinutes for that date
  {
    let bad = 0
    const messages: string[] = []
    for (const ev of dayEvidence) {
      const completed = trips.filter(
        (t) =>
          t.assetId === ev.assetId &&
          t.checkInAt &&
          t.checkOutAt &&
          toEastDate(t.scheduledStart) === ev.date,
      )
      const expected = completed.reduce((sum, t) => sum + t.onSiteMinutes, 0)
      if (ev.onSiteMinutes !== expected) {
        bad++
        messages.push(
          `${ev.assetId}: evidence ${ev.onSiteMinutes} min vs trips ${expected} min`,
        )
      }
    }
    results.push({
      id: 3,
      name: 'dayEvidence.onSiteMinutes matches sum of completed trip onSiteMinutes',
      ok: bad === 0,
      detail: bad === 0
        ? `All ${dayEvidence.length} evidence records match.`
        : `${bad} mismatch(es): ${messages.slice(0, 3).join('; ')}`,
    })
  }

  // 4. Overtime week TOTAL HOURS === sum of that row's daily cells across the range
  {
    const range = ['2026-07-20', '2026-07-21', '2026-07-22', '2026-07-23', '2026-07-24', '2026-07-25', '2026-07-26']
    const rows = getOvertimeWeek(range, 'all', 'homeToHome')
    let bad = 0
    const messages: string[] = []
    for (const row of rows) {
      const expected = row.days.reduce((sum, d) => sum + d.hours, 0)
      if (Math.abs(row.totalHours - expected) > 0.001) {
        bad++
        messages.push(`${row.assetId}: ${row.totalHours} vs ${expected}`)
      }
    }
    results.push({
      id: 4,
      name: 'Overtime week total hours matches sum of daily cells',
      ok: bad === 0,
      detail: bad === 0
        ? `All ${rows.length} rows reconcile.`
        : `${bad} mismatch(es): ${messages.slice(0, 3).join('; ')}`,
    })
  }

  // 4b. For every asset: min ≤ max ≤ homeToHome week totals
  {
    const range = ['2026-07-20', '2026-07-21', '2026-07-22', '2026-07-23', '2026-07-24', '2026-07-25', '2026-07-26']
    const minRows = getOvertimeWeek(range, 'all', 'min')
    const maxRows = getOvertimeWeek(range, 'all', 'max')
    const h2hRows = getOvertimeWeek(range, 'all', 'homeToHome')
    const maxById = new Map(maxRows.map((r) => [r.assetId, r]))
    const h2hById = new Map(h2hRows.map((r) => [r.assetId, r]))
    let bad = 0
    let strictGreater = 0
    const messages: string[] = []
    for (const minRow of minRows) {
      const maxRow = maxById.get(minRow.assetId)
      const h2hRow = h2hById.get(minRow.assetId)
      if (!maxRow || !h2hRow) {
        bad++
        messages.push(`${minRow.assetId}: missing max/homeToHome row`)
        continue
      }
      if (minRow.totalHours - maxRow.totalHours > 0.001) {
        bad++
        messages.push(`${minRow.assetId}: min ${minRow.totalHours} > max ${maxRow.totalHours}`)
      }
      if (maxRow.totalHours - h2hRow.totalHours > 0.001) {
        bad++
        messages.push(`${minRow.assetId}: max ${maxRow.totalHours} > homeToHome ${h2hRow.totalHours}`)
      }
      if (h2hRow.totalHours - maxRow.totalHours > 0.01) {
        strictGreater++
      }
    }
    results.push({
      id: 7,
      name: 'Overtime metrics satisfy min ≤ max ≤ homeToHome',
      ok: bad === 0 && strictGreater >= Math.floor(minRows.length * 0.8),
      detail: bad === 0
        ? `All ${minRows.length} rows ordered; ${strictGreater} with homeToHome > max.`
        : `${bad} violation(s): ${messages.slice(0, 3).join('; ')}`,
    })
  }

  // 5. Timestamps relative to DEMO_NOW are non-negative; no future "lastPingAt" or similar
  {
    const now = new Date(DEMO_NOW).getTime()
    let bad = 0
    const messages: string[] = []
    for (const t of telemetry) {
      const ping = new Date(t.lastPingAt).getTime()
      if (ping > now) {
        bad++
        messages.push(`${t.assetId} lastPingAt ${t.lastPingAt} is after DEMO_NOW`)
      }
    }
    for (const w of checkoutWatches) {
      const checkIn = new Date(w.checkInAt).getTime()
      if (checkIn > now) {
        bad++
        messages.push(`${w.watchId} checkInAt ${w.checkInAt} is after DEMO_NOW`)
      }
    }
    results.push({
      id: 5,
      name: 'Relative timestamps derive from DEMO_NOW (no negative "ago" values)',
      ok: bad === 0,
      detail: bad === 0
        ? 'All telemetry and checkout timestamps are at or before DEMO_NOW.'
        : `${bad} future timestamp(s): ${messages.slice(0, 3).join('; ')}`,
    })
  }

  // 6. No banned terms in src/mock files
  {
    const bannedTerms = loadBannedTerms()
    const mockDir = path.resolve(process.cwd(), 'src/mock')
    const files = fs.readdirSync(mockDir, { recursive: true }) as string[]
    let bad = 0
    const findings: string[] = []
    for (const file of files) {
      const fullPath = path.join(mockDir, file)
      if (!fs.statSync(fullPath).isFile()) continue
      if (!fullPath.endsWith('.ts')) continue
      const content = fs.readFileSync(fullPath, 'utf-8')
      for (const term of bannedTerms) {
        if (content.includes(term)) {
          bad++
          findings.push(`${file}: contains "${term}"`)
        }
      }
    }
    results.push({
      id: 6,
      name: 'No banned terms in src/mock files',
      ok: bad === 0,
      detail: bad === 0
        ? 'No banned terms found in mock source.'
        : `${bad} banned term occurrence(s): ${findings.slice(0, 5).join('; ')}`,
    })
  }

  // 8. Checkout alerts resolve to real watch + asset + WO
  {
    const assetIds = new Set(assets.map((a) => a.assetId))
    const woIds = new Set(workOrders.map((wo) => wo.woId))
    const watchIds = new Set(checkoutWatches.map((w) => w.watchId))
    let bad = 0
    const messages: string[] = []
    for (const alert of checkoutAlerts) {
      if (!watchIds.has(alert.watchId)) {
        bad++
        messages.push(`${alert.alertId}: bad watchId ${alert.watchId}`)
      }
      if (!assetIds.has(alert.assetId)) {
        bad++
        messages.push(`${alert.alertId}: bad assetId ${alert.assetId}`)
      }
      if (!woIds.has(alert.woId)) {
        bad++
        messages.push(`${alert.alertId}: bad woId ${alert.woId}`)
      }
      const watch = checkoutWatches.find((w) => w.watchId === alert.watchId)
      if (watch && (watch.assetId !== alert.assetId || watch.woId !== alert.woId)) {
        bad++
        messages.push(`${alert.alertId}: asset/WO mismatch vs watch ${alert.watchId}`)
      }
    }
    results.push({
      id: 8,
      name: 'Checkout alerts resolve to real watch + asset + WO',
      ok: bad === 0 && checkoutAlerts.length >= 7,
      detail:
        bad === 0
          ? `All ${checkoutAlerts.length} checkout alerts resolve.`
          : `${bad} bad reference(s): ${messages.slice(0, 3).join('; ')}`,
    })
  }

  // 9. Idle alerts resolve to real assets
  {
    const assetIds = new Set(assets.map((a) => a.assetId))
    let bad = 0
    const messages: string[] = []
    for (const alert of idleAlerts) {
      if (!assetIds.has(alert.assetId)) {
        bad++
        messages.push(`${alert.alertId}: bad assetId ${alert.assetId}`)
      }
      if (alert.minutes < 8) {
        bad++
        messages.push(`${alert.alertId}: minutes ${alert.minutes} < 8`)
      }
    }
    results.push({
      id: 9,
      name: 'Idle alerts resolve to real assets with duration ≥ 8',
      ok: bad === 0 && idleAlerts.length >= 4,
      detail:
        bad === 0
          ? `All ${idleAlerts.length} idle alerts resolve.`
          : `${bad} problem(s): ${messages.slice(0, 3).join('; ')}`,
    })
  }

  return results
}
