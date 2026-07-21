import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { getOpenWorkOrders, getWorkOrderGeofence } from '../../mock/queries'
import {
  QUEUE_TO_TYPE,
  useDispatchStore,
  type QueueTab,
} from '../../store/dispatchStore'

const QUEUE_TABS: { id: QueueTab; label: string }[] = [
  { id: 'survey', label: 'Site Survey' },
  { id: 'service', label: 'Service Call' },
  { id: 'FDNY', label: 'FDNY Survey' },
  { id: 'repair', label: 'Repair' },
]

const CARD_WIDTH = 316
const RIGHT_MARGIN = 12
const TOP_MARGIN = 12

type CardShellProps = {
  title: string
  subtitle: string
  icon: React.ReactNode
  iconClass: string
  onReset: () => void
  children: React.ReactNode
  footer?: React.ReactNode
}

function CardShell({ title, subtitle, icon, iconClass, onReset, children, footer }: CardShellProps) {
  return (
    <div className="h-full flex flex-col bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
      <div className="drag-handle cursor-grab active:cursor-grabbing px-3 pt-3 pb-2 flex items-start gap-2 border-b border-gray-100 select-none">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${iconClass}`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-gray-900 leading-tight">{title}</p>
          <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="text-[11px] font-medium text-gray-500 hover:text-gray-800 inline-flex items-center gap-1"
        >
          <ResetIcon /> Reset
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-auto px-3 py-2">{children}</div>
      {footer && <div className="px-3 py-2 border-t border-gray-100 text-[11px] text-gray-500">{footer}</div>}
    </div>
  )
}

type DraggableCardProps = {
  defaultX: number
  defaultY: number
  width?: number
  height: number
  minWidth?: number
  minHeight?: number
  resizable?: boolean
  boundsEl: HTMLElement | null
  children: React.ReactNode
}

/**
 * Minimal header-drag card. Replaces react-rnd, which crashes on mousedown under
 * Vite + React 19 because react-draggable touches `process.env.DRAGGABLE_DEBUG`.
 */
function DraggableCard({
  defaultX,
  defaultY,
  width = CARD_WIDTH,
  height,
  minWidth = 280,
  minHeight = 120,
  resizable = false,
  boundsEl,
  children,
}: DraggableCardProps) {
  const [pos, setPos] = useState({ x: defaultX, y: defaultY })
  const [size, setSize] = useState({ w: width, h: height })
  const [dragging, setDragging] = useState(false)
  const posRef = useRef(pos)
  const sizeRef = useRef(size)
  posRef.current = pos
  sizeRef.current = size

  const clampPos = useCallback(
    (x: number, y: number, w: number, h: number) => {
      const bw = boundsEl?.clientWidth ?? window.innerWidth
      const bh = boundsEl?.clientHeight ?? window.innerHeight
      return {
        x: Math.max(0, Math.min(x, Math.max(0, bw - w))),
        y: Math.max(0, Math.min(y, Math.max(0, bh - h))),
      }
    },
    [boundsEl],
  )

  const onHandlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('button, input, textarea, select, a')) return
      if (!target.closest('.drag-handle')) return

      e.preventDefault()
      e.stopPropagation()
      const startX = e.clientX
      const startY = e.clientY
      const origin = { ...posRef.current }
      const w = sizeRef.current.w
      const h = sizeRef.current.h
      setDragging(true)

      const el = e.currentTarget as HTMLElement
      el.setPointerCapture(e.pointerId)

      function onMove(ev: PointerEvent) {
        const next = clampPos(origin.x + (ev.clientX - startX), origin.y + (ev.clientY - startY), w, h)
        setPos(next)
      }

      function onUp(ev: PointerEvent) {
        setDragging(false)
        el.releasePointerCapture(ev.pointerId)
        el.removeEventListener('pointermove', onMove)
        el.removeEventListener('pointerup', onUp)
        el.removeEventListener('pointercancel', onUp)
      }

      el.addEventListener('pointermove', onMove)
      el.addEventListener('pointerup', onUp)
      el.addEventListener('pointercancel', onUp)
    },
    [clampPos],
  )

  const onResizePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const startX = e.clientX
      const startY = e.clientY
      const origin = { ...sizeRef.current }
      const originPos = { ...posRef.current }
      setDragging(true)

      const el = e.currentTarget as HTMLElement
      el.setPointerCapture(e.pointerId)

      function onMove(ev: PointerEvent) {
        const bw = boundsEl?.clientWidth ?? window.innerWidth
        const bh = boundsEl?.clientHeight ?? window.innerHeight
        const w = Math.max(minWidth, Math.min(origin.w + (ev.clientX - startX), bw - originPos.x))
        const h = Math.max(minHeight, Math.min(origin.h + (ev.clientY - startY), bh - originPos.y))
        setSize({ w, h })
      }

      function onUp(ev: PointerEvent) {
        setDragging(false)
        el.releasePointerCapture(ev.pointerId)
        el.removeEventListener('pointermove', onMove)
        el.removeEventListener('pointerup', onUp)
        el.removeEventListener('pointercancel', onUp)
      }

      el.addEventListener('pointermove', onMove)
      el.addEventListener('pointerup', onUp)
      el.addEventListener('pointercancel', onUp)
    },
    [boundsEl, minHeight, minWidth],
  )

  return (
    <div
      className="absolute pointer-events-auto"
      style={{
        left: pos.x,
        top: pos.y,
        width: size.w,
        height: size.h,
        zIndex: dragging ? 45 : 31,
      }}
      onPointerDown={onHandlePointerDown}
    >
      {children}
      {resizable && (
        <div
          role="presentation"
          aria-hidden
          onPointerDown={onResizePointerDown}
          className="absolute right-0 bottom-0 w-4 h-4 cursor-se-resize"
          style={{ touchAction: 'none' }}
        />
      )}
    </div>
  )
}

export function FloatingDispatchCards({
  techVisible,
  techTotal,
  woVisible,
  woTotal,
}: {
  techVisible: number
  techTotal: number
  woVisible: number
  woTotal: number
}) {
  const boundsRef = useRef<HTMLDivElement>(null)
  const [boundsEl, setBoundsEl] = useState<HTMLElement | null>(null)
  const [defaultX, setDefaultX] = useState<number | null>(null)

  useLayoutEffect(() => {
    const el = boundsRef.current
    if (!el) return
    setBoundsEl(el)
    setDefaultX(Math.max(RIGHT_MARGIN, el.clientWidth - CARD_WIDTH - RIGHT_MARGIN))
  }, [])

  return (
    <div
      ref={boundsRef}
      data-dispatch-card-bounds
      className="absolute inset-0 z-30 pointer-events-none"
    >
      {defaultX !== null && (
        <>
          <DraggableCard
            defaultX={defaultX}
            defaultY={TOP_MARGIN}
            height={148}
            boundsEl={boundsEl}
          >
            <SearchLiveTechnicianCard visible={techVisible} total={techTotal} />
          </DraggableCard>

          <DraggableCard
            defaultX={defaultX}
            defaultY={172}
            height={148}
            boundsEl={boundsEl}
          >
            <SearchWorkOrdersCard visible={woVisible} total={woTotal} />
          </DraggableCard>

          <DraggableCard
            defaultX={defaultX}
            defaultY={332}
            height={300}
            minHeight={220}
            resizable
            boundsEl={boundsEl}
          >
            <OpenJobQueuesCard />
          </DraggableCard>
        </>
      )}
    </div>
  )
}

function SearchLiveTechnicianCard({ visible, total }: { visible: number; total: number }) {
  const techSearch = useDispatchStore((s) => s.techSearch)
  const setTechSearch = useDispatchStore((s) => s.setTechSearch)
  const resetTechSearch = useDispatchStore((s) => s.resetTechSearch)

  return (
    <CardShell
      title="Search Live Technician"
      subtitle="By asset ID or plate number"
      iconClass="bg-fuchsia-100 text-fuchsia-700"
      icon={<SearchIcon />}
      onReset={resetTechSearch}
      footer={`${visible} of ${total} on map`}
    >
      <div className="relative">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400">
          <SearchIcon className="w-4 h-4" />
        </span>
        <input
          type="text"
          value={techSearch}
          onChange={(e) => setTechSearch(e.target.value)}
          placeholder="Asset ID or plate #…"
          className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
        />
      </div>
    </CardShell>
  )
}

function SearchWorkOrdersCard({ visible, total }: { visible: number; total: number }) {
  const woSearch = useDispatchStore((s) => s.woSearch)
  const setWoSearch = useDispatchStore((s) => s.setWoSearch)
  const resetWoSearch = useDispatchStore((s) => s.resetWoSearch)

  return (
    <CardShell
      title="Search Work Orders"
      subtitle="By Work Order ID or Trip ID"
      iconClass="bg-sky-100 text-sky-700"
      icon={<ClipboardIcon />}
      onReset={resetWoSearch}
      footer={`${visible} of ${total} on map`}
    >
      <div className="relative">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400">
          <SearchIcon className="w-4 h-4" />
        </span>
        <input
          type="text"
          value={woSearch}
          onChange={(e) => setWoSearch(e.target.value)}
          placeholder="Work Order ID or Trip ID…"
          className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
      </div>
    </CardShell>
  )
}

function OpenJobQueuesCard() {
  const queueTab = useDispatchStore((s) => s.queueTab)
  const queueSearch = useDispatchStore((s) => s.queueSearch)
  const selectedWoId = useDispatchStore((s) => s.selectedWoId)
  const assignments = useDispatchStore((s) => s.assignments)
  const setQueueTab = useDispatchStore((s) => s.setQueueTab)
  const setQueueSearch = useDispatchStore((s) => s.setQueueSearch)
  const resetQueueSearch = useDispatchStore((s) => s.resetQueueSearch)
  const selectWo = useDispatchStore((s) => s.selectWo)
  const focusOn = useDispatchStore((s) => s.focusOn)

  const openOrders = useMemo(() => getOpenWorkOrders(), [])

  const tabsWithCounts = useMemo(
    () =>
      QUEUE_TABS.map((tab) => ({
        ...tab,
        count: openOrders.filter((wo) => wo.type === QUEUE_TO_TYPE[tab.id]).length,
      })),
    [openOrders],
  )

  const rows = useMemo(() => {
    const type = QUEUE_TO_TYPE[queueTab]
    const q = queueSearch.trim().toLowerCase()
    return openOrders
      .filter((wo) => wo.type === type)
      .filter((wo) => {
        if (!q) return true
        return (
          wo.woId.toLowerCase().includes(q) ||
          wo.site.toLowerCase().includes(q) ||
          wo.address.toLowerCase().includes(q) ||
          wo.client.toLowerCase().includes(q)
        )
      })
  }, [openOrders, queueTab, queueSearch])

  function focusWo(woId: string) {
    const geo = getWorkOrderGeofence(woId)
    if (geo) {
      selectWo(woId, geo.center)
      focusOn(geo.center.lat, geo.center.lng, 14)
    } else {
      selectWo(woId)
    }
  }

  const activeTab = tabsWithCounts.find((t) => t.id === queueTab)

  return (
    <div data-tour="open-queues" className="h-full">
      <CardShell
        title="Open job queues"
        subtitle="Site Survey · Service · FDNY · Repair"
        iconClass="bg-sky-100 text-sky-700"
        icon={<ClipboardIcon />}
        onReset={resetQueueSearch}
        footer={
          activeTab ? `${activeTab.count} open ${activeTab.label.toLowerCase()} jobs` : undefined
        }
      >
      <div className="flex flex-wrap gap-1.5 mb-2">
        {tabsWithCounts.map((tab) => {
          const active = tab.id === queueTab
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setQueueTab(tab.id)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                active
                  ? 'bg-sky-600 text-white border-sky-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {tab.label} {tab.count}
            </button>
          )
        })}
      </div>
      <input
        type="text"
        value={queueSearch}
        onChange={(e) => setQueueSearch(e.target.value)}
        placeholder="Filter by WO #, client, address…"
        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg mb-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
      />
      <div className="space-y-1 max-h-40 overflow-auto">
        {rows.length === 0 && (
          <p className="text-xs text-gray-500 py-3 text-center">No open work orders in this queue.</p>
        )}
        {rows.map((wo) => {
          const assigned = assignments.find((a) => a.woId === wo.woId)
          const selected = selectedWoId === wo.woId
          return (
            <button
              key={wo.woId}
              type="button"
              onClick={() => focusWo(wo.woId)}
              className={`w-full text-left px-2.5 py-2 rounded-lg hover:bg-gray-50 ${
                selected ? 'bg-sky-50 ring-1 ring-sky-200' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-gray-900">{wo.woId}</span>
                <span className="text-[10px] text-gray-400">{wo.type}</span>
              </div>
              <p className="text-[11px] text-gray-600 truncate">{wo.site}</p>
              <p className="text-[10px] text-gray-400 truncate">{wo.address}</p>
              {assigned && (
                <p className="text-[10px] text-emerald-700 mt-0.5">Assigned → {assigned.assetId}</p>
              )}
            </button>
          )
        })}
      </div>
    </CardShell>
    </div>
  )
}

function SearchIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
    </svg>
  )
}

function ClipboardIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm7 18H5V5h2v3h10V5h2v16z" />
    </svg>
  )
}

function ResetIcon() {
  return (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </svg>
  )
}
