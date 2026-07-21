import { rng, FIRST_NAMES, LAST_NAMES, SITE_NAMES, CLIENT_NAMES, TRADES } from './constants'
import type { Trade } from './types'

export function randomInt(min: number, max: number) {
  return Math.floor(rng() * (max - min + 1)) + min
}

export function pick<T>(arr: readonly T[]): T {
  return arr[randomInt(0, arr.length - 1)]
}

export function pickWeighted<T>(arr: readonly T[], weights: readonly number[]): T {
  const total = weights.reduce((a, b) => a + b, 0)
  let r = rng() * total
  for (let i = 0; i < arr.length; i++) {
    r -= weights[i]
    if (r <= 0) return arr[i]
  }
  return arr[arr.length - 1]
}

export function generateTechName(index: number): string {
  const first = FIRST_NAMES[index % FIRST_NAMES.length]
  const last = LAST_NAMES[(index * 3 + 7) % LAST_NAMES.length]
  return `${first} ${last}`
}

export function generateAssetId(index: number): string {
  if (index < 20) {
    return `#2228${String(70 + index).padStart(2, '0')}`
  }
  return `MM${String(2040 + (index - 20)).padStart(4, '0')}`
}

export function generateTrade(_index: number): Trade {
  const weights = [0.6, 0.3, 0.1]
  return pickWeighted(TRADES, weights)
}

export function generateCell(): string {
  return `+1 (555) ${String(randomInt(100, 999)).padStart(3, '0')}-${String(randomInt(0, 9999)).padStart(4, '0')}`
}

export function generateSite(index: number): string {
  return SITE_NAMES[index % SITE_NAMES.length]
}

export function generateClient(index: number): string {
  return CLIENT_NAMES[index % CLIENT_NAMES.length]
}

export function generateStreet(_index: number): string {
  const number = randomInt(100, 9999)
  const streets = [
    'Main St', 'Broadway', 'Park Ave', 'Lexington Ave', 'Madison Ave', '5th Ave',
    'Queens Blvd', 'Jamaica Ave', 'Hempstead Tpke', 'Northern Blvd', 'Sunrise Hwy',
    'Merrick Rd', 'Jericho Tpke', 'Hillside Ave', 'Atlantic Ave', 'Flatbush Ave',
    'Richmond Rd', 'Forest Ave', 'New Dorp Ln', 'Bay St',
  ]
  return `${number} ${pick(streets)}`
}

/** Cities used for mock WO addresses — keep in sync with CITY_LAND_COORDS */
export const MOCK_CITIES = [
  'New York, NY',
  'Brooklyn, NY',
  'Queens, NY',
  'Bronx, NY',
  'Staten Island, NY',
  'Hempstead, NY',
  'Mineola, NY',
  'Garden City, NY',
  'Long Beach, NY',
  'Freeport, NY',
  'Oceanside, NY',
  'Lynbrook, NY',
  'Valley Stream, NY',
  'Rockville Centre, NY',
  'Great Neck, NY',
  'Port Washington, NY',
  'Manhasset, NY',
  'Roslyn, NY',
  'Glen Cove, NY',
] as const

/**
 * Inland anchors near each city (main commercial corridors), kept clearly on land
 * so WO / geofence markers never fall in Long Island Sound, Jamaica Bay, etc.
 */
const CITY_LAND_COORDS: Record<(typeof MOCK_CITIES)[number], { lat: number; lng: number }> = {
  'New York, NY': { lat: 40.7549, lng: -73.984 },
  'Brooklyn, NY': { lat: 40.6782, lng: -73.9442 },
  'Queens, NY': { lat: 40.7282, lng: -73.7949 },
  'Bronx, NY': { lat: 40.8448, lng: -73.8648 },
  'Staten Island, NY': { lat: 40.5795, lng: -74.1502 },
  'Hempstead, NY': { lat: 40.7062, lng: -73.6187 },
  'Mineola, NY': { lat: 40.7465, lng: -73.6407 },
  'Garden City, NY': { lat: 40.7268, lng: -73.6343 },
  'Long Beach, NY': { lat: 40.5895, lng: -73.6579 },
  'Freeport, NY': { lat: 40.6576, lng: -73.5832 },
  'Oceanside, NY': { lat: 40.6387, lng: -73.6401 },
  'Lynbrook, NY': { lat: 40.6548, lng: -73.6718 },
  'Valley Stream, NY': { lat: 40.6643, lng: -73.7085 },
  'Rockville Centre, NY': { lat: 40.6587, lng: -73.6412 },
  'Great Neck, NY': { lat: 40.787, lng: -73.7276 },
  'Port Washington, NY': { lat: 40.8257, lng: -73.6982 },
  'Manhasset, NY': { lat: 40.7979, lng: -73.6996 },
  'Roslyn, NY': { lat: 40.7998, lng: -73.6509 },
  'Glen Cove, NY': { lat: 40.8623, lng: -73.6337 },
}

export function generateCity(_index: number): string {
  return MOCK_CITIES[_index % MOCK_CITIES.length]
}

export function generateAddress(index: number): string {
  return `${generateStreet(index)}, ${generateCity(index)}`
}

export function parseDate(iso: string): Date {
  return new Date(iso)
}

export function formatDate(date: Date): string {
  return date.toISOString()
}

export function addMinutes(iso: string, minutes: number): string {
  const d = parseDate(iso)
  d.setUTCMinutes(d.getUTCMinutes() + minutes)
  return d.toISOString()
}

export function addHours(iso: string, hours: number): string {
  return addMinutes(iso, hours * 60)
}

export function minutesBetween(startIso: string, endIso: string): number {
  return Math.round((parseDate(endIso).getTime() - parseDate(startIso).getTime()) / 60000)
}

export function hoursBetween(startIso: string, endIso: string): number {
  return minutesBetween(startIso, endIso) / 60
}

export function toEastDate(iso: string): string {
  const d = parseDate(iso)
  const year = d.getUTCFullYear()
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function haversineMi(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c * 10) / 10
}

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

/**
 * Deterministic on-land site coordinate for WO index `i`.
 * Anchored to the same city as `generateCity(i)` so markers match the stored address
 * and never land in Long Island Sound / open water.
 */
export function getSiteCoordinate(index: number): { lat: number; lng: number } {
  const city = MOCK_CITIES[index % MOCK_CITIES.length]
  const base = CITY_LAND_COORDS[city]
  // Tiny unique offsets so stacked WOs in the same city don't share one pixel
  const lat = base.lat + (((index * 17) % 7) - 3) * 0.0011
  const lng = base.lng + (((index * 23) % 7) - 3) * 0.0013
  return {
    lat: Math.round(lat * 10000) / 10000,
    lng: Math.round(lng * 10000) / 10000,
  }
}

export function jitterCoordinate(lat: number, lng: number, spreadMiles: number): { lat: number; lng: number } {
  const milesPerLat = 69
  const latOffset = (rng() - 0.5) * 2 * (spreadMiles / milesPerLat)
  const lngOffset = (rng() - 0.5) * 2 * (spreadMiles / (milesPerLat * Math.cos((lat * Math.PI) / 180)))
  return {
    lat: Math.round((lat + latOffset) * 10000) / 10000,
    lng: Math.round((lng + lngOffset) * 10000) / 10000,
  }
}
