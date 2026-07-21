import { useMemo, useState } from 'react'
import { FilterChips } from '../../shell/FilterChips'
import { DEMO_NOW } from '../../mock/constants'
import {
  getFleetTelemetry,
  getIdleMonitorCounts,
  type FleetTelemetryRow,
} from '../../mock/queries'
import type { GpsStatus } from '../../mock/types'

type MonitorFilter =
  | 'all'
  | 'atThreshold'
  | 'idlingUnder'
  | 'parked'
  | 'stale'
  | 'issues'

function formatEtStamp(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York',
  })
}

function formatLiveClock(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'America/New_York',
  })
}

function formatUpdatedDay(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'America/New_York',
  })
}

function minutesAgo(iso: string): number {
  return Math.max(
    0,
    Math.round((new Date(DEMO_NOW).getTime() - new Date(iso).getTime()) / 60000),
  )
}

function statusLabel(status: GpsStatus, engineOn: boolean): string {
  if (status === 'stale') return 'Stale GPS'
  if (status === 'moving') return 'Engine on (moving)'
  if (status === 'idling') return 'Idling'
  if (status === 'parked' && engineOn) return 'Engine on (parked)'
  return 'Parked'
}

function statusBadge(status: GpsStatus): string {
  if (status === 'stale') return 'bg-orange-100 text-orange-800'
  if (status === 'moving') return 'bg-sky-100 text-sky-800'
  if (status === 'idling') return 'bg-amber-100 text-amber-900'
  return 'bg-slate-100 text-slate-700'
}

function idleCell(row: FleetTelemetryRow): string {
  if (row.gpsStatus === 'stale') return 'GPS stale'
  if (row.gpsStatus === 'idling' || row.idleMinutes > 0) return `${row.idleMinutes}m`
  return '—'
}

function matchesFilter(row: FleetTelemetryRow, filter: MonitorFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'atThreshold') return row.gpsStatus === 'idling' && row.idleMinutes >= 8
  if (filter === 'idlingUnder') {
    return row.gpsStatus === 'idling' && row.idleMinutes > 0 && row.idleMinutes < 8
  }
  if (filter === 'parked') return row.gpsStatus === 'parked'
  if (filter === 'stale') return row.gpsStatus === 'stale'
  if (filter === 'issues') {
    return row.gpsStatus === 'stale' || (row.gpsStatus === 'idling' && row.idleMinutes >= 8)
  }
  return true
}

export function MonitoredTechniciansTab() {
  const [filter, setFilter] = useState<MonitorFilter>('all')

  const counts = useMemo(() => getIdleMonitorCounts(true), [])
  const rows = useMemo(() => {
    return getFleetTelemetry({ active: true }).filter((r) => matchesFilter(r, filter))
  }, [filter])

  const filterOptions = [
    { value: 'all', label: 'All trackable', count: counts.all },
    { value: 'atThreshold', label: 'Alert threshold', count: counts.atThreshold },
    { value: 'idlingUnder', label: 'Idling <8m', count: counts.idlingUnder },
    { value: 'parked', label: 'Parked', count: counts.parked },
    { value: 'stale', label: 'Stale GPS', count: counts.stale },
    { value: 'issues', label: 'Issues', count: counts.issues },
  ]

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-gray-50">
      <div className="px-4 py-3 bg-white border-b border-gray-200 space-y-2">
        <FilterChips
          options={filterOptions}
          activeValue={filter}
          onChange={(v) => setFilter(v as MonitorFilter)}
        />
        <p className="text-xs text-gray-600 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-flex items-center gap-1.5 font-medium text-sky-700">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
            Live · {formatLiveClock(DEMO_NOW)}
          </span>
          <span>
            {counts.all} trackable · {counts.atThreshold} at threshold
          </span>
          <span className="text-gray-400">Updated · {formatUpdatedDay(DEMO_NOW)}</span>
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-auto p-4">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-[10px] font-semibold tracking-wide text-gray-500">
                  <th className="px-3 py-2.5">ASSET</th>
                  <th className="px-3 py-2.5">STATUS</th>
                  <th className="px-3 py-2.5">ENGINE</th>
                  <th className="px-3 py-2.5">SPEED</th>
                  <th className="px-3 py-2.5">IDLE</th>
                  <th className="px-3 py-2.5">LOCATION</th>
                  <th className="px-3 py-2.5">LAST PING</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-500">
                      No technicians match this filter.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const ago = minutesAgo(row.lastPingAt)
                    return (
                      <tr key={row.assetId} className="text-sm hover:bg-gray-50/80">
                        <td className="px-3 py-3 font-semibold text-gray-900 tabular-nums whitespace-nowrap">
                          {row.assetId}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusBadge(row.gpsStatus)}`}
                          >
                            {statusLabel(row.gpsStatus, row.engineOn)}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-gray-800">{row.engineOn ? 'Yes' : 'No'}</td>
                        <td className="px-3 py-3 tabular-nums text-gray-800">
                          {row.speed.toFixed(1)} mph
                        </td>
                        <td className="px-3 py-3 tabular-nums text-gray-800">{idleCell(row)}</td>
                        <td className="px-3 py-3 text-gray-700 max-w-[16rem] truncate">
                          {row.address}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <p className="text-xs text-gray-800">{formatEtStamp(row.lastPingAt)}</p>
                          <p className="text-[11px] text-gray-400">{ago} min ago</p>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
