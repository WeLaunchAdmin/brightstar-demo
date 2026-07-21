import { assets } from './assets'
import { generateAddress, generateSite, generateClient, randomInt, pickWeighted } from '../helpers'
import type { WorkOrder, WoType, WoStatus } from '../types'

const WO_COUNT = 35

export const WO_TYPES: WoType[] = ['ITM', 'repair', 'emergency', 'survey', 'service', 'FDNY']

function generateWoId(_index: number): string {
  return `#${277850 + _index}`
}

function generateWoType(_index: number): WoType {
  return pickWeighted(WO_TYPES, [0.3, 0.2, 0.1, 0.15, 0.15, 0.1])
}

function generateWoStatus(_index: number, hasAsset: boolean): WoStatus {
  if (!hasAsset) return 'open'
  return pickWeighted(
    ['completed', 'in progress', 'assigned', 'open'] as WoStatus[],
    [0.25, 0.35, 0.25, 0.15],
  )
}

const DESCRIPTIONS = [
  '5 Year Obstruction Testing',
  'Annual fire pump flow test',
  'Site survey — sprinkler coverage review',
  'Service call — alarm panel trouble',
  'FDNY survey follow-up',
  'Repair — replace damaged riser fitting',
]

export const workOrders: WorkOrder[] = Array.from({ length: WO_COUNT }, (_, i) => {
  const assignedAsset = randomInt(0, 100) > 35 ? assets[randomInt(0, assets.length - 1)] : undefined
  return {
    woId: generateWoId(i),
    site: generateSite(i),
    address: generateAddress(i),
    client: generateClient(i),
    type: generateWoType(i),
    assetId: assignedAsset?.assetId,
    status: generateWoStatus(i, !!assignedAsset),
    description: i % 3 === 0 ? DESCRIPTIONS[i % DESCRIPTIONS.length] : undefined,
  }
})
