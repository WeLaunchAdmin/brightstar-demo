import { workOrders } from './workOrders'
import { getSiteCoordinate } from '../helpers'
import type { Geofence } from '../types'

export const geofences: Geofence[] = workOrders.map((wo, index) => ({
  woId: wo.woId,
  center: getSiteCoordinate(index),
  radiusMiles: 0.5,
}))
