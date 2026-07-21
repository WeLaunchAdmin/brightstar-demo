import { DEMO_NOW } from '../../mock/constants'
import type { CheckoutAlertRow } from '../../mock/queries'

export function exportCheckoutAlertsCsv(rows: CheckoutAlertRow[]) {
  const headers = [
    'ALERT',
    'ASSET',
    'WORK ORDER',
    'CASE',
    'TIER',
    'DISTANCE',
    'THRESHOLD',
    'SITE',
    'ADDRESS',
    'STATUS',
    'NOTIFIED',
    'DETECTED',
    'CALLED AT',
    'CHECKOUT',
  ]
  const lines = rows.map((r) =>
    [
      r.alertId,
      r.assetId,
      r.woId,
      r.caseType,
      r.tierLabel,
      r.distanceMi.toFixed(2),
      r.thresholdMi.toFixed(2),
      r.site,
      r.address,
      r.status,
      r.notified,
      r.detectedAt,
      r.calledAt ?? '',
      r.checkoutAt ?? 'Not checked out',
    ]
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(','),
  )
  const blob = new Blob([[headers.join(','), ...lines].join('\n')], {
    type: 'text/csv;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `checkout-alerts-${DEMO_NOW.slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
