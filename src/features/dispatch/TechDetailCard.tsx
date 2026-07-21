import { useMemo } from 'react'
import { Truck } from 'lucide-react'
import { DEMO_NOW } from '../../mock/constants'
import { getAsset, getFleetTelemetry, getTripsForAsset } from '../../mock/queries'
import type { GpsStatus } from '../../mock/types'
import { useDispatchStore } from '../../store/dispatchStore'

function formatEtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York',
  })
}

function relativeAgo(iso: string): string {
  const mins = Math.max(
    0,
    Math.round((new Date(DEMO_NOW).getTime() - new Date(iso).getTime()) / 60000),
  )
  if (mins < 1) return 'just now'
  if (mins === 1) return '1 min'
  if (mins < 60) return `${mins} min`
  const hours = Math.floor(mins / 60)
  const rem = mins % 60
  if (hours < 24) {
    if (rem === 0) return hours === 1 ? '1 hr' : `${hours} hr`
    return `${hours}h ${rem}m`
  }
  const days = Math.floor(hours / 24)
  return days === 1 ? '1 day' : `${days} days`
}

function gpsStatusUi(status: GpsStatus): { label: string; headerBg: string; badge: string; accent: string } {
  if (status === 'moving') {
    return {
      label: 'Moving',
      headerBg: 'bg-emerald-700',
      badge: 'bg-emerald-100 text-emerald-800',
      accent: 'border-emerald-500',
    }
  }
  if (status === 'idling') {
    return {
      label: 'Idling',
      headerBg: 'bg-amber-600',
      badge: 'bg-amber-100 text-amber-900',
      accent: 'border-amber-500',
    }
  }
  if (status === 'stale') {
    return {
      label: 'Stale GPS',
      headerBg: 'bg-rose-700',
      badge: 'bg-rose-100 text-rose-800',
      accent: 'border-rose-500',
    }
  }
  return {
    label: 'Parked',
    headerBg: 'bg-slate-600',
    badge: 'bg-slate-100 text-slate-700',
    accent: 'border-slate-400',
  }
}

function tripCheckStatus(trip: { checkInAt?: string; checkOutAt?: string }): {
  label: string
  className: string
} {
  if (trip.checkOutAt) return { label: 'Checked out', className: 'bg-emerald-100 text-emerald-800' }
  if (trip.checkInAt) return { label: 'Checked in', className: 'bg-sky-100 text-sky-800' }
  return { label: 'Scheduled', className: 'bg-slate-100 text-slate-700' }
}

/**
 * Floating technician detail — asset ID only (no person names).
 * Docked on-screen like WoDetailCard so it never clips off the map.
 */
export function TechDetailCard() {
  const selectedAssetId = useDispatchStore((s) => s.selectedAssetId)
  const serviceDate = useDispatchStore((s) => s.serviceDate)
  const selectTech = useDispatchStore((s) => s.selectTech)
  const refreshKey = useDispatchStore((s) => s.refreshKey)

  const tel = useMemo(() => {
    void refreshKey
    if (!selectedAssetId) return undefined
    return getFleetTelemetry({ active: true }).find((t) => t.assetId === selectedAssetId)
  }, [selectedAssetId, refreshKey])

  const asset = useMemo(() => {
    void refreshKey
    return selectedAssetId ? getAsset(selectedAssetId) : undefined
  }, [selectedAssetId, refreshKey])

  const todayTrips = useMemo(() => {
    if (!selectedAssetId) return []
    return getTripsForAsset(selectedAssetId, serviceDate)
  }, [selectedAssetId, serviceDate])

  if (!selectedAssetId || !tel || !asset) return null

  const ui = gpsStatusUi(tel.gpsStatus)

  return (
    <div className="absolute left-3 bottom-16 z-40 w-[min(22rem,calc(100%-1.5rem))] max-h-[min(32rem,calc(100%-5rem))] pointer-events-auto">
      <div
        className={`w-full max-h-full overflow-y-auto rounded-xl shadow-xl border-2 bg-white text-left ${ui.accent}`}
      >
        <div
          className={`${ui.headerBg} text-white px-3 py-2.5 flex items-center justify-between gap-2 sticky top-0 z-10`}
        >
          <div className="min-w-0 flex items-center gap-2">
            <Truck className="w-4 h-4 shrink-0 opacity-90" strokeWidth={2.25} />
            <p className="text-sm font-semibold truncate tabular-nums">{tel.assetId}</p>
          </div>
          <button
            type="button"
            title="Close"
            aria-label="Close"
            onClick={() => selectTech(null)}
            className="w-7 h-7 inline-flex items-center justify-center rounded-md text-white/80 hover:text-white hover:bg-white/15"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="p-3 space-y-3">
          <div>
            <p className="text-[10px] font-semibold tracking-wide text-gray-500 mb-1.5">LIVE STATUS</p>
            <div className="rounded-lg border border-gray-100 bg-gray-50/80 px-2.5 py-2 space-y-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${ui.badge}`}>
                  {ui.label}
                </span>
                <span
                  className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                    tel.engineOn ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Engine {tel.engineOn ? 'on' : 'off'}
                </span>
              </div>
              <p className="text-xs text-gray-800">
                <span className="font-semibold tabular-nums">{tel.speed}</span> mph
                {tel.gpsStatus === 'idling' && (
                  <span className="text-gray-500">
                    {' '}
                    · Idle <span className="font-semibold text-amber-800 tabular-nums">{tel.idleMinutes}</span> min
                  </span>
                )}
              </p>
              <p className="text-xs text-gray-600 leading-snug">{tel.address}</p>
              <p className="text-[11px] text-gray-400">
                Last ping · {relativeAgo(tel.lastPingAt)} ago
              </p>
            </div>
          </div>

          <div>
            <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-100 text-violet-800">
              {asset.trade}
            </span>
          </div>

          <div>
            <p className="text-[10px] font-semibold tracking-wide text-gray-500 mb-1.5">TODAY&apos;S TRIPS</p>
            {todayTrips.length === 0 ? (
              <p className="text-xs text-gray-500 py-2">No trips scheduled.</p>
            ) : (
              <ul className="space-y-1.5">
                {todayTrips.map((trip) => {
                  const check = tripCheckStatus(trip)
                  return (
                    <li
                      key={trip.tripId}
                      className="rounded-lg border border-gray-100 px-2.5 py-2 hover:bg-gray-50/80"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-gray-900 tabular-nums">{trip.woId}</span>
                        <span
                          className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${check.className}`}
                        >
                          {check.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-600 truncate mt-0.5">{trip.site}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5 tabular-nums">
                        {formatEtTime(trip.scheduledStart)} – {formatEtTime(trip.scheduledEnd)}
                      </p>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function CloseIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
    </svg>
  )
}
