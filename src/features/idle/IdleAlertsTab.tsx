import { useMemo, useState } from 'react'
import { FilterChips } from '../../shell/FilterChips'
import { DEMO_NOW } from '../../mock/constants'
import { getIdleAlertStatusCounts, getIdleAlerts } from '../../mock/queries'
import type { IdleAlertCallStatus } from '../../mock/types'

type StatusFilter = 'all' | IdleAlertCallStatus

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

function formatUpdatedDay(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'America/New_York',
  })
}

function statusBadge(status: IdleAlertCallStatus): string {
  if (status === 'Completed' || status === 'Legacy notified') {
    return 'bg-emerald-100 text-emerald-800'
  }
  if (status === 'Pending call' || status === 'Busy') {
    return 'bg-amber-100 text-amber-900'
  }
  if (status === 'Failed' || status === 'Canceled') {
    return 'bg-rose-100 text-rose-800'
  }
  if (status === 'No phone') return 'bg-slate-100 text-slate-600'
  return 'bg-slate-100 text-slate-700'
}

export function IdleAlertsTab() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [serviceDate, setServiceDate] = useState('2026-07-21')
  const [evidenceMsg, setEvidenceMsg] = useState<string | null>(null)

  const counts = useMemo(() => getIdleAlertStatusCounts(serviceDate), [serviceDate])

  const rows = useMemo(() => {
    return getIdleAlerts({
      date: serviceDate,
      status: statusFilter === 'all' ? undefined : statusFilter,
    })
  }, [serviceDate, statusFilter])

  const filterOptions = [
    { value: 'all', label: 'All', count: counts.all },
    { value: 'Pending call', label: 'Pending call', count: counts['Pending call'] },
    { value: 'Completed', label: 'Completed', count: counts.Completed },
    { value: 'No answer', label: 'No answer', count: counts['No answer'] },
    { value: 'Busy', label: 'Busy', count: counts.Busy },
    { value: 'Failed', label: 'Failed', count: counts.Failed },
    { value: 'Canceled', label: 'Canceled', count: counts.Canceled },
    { value: 'Legacy notified', label: 'Legacy notified', count: counts['Legacy notified'] },
    { value: 'No phone', label: 'No phone', count: counts['No phone'] },
  ]

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-gray-50">
      <div className="px-4 py-3 bg-white border-b border-gray-200 flex flex-wrap items-center gap-3 justify-between">
        <FilterChips
          options={filterOptions}
          activeValue={statusFilter}
          onChange={(v) => setStatusFilter(v as StatusFilter)}
        />
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-rose-700">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
            IDLE EVENTS — routed to alerts pipeline
          </span>
          <input
            type="date"
            value={serviceDate}
            onChange={(e) => setServiceDate(e.target.value)}
            className="px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg"
          />
          <span className="text-xs text-gray-500">Updated · {formatUpdatedDay(DEMO_NOW)}</span>
        </div>
      </div>

      {evidenceMsg && (
        <div className="mx-4 mt-3 px-3 py-2 text-xs rounded-lg border border-sky-200 bg-sky-50 text-sky-900">
          {evidenceMsg}{' '}
          <button
            type="button"
            className="underline font-semibold"
            onClick={() => setEvidenceMsg(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-auto p-4">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[64rem] text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-[10px] font-semibold tracking-wide text-gray-500">
                  <th className="px-3 py-2.5">ASSET</th>
                  <th className="px-3 py-2.5">IDLE DURATION</th>
                  <th className="px-3 py-2.5">LOCATION</th>
                  <th className="px-3 py-2.5">STATUS</th>
                  <th className="px-3 py-2.5">NOTIFIED</th>
                  <th className="px-3 py-2.5">IDLE SINCE</th>
                  <th className="px-3 py-2.5">IDLE DETECTED AT</th>
                  <th className="px-3 py-2.5">STOPPED IDLING</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-500">
                      No idle alerts for this filter.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.alertId} className="text-sm hover:bg-gray-50/80">
                      <td className="px-3 py-3 font-semibold text-gray-900 tabular-nums whitespace-nowrap">
                        {row.assetId}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <p className="font-semibold text-gray-900 tabular-nums">{row.minutes}m</p>
                        <button
                          type="button"
                          onClick={() =>
                            setEvidenceMsg(
                              `Evidence stub for ${row.alertId} · ${row.assetId} (demo only).`,
                            )
                          }
                          className="text-[11px] font-semibold text-sky-600 hover:text-sky-800"
                        >
                          View evidence
                        </button>
                      </td>
                      <td className="px-3 py-3 text-gray-700 max-w-[14rem] truncate">
                        {row.location}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusBadge(row.callStatus)}`}
                        >
                          {row.callStatus}
                        </span>
                        {row.sessionEnded && (
                          <p className="text-[11px] text-gray-400 mt-0.5">Session ended</p>
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-700 whitespace-nowrap">
                        {row.notifiedAckAt ? `Ack ${formatEtStamp(row.notifiedAckAt)}` : '—'}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-700 whitespace-nowrap">
                        {formatEtStamp(row.idleSinceAt)}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-700 whitespace-nowrap">
                        {formatEtStamp(row.idleDetectedAt)}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-700 whitespace-nowrap">
                        {row.stoppedIdlingAt ? formatEtStamp(row.stoppedIdlingAt) : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
