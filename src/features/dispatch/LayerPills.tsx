import { useDispatchStore } from '../../store/dispatchStore'
import { getOpenWorkOrders } from '../../mock/queries'

function formatDatePill(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function LayerPills() {
  const showLiveTechs = useDispatchStore((s) => s.showLiveTechs)
  const showWorkOrders = useDispatchStore((s) => s.showWorkOrders)
  const serviceDate = useDispatchStore((s) => s.serviceDate)
  const setShowLiveTechs = useDispatchStore((s) => s.setShowLiveTechs)
  const setShowWorkOrders = useDispatchStore((s) => s.setShowWorkOrders)
  const setServiceDate = useDispatchStore((s) => s.setServiceDate)

  const openCount = getOpenWorkOrders().length

  return (
    <div
      className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2"
      data-tour="layer-pills"
    >
      <div className="flex items-center gap-1 p-1 bg-white rounded-full shadow-lg border border-gray-200">
        <button
          type="button"
          onClick={() => setShowLiveTechs(!showLiveTechs)}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-sm font-semibold transition-colors ${
            showLiveTechs
              ? 'bg-fuchsia-600 text-white'
              : 'bg-transparent text-gray-600 hover:bg-gray-50'
          }`}
        >
          <TruckIcon className="w-4 h-4" />
          Live Technician
        </button>
        <button
          type="button"
          onClick={() => setShowWorkOrders(!showWorkOrders)}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-sm font-semibold transition-colors ${
            showWorkOrders
              ? 'bg-slate-800 text-white'
              : 'bg-transparent text-gray-600 hover:bg-gray-50'
          }`}
        >
          <ClipboardIcon className="w-4 h-4" />
          Work Orders
          <span
            className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-xs rounded-full ${
              showWorkOrders ? 'bg-slate-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            {openCount}
          </span>
        </button>
      </div>

      <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-white rounded-full shadow-lg border border-gray-200 text-sm font-semibold text-slate-800 cursor-pointer hover:bg-gray-50">
        <CalendarIcon className="w-4 h-4 text-gray-500" />
        <span>{formatDatePill(serviceDate)}</span>
        <input
          type="date"
          value={serviceDate}
          onChange={(e) => setServiceDate(e.target.value)}
          className="sr-only"
        />
      </label>
    </div>
  )
}

function TruckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 18.5a1.5 1.5 0 1 1-3.001-.001A1.5 1.5 0 0 1 18 18.5zM6 18.5a1.5 1.5 0 1 1-3.001-.001A1.5 1.5 0 0 1 6 18.5zM20 8h-3V4H4v12h2.18a3 3 0 0 1 5.64 0h2.36a3 3 0 0 1 5.64 0H22V11l-2-3z" />
    </svg>
  )
}

function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm7 18H5V5h2v3h10V5h2v16z" />
    </svg>
  )
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z" />
    </svg>
  )
}
