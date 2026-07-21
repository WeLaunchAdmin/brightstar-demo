import { create } from 'zustand'
import type { Trade, WoType } from '../mock/types'

export type CrewFilter = 'all' | 'Maintenance' | 'Nassau' | 'FP'
export type QueueTab = 'survey' | 'service' | 'FDNY' | 'repair'

export type LocalAssignment = {
  woId: string
  assetId: string
  startAt: string
  endAt: string
  dispatchedNow: boolean
  assignedAt: string
}

export type ToastState = {
  id: number
  message: string
  tone: 'success' | 'info'
} | null

type DispatchState = {
  showLiveTechs: boolean
  showWorkOrders: boolean
  serviceDate: string
  crewFilter: CrewFilter
  queueTab: QueueTab
  queueSearch: string
  techSearch: string
  woSearch: string
  selectedWoId: string | null
  selectedWoCoords: { lat: number; lng: number } | null
  selectedAssetId: string | null
  assignOpen: boolean
  focus: { lat: number; lng: number; zoom?: number; nonce: number } | null
  fitNonce: number
  assignments: LocalAssignment[]
  toast: ToastState
  refreshKey: number

  setShowLiveTechs: (value: boolean) => void
  setShowWorkOrders: (value: boolean) => void
  setServiceDate: (value: string) => void
  setCrewFilter: (value: CrewFilter) => void
  setQueueTab: (value: QueueTab) => void
  setQueueSearch: (value: string) => void
  setTechSearch: (value: string) => void
  setWoSearch: (value: string) => void
  resetTechSearch: () => void
  resetWoSearch: () => void
  resetQueueSearch: () => void
  selectWo: (woId: string | null, coords?: { lat: number; lng: number } | null) => void
  selectTech: (assetId: string | null) => void
  openAssign: () => void
  closeAssign: () => void
  focusOn: (lat: number, lng: number, zoom?: number) => void
  requestFit: () => void
  addAssignment: (assignment: Omit<LocalAssignment, 'assignedAt'>) => void
  showToast: (message: string, tone?: 'success' | 'info') => void
  clearToast: () => void
  refresh: () => void
}

export const CREW_TO_TRADE: Record<Exclude<CrewFilter, 'all'>, Trade> = {
  Maintenance: 'Sprinkler',
  Nassau: 'Inspector',
  FP: 'Fire Alarm',
}

export const QUEUE_TO_TYPE: Record<QueueTab, WoType> = {
  survey: 'survey',
  service: 'service',
  FDNY: 'FDNY',
  repair: 'repair',
}

export const useDispatchStore = create<DispatchState>((set) => ({
  showLiveTechs: true,
  showWorkOrders: true,
  serviceDate: '2026-07-21',
  crewFilter: 'all',
  queueTab: 'survey',
  queueSearch: '',
  techSearch: '',
  woSearch: '',
  selectedWoId: null,
  selectedWoCoords: null,
  selectedAssetId: null,
  assignOpen: false,
  focus: null,
  fitNonce: 0,
  assignments: [],
  toast: null,
  refreshKey: 0,

  setShowLiveTechs: (value) => set({ showLiveTechs: value }),
  setShowWorkOrders: (value) => set({ showWorkOrders: value }),
  setServiceDate: (value) =>
    set({
      serviceDate: value,
      selectedWoId: null,
      selectedWoCoords: null,
      selectedAssetId: null,
      assignOpen: false,
    }),
  setCrewFilter: (value) => set({ crewFilter: value }),
  setQueueTab: (value) => set({ queueTab: value, queueSearch: '' }),
  setQueueSearch: (value) => set({ queueSearch: value }),
  setTechSearch: (value) => set({ techSearch: value }),
  setWoSearch: (value) => set({ woSearch: value }),
  resetTechSearch: () => set({ techSearch: '' }),
  resetWoSearch: () => set({ woSearch: '' }),
  resetQueueSearch: () => set({ queueSearch: '' }),
  selectWo: (woId, coords = null) =>
    set({
      selectedWoId: woId,
      selectedWoCoords: woId ? coords : null,
      selectedAssetId: null,
      assignOpen: false,
    }),
  selectTech: (assetId) =>
    set({
      selectedAssetId: assetId,
      selectedWoId: null,
      selectedWoCoords: null,
      assignOpen: false,
    }),
  openAssign: () => set({ assignOpen: true }),
  closeAssign: () => set({ assignOpen: false }),
  focusOn: (lat, lng, zoom = 14) =>
    set((state) => ({
      focus: { lat, lng, zoom, nonce: state.focus ? state.focus.nonce + 1 : 1 },
    })),
  requestFit: () => set((state) => ({ fitNonce: state.fitNonce + 1 })),
  addAssignment: (assignment) =>
    set((state) => ({
      assignments: [
        ...state.assignments.filter((a) => a.woId !== assignment.woId),
        { ...assignment, assignedAt: new Date().toISOString() },
      ],
      assignOpen: false,
    })),
  showToast: (message, tone = 'success') =>
    set((state) => ({
      toast: { id: (state.toast?.id ?? 0) + 1, message, tone },
    })),
  clearToast: () => set({ toast: null }),
  refresh: () =>
    set((state) => ({
      refreshKey: state.refreshKey + 1,
      selectedWoId: null,
      selectedWoCoords: null,
      selectedAssetId: null,
      assignOpen: false,
    })),
}))
