import { generateAssetId, generateTechName, generateTrade, generateCell } from '../helpers'
import type { Asset } from '../types'

export const ASSET_COUNT = 40
export const ACTIVE_ASSET_COUNT = 35

export const assets: Asset[] = Array.from({ length: ASSET_COUNT }, (_, i) => ({
  assetId: generateAssetId(i),
  techName: generateTechName(i),
  trade: generateTrade(i),
  workCell: generateCell(),
  active: i < ACTIVE_ASSET_COUNT,
}))
