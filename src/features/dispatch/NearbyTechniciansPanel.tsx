import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import type { NearbyCrewFilter, NearbyTechnician } from '../../mock/queries'

export type NearbyRankedRow = NearbyTechnician & {
  etaMin: number | null
  driveDistanceMi: number | null
}

type NearbyTechniciansPanelProps = {
  originLabel: string
  crewFilter: NearbyCrewFilter
  onCrewFilterChange: (crew: NearbyCrewFilter) => void
  rows: NearbyRankedRow[]
  empty: boolean
  loading: boolean
  selectedAssetId: string | null
  onSelect: (row: NearbyRankedRow) => void
  onReset: () => void
  onClose: () => void
}

const CREW_TABS: { value: NearbyCrewFilter; label: string }[] = [
  { value: 'Maintenance', label: 'Maintenance' },
  { value: 'Nassau', label: 'Nassau' },
  { value: 'FP', label: 'FP' },
]

const PANEL_W = 340
const PANEL_H = 420

export function NearbyTechniciansPanel({
  originLabel,
  crewFilter,
  onCrewFilterChange,
  rows,
  empty,
  loading,
  selectedAssetId,
  onSelect,
  onReset,
  onClose,
}: NearbyTechniciansPanelProps) {
  return (
    <div className="absolute inset-0 z-50 pointer-events-none">
      <DraggableNearbyCard defaultX={12} defaultY={72} width={PANEL_W} height={PANEL_H}>
        <div className="h-full flex flex-col bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden pointer-events-auto">
          <div className="drag-handle cursor-grab active:cursor-grabbing px-3 pt-3 pb-2 border-b border-gray-100 select-none">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold tracking-wide text-gray-900 uppercase">
                  Nearby Technicians
                </p>
                <p className="mt-1 text-[11px] text-gray-500 flex items-center gap-1 min-w-0">
                  <PinIcon className="w-3 h-3 shrink-0 text-blue-600" />
                  <span className="truncate">{originLabel}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={onReset}
                className="text-[11px] font-medium text-gray-500 hover:text-gray-800 inline-flex items-center gap-1 shrink-0"
              >
                <ResetIcon /> Reset
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 shrink-0"
                aria-label="Close"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-2.5 flex items-center gap-1">
              {CREW_TABS.map((tab) => {
                const active = crewFilter === tab.value
                return (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => onCrewFilterChange(tab.value)}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-full border transition-colors ${
                      active
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {tab.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            {loading ? (
              <p className="px-4 py-10 text-center text-sm text-gray-400">Loading drive times…</p>
            ) : empty ? (
              <p className="px-4 py-10 text-center text-sm text-gray-500">
                No nearby technicians available
              </p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {rows.map((row, index) => {
                  const selected = selectedAssetId === row.assetId
                  const eta =
                    row.etaMin !== null ? `${row.etaMin} min` : '—'
                  const miles =
                    row.driveDistanceMi !== null
                      ? `${row.driveDistanceMi} mi`
                      : `${row.distanceMi} mi`
                  const tripsLabel =
                    row.tripsToday === 1
                      ? '1 trip today'
                      : `${row.tripsToday} trips today`

                  return (
                    <li key={row.assetId}>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          // Keep search input from stealing focus / reopening suggestions
                          e.preventDefault()
                          e.stopPropagation()
                        }}
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          onSelect(row)
                        }}
                        className={`w-full text-left px-3 py-2.5 flex gap-2.5 transition-colors ${
                          selected ? 'bg-blue-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <span className="w-5 shrink-0 text-sm font-semibold text-gray-400 tabular-nums pt-0.5">
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">
                                {row.assetId}
                              </p>
                              <p className="text-[11px] text-gray-500 truncate">
                                Truck {row.assetId}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-bold text-gray-900 tabular-nums">
                                {eta}
                              </p>
                              <p className="text-[11px] text-gray-500 tabular-nums">{miles}</p>
                            </div>
                          </div>
                          <p className="mt-1 text-[11px] text-gray-600 truncate">
                            {tripsLabel} · Now: {row.currentLocation}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            Last Updated: {formatPing(row.lastPingAt)}
                          </p>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </DraggableNearbyCard>
    </div>
  )
}

function formatPing(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function DraggableNearbyCard({
  defaultX,
  defaultY,
  width,
  height,
  children,
}: {
  defaultX: number
  defaultY: number
  width: number
  height: number
  children: React.ReactNode
}) {
  const [pos, setPos] = useState({ x: defaultX, y: defaultY })
  const posRef = useRef(pos)
  posRef.current = pos
  const rootRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    setPos({ x: defaultX, y: defaultY })
  }, [defaultX, defaultY])

  const onHandlePointerDown = useCallback((e: React.PointerEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('button, input, textarea, select, a')) return
    if (!target.closest('.drag-handle')) return

    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startY = e.clientY
    const origin = { ...posRef.current }
    const parent = rootRef.current?.offsetParent as HTMLElement | null
    const bw = parent?.clientWidth ?? window.innerWidth
    const bh = parent?.clientHeight ?? window.innerHeight

    const el = e.currentTarget as HTMLElement
    el.setPointerCapture(e.pointerId)

    function onMove(ev: PointerEvent) {
      const x = Math.max(0, Math.min(origin.x + (ev.clientX - startX), Math.max(0, bw - width)))
      const y = Math.max(0, Math.min(origin.y + (ev.clientY - startY), Math.max(0, bh - height)))
      setPos({ x, y })
    }

    function onUp(ev: PointerEvent) {
      el.releasePointerCapture(ev.pointerId)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
    }

    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
  }, [height, width])

  return (
    <div
      ref={rootRef}
      className="absolute"
      style={{ left: pos.x, top: pos.y, width, height }}
      onPointerDown={onHandlePointerDown}
    >
      {children}
    </div>
  )
}

function PinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
    </svg>
  )
}

function ResetIcon() {
  return (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 12a9 9 0 1 0 3-6.7" strokeLinecap="round" />
      <path d="M3 4v5h5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  )
}
