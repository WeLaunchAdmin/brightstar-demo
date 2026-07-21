import { useCallback, useEffect, useRef, useState } from 'react'
import { Layer, Map, Marker, NavigationControl, Source, useMap } from 'react-map-gl/mapbox'
import { Truck } from 'lucide-react'
import 'mapbox-gl/dist/mapbox-gl.css'
import type { GpsStatus } from '../mock/types'

const NYC_CENTER = {
  longitude: -74.006,
  latitude: 40.7128,
  zoom: 11,
}

export type FleetMapMarkerKind = 'truck' | 'wo' | 'schedule' | 'checkin' | 'lastKnown'

export type FleetMapMarker = {
  id: string
  kind: FleetMapMarkerKind
  lat: number
  lng: number
  /** Display label — asset ID or WO ID only on the dispatch board */
  label: string
  status?: GpsStatus
  selected?: boolean
}

export type FleetMapFocus = {
  lat: number
  lng: number
  zoom?: number
  nonce: number
}

export type FleetMapSearchPin = {
  lat: number
  lng: number
  label?: string
}

export type FleetMapRouteBounds = {
  coordinates: Array<[number, number]>
  nonce: number
}

export type FleetMapGeofence = {
  center: { lat: number; lng: number }
  radiusMiles: number
}

type FleetMapProps = {
  children?: React.ReactNode
  markers?: FleetMapMarker[]
  fitToMarkers?: boolean
  /** Increment to re-run fit-bounds on current markers */
  fitNonce?: number
  focus?: FleetMapFocus | null
  routeBounds?: FleetMapRouteBounds | null
  searchPin?: FleetMapSearchPin | null
  routeGeometry?: GeoJSON.LineString | null
  routeEndpoints?: { from: FleetMapSearchPin; to: FleetMapSearchPin } | null
  /** Orange geofence fill+outline around a WO site */
  geofence?: FleetMapGeofence | null
  /** Dotted breadcrumb line (e.g. check-in → last known) */
  breadcrumb?: GeoJSON.LineString | null
  onMarkerClick?: (marker: FleetMapMarker) => void
  onMapCenterChange?: (center: { lng: number; lat: number }) => void
  showFitButton?: boolean
  className?: string
  /** Defaults to light-v11 so Day analysis / other pages stay unchanged */
  mapStyle?: string
}

function FitToMarkers({ markers, fitNonce }: { markers: FleetMapMarker[]; fitNonce?: number }) {
  const { current: map } = useMap()
  const markersRef = useRef(markers)
  markersRef.current = markers
  const didInitialFit = useRef(false)

  const applyFit = useCallback(() => {
    if (!map) return
    const list = markersRef.current
    if (list.length === 0) return
    if (list.length === 1) {
      map.flyTo({ center: [list[0].lng, list[0].lat], zoom: 12, duration: 600 })
      return
    }
    const lats = list.map((m) => m.lat)
    const lngs = list.map((m) => m.lng)
    map.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      { padding: 64, duration: 600, maxZoom: 13 },
    )
  }, [map])

  // One-time fit when markers first become available — NOT on selection/highlight changes.
  useEffect(() => {
    if (!map || didInitialFit.current || markers.length === 0) return
    didInitialFit.current = true
    applyFit()
  }, [map, markers.length, applyFit])

  // Explicit "Fit all" / refresh via fitNonce only.
  useEffect(() => {
    if (fitNonce === undefined || fitNonce === 0) return
    applyFit()
  }, [fitNonce, applyFit])

  return null
}

function FocusCamera({ focus }: { focus?: FleetMapFocus | null }) {
  const { current: map } = useMap()

  useEffect(() => {
    if (!map || !focus) return
    map.flyTo({
      center: [focus.lng, focus.lat],
      zoom: focus.zoom ?? 14,
      duration: 700,
    })
  }, [map, focus])

  return null
}

function RouteBoundsCamera({ routeBounds }: { routeBounds?: FleetMapRouteBounds | null }) {
  const { current: map } = useMap()

  useEffect(() => {
    if (!map || !routeBounds || routeBounds.coordinates.length === 0) return
    const lngs = routeBounds.coordinates.map((c) => c[0])
    const lats = routeBounds.coordinates.map((c) => c[1])
    map.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      { padding: 80, duration: 800, maxZoom: 14 },
    )
  }, [map, routeBounds])

  return null
}

function MapCenterReporter({
  onMapCenterChange,
}: {
  onMapCenterChange?: (center: { lng: number; lat: number }) => void
}) {
  const { current: map } = useMap()

  useEffect(() => {
    if (!map || !onMapCenterChange) return
    const report = () => {
      const c = map.getCenter()
      onMapCenterChange({ lng: c.lng, lat: c.lat })
    }
    report()
    map.on('moveend', report)
    return () => {
      map.off('moveend', report)
    }
  }, [map, onMapCenterChange])

  return null
}

function FitButton({ markers }: { markers: FleetMapMarker[] }) {
  const { current: map } = useMap()

  function handleFit() {
    if (!map || markers.length === 0) return
    if (markers.length === 1) {
      map.flyTo({ center: [markers[0].lng, markers[0].lat], zoom: 12, duration: 600 })
      return
    }
    const lats = markers.map((m) => m.lat)
    const lngs = markers.map((m) => m.lng)
    map.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      { padding: 64, duration: 600, maxZoom: 13 },
    )
  }

  return (
    <button
      type="button"
      onClick={handleFit}
      className="absolute bottom-6 right-3 z-10 px-3 py-1.5 text-xs font-semibold bg-white border border-gray-200 rounded-lg shadow-sm text-gray-800 hover:bg-gray-50"
    >
      Fit
    </button>
  )
}

function MarkerGlyph({
  marker,
  onClick,
}: {
  marker: FleetMapMarker
  onClick?: (marker: FleetMapMarker) => void
}) {
  const selectedRing = marker.selected ? 'ring-2 ring-offset-1 ring-indigo-500' : ''
  const [labelPinned, setLabelPinned] = useState(false)

  if (marker.kind === 'checkin') {
    return (
      <button
        type="button"
        title={marker.label}
        onClick={(e) => {
          e.stopPropagation()
          onClick?.(marker)
        }}
        className={`cursor-pointer ${selectedRing} rounded-full`}
      >
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500 border-2 border-white shadow-md text-white text-[10px] font-bold">
          IN
        </span>
      </button>
    )
  }

  if (marker.kind === 'lastKnown') {
    return (
      <button
        type="button"
        title={marker.label}
        onClick={(e) => {
          e.stopPropagation()
          onClick?.(marker)
        }}
        className={`cursor-pointer ${selectedRing} rounded-full`}
      >
        <span className="block w-3.5 h-3.5 rounded-full bg-emerald-600 border-2 border-white shadow" />
      </button>
    )
  }

  if (marker.kind === 'wo' || marker.kind === 'schedule') {
    const isSchedule = marker.kind === 'schedule'
    const tone = isSchedule
      ? { dot: 'bg-sky-500', border: 'border-sky-500' }
      : { dot: 'bg-orange-500', border: 'border-orange-500' }
    const shortLabel = formatWoPillLabel(marker.label)
    return (
      <button
        type="button"
        title={marker.label}
        data-tour="wo-pill"
        onClick={(e) => {
          e.stopPropagation()
          onClick?.(marker)
        }}
        className={`group cursor-pointer ${selectedRing} rounded-full`}
      >
        <span
          className={`inline-flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-full bg-white border-2 ${tone.border} shadow-md hover:shadow-lg transition-shadow`}
        >
          <span className={`w-2 h-2 rounded-full shrink-0 ${tone.dot}`} />
          <span className="text-[11px] font-semibold text-gray-900 tabular-nums leading-none">
            {shortLabel}
          </span>
        </span>
      </button>
    )
  }

  const truckTone = truckMarkerTone(marker.status)
  const showLabel = labelPinned
  return (
    <button
      type="button"
      title={marker.label}
      onClick={(e) => {
        e.stopPropagation()
        setLabelPinned((v) => !v)
        onClick?.(marker)
      }}
      onBlur={() => setLabelPinned(false)}
      className={`relative group cursor-pointer ${selectedRing} rounded-lg`}
    >
      <span
        className={`inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white border-2 shadow-md ${truckTone.border} ${truckTone.icon}`}
      >
        <Truck className="w-4 h-4" strokeWidth={2.25} />
      </span>
      <span
        className={`pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 px-1.5 py-0.5 rounded bg-gray-900 text-white text-[10px] font-semibold whitespace-nowrap shadow transition-opacity ${
          showLabel ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
      >
        {marker.label}
      </span>
    </button>
  )
}

function formatWoPillLabel(woId: string): string {
  const digits = woId.replace(/\D/g, '')
  if (digits.length >= 4) return `#${digits.slice(-4)}`
  return woId.startsWith('#') ? woId : `#${woId}`
}

function truckMarkerTone(status?: GpsStatus): { border: string; icon: string } {
  if (status === 'moving') return { border: 'border-emerald-600', icon: 'text-emerald-600' }
  if (status === 'idling') return { border: 'border-amber-500', icon: 'text-amber-500' }
  if (status === 'stale') return { border: 'border-rose-600', icon: 'text-rose-600' }
  return { border: 'border-slate-500', icon: 'text-slate-500' } // parked / default
}

/** Approximate circle polygon for Mapbox fill/line layers (radius in miles). */
function circlePolygon(
  lng: number,
  lat: number,
  radiusMiles: number,
  points = 64,
): GeoJSON.Polygon {
  const coords: Array<[number, number]> = []
  const latRad = (radiusMiles / 69.0)
  const lngRad = radiusMiles / (69.0 * Math.cos((lat * Math.PI) / 180))
  for (let i = 0; i <= points; i++) {
    const t = (i / points) * Math.PI * 2
    coords.push([
      Math.round((lng + lngRad * Math.cos(t)) * 100000) / 100000,
      Math.round((lat + latRad * Math.sin(t)) * 100000) / 100000,
    ])
  }
  return { type: 'Polygon', coordinates: [coords] }
}

export function FleetMap({
  children,
  markers = [],
  fitToMarkers = false,
  fitNonce,
  focus = null,
  routeBounds = null,
  searchPin = null,
  routeGeometry = null,
  routeEndpoints = null,
  geofence = null,
  breadcrumb = null,
  onMarkerClick,
  onMapCenterChange,
  showFitButton = false,
  className,
  mapStyle = 'mapbox://styles/mapbox/light-v11',
}: FleetMapProps) {
  const token = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined

  if (!token) {
    return (
      <div
        className={`flex h-full items-center justify-center bg-gray-100 border border-dashed border-gray-300 rounded-xl ${className ?? ''}`}
      >
        <div className="text-center px-4">
          <p className="text-sm font-medium text-gray-900">Fleet Map placeholder</p>
          <p className="text-xs text-gray-500 mt-1">Add VITE_MAPBOX_TOKEN to your .env to load the map.</p>
          {markers.length > 0 && (
            <p className="text-xs text-gray-400 mt-2">{markers.length} marker(s) ready</p>
          )}
        </div>
      </div>
    )
  }

  const geofenceGeo = geofence
    ? circlePolygon(geofence.center.lng, geofence.center.lat, geofence.radiusMiles)
    : null

  return (
    <div className={`relative h-full w-full min-h-[240px] ${className ?? ''}`} data-tour="fleet-map">
      <Map
        mapboxAccessToken={token}
        initialViewState={NYC_CENTER}
        mapStyle={mapStyle}
        style={{ width: '100%', height: '100%' }}
      >
        <NavigationControl position="top-right" />
        <MapCenterReporter onMapCenterChange={onMapCenterChange} />
        {(fitToMarkers || fitNonce !== undefined) && markers.length > 0 && (
          <FitToMarkers markers={markers} fitNonce={fitNonce} />
        )}
        <FocusCamera focus={focus} />
        <RouteBoundsCamera routeBounds={routeBounds} />
        {geofenceGeo && (
          <Source
            id="fleet-geofence"
            type="geojson"
            data={{ type: 'Feature', properties: {}, geometry: geofenceGeo }}
          >
            <Layer
              id="fleet-geofence-fill"
              type="fill"
              paint={{
                'fill-color': '#f97316',
                'fill-opacity': 0.12,
              }}
            />
            <Layer
              id="fleet-geofence-outline"
              type="line"
              paint={{
                'line-color': '#ea580c',
                'line-width': 2,
                'line-opacity': 0.85,
              }}
            />
          </Source>
        )}
        {breadcrumb && (
          <Source
            id="fleet-breadcrumb"
            type="geojson"
            data={{
              type: 'Feature',
              properties: {},
              geometry: breadcrumb,
            }}
          >
            <Layer
              id="fleet-breadcrumb-line"
              type="line"
              paint={{
                'line-color': '#f97316',
                'line-width': 2.5,
                'line-opacity': 0.9,
                'line-dasharray': [1.5, 1.5],
              }}
            />
          </Source>
        )}
        {routeGeometry && (
          <Source
            id="dispatch-route"
            type="geojson"
            data={{
              type: 'Feature',
              properties: {},
              geometry: routeGeometry,
            }}
          >
            <Layer
              id="dispatch-route-line"
              type="line"
              paint={{
                'line-color': '#0ea5e9',
                'line-width': 4,
                'line-opacity': 0.9,
              }}
            />
          </Source>
        )}
        {markers.map((marker) => (
          <Marker key={marker.id} longitude={marker.lng} latitude={marker.lat} anchor="bottom">
            <MarkerGlyph marker={marker} onClick={onMarkerClick} />
          </Marker>
        ))}
        {routeEndpoints?.from && (
          <Marker longitude={routeEndpoints.from.lng} latitude={routeEndpoints.from.lat} anchor="bottom">
            <EndpointPin letter="A" tone="from" />
          </Marker>
        )}
        {routeEndpoints?.to && (
          <Marker longitude={routeEndpoints.to.lng} latitude={routeEndpoints.to.lat} anchor="bottom">
            <EndpointPin letter="B" tone="to" />
          </Marker>
        )}
        {searchPin && (
          <Marker longitude={searchPin.lng} latitude={searchPin.lat} anchor="bottom">
            <SearchPinGlyph label={searchPin.label} />
          </Marker>
        )}
        {showFitButton && <FitButton markers={markers} />}
        {children}
      </Map>
    </div>
  )
}

function SearchPinGlyph({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center pointer-events-none">
      <div className="w-8 h-8 rounded-full bg-violet-600 border-2 border-white shadow-md flex items-center justify-center">
        <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5c-1.4 0-2.5-1.1-2.5-2.5S10.6 6.5 12 6.5s2.5 1.1 2.5 2.5S13.4 11.5 12 11.5z" />
        </svg>
      </div>
      {label && (
        <span className="mt-1 px-1.5 py-0.5 rounded bg-white/95 text-[10px] font-semibold text-gray-800 shadow border border-gray-200 max-w-[10rem] truncate">
          {label}
        </span>
      )}
    </div>
  )
}

function EndpointPin({ letter, tone }: { letter: string; tone: 'from' | 'to' }) {
  const bg = tone === 'from' ? 'bg-emerald-500' : 'bg-rose-500'
  return (
    <div className={`w-7 h-7 rounded-full ${bg} border-2 border-white shadow-md text-white text-xs font-bold flex items-center justify-center`}>
      {letter}
    </div>
  )
}
