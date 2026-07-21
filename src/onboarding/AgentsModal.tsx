const AGENTS = [
  {
    name: 'Jarvis',
    role: 'Fleet assistant',
    blurb:
      'Ask about work orders, asset status, overtime, and schedules by chat or voice. Read-only — verify before you dispatch.',
  },
  {
    name: 'Evidence Analyst',
    role: 'Day analysis',
    blurb:
      'Supports Overtime day analysis with GPS evidence, timelines, and on-site minutes for a single asset.',
  },
  {
    name: 'Checkout Monitor',
    role: 'Checkout compliance',
    blurb:
      'Watches active check-ins and raises geofence alerts when an asset drifts past the on-site zone before check-out.',
  },
  {
    name: 'Idle Monitoring',
    role: 'Idle events',
    blurb:
      'Surfaces idle telemetry and idle-event alerts so supervisors can follow up on long stops.',
  },
] as const

type AgentsModalProps = {
  onClose: () => void
}

export function AgentsModal({ onClose }: AgentsModalProps) {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="agents-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 border-b border-gray-100">
          <div>
            <h2 id="agents-modal-title" className="text-lg font-semibold text-gray-900">
              Meet all agents
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              BrightStar assistants by function — no personas, just what they do.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
            aria-label="Close"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <ul className="px-5 py-4 space-y-3 max-h-[min(28rem,70vh)] overflow-y-auto">
          {AGENTS.map((agent) => (
            <li
              key={agent.name}
              className="rounded-xl border border-gray-200 bg-gray-50/80 px-3.5 py-3"
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-semibold text-gray-900">{agent.name}</p>
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
                  {agent.role}
                </p>
              </div>
              <p className="text-sm text-gray-600 mt-1.5 leading-snug">{agent.blurb}</p>
            </li>
          ))}
        </ul>

        <div className="px-5 py-3 border-t border-gray-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-sm font-semibold rounded-lg bg-gray-900 text-white hover:bg-gray-800"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}
