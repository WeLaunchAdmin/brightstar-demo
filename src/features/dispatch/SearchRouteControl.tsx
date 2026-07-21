import { useEffect, useId, useMemo, useRef, useState, type MutableRefObject } from 'react'
import { getOpenWorkOrders, getWorkOrderGeofence } from '../../mock/queries'
import { geocode, getDrivingRoute, type GeocodeResult } from '../../lib/mapboxApi'
import { useDispatchStore } from '../../store/dispatchStore'

export type SearchPin = { lat: number; lng: number; label: string }
export type RouteOverlay = {
  geometry: GeoJSON.LineString
  distanceMi: number
  durationMin: number
  from: SearchPin
  to: SearchPin
}

type SearchRouteControlProps = {
  mapCenter: { lng: number; lat: number }
  onSearchPinChange: (pin: SearchPin | null) => void
  onRouteChange: (route: RouteOverlay | null) => void
  onFlyTo: (lat: number, lng: number, zoom?: number) => void
  onFitBounds: (coords: Array<[number, number]>) => void
  /** Increment to clear the Search-mode query + pin from outside (e.g. nearby panel close). */
  clearNonce?: number
}

type Mode = 'search' | 'route'

type Endpoint = {
  query: string
  result: GeocodeResult | null
  suggestions: GeocodeResult[]
  open: boolean
  loading: boolean
  error: string | null
}

const emptyEndpoint = (): Endpoint => ({
  query: '',
  result: null,
  suggestions: [],
  open: false,
  loading: false,
  error: null,
})

export function SearchRouteControl({
  mapCenter,
  onSearchPinChange,
  onRouteChange,
  onFlyTo,
  onFitBounds,
  clearNonce = 0,
}: SearchRouteControlProps) {
  const [mode, setMode] = useState<Mode>('search')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchSuggestions, setSearchSuggestions] = useState<GeocodeResult[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  const [from, setFrom] = useState<Endpoint>(emptyEndpoint)
  const [to, setTo] = useState<Endpoint>(emptyEndpoint)
  const [routeLoading, setRouteLoading] = useState(false)
  const [routeError, setRouteError] = useState<string | null>(null)
  const [routeStats, setRouteStats] = useState<{ distanceMi: number; durationMin: number } | null>(
    null,
  )
  const [woPickerOpen, setWoPickerOpen] = useState(false)

  const selectedWoId = useDispatchStore((s) => s.selectedWoId)
  const selectedWoCoords = useDispatchStore((s) => s.selectedWoCoords)

  const searchAbort = useRef<AbortController | null>(null)
  const fromAbort = useRef<AbortController | null>(null)
  const toAbort = useRef<AbortController | null>(null)
  const routeAbort = useRef<AbortController | null>(null)
  /** After an address is chosen, block geocode until the user types again. */
  const searchLockedRef = useRef(false)
  const mapCenterRef = useRef(mapCenter)
  mapCenterRef.current = mapCenter
  const onSearchPinChangeRef = useRef(onSearchPinChange)
  onSearchPinChangeRef.current = onSearchPinChange
  const listId = useId()

  const openWos = useMemo(() => getOpenWorkOrders(), [])

  useEffect(() => {
    if (clearNonce === 0) return
    searchLockedRef.current = false
    setSearchQuery('')
    setSearchSuggestions([])
    setSearchOpen(false)
    setSearchError(null)
    onSearchPinChangeRef.current(null)
  }, [clearNonce])

  // Geocode only when the user edits the search query — not on map move / focus / pin callbacks.
  useEffect(() => {
    if (mode !== 'search') return
    if (searchLockedRef.current) return

    const q = searchQuery.trim()
    if (q.length < 2) {
      setSearchSuggestions([])
      setSearchOpen(false)
      setSearchError(null)
      setSearchLoading(false)
      onSearchPinChangeRef.current(null)
      return
    }

    setSearchLoading(true)
    setSearchError(null)
    searchAbort.current?.abort()
    const controller = new AbortController()
    searchAbort.current = controller

    const timer = window.setTimeout(async () => {
      const results = await geocode(q, mapCenterRef.current, controller.signal)
      if (controller.signal.aborted) return
      // User may have committed a result while this request was in flight
      if (searchLockedRef.current) return
      setSearchLoading(false)
      setSearchSuggestions(results)
      setSearchOpen(results.length > 0)
      if (results.length === 0) setSearchError('No results')
    }, 300)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [searchQuery, mode])

  useDebouncedGeocode(from.query, mapCenterRef, fromAbort, (patch) => setFrom((s) => ({ ...s, ...patch })))
  useDebouncedGeocode(to.query, mapCenterRef, toAbort, (patch) => setTo((s) => ({ ...s, ...patch })))

  function selectSearchResult(result: GeocodeResult) {
    searchLockedRef.current = true
    setSearchQuery(result.fullAddress)
    setSearchSuggestions([])
    setSearchOpen(false)
    setSearchLoading(false)
    setSearchError(null)
    onSearchPinChange({ lat: result.lat, lng: result.lng, label: result.name })
    onFlyTo(result.lat, result.lng, 14)
  }

  function clearSearch() {
    searchLockedRef.current = false
    setSearchQuery('')
    setSearchSuggestions([])
    setSearchOpen(false)
    setSearchLoading(false)
    setSearchError(null)
    onSearchPinChange(null)
  }

  function onSearchQueryChange(value: string) {
    searchLockedRef.current = false
    setSearchQuery(value)
  }

  function swapEndpoints() {
    setFrom(to)
    setTo(from)
    setRouteStats(null)
    setRouteError(null)
    onRouteChange(null)
  }

  function pickEndpoint(which: 'from' | 'to', result: GeocodeResult) {
    const next: Endpoint = {
      query: result.fullAddress,
      result,
      suggestions: [],
      open: false,
      loading: false,
      error: null,
    }
    if (which === 'from') setFrom(next)
    else setTo(next)
    setRouteStats(null)
    setRouteError(null)
    onRouteChange(null)
  }

  async function applyRoute() {
    if (!from.result || !to.result) return
    setRouteLoading(true)
    setRouteError(null)
    routeAbort.current?.abort()
    const controller = new AbortController()
    routeAbort.current = controller

    const route = await getDrivingRoute(
      { lng: from.result.lng, lat: from.result.lat },
      { lng: to.result.lng, lat: to.result.lat },
      controller.signal,
    )
    if (controller.signal.aborted) return
    setRouteLoading(false)

    if (!route) {
      setRouteStats(null)
      setRouteError('Route unavailable')
      onRouteChange(null)
      return
    }

    setRouteStats({ distanceMi: route.distanceMi, durationMin: route.durationMin })
    onRouteChange({
      geometry: route.geometry,
      distanceMi: route.distanceMi,
      durationMin: route.durationMin,
      from: { lat: from.result.lat, lng: from.result.lng, label: from.result.name },
      to: { lat: to.result.lat, lng: to.result.lng, label: to.result.name },
    })
    onFitBounds(route.geometry.coordinates as Array<[number, number]>)
  }

  function useSelectedWoAsTo() {
    if (selectedWoId && selectedWoCoords) {
      const label = selectedWoId
      setTo({
        query: label,
        result: {
          id: `wo-${selectedWoId}`,
          name: selectedWoId,
          fullAddress: selectedWoId,
          lat: selectedWoCoords.lat,
          lng: selectedWoCoords.lng,
        },
        suggestions: [],
        open: false,
        loading: false,
        error: null,
      })
      setWoPickerOpen(false)
      setRouteStats(null)
      onRouteChange(null)
      return
    }
    setWoPickerOpen((v) => !v)
  }

  function pickWoAsTo(woId: string) {
    const geo = getWorkOrderGeofence(woId)
    if (!geo) return
    setTo({
      query: woId,
      result: {
        id: `wo-${woId}`,
        name: woId,
        fullAddress: woId,
        lat: geo.center.lat,
        lng: geo.center.lng,
      },
      suggestions: [],
      open: false,
      loading: false,
      error: null,
    })
    setWoPickerOpen(false)
    setRouteStats(null)
    onRouteChange(null)
  }

  const canApply = Boolean(from.result && to.result) && !routeLoading

  return (
    <div
      className="absolute top-2 left-1/2 -translate-x-1/2 z-40 w-[min(26rem,calc(100%-2rem))]"
      data-tour="search-route"
    >
      <div className="bg-white rounded-xl border border-gray-200 shadow-md overflow-visible">
        <div className="flex items-center gap-0.5 p-0.5 border-b border-gray-100">
          <button
            type="button"
            onClick={() => {
              setMode('search')
              onRouteChange(null)
              setRouteStats(null)
              setRouteError(null)
            }}
            className={`flex-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
              mode === 'search' ? 'bg-white text-slate-900 shadow-sm border border-gray-200' : 'text-gray-500'
            }`}
          >
            Search
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('route')
              onSearchPinChange(null)
              clearSearch()
            }}
            className={`flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
              mode === 'route' ? 'bg-sky-600 text-white' : 'text-gray-500'
            }`}
          >
            <RouteIcon /> Route
          </button>
        </div>

        {mode === 'search' ? (
          <div className="px-2 py-1.5 relative">
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                <SearchIcon />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                onFocus={() => {
                  if (!searchLockedRef.current && searchSuggestions.length > 0) {
                    setSearchOpen(true)
                  }
                }}
                placeholder="Search address…"
                className="w-full pl-8 pr-14 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                aria-autocomplete="list"
                aria-controls={listId}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[11px] font-medium text-gray-500 hover:text-gray-800 px-1.5 py-0.5"
                >
                  Clear
                </button>
              )}
            </div>
            {searchLoading && <p className="text-[10px] text-gray-400 mt-1">Searching…</p>}
            {searchError && !searchLoading && (
              <p className="text-[10px] text-gray-500 mt-1">{searchError}</p>
            )}
            {searchOpen && searchSuggestions.length > 0 && (
              <ul
                id={listId}
                className="absolute left-2 right-2 top-full mt-0.5 z-50 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-56 overflow-y-auto"
              >
                {searchSuggestions.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => selectSearchResult(item)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                    >
                      <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                      <p className="text-xs text-gray-500 truncate">{item.fullAddress}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="px-2 py-1.5 space-y-1.5 relative">
            <div className="flex items-start gap-1.5">
              <div className="flex-1 space-y-1.5">
                <EndpointInput
                  tone="from"
                  endpoint={from}
                  placeholder="From address…"
                  onQueryChange={(query) => {
                    setFrom((s) => ({ ...s, query, result: null, open: true }))
                    setRouteStats(null)
                    onRouteChange(null)
                  }}
                  onSelect={(r) => pickEndpoint('from', r)}
                  onFocus={() => setFrom((s) => ({ ...s, open: true }))}
                />
                <EndpointInput
                  tone="to"
                  endpoint={to}
                  placeholder="To address…"
                  onQueryChange={(query) => {
                    setTo((s) => ({ ...s, query, result: null, open: true }))
                    setRouteStats(null)
                    onRouteChange(null)
                  }}
                  onSelect={(r) => pickEndpoint('to', r)}
                  onFocus={() => setTo((s) => ({ ...s, open: true }))}
                />
              </div>
              <button
                type="button"
                title="Swap"
                onClick={swapEndpoints}
                className="mt-5 w-7 h-7 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 inline-flex items-center justify-center"
              >
                <SwapIcon />
              </button>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={useSelectedWoAsTo}
                  className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-md border border-gray-200 text-slate-700 hover:bg-gray-50"
                  title="Use work order as To"
                >
                  <ClipboardIcon /> WO
                </button>
                {woPickerOpen && (
                  <div className="absolute left-0 top-full mt-1 w-56 max-h-48 overflow-auto bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                    {openWos.slice(0, 12).map((wo) => (
                      <button
                        key={wo.woId}
                        type="button"
                        onClick={() => pickWoAsTo(wo.woId)}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 border-b border-gray-100 last:border-0"
                      >
                        <span className="font-semibold text-gray-900">{wo.woId}</span>
                        <span className="block text-gray-500 truncate">{wo.site}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {routeStats && (
                  <p className="text-[11px] text-gray-600 tabular-nums">
                    {routeStats.distanceMi.toFixed(1)} mi · {routeStats.durationMin} min
                  </p>
                )}
                {routeError && <p className="text-[11px] text-rose-600">{routeError}</p>}
                <button
                  type="button"
                  disabled={!canApply}
                  onClick={applyRoute}
                  className="px-2.5 py-1 text-xs font-semibold rounded-md bg-sky-500 text-white disabled:opacity-40 hover:bg-sky-600"
                >
                  {routeLoading ? 'Routing…' : 'Apply'}
                </button>
              </div>
            </div>

            {!from.result || !to.result ? (
              <p className="text-[10px] text-gray-400">Select both addresses to see distance and ETA.</p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}

function useDebouncedGeocode(
  query: string,
  mapCenterRef: MutableRefObject<{ lng: number; lat: number }>,
  abortRef: MutableRefObject<AbortController | null>,
  apply: (patch: Partial<Endpoint>) => void,
) {
  const applyRef = useRef(apply)
  applyRef.current = apply

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      applyRef.current({ suggestions: [], loading: false, error: null })
      return
    }

    applyRef.current({ loading: true, error: null })
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const timer = window.setTimeout(async () => {
      const results = await geocode(q, mapCenterRef.current, controller.signal)
      if (controller.signal.aborted) return
      applyRef.current({
        loading: false,
        suggestions: results,
        open: true,
        error: results.length === 0 ? 'No results' : null,
      })
    }, 300)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [query, abortRef, mapCenterRef])
}

function EndpointInput({
  tone,
  endpoint,
  placeholder,
  onQueryChange,
  onSelect,
  onFocus,
}: {
  tone: 'from' | 'to'
  endpoint: Endpoint
  placeholder: string
  onQueryChange: (q: string) => void
  onSelect: (r: GeocodeResult) => void
  onFocus: () => void
}) {
  const badge = tone === 'from' ? 'bg-emerald-500' : 'bg-rose-500'
  const letter = tone === 'from' ? 'A' : 'B'

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <span
          className={`w-6 h-6 rounded-full ${badge} text-white text-[11px] font-bold inline-flex items-center justify-center shrink-0`}
        >
          {letter}
        </span>
        <input
          type="text"
          value={endpoint.query}
          onChange={(e) => onQueryChange(e.target.value)}
          onFocus={onFocus}
          placeholder={placeholder}
          className="flex-1 px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
      </div>
      {endpoint.loading && <p className="ml-8 text-[10px] text-gray-400 mt-1">Searching…</p>}
      {endpoint.error && !endpoint.loading && (
        <p className="ml-8 text-[10px] text-gray-500 mt-1">{endpoint.error}</p>
      )}
      {endpoint.open && endpoint.suggestions.length > 0 && !endpoint.result && (
        <ul className="absolute left-8 right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-lg max-h-44 overflow-auto">
          {endpoint.suggestions.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect(item)}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-0"
              >
                <p className="text-xs font-medium text-gray-900 truncate">{item.name}</p>
                <p className="text-[11px] text-gray-500 truncate">{item.fullAddress}</p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function SearchIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
    </svg>
  )
}

function RouteIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 15.18V7c0-2.21-1.79-4-4-4s-4 1.79-4 4v10c0 1.1-.9 2-2 2s-2-.9-2-2V8.82C8.16 8.4 9 7.3 9 6c0-1.66-1.34-3-3-3S3 4.34 3 6c0 1.3.84 2.4 2 2.82V17c0 2.21 1.79 4 4 4s4-1.79 4-4V7c0-1.1.9-2 2-2s2 .9 2 2v8.18c-1.16.42-2 1.52-2 2.82 0 1.66 1.34 3 3 3s3-1.34 3-3c0-1.3-.84-2.4-2-2.82z" />
    </svg>
  )
}

function SwapIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16 17.01V10h-2v7.01h-3L15 21l4-3.99h-3zM9 3 5 6.99h3V14h2V6.99h3L9 3z" />
    </svg>
  )
}

function ClipboardIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm7 18H5V5h2v3h10V5h2v16z" />
    </svg>
  )
}
