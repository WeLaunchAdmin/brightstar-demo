export type GeocodeResult = {
  id: string
  name: string
  fullAddress: string
  lat: number
  lng: number
}

export type RouteResult = {
  geometry: GeoJSON.LineString
  distanceMi: number
  durationMin: number
}

function getToken(): string | undefined {
  const token = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined
  return token?.trim() || undefined
}

function parseFeature(feature: Record<string, unknown>): GeocodeResult | null {
  const id = String(feature.id ?? '')
  const props = (feature.properties ?? {}) as Record<string, unknown>
  const geometry = feature.geometry as { type?: string; coordinates?: number[] } | undefined

  let lng: number | undefined
  let lat: number | undefined

  const coordsObj = props.coordinates as { longitude?: number; latitude?: number } | undefined
  if (coordsObj && typeof coordsObj.longitude === 'number' && typeof coordsObj.latitude === 'number') {
    lng = coordsObj.longitude
    lat = coordsObj.latitude
  } else if (geometry?.coordinates && geometry.coordinates.length >= 2) {
    lng = geometry.coordinates[0]
    lat = geometry.coordinates[1]
  }

  if (lng === undefined || lat === undefined || Number.isNaN(lng) || Number.isNaN(lat)) {
    return null
  }

  const name =
    (props.name_preferred as string | undefined) ||
    (props.name as string | undefined) ||
    (props.full_address as string | undefined) ||
    'Selected location'
  const fullAddress =
    (props.full_address as string | undefined) ||
    (props.place_formatted as string | undefined) ||
    name

  return { id: id || `${lng},${lat}`, name, fullAddress, lat, lng }
}

/** Mapbox Geocoding API v6 forward search. Temporary — do not cache. */
export async function geocode(
  query: string,
  proximity?: { lng: number; lat: number },
  signal?: AbortSignal,
): Promise<GeocodeResult[]> {
  const token = getToken()
  if (!token) return []

  const q = query.trim()
  if (q.length < 2) return []

  const url = new URL('https://api.mapbox.com/search/geocode/v6/forward')
  url.searchParams.set('q', q)
  url.searchParams.set('limit', '5')
  url.searchParams.set('access_token', token)
  if (proximity) {
    url.searchParams.set('proximity', `${proximity.lng},${proximity.lat}`)
  }

  try {
    const res = await fetch(url.toString(), { signal })
    if (!res.ok) return []
    const data = (await res.json()) as { features?: Record<string, unknown>[] }
    const features = data.features ?? []
    return features.map(parseFeature).filter((f): f is GeocodeResult => f !== null)
  } catch (err) {
    if ((err as Error).name === 'AbortError') return []
    return []
  }
}

/** Mapbox Directions API — driving profile, full GeoJSON overview. */
export async function getDrivingRoute(
  from: { lng: number; lat: number },
  to: { lng: number; lat: number },
  signal?: AbortSignal,
): Promise<RouteResult | null> {
  const token = getToken()
  if (!token) return null

  const path = `${from.lng},${from.lat};${to.lng},${to.lat}`
  const url = new URL(`https://api.mapbox.com/directions/v5/mapbox/driving/${path}`)
  url.searchParams.set('geometries', 'geojson')
  url.searchParams.set('overview', 'full')
  url.searchParams.set('access_token', token)

  try {
    const res = await fetch(url.toString(), { signal })
    if (!res.ok) return null
    const data = (await res.json()) as {
      routes?: Array<{
        distance: number
        duration: number
        geometry: GeoJSON.LineString
      }>
      code?: string
    }
    const route = data.routes?.[0]
    if (!route?.geometry) return null

    return {
      geometry: route.geometry,
      distanceMi: Math.round((route.distance / 1609.344) * 10) / 10,
      durationMin: Math.max(1, Math.round(route.duration / 60)),
    }
  } catch (err) {
    if ((err as Error).name === 'AbortError') return null
    return null
  }
}

export type MatrixLeg = {
  durationMin: number | null
  distanceMi: number | null
}

/**
 * Mapbox Matrix API — 1 source → many destinations (driving).
 * Max 24 destinations (25 coordinates total including source).
 * Null duration/distance = unreachable pair.
 */
export async function getDrivingMatrix(
  source: { lng: number; lat: number },
  destinations: Array<{ lng: number; lat: number }>,
  signal?: AbortSignal,
): Promise<MatrixLeg[] | null> {
  const token = getToken()
  if (!token) return null
  if (destinations.length === 0) return []

  const capped = destinations.slice(0, 24)
  const coords = [
    `${source.lng},${source.lat}`,
    ...capped.map((d) => `${d.lng},${d.lat}`),
  ].join(';')

  const destIndices = capped.map((_, i) => i + 1).join(';')
  const url = new URL(
    `https://api.mapbox.com/directions-matrix/v1/mapbox/driving/${coords}`,
  )
  url.searchParams.set('sources', '0')
  url.searchParams.set('destinations', destIndices)
  url.searchParams.set('annotations', 'duration,distance')
  url.searchParams.set('access_token', token)

  try {
    const res = await fetch(url.toString(), { signal })
    if (!res.ok) return null
    const data = (await res.json()) as {
      code?: string
      durations?: Array<Array<number | null>>
      distances?: Array<Array<number | null>>
    }
    if (data.code && data.code !== 'Ok') return null

    const durationRow = data.durations?.[0] ?? []
    const distanceRow = data.distances?.[0] ?? []

    return capped.map((_, i) => {
      const sec = durationRow[i]
      const meters = distanceRow[i]
      return {
        durationMin:
          sec === null || sec === undefined
            ? null
            : Math.max(1, Math.round(sec / 60)),
        distanceMi:
          meters === null || meters === undefined
            ? null
            : Math.round((meters / 1609.344) * 10) / 10,
      }
    })
  } catch (err) {
    if ((err as Error).name === 'AbortError') return null
    return null
  }
}

