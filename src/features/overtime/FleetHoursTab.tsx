import { useMemo, useState } from 'react'
import { FilterChips } from '../../shell/FilterChips'
import { getOvertimeWeek } from '../../mock/queries'
import type { OvertimeMetric } from '../../mock/queries'
import type { Trade } from '../../mock/types'

const DEFAULT_FROM = '2026-07-20'
const DEFAULT_TO = '2026-07-26'

const TRADE_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'Sprinkler', label: 'Sprinkler' },
  { value: 'Fire Alarm', label: 'Fire Alarm' },
  { value: 'Inspector', label: 'Inspectors' },
]

const METRIC_OPTIONS: { id: OvertimeMetric; label: string; helper: string }[] = [
  { id: 'max', label: 'Maximum Hours', helper: 'Earliest check-in → latest check-out' },
  { id: 'min', label: 'Minimum Hours', helper: 'Sum of on-site punch hours' },
  { id: 'homeToHome', label: 'Home-to-Home', helper: 'Night-aware span' },
]

function buildRange(from: string, to: string): string[] {
  if (!from || !to || from > to) return []
  const range: string[] = []
  const current = new Date(`${from}T12:00:00`)
  const end = new Date(`${to}T12:00:00`)
  while (current <= end) {
    const year = current.getFullYear()
    const month = String(current.getMonth() + 1).padStart(2, '0')
    const day = String(current.getDate()).padStart(2, '0')
    range.push(`${year}-${month}-${day}`)
    current.setDate(current.getDate() + 1)
  }
  return range
}

function formatHeader(date: string): string {
  const d = new Date(`${date}T12:00:00`)
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short' })
  const monthDay = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return `${weekday} ${monthDay}`
}

export function FleetHoursTab() {
  const [fromDate, setFromDate] = useState(DEFAULT_FROM)
  const [toDate, setToDate] = useState(DEFAULT_TO)
  const [search, setSearch] = useState('')
  const [tradeFilter, setTradeFilter] = useState('all')
  const [metric, setMetric] = useState<OvertimeMetric>('homeToHome')

  const range = useMemo(() => buildRange(fromDate, toDate), [fromDate, toDate])

  const rows = useMemo(() => {
    const trade = tradeFilter === 'all' ? 'all' : (tradeFilter as Trade)
    const data = getOvertimeWeek(range, trade, metric)
    if (!search.trim()) return data
    const q = search.trim().toLowerCase()
    return data.filter(
      (r) => r.techName.toLowerCase().includes(q) || r.assetId.toLowerCase().includes(q),
    )
  }, [range, tradeFilter, metric, search])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 space-y-4 bg-white border-b border-gray-200">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="from-date" className="text-xs font-medium text-gray-500">
              From
            </label>
            <input
              id="from-date"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="to-date" className="text-xs font-medium text-gray-500">
              To
            </label>
            <input
              id="to-date"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="tech-search" className="text-xs font-medium text-gray-500">
              Technician
            </label>
            <input
              id="tech-search"
              type="text"
              placeholder="Search technician…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-56"
            />
          </div>
          <div className="flex-1 min-w-[12rem]">
            <p className="text-xs font-medium text-gray-500 mb-1">Trade</p>
            <FilterChips
              options={TRADE_OPTIONS}
              activeValue={tradeFilter}
              onChange={setTradeFilter}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-stretch gap-3">
            {METRIC_OPTIONS.map((m) => {
              const isActive = m.id === metric
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMetric(m.id)}
                  className={`flex flex-col items-start px-4 py-3 rounded-xl border text-left min-w-[11rem] transition-colors ${
                    isActive
                      ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-gray-900'}`}>
                    {m.label}
                  </span>
                  <span className={`text-xs mt-0.5 ${isActive ? 'text-gray-300' : 'text-gray-500'}`}>
                    {m.helper}
                  </span>
                </button>
              )
            })}
          </div>
          <p className="text-xs text-gray-500 text-right max-w-xs">
            Earliest check-in → latest check-out · clamp days show Adjusted
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left min-w-[960px]">
              <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 sticky left-0 bg-gray-50 z-10">EMPLOYEE</th>
                  <th className="px-4 py-3 text-right">TOTAL HOURS</th>
                  <th className="px-4 py-3 text-right">TOTAL DAYS</th>
                  <th className="px-4 py-3 text-right">HOURS/DAY</th>
                  {range.map((date) => (
                    <th key={date} className="px-4 py-3 text-right whitespace-nowrap">
                      {formatHeader(date)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row) => {
                  const hasAdjusted = row.days.some((d) => d.isAdjusted)
                  return (
                    <tr key={row.assetId} className="hover:bg-gray-50/80">
                      <td className="px-4 py-3 sticky left-0 bg-white z-10">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-900">{row.techName}</span>
                          <span className="text-xs text-gray-500">{row.trade}</span>
                          {hasAdjusted && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide bg-amber-100 text-amber-800">
                              ADJUSTED
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900 tabular-nums">
                        {row.totalHours.toFixed(1)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 tabular-nums">{row.totalDays}</td>
                      <td className="px-4 py-3 text-right text-gray-700 tabular-nums">
                        {row.hoursPerDay.toFixed(1)}
                      </td>
                      {row.days.map((d) => (
                        <td key={d.date} className="px-4 py-3 text-right whitespace-nowrap">
                          {d.hours > 0 ? (
                            <span className="inline-flex items-center justify-end gap-1.5">
                              <span className="text-gray-900 tabular-nums">{d.hours.toFixed(1)}</span>
                              {d.isAdjusted && (
                                <span className="inline-flex items-center px-1 py-0.5 rounded text-[10px] font-semibold tracking-wide bg-gray-100 text-gray-600">
                                  ADJ
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {rows.length === 0 && (
            <div className="px-6 py-12 text-center text-sm text-gray-500">
              No technicians match the current filters.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
