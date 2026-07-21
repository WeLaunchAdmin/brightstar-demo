import { useEffect, useMemo, useState } from 'react'
import {
  FleetMap,
  type FleetMapFocus,
  type FleetMapMarker,
} from '../../components/FleetMap'
import { FilterChips } from '../../shell/FilterChips'
import { DEMO_NOW } from '../../mock/constants'
import { haversineMi, toEastDate } from '../../mock/helpers'
import {
  getCheckoutWatches,
  getFleetTelemetry,
  getWorkOrder,
  getWorkOrderGeofence,
} from '../../mock/queries'
import type { CheckoutStatus, CheckoutWatch } from '../../mock/types'

type StatusFilter = 'all' | 'on site' | 'en route' | 'issues'

function relativeAgo(iso: string): string {
  const mins = Math.max(
    0,
    Math.round((new Date(DEMO_NOW).getTime() - new Date(iso).getTime()) / 60000),
  )
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  const rem = mins % 60
  return rem ? `${hours}h ${rem}m ago` : `${hours}h ago`
}

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

function statusBadge(status: CheckoutStatus): { label: string; className: string; dot: string } {
  if (status === 'on site') {
    return { label: 'On site', className: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-500' }
  }
  if (status === 'en route') {
    return { label: 'En route', className: 'bg-sky-100 text-sky-800', dot: 'bg-sky-500' }
  }
  if (status === 'stale gps') {
    return { label: 'Stale GPS', className: 'bg-amber-100 text-amber-900', dot: 'bg-amber-500' }
  }
  return { label: 'Outside geofence', className: 'bg-orange-100 text-orange-800', dot: 'bg-orange-500' }
}

function matchesFilter(watch: CheckoutWatch, filter: StatusFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'issues') return watch.status === 'issues' || watch.status === 'stale gps'
  return watch.status === filter
}

export function ActiveWatchesTab() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [serviceDate, setServiceDate] = useState('2026-07-21')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [focus, setFocus] = useState<FleetMapFocus | null>(null)
  const [fitNonce, setFitNonce] = useState(0)
  const [syncTick, setSyncTick] = useState(0)

  const allWatches = useMemo(() => {
    void syncTick
    return getCheckoutWatches().filter((w) => toEastDate(w.checkInAt) === serviceDate)
  }, [serviceDate, syncTick])

  const counts = useMemo(() => {
    const onSite = allWatches.filter((w) => w.status === 'on site').length
    const enRoute = allWatches.filter((w) => w.status === 'en route').length
    const issues = allWatches.filter(
      (w) => w.status === 'issues' || w.status === 'stale gps',
    ).length
    return { all: allWatches.length, onSite, enRoute, issues }
  }, [allWatches])

  const watches = useMemo(
    () => allWatches.filter((w) => matchesFilter(w, statusFilter)),
    [allWatches, statusFilter],
  )

  useEffect(() => {
    if (watches.length === 0) {
      setSelectedId(null)
      return
    }
    if (!selectedId || !watches.some((w) => w.watchId === selectedId)) {
      setSelectedId(watches[0].watchId)
    }
  }, [watches, selectedId])

  const selected = watches.find((w) => w.watchId === selectedId) ?? null

  const telemetryByAsset = useMemo(() => {
    void syncTick
    return new Map(getFleetTelemetry().map((t) => [t.assetId, t]))
  }, [syncTick])

  const geofence = selected ? getWorkOrderGeofence(selected.woId) : undefined
  const wo = selected ? getWorkOrder(selected.woId) : undefined
  const tel = selected ? telemetryByAsset.get(selected.assetId) : undefined

  const mapMarkers: FleetMapMarker[] = useMemo(() => {
    if (!selected) return []
    const center = geofence?.center
    const markers: FleetMapMarker[] = [
      {
        id: `checkin-${selected.watchId}`,
        kind: 'checkin',
        lat: selected.checkInLoc.lat,
        lng: selected.checkInLoc.lng,
        label: 'Check-in',
      },
      {
        id: `last-${selected.watchId}`,
        kind: 'lastKnown',
        lat: selected.lastKnownLoc.lat,
        lng: selected.lastKnownLoc.lng,
        label: selected.assetId,
      },
    ]
    if (center) {
      markers.push({
        id: `wo-${selected.woId}`,
        kind: 'wo',
        lat: center.lat,
        lng: center.lng,
        label: selected.woId,
        selected: true,
      })
    }
    return markers
  }, [selected, geofence])

  const breadcrumb: GeoJSON.LineString | null = useMemo(() => {
    if (!selected) return null
    return {
      type: 'LineString',
      coordinates: [
        [selected.checkInLoc.lng, selected.checkInLoc.lat],
        [selected.lastKnownLoc.lng, selected.lastKnownLoc.lat],
      ],
    }
  }, [selected])

  const distanceFromSite = useMemo(() => {
    if (!selected || !geofence) return null
    return haversineMi(
      selected.lastKnownLoc.lat,
      selected.lastKnownLoc.lng,
      geofence.center.lat,
      geofence.center.lng,
    )
  }, [selected, geofence])

  function selectWatch(watch: CheckoutWatch) {
    setSelectedId(watch.watchId)
    const geo = getWorkOrderGeofence(watch.woId)
    const lat = geo?.center.lat ?? watch.checkInLoc.lat
    const lng = geo?.center.lng ?? watch.checkInLoc.lng
    setFocus({ lat, lng, zoom: 13.5, nonce: Date.now() })
    setFitNonce((n) => n + 1)
  }

  function openWorkOrder() {
    if (!selected) return
    const geo = getWorkOrderGeofence(selected.woId)
    if (geo) {
      setFocus({ lat: geo.center.lat, lng: geo.center.lng, zoom: 14.5, nonce: Date.now() })
    }
  }

  const filterOptions = [
    { value: 'all', label: 'All', count: counts.all },
    { value: 'on site', label: 'On site', count: counts.onSite },
    { value: 'en route', label: 'En route', count: counts.enRoute },
    { value: 'issues', label: 'Issues', count: counts.issues },
  ]

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-gray-50">
      <div className="px-4 py-3 bg-white border-b border-gray-200 flex flex-wrap items-center gap-3 justify-between">
        <FilterChips
          options={filterOptions}
          activeValue={statusFilter}
          onChange={(v) => setStatusFilter(v as StatusFilter)}
        />
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={serviceDate}
            onChange={(e) => setServiceDate(e.target.value)}
            className="px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg"
          />
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live · {formatLiveClock(DEMO_NOW)}
          </span>
          <button
            type="button"
            onClick={() => setSyncTick((t) => t + 1)}
            className="text-xs font-semibold text-sky-700 hover:text-sky-900"
          >
            Sync
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[20rem_minmax(0,1fr)_22rem]">
        {/* Left list */}
        <aside className="min-h-0 overflow-auto border-r border-gray-200 bg-white">
          <div className="px-3 py-2.5 border-b border-gray-100 sticky top-0 bg-white z-10">
            <p className="text-[10px] font-semibold tracking-wide text-gray-500">
              ACTIVE WATCHES{' '}
              <span className="text-gray-800 tabular-nums">{watches.length}</span>
            </p>
          </div>
          {watches.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs text-gray-500">No watches for this filter.</p>
          ) : (
            <ul className="p-2 space-y-1.5">
              {watches.map((watch) => {
                const badge = statusBadge(watch.status)
                const active = watch.watchId === selectedId
                return (
                  <li key={watch.watchId}>
                    <button
                      type="button"
                      onClick={() => selectWatch(watch)}
                      className={`w-full text-left rounded-xl border px-3 py-2.5 transition-colors ${
                        active
                          ? 'border-sky-400 bg-sky-50/80 ring-1 ring-sky-200'
                          : 'border-gray-200 bg-white hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${badge.dot}`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-gray-900 tabular-nums truncate">
                              {watch.assetId}
                            </span>
                            <span
                              className={`shrink-0 inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${badge.className}`}
                            >
                              {badge.label}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-600 mt-0.5 tabular-nums truncate">
                            WO {watch.woId} · {watch.assetId}
                          </p>
                          <p className="text-[11px] text-gray-400 mt-1">
                            Checked in {relativeAgo(watch.checkInAt)}
                          </p>
                        </div>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </aside>

        {/* Center map */}
        <div className="relative min-h-[280px] bg-gray-100">
          <FleetMap
            markers={mapMarkers}
            fitToMarkers
            fitNonce={fitNonce}
            focus={focus}
            geofence={
              geofence
                ? { center: geofence.center, radiusMiles: geofence.radiusMiles }
                : selected
                  ? {
                      center: selected.checkInLoc,
                      radiusMiles: selected.geofenceMiles,
                    }
                  : null
            }
            breadcrumb={breadcrumb}
            mapStyle="mapbox://styles/mapbox/streets-v12"
            className="h-full"
          />
          <div className="absolute bottom-4 left-3 z-10 bg-white/95 border border-gray-200 rounded-lg shadow-sm px-2.5 py-2 text-[10px] text-gray-700 space-y-1">
            <p className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rotate-45 bg-orange-500 border border-white shadow-sm" />
              Work order
            </p>
            <p className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Check-in location
            </p>
            <p className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-700" />
              Last known
            </p>
          </div>
        </div>

        {/* Right detail */}
        <aside className="min-h-0 overflow-auto border-l border-gray-200 bg-white">
          {!selected ? (
            <p className="px-4 py-10 text-center text-xs text-gray-500">Select a watch to inspect.</p>
          ) : (
            <div className="p-4 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-base font-bold text-gray-900 tabular-nums">{selected.assetId}</h2>
                <span
                  className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                    statusBadge(selected.status).className
                  }`}
                >
                  {statusBadge(selected.status).label}
                </span>
              </div>

              <div>
                <p className="text-[10px] font-semibold tracking-wide text-gray-500">WORK ORDER</p>
                <p className="text-sm text-gray-900 mt-1 tabular-nums">
                  {selected.woId} · {selected.assetId}
                </p>
                {wo && <p className="text-xs text-gray-500 mt-0.5 truncate">{wo.site}</p>}
              </div>

              <div>
                <p className="text-[10px] font-semibold tracking-wide text-gray-500">CHECKED IN</p>
                <p className="text-sm text-gray-900 mt-1">
                  {formatEtStamp(selected.checkInAt)}
                  <span className="text-gray-500"> · {relativeAgo(selected.checkInAt)}</span>
                </p>
              </div>

              <div>
                <p className="text-[10px] font-semibold tracking-wide text-gray-500">
                  LAST KNOWN LOCATION
                </p>
                <p className="text-sm text-gray-900 mt-1">
                  {tel ? formatEtStamp(tel.lastPingAt) : formatEtStamp(selected.checkInAt)}
                </p>
                {distanceFromSite != null && (
                  <p className="text-xs text-orange-700 mt-0.5 tabular-nums">
                    {distanceFromSite.toFixed(2)} mi from site
                  </p>
                )}
              </div>

              {selected.status === 'stale gps' && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  GPS last reported a while ago — position may be stale.
                </div>
              )}

              {selected.status === 'issues' && distanceFromSite != null && (
                <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-900">
                  Truck {distanceFromSite.toFixed(2)} mi from site — outside the{' '}
                  {(geofence?.radiusMiles ?? selected.geofenceMiles).toFixed(2)} mi geofence.
                </div>
              )}

              <button
                type="button"
                onClick={openWorkOrder}
                className="w-full px-3 py-2.5 text-sm font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-700"
              >
                Open work order →
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
