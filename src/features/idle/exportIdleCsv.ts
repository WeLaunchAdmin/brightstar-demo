import { DEMO_NOW } from '../../mock/constants'

export function exportIdleCsv(
  kind: 'monitored' | 'alerts',
  rows: Array<Record<string, string | number | boolean>>,
) {
  if (rows.length === 0) return
  const headers = Object.keys(rows[0])
  const lines = rows.map((r) =>
    headers
      .map((h) => `"${String(r[h] ?? '').replace(/"/g, '""')}"`)
      .join(','),
  )
  const blob = new Blob([[headers.join(','), ...lines].join('\n')], {
    type: 'text/csv;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `idle-${kind}-${DEMO_NOW.slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
