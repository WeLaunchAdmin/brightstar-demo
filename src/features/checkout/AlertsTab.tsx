import { useMemo, useState } from 'react'
import { FilterChips } from '../../shell/FilterChips'
import { DEMO_NOW } from '../../mock/constants'
import {
  getCheckoutAlertStatusCounts,
  getCheckoutAlerts,
  type CheckoutAlertRow,
} from '../../mock/queries'
import type { CheckoutAlertStatus } from '../../mock/types'

type StatusFilter = 'all' | CheckoutAlertStatus

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

function statusBadge(status: CheckoutAlertStatus): string {
  if (status === 'Completed') return 'bg-emerald-100 text-emerald-800'
  if (status === 'Pending call') return 'bg-amber-100 text-amber-900'
  if (status === 'No answer') return 'bg-slate-100 text-slate-700'
  return 'bg-rose-100 text-rose-800'
}

function caseBadge(caseType: CheckoutAlertRow['caseType']): string {
  if (caseType === 'Left site') return 'bg-rose-100 text-rose-800'
  return 'bg-orange-100 text-orange-800'
}

export function AlertsTab() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [serviceDate, setServiceDate] = useState('2026-07-21')
  const [evidenceMsg, setEvidenceMsg] = useState<string | null>(null)

  const counts = useMemo(() => getCheckoutAlertStatusCounts(serviceDate), [serviceDate])

  const rows = useMemo(() => {
    return getCheckoutAlerts({
      date: serviceDate,
      status: statusFilter === 'all' ? undefined : statusFilter,
    })
  }, [serviceDate, statusFilter])

  const filterOptions = [
    { value: 'all', label: 'All', count: counts.all },
    { value: 'Pending call', label: 'Pending call', count: counts['Pending call'] },
    { value: 'Completed', label: 'Completed', count: counts.Completed },
    { value: 'No answer', label: 'No answer', count: counts['No answer'] },
    { value: 'Failed', label: 'Failed', count: counts.Failed },
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
            GEOFENCE BREACHES — routed to alerts pipeline
          </span>
          <input
            type="date"
            value={serviceDate}
            onChange={(e) => setServiceDate(e.target.value)}
            className="px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg"
          />
          <span className="text-xs text-gray-500">Updated · {formatLiveClock(DEMO_NOW)}</span>
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
            <table className="w-full min-w-[72rem] text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-[10px] font-semibold tracking-wide text-gray-500">
                  <th className="px-3 py-2.5">ALERT</th>
                  <th className="px-3 py-2.5">ASSET</th>
                  <th className="px-3 py-2.5">WORK ORDER</th>
                  <th className="px-3 py-2.5">CASE</th>
                  <th className="px-3 py-2.5">DISTANCE</th>
                  <th className="px-3 py-2.5">SITE</th>
                  <th className="px-3 py-2.5">STATUS</th>
                  <th className="px-3 py-2.5">NOTIFIED</th>
                  <th className="px-3 py-2.5">DETECTED</th>
                  <th className="px-3 py-2.5">CALLED AT</th>
                  <th className="px-3 py-2.5">CHECKOUT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-12 text-center text-sm text-gray-500">
                      No geofence breaches for this filter.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.alertId} className="text-sm hover:bg-gray-50/80">
                      <td className="px-3 py-3 font-semibold text-gray-900 tabular-nums whitespace-nowrap">
                        {row.alertId}
                      </td>
                      <td className="px-3 py-3 font-semibold text-gray-900 tabular-nums whitespace-nowrap">
                        {row.assetId}
                      </td>
                      <td className="px-3 py-3 tabular-nums text-gray-800 whitespace-nowrap">
                        {row.woId}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${caseBadge(row.caseType)}`}
                        >
                          {row.caseType}
                        </span>
                        <p className="text-[11px] text-gray-500 mt-1">{row.tierLabel}</p>
                        <button
                          type="button"
                          onClick={() =>
                            setEvidenceMsg(
                              `Evidence stub for ${row.alertId} · ${row.assetId} · ${row.woId} (demo only).`,
                            )
                          }
                          className="text-[11px] font-semibold text-sky-600 hover:text-sky-800 mt-0.5"
                        >
                          View evidence
                        </button>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <p className="font-semibold text-gray-900 tabular-nums">
                          {row.distanceMi.toFixed(2)} mi
                        </p>
                        <p className="text-[11px] text-gray-500 tabular-nums">
                          Threshold {row.thresholdMi.toFixed(2)} mi
                        </p>
                      </td>
                      <td className="px-3 py-3 max-w-[12rem]">
                        <p className="font-medium text-gray-900 truncate">{row.site}</p>
                        <p className="text-[11px] text-gray-500 truncate">{row.address}</p>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusBadge(row.status)}`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-gray-700 whitespace-nowrap">{row.notified}</td>
                      <td className="px-3 py-3 text-xs text-gray-700 whitespace-nowrap">
                        {formatEtStamp(row.detectedAt)}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-700 whitespace-nowrap">
                        {row.calledAt ? formatEtStamp(row.calledAt) : '—'}
                      </td>
                      <td className="px-3 py-3 text-xs whitespace-nowrap">
                        {row.checkoutAt ? (
                          <span className="text-gray-700">{formatEtStamp(row.checkoutAt)}</span>
                        ) : (
                          <span className="font-medium text-sky-700">Not checked out</span>
                        )}
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
