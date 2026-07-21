import { useMemo, useState } from 'react'
import { DEMO_NOW } from '../../mock/constants'
import {
  getFleetTelemetry,
  getTripForWorkOrder,
  getWorkOrder,
} from '../../mock/queries'
import type { WoType, WoStatus } from '../../mock/types'
import { useDispatchStore } from '../../store/dispatchStore'

function formatMapDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/New_York',
  })
}

function formatEtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York',
  })
}

function statusBadge(status: WoStatus): { label: string; className: string } {
  if (status === 'in progress') return { label: 'In Progress', className: 'bg-sky-100 text-sky-800' }
  if (status === 'completed') return { label: 'Completed', className: 'bg-emerald-100 text-emerald-800' }
  if (status === 'assigned') return { label: 'Assigned', className: 'bg-indigo-100 text-indigo-800' }
  return { label: 'Scheduled', className: 'bg-slate-100 text-slate-700' }
}

function typeChips(type: WoType): string[] {
  const chips: string[] = []
  if (type === 'emergency') chips.push('Emergency')
  else chips.push('Non-Emergency')
  if (type === 'ITM') chips.push('INSPECTION')
  else if (type === 'repair') chips.push('Repair')
  else if (type === 'survey') chips.push('Site Survey')
  else if (type === 'service') chips.push('Service')
  else if (type === 'FDNY') chips.push('FDNY Survey')
  return chips
}

export function WoDetailCard() {
  const selectedWoId = useDispatchStore((s) => s.selectedWoId)
  const serviceDate = useDispatchStore((s) => s.serviceDate)
  const assignOpen = useDispatchStore((s) => s.assignOpen)
  const assignments = useDispatchStore((s) => s.assignments)
  const selectWo = useDispatchStore((s) => s.selectWo)
  const openAssign = useDispatchStore((s) => s.openAssign)
  const closeAssign = useDispatchStore((s) => s.closeAssign)
  const addAssignment = useDispatchStore((s) => s.addAssignment)
  const showToast = useDispatchStore((s) => s.showToast)
  const refreshKey = useDispatchStore((s) => s.refreshKey)

  const wo = useMemo(() => {
    void refreshKey
    return selectedWoId ? getWorkOrder(selectedWoId) : undefined
  }, [selectedWoId, refreshKey])

  const trip = useMemo(() => {
    if (!selectedWoId) return undefined
    return getTripForWorkOrder(selectedWoId, serviceDate)
  }, [selectedWoId, serviceDate])

  const local = assignments.find((a) => a.woId === selectedWoId)
  const assignedAssetId = local?.assetId ?? wo?.assetId

  if (!selectedWoId || !wo) return null

  const badge = statusBadge(wo.status)
  const chips = typeChips(wo.type)
  const synced = formatEtTime(DEMO_NOW)

  async function copyWo() {
    try {
      await navigator.clipboard.writeText(wo!.woId)
      showToast(`Copied ${wo!.woId}`, 'info')
    } catch {
      showToast('Copy failed', 'info')
    }
  }

  // Docked on-screen so the card never clips off the map viewport
  return (
    <div className="absolute left-3 bottom-16 z-40 w-[min(22rem,calc(100%-1.5rem))] max-h-[min(32rem,calc(100%-5rem))] pointer-events-auto">
      <div className="w-full max-h-full overflow-y-auto rounded-xl shadow-xl border border-gray-200 bg-white text-left">
        <div className="bg-slate-800 text-white px-3 py-2.5 flex items-center justify-between gap-2 sticky top-0 z-10">
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">
              {wo.woId}
              {trip && (
                <span className="ml-2 font-normal text-slate-300">Trip {trip.tripId}</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <IconButton label="Copy" onClick={copyWo}>
              <CopyIcon />
            </IconButton>
            <IconButton
              label="Refresh"
              onClick={() => showToast('WO refreshed from mock data', 'info')}
            >
              <RefreshIcon />
            </IconButton>
            <IconButton label="Close" onClick={() => selectWo(null)}>
              <CloseIcon />
            </IconButton>
          </div>
        </div>

        <div className="p-3 space-y-3">
          <div className="flex items-start gap-2 flex-wrap">
            <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${badge.className}`}>
              {badge.label}
            </span>
          </div>
          <h3 className="text-base font-bold text-gray-900 leading-snug">{wo.site}</h3>

          {trip && (
            <div>
              <p className="text-[10px] font-semibold tracking-wide text-gray-500 flex items-center gap-1.5">
                <ClockIcon /> SCHEDULED ON MAP DATE
              </p>
              <p className="text-sm font-semibold text-gray-900 mt-1">{formatMapDate(trip.scheduledStart)}</p>
              <p className="text-xs text-gray-500">
                {formatEtTime(trip.scheduledStart)} – {formatEtTime(trip.scheduledEnd)}
              </p>
            </div>
          )}

          <div className="flex items-start gap-2">
            <PinIcon />
            <p className="text-xs text-gray-600 flex-1 leading-snug">{wo.address}</p>
            <div className="flex items-center gap-1 shrink-0">
              <DecorDot className="bg-indigo-400" />
              <DecorDot className="bg-amber-400" />
              <DecorDot className="bg-violet-400" />
              <DecorDot className="bg-emerald-400" />
              <DecorDot className="bg-sky-400" />
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {chips.map((chip) => (
              <span
                key={chip}
                className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  chip === 'Emergency'
                    ? 'bg-rose-100 text-rose-800'
                    : chip === 'Non-Emergency'
                      ? 'bg-emerald-100 text-emerald-800'
                      : chip === 'INSPECTION'
                        ? 'bg-sky-100 text-sky-800'
                        : 'bg-violet-100 text-violet-800'
                }`}
              >
                {chip}
              </span>
            ))}
          </div>

          {assignedAssetId && (
            <div>
              <p className="text-[10px] font-semibold tracking-wide text-gray-500">ASSIGNED</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border border-amber-300 bg-amber-50 text-amber-900">
                  {assignedAssetId}
                </span>
              </div>
            </div>
          )}

          {wo.description && (
            <div>
              <p className="text-[10px] font-semibold tracking-wide text-gray-500">WORK ORDER DESCRIPTIONS</p>
              <p className="text-sm text-gray-800 mt-1">{wo.description}</p>
            </div>
          )}

          {(wo.status === 'open' || wo.status === 'assigned') && !assignOpen && (
            <button
              type="button"
              onClick={openAssign}
              className="w-full px-3 py-2 text-sm font-semibold text-white bg-slate-800 rounded-lg hover:bg-slate-700"
            >
              Assign technician
            </button>
          )}

          {assignOpen && (
            <AssignInline
              woId={wo.woId}
              onCancel={closeAssign}
              onSubmit={(payload) => {
                addAssignment(payload)
                showToast(
                  payload.dispatchedNow
                    ? `Dispatch now queued for ${payload.woId} → ${payload.assetId} (demo only).`
                    : `Assigned ${payload.woId} → ${payload.assetId} (demo only).`,
                )
              }}
            />
          )}

          <p className="text-[11px] text-gray-400">Synced · {synced}</p>
        </div>
      </div>
    </div>
  )
}

function AssignInline({
  woId,
  onCancel,
  onSubmit,
}: {
  woId: string
  onCancel: () => void
  onSubmit: (payload: {
    woId: string
    assetId: string
    startAt: string
    endAt: string
    dispatchedNow: boolean
  }) => void
}) {
  const available = useMemo(() => getFleetTelemetry({ active: true }), [])
  const [assetId, setAssetId] = useState(available[0]?.assetId ?? '')
  const [startAt, setStartAt] = useState('2026-07-21T09:00')
  const [endAt, setEndAt] = useState('2026-07-21T12:00')

  return (
    <div className="space-y-2 border-t border-gray-100 pt-3">
      <p className="text-[10px] font-semibold tracking-wide text-gray-500">ASSIGN ASSET ID</p>
      <select
        value={assetId}
        onChange={(e) => setAssetId(e.target.value)}
        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
      >
        {available.map((t) => (
          <option key={t.assetId} value={t.assetId}>
            {t.assetId} · {t.gpsStatus}
          </option>
        ))}
      </select>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="datetime-local"
          value={startAt}
          onChange={(e) => setStartAt(e.target.value)}
          className="px-2 py-1.5 text-xs border border-gray-300 rounded-lg"
        />
        <input
          type="datetime-local"
          value={endAt}
          onChange={(e) => setEndAt(e.target.value)}
          className="px-2 py-1.5 text-xs border border-gray-300 rounded-lg"
        />
      </div>
      <p className="text-[10px] text-gray-500">Verify results before dispatching crews.</p>
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="flex-1 text-xs border border-gray-300 rounded-lg py-1.5">
          Cancel
        </button>
        <button
          type="button"
          onClick={() =>
            onSubmit({
              woId,
              assetId,
              startAt: `${startAt}:00-04:00`,
              endAt: `${endAt}:00-04:00`,
              dispatchedNow: false,
            })
          }
          className="flex-1 text-xs font-semibold text-white bg-indigo-600 rounded-lg py-1.5"
        >
          Assign
        </button>
        <button
          type="button"
          onClick={() =>
            onSubmit({
              woId,
              assetId,
              startAt: `${startAt}:00-04:00`,
              endAt: `${endAt}:00-04:00`,
              dispatchedNow: true,
            })
          }
          className="flex-1 text-xs font-semibold text-white bg-slate-800 rounded-lg py-1.5"
        >
          Dispatch now
        </button>
      </div>
    </div>
  )
}

function IconButton({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="w-7 h-7 inline-flex items-center justify-center rounded-md text-slate-300 hover:text-white hover:bg-slate-700"
    >
      {children}
    </button>
  )
}

function DecorDot({ className }: { className: string }) {
  return <span className={`w-4 h-4 rounded-full ${className}`} />
}

function CopyIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
    </svg>
  )
}

function RefreshIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 21h5v-5" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z" />
    </svg>
  )
}

function PinIcon() {
  return (
    <svg className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5c-1.4 0-2.5-1.1-2.5-2.5S10.6 6.5 12 6.5s2.5 1.1 2.5 2.5S13.4 11.5 12 11.5z" />
    </svg>
  )
}
