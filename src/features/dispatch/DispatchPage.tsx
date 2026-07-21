import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FleetMap, type FleetMapMarker, type FleetMapRouteBounds } from '../../components/FleetMap'
import { PageHeader } from '../../shell/PageHeader'
import { MapPin } from '../../shell/icons'
import {
  getFleetTelemetry,
  getNearbyTechnicians,
  getOpenWorkOrders,
  getScheduleForDate,
  getTripForWorkOrder,
  getWorkOrderGeofence,
  type NearbyCrewFilter,
} from '../../mock/queries'
import { getDrivingMatrix, getDrivingRoute } from '../../lib/mapboxApi'
import { CREW_TO_TRADE, useDispatchStore } from '../../store/dispatchStore'
import { DispatchControls } from './DispatchControls'
import { LayerPills } from './LayerPills'
import { FloatingDispatchCards } from './FloatingDispatchCards'
import { WoDetailCard } from './WoDetailCard'
import { TechDetailCard } from './TechDetailCard'
import { DispatchToast } from './DispatchToast'
import {
  NearbyTechniciansPanel,
  type NearbyRankedRow,
} from './NearbyTechniciansPanel'
import {
  SearchRouteControl,
  type RouteOverlay,
  type SearchPin,
} from './SearchRouteControl'

const DEFAULT_CENTER = { lng: -74.006, lat: 40.7128 }
const NEARBY_MAX_MI = 30

export function DispatchPage() {
  const showLiveTechs = useDispatchStore((s) => s.showLiveTechs)
  const showWorkOrders = useDispatchStore((s) => s.showWorkOrders)
  const serviceDate = useDispatchStore((s) => s.serviceDate)
  const crewFilter = useDispatchStore((s) => s.crewFilter)
  const techSearch = useDispatchStore((s) => s.techSearch)
  const woSearch = useDispatchStore((s) => s.woSearch)
  const selectedWoId = useDispatchStore((s) => s.selectedWoId)
  const selectedAssetId = useDispatchStore((s) => s.selectedAssetId)
  const focus = useDispatchStore((s) => s.focus)
  const fitNonce = useDispatchStore((s) => s.fitNonce)
  const refreshKey = useDispatchStore((s) => s.refreshKey)
  const selectWo = useDispatchStore((s) => s.selectWo)
  const selectTech = useDispatchStore((s) => s.selectTech)
  const focusOn = useDispatchStore((s) => s.focusOn)
  const refresh = useDispatchStore((s) => s.refresh)
  const requestFit = useDispatchStore((s) => s.requestFit)

  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER)
  const [searchPin, setSearchPin] = useState<SearchPin | null>(null)
  const [routeOverlay, setRouteOverlay] = useState<RouteOverlay | null>(null)
  const [routeBounds, setRouteBounds] = useState<FleetMapRouteBounds | null>(null)

  const [nearbyOpen, setNearbyOpen] = useState(false)
  const [nearbyOrigin, setNearbyOrigin] = useState<SearchPin | null>(null)
  const [nearbyCrew, setNearbyCrew] = useState<NearbyCrewFilter>('Maintenance')
  const [nearbyRows, setNearbyRows] = useState<NearbyRankedRow[]>([])
  const [nearbyEmpty, setNearbyEmpty] = useState(false)
  const [nearbyLoading, setNearbyLoading] = useState(false)
  const [searchClearNonce, setSearchClearNonce] = useState(0)

  const matrixAbort = useRef<AbortController | null>(null)
  const routeAbort = useRef<AbortController | null>(null)

  const handleMapCenterChange = useCallback((center: { lng: number; lat: number }) => {
    setMapCenter(center)
  }, [])

  const clearNearbySelectionRoute = useCallback(() => {
    routeAbort.current?.abort()
    setRouteOverlay(null)
    setRouteBounds(null)
    selectTech(null)
  }, [selectTech])

  const runNearbySearch = useCallback(
    async (origin: SearchPin, crew: NearbyCrewFilter) => {
      matrixAbort.current?.abort()
      clearNearbySelectionRoute()

      const candidates = getNearbyTechnicians(origin.lat, origin.lng, crew)
      const tooFar =
        candidates.length === 0 || candidates[0].distanceMi > NEARBY_MAX_MI

      setNearbyOrigin(origin)
      setNearbyOpen(true)

      if (tooFar) {
        setNearbyRows([])
        setNearbyEmpty(true)
        setNearbyLoading(false)
        return
      }

      setNearbyEmpty(false)
      setNearbyLoading(true)

      const controller = new AbortController()
      matrixAbort.current = controller

      let ranked: NearbyRankedRow[]

      if (candidates.length === 1) {
        // Matrix API requires ≥2 elements; use Directions for a single destination.
        const only = candidates[0]
        const route = await getDrivingRoute(
          { lng: origin.lng, lat: origin.lat },
          { lng: only.lng, lat: only.lat },
          controller.signal,
        )
        if (controller.signal.aborted) return
        ranked = [
          {
            ...only,
            etaMin: route?.durationMin ?? null,
            driveDistanceMi: route?.distanceMi ?? null,
          },
        ]
      } else {
        const matrix = await getDrivingMatrix(
          { lng: origin.lng, lat: origin.lat },
          candidates.map((c) => ({ lng: c.lng, lat: c.lat })),
          controller.signal,
        )
        if (controller.signal.aborted) return

        ranked = candidates.map((c, i) => ({
          ...c,
          etaMin: matrix?.[i]?.durationMin ?? null,
          driveDistanceMi: matrix?.[i]?.distanceMi ?? null,
        }))
      }

      ranked.sort((a, b) => {
        const aEta = a.etaMin ?? Number.POSITIVE_INFINITY
        const bEta = b.etaMin ?? Number.POSITIVE_INFINITY
        if (aEta !== bEta) return aEta - bEta
        return a.distanceMi - b.distanceMi || a.assetId.localeCompare(b.assetId)
      })

      setNearbyRows(ranked)
      setNearbyLoading(false)
    },
    [clearNearbySelectionRoute],
  )

  const handleSearchPinChange = useCallback(
    (pin: SearchPin | null) => {
      setSearchPin(pin)
      if (!pin) {
        matrixAbort.current?.abort()
        setNearbyOpen(false)
        setNearbyOrigin(null)
        setNearbyRows([])
        setNearbyEmpty(false)
        setNearbyLoading(false)
        return
      }
      void runNearbySearch(pin, nearbyCrew)
    },
    [nearbyCrew, runNearbySearch],
  )

  const handleRouteChange = useCallback((route: RouteOverlay | null) => {
    setRouteOverlay(route)
    if (!route) setRouteBounds(null)
  }, [])

  const handleFlyTo = useCallback(
    (lat: number, lng: number, zoom?: number) => {
      focusOn(lat, lng, zoom ?? 14)
    },
    [focusOn],
  )

  const handleFitBounds = useCallback((coords: Array<[number, number]>) => {
    setRouteBounds((prev) => ({
      coordinates: coords,
      nonce: (prev?.nonce ?? 0) + 1,
    }))
  }, [])

  const handleNearbyCrewChange = useCallback(
    (crew: NearbyCrewFilter) => {
      setNearbyCrew(crew)
      if (nearbyOrigin) void runNearbySearch(nearbyOrigin, crew)
    },
    [nearbyOrigin, runNearbySearch],
  )

  const handleNearbySelect = useCallback(
    async (row: NearbyRankedRow) => {
      if (!nearbyOrigin) return
      selectTech(row.assetId)

      routeAbort.current?.abort()
      const controller = new AbortController()
      routeAbort.current = controller

      const route = await getDrivingRoute(
        { lng: nearbyOrigin.lng, lat: nearbyOrigin.lat },
        { lng: row.lng, lat: row.lat },
        controller.signal,
      )
      if (controller.signal.aborted || !route) return

      const from: SearchPin = {
        lat: nearbyOrigin.lat,
        lng: nearbyOrigin.lng,
        label: nearbyOrigin.label,
      }
      const to: SearchPin = {
        lat: row.lat,
        lng: row.lng,
        label: row.assetId,
      }
      // Single camera move: frame address ↔ tech once via RouteBoundsCamera.
      // Do not also focusOn — that fought FitToMarkers / double-animated the view.
      setRouteOverlay({
        geometry: route.geometry,
        distanceMi: route.distanceMi,
        durationMin: route.durationMin,
        from,
        to,
      })
      setRouteBounds((prev) => ({
        coordinates: [
          [nearbyOrigin.lng, nearbyOrigin.lat],
          [row.lng, row.lat],
        ],
        nonce: (prev?.nonce ?? 0) + 1,
      }))
    },
    [nearbyOrigin, selectTech],
  )

  const handleNearbyReset = useCallback(() => {
    clearNearbySelectionRoute()
  }, [clearNearbySelectionRoute])

  const handleNearbyClose = useCallback(() => {
    matrixAbort.current?.abort()
    clearNearbySelectionRoute()
    setNearbyOpen(false)
    setNearbyOrigin(null)
    setNearbyRows([])
    setNearbyEmpty(false)
    setNearbyLoading(false)
    setSearchPin(null)
    setSearchClearNonce((n) => n + 1)
  }, [clearNearbySelectionRoute])

  // Keep nearby crew in sync when user first opens via global filter (optional nicety)
  useEffect(() => {
    if (crewFilter !== 'all') setNearbyCrew(crewFilter)
  }, [crewFilter])

  const techPool = useMemo(() => {
    void refreshKey
    const trade = crewFilter === 'all' ? null : CREW_TO_TRADE[crewFilter]
    return getFleetTelemetry({ active: true }).filter((t) => (trade ? t.trade === trade : true))
  }, [crewFilter, refreshKey])

  const openPool = useMemo(() => {
    void refreshKey
    return getOpenWorkOrders()
  }, [refreshKey])

  const markers = useMemo(() => {
    const result: FleetMapMarker[] = []
    const techQ = techSearch.trim().toLowerCase()
    const woQ = woSearch.trim().toLowerCase()

    if (showLiveTechs) {
      const techs = techPool.filter((t) => {
        if (!techQ) return true
        return t.assetId.toLowerCase().includes(techQ)
      })
      for (const tech of techs) {
        result.push({
          id: `tech-${tech.assetId}`,
          kind: 'truck',
          lat: tech.lat,
          lng: tech.lng,
          label: tech.assetId,
          status: tech.gpsStatus,
          selected: selectedAssetId === tech.assetId,
        })
      }
    }

    if (showWorkOrders) {
      const open = openPool.filter((wo) => {
        if (!woQ) return true
        const trip = getTripForWorkOrder(wo.woId, serviceDate)
        return (
          wo.woId.toLowerCase().includes(woQ) ||
          (trip?.tripId.toLowerCase().includes(woQ) ?? false)
        )
      })

      for (const wo of open) {
        const geo = getWorkOrderGeofence(wo.woId)
        if (!geo) continue
        result.push({
          id: `wo-open-${wo.woId}`,
          kind: 'wo',
          lat: geo.center.lat,
          lng: geo.center.lng,
          label: wo.woId,
          selected: selectedWoId === wo.woId,
        })
      }

      const scheduled = getScheduleForDate(serviceDate)
      const seen = new Set(open.map((wo) => wo.woId))
      for (const row of scheduled) {
        if (seen.has(row.woId)) continue
        if (woQ) {
          const matches =
            row.woId.toLowerCase().includes(woQ) || row.tripId.toLowerCase().includes(woQ)
          if (!matches) continue
        }
        seen.add(row.woId)
        const geo = getWorkOrderGeofence(row.woId)
        if (!geo) continue
        result.push({
          id: `wo-sched-${row.woId}`,
          kind: 'schedule',
          lat: geo.center.lat,
          lng: geo.center.lng,
          label: row.woId,
          selected: selectedWoId === row.woId,
        })
      }
    }

    return result
  }, [
    showLiveTechs,
    showWorkOrders,
    serviceDate,
    techSearch,
    woSearch,
    techPool,
    openPool,
    selectedWoId,
    selectedAssetId,
  ])

  const techVisible = markers.filter((m) => m.kind === 'truck').length
  const woVisible = markers.filter((m) => m.kind === 'wo' || m.kind === 'schedule').length
  const techTotal = techPool.length
  const woTotal =
    openPool.length +
    getScheduleForDate(serviceDate).filter((s) => !openPool.some((o) => o.woId === s.woId)).length

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        icon={<MapPin className="w-5 h-5" />}
        title="Daily Dispatch"
        subtitle="Live field control tower"
        onRefresh={() => {
          refresh()
          requestFit()
          setSearchPin(null)
          setRouteOverlay(null)
          setRouteBounds(null)
          setNearbyOpen(false)
          setNearbyOrigin(null)
          setNearbyRows([])
          setNearbyEmpty(false)
          setSearchClearNonce((n) => n + 1)
        }}
      />

      <div className="relative flex-1 min-h-0 bg-gray-100 overflow-hidden">
        <FleetMap
          markers={markers}
          fitToMarkers
          fitNonce={fitNonce}
          focus={focus}
          routeBounds={routeBounds}
          searchPin={searchPin}
          routeGeometry={routeOverlay?.geometry ?? null}
          routeEndpoints={
            routeOverlay
              ? { from: routeOverlay.from, to: routeOverlay.to }
              : null
          }
          onMapCenterChange={handleMapCenterChange}
          mapStyle="mapbox://styles/mapbox/streets-v12"
          onMarkerClick={(marker) => {
            if (marker.kind === 'wo' || marker.kind === 'schedule') {
              selectWo(marker.label, { lat: marker.lat, lng: marker.lng })
              focusOn(marker.lat, marker.lng, 14)
            } else if (marker.kind === 'truck') {
              selectTech(marker.label)
              focusOn(marker.lat, marker.lng, 14)
            }
          }}
          className="h-full"
        />

        <SearchRouteControl
          mapCenter={mapCenter}
          onSearchPinChange={handleSearchPinChange}
          onRouteChange={handleRouteChange}
          onFlyTo={handleFlyTo}
          onFitBounds={handleFitBounds}
          clearNonce={searchClearNonce}
        />

        {nearbyOpen && nearbyOrigin && (
          <NearbyTechniciansPanel
            originLabel={nearbyOrigin.label}
            crewFilter={nearbyCrew}
            onCrewFilterChange={handleNearbyCrewChange}
            rows={nearbyRows}
            empty={nearbyEmpty}
            loading={nearbyLoading}
            selectedAssetId={selectedAssetId}
            onSelect={(row) => {
              void handleNearbySelect(row)
            }}
            onReset={handleNearbyReset}
            onClose={handleNearbyClose}
          />
        )}

        <DispatchControls />
        <WoDetailCard />
        <TechDetailCard />
        <FloatingDispatchCards
          techVisible={techVisible}
          techTotal={techTotal}
          woVisible={woVisible}
          woTotal={woTotal}
        />
        <LayerPills />
        <DispatchToast />
      </div>
    </div>
  )
}
