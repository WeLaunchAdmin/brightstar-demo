import { useMemo, useRef, useState } from 'react'
import { FleetMap } from '../../components/FleetMap'
import { DEMO_NOW } from '../../mock/constants'
import {
  getAssetsWithDayEvidence,
  getDayAnalysis,
  getFleetTelemetry,
} from '../../mock/queries'
import type { DayAnalysisResult } from '../../mock/queries'

const DEFAULT_DATE = '2026-07-21'

function formatEtClock(iso: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York',
  })
}

function formatOnSite(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h <= 0) return `${m}m`
  return `${h}h ${m}m`
}

function relativeFromDemo(iso: string): { label: string; recent: boolean } {
  const mins = Math.max(0, Math.round((new Date(DEMO_NOW).getTime() - new Date(iso).getTime()) / 60000))
  if (mins < 20) return { label: `${mins}m ago`, recent: true }
  if (mins < 60) return { label: `${mins}m ago`, recent: false }
  const hours = Math.floor(mins / 60)
  const rem = mins % 60
  return { label: rem ? `${hours}h ${rem}m ago` : `${hours}h ago`, recent: false }
}

function verdictStyles(verdict: string) {
  if (verdict === 'CLEAN') return 'bg-emerald-100 text-emerald-800 border-emerald-200'
  if (verdict === 'OT MIXED') return 'bg-amber-100 text-amber-900 border-amber-200'
  return 'bg-slate-100 text-slate-700 border-slate-200'
}

function eventDotClass(kind: string) {
  if (kind === 'check-in') return 'bg-emerald-500'
  if (kind === 'check-out') return 'bg-indigo-500'
  if (kind === 'scheduled') return 'bg-amber-500'
  if (kind === 'shift-started' || kind === 'depart') return 'bg-sky-500'
  return 'bg-gray-400'
}

type TechOption = {
  assetId: string
  techName: string
  trade: string
  address: string
  lastPingAt: string
  hasEvidence: boolean
}

export function DayAnalysisTab() {
  const [selectedId, setSelectedId] = useState('')
  const [date, setDate] = useState(DEFAULT_DATE)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [analyzed, setAnalyzed] = useState<DayAnalysisResult | null>(null)
  const [analyzedEmpty, setAnalyzedEmpty] = useState(false)
  const [attempted, setAttempted] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const evidenceIds = useMemo(() => new Set(getAssetsWithDayEvidence(date)), [date])

  const techOptions: TechOption[] = useMemo(() => {
    return getFleetTelemetry({ active: true })
      .map((t) => ({
        assetId: t.assetId,
        techName: t.techName,
        trade: t.trade,
        address: t.address,
        lastPingAt: t.lastPingAt,
        hasEvidence: evidenceIds.has(t.assetId),
      }))
      .sort((a, b) => Number(b.hasEvidence) - Number(a.hasEvidence) || a.techName.localeCompare(b.techName))
  }, [evidenceIds])

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return techOptions
    return techOptions.filter(
      (t) =>
        t.techName.toLowerCase().includes(q) ||
        t.assetId.toLowerCase().includes(q) ||
        t.trade.toLowerCase().includes(q),
    )
  }, [techOptions, query])

  const selected = techOptions.find((t) => t.assetId === selectedId)

  function handleAnalyze() {
    setAttempted(true)
    if (!selectedId) {
      setAnalyzed(null)
      setAnalyzedEmpty(false)
      return
    }
    const result = getDayAnalysis(selectedId, date)
    if (!result) {
      setAnalyzed(null)
      setAnalyzedEmpty(true)
      return
    }
    setAnalyzed(result)
    setAnalyzedEmpty(false)
    setOpen(false)
  }

  function pickTech(option: TechOption) {
    setSelectedId(option.assetId)
    setQuery(option.techName)
    setOpen(false)
    setAnalyzed(null)
    setAnalyzedEmpty(false)
    setAttempted(false)
  }

  const showEmptyPrompt = !attempted && !analyzed && !analyzedEmpty
  const showNoEvidence = attempted && analyzedEmpty
  const showPickFirst = attempted && !selectedId

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-50">
      {/* Controls */}
      <div className="px-6 py-4 bg-white border-b border-gray-200">
        <div className="flex flex-wrap items-end gap-3">
          <div className="relative flex-1 min-w-[16rem]" ref={dropdownRef}>
            <label className="block text-xs font-medium text-gray-500 mb-1">Technician</label>
            <input
              type="text"
              value={query}
              placeholder="Search technician or truck…"
              onFocus={() => setOpen(true)}
              onChange={(e) => {
                setQuery(e.target.value)
                setOpen(true)
                if (selected && e.target.value !== selected.techName) {
                  setSelectedId('')
                  setAnalyzed(null)
                  setAnalyzedEmpty(false)
                  setAttempted(false)
                }
              }}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {open && (
              <div className="absolute z-30 mt-1 w-full max-h-72 overflow-auto bg-white border border-gray-200 rounded-xl shadow-lg">
                {filteredOptions.length === 0 && (
                  <p className="px-3 py-3 text-sm text-gray-500">No technicians match.</p>
                )}
                {filteredOptions.map((option) => {
                  const rel = relativeFromDemo(option.lastPingAt)
                  return (
                    <button
                      key={option.assetId}
                      type="button"
                      onClick={() => pickTech(option)}
                      className="w-full text-left px-3 py-2.5 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-gray-900">{option.techName}</span>
                        <span className="text-xs text-gray-400">{option.assetId}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs ${rel.recent ? 'text-emerald-600' : 'text-sky-600'}`}>
                          Last location {rel.label} · {formatEtClock(option.lastPingAt)} ET
                        </span>
                        {option.hasEvidence && (
                          <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700">
                            Evidence
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="analysis-date" className="block text-xs font-medium text-gray-500 mb-1">
              Date
            </label>
            <input
              id="analysis-date"
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value)
                setAnalyzed(null)
                setAnalyzedEmpty(false)
                setAttempted(false)
              }}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            type="button"
            onClick={handleAnalyze}
            className="px-4 py-2 text-sm font-semibold text-white bg-gray-900 rounded-lg hover:bg-gray-800"
          >
            Analyze
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto" onClick={() => setOpen(false)}>
        {showEmptyPrompt && (
          <div className="h-full min-h-[20rem] flex flex-col items-center justify-center text-center px-6">
            <p className="text-base font-semibold text-gray-900">Select a technician</p>
            <p className="text-sm text-gray-500 mt-1 max-w-md">
              Choose a technician, select a date, then click Analyze.
            </p>
          </div>
        )}

        {showPickFirst && (
          <div className="h-full min-h-[20rem] flex flex-col items-center justify-center text-center px-6">
            <p className="text-base font-semibold text-gray-900">Select a technician</p>
            <p className="text-sm text-gray-500 mt-1">Pick someone from the list before analyzing.</p>
          </div>
        )}

        {showNoEvidence && (
          <div className="h-full min-h-[20rem] flex flex-col items-center justify-center text-center px-6">
            <p className="text-base font-semibold text-gray-900">No overtime evidence for this technician on this date</p>
            <p className="text-sm text-gray-500 mt-1 max-w-md">
              Try a technician marked Evidence in the dropdown, or keep the date at {DEFAULT_DATE}.
            </p>
          </div>
        )}

        {analyzed && <DayAnalysisResultView result={analyzed} />}
      </div>
    </div>
  )
}

function DayAnalysisResultView({ result }: { result: DayAnalysisResult }) {
  const jobsLabel =
    result.jobsDone === result.jobsScheduled && result.jobsScheduled > 0
      ? 'All accounted'
      : `${result.jobsDone} completed`

  return (
    <div className="p-6 space-y-4">
      {/* Metric cards */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
        <MetricCard
          label="SHIFT MOVING"
          value={`${result.distanceMi.toFixed(1)} mi`}
          hint="Fleet GPS distance"
        />
        <MetricCard
          label="JOBS DONE"
          value={`${result.jobsDone}/${result.jobsScheduled}`}
          hint={jobsLabel}
        />
        <MetricCard
          label="ON-SITE"
          value={formatOnSite(result.onSiteMinutes)}
          hint={`BrightStar Field ${result.onSiteMinutes}m`}
        />
        <MetricCard
          label="GPS PINGS"
          value={String(result.gpsPings.length)}
          hint={`${result.distanceMi.toFixed(1)} mi · ${result.movingMin} min moving`}
        />
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 flex flex-col justify-center">
          <p className="text-[11px] font-semibold tracking-wide text-gray-500">VERDICT</p>
          <span
            className={`mt-2 inline-flex self-start px-2.5 py-1 rounded-full text-xs font-bold border ${verdictStyles(result.verdict)}`}
          >
            {result.verdict}
          </span>
        </div>
      </div>

      {/* Main 3-column */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 min-h-[28rem]">
        {/* Timeline */}
        <section className="xl:col-span-3 bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col">
          <header className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">
              Day timeline
              <span className="ml-2 text-xs font-medium text-gray-500">{result.timeline.length} events</span>
            </h2>
          </header>
          <div className="flex-1 overflow-auto p-4 space-y-4">
            {result.timeline.map((event, idx) => (
              <div key={`${event.at}-${event.kind}-${idx}`} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className={`w-2.5 h-2.5 rounded-full mt-1.5 ${eventDotClass(event.kind)}`} />
                  {idx < result.timeline.length - 1 && <span className="flex-1 w-px bg-gray-200 mt-1" />}
                </div>
                <div className="pb-2 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-gray-900">{formatEtClock(event.at)}</span>
                    <span className="text-sm font-medium text-gray-800">{event.label}</span>
                  </div>
                  {(event.woId || event.site) && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {event.woId}
                      {event.woId && event.site ? ' · ' : ''}
                      {event.site}
                    </p>
                  )}
                  {event.address && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{event.address}</p>
                  )}
                  {event.tags && event.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {event.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-600"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Map */}
        <section className="xl:col-span-6 bg-white border border-gray-200 rounded-xl overflow-hidden min-h-[22rem]">
          <FleetMap markers={result.mapMarkers} fitToMarkers className="rounded-xl" />
        </section>

        {/* Right panel */}
        <section className="xl:col-span-3 space-y-3">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-gray-900">{result.techName}</p>
                <p className="text-xs text-gray-500 mt-0.5">{result.trade} · {result.assetId}</p>
              </div>
              <span
                className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${verdictStyles(result.verdict)}`}
              >
                {result.verdict}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-3">{result.address}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-gray-50 px-2.5 py-2">
                <p className="text-gray-500">Start</p>
                <p className="font-semibold text-gray-900 mt-0.5">{formatEtClock(result.shiftStart)} ET</p>
              </div>
              <div className="rounded-lg bg-gray-50 px-2.5 py-2">
                <p className="text-gray-500">End</p>
                <p className="font-semibold text-gray-900 mt-0.5">{formatEtClock(result.shiftEnd)} ET</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-[11px] font-semibold tracking-wide text-gray-500">EVIDENCE ANALYST</p>
            <p className="text-sm text-gray-700 mt-2 leading-relaxed">{result.summary}</p>
          </div>
        </section>
      </div>

      {/* Evidence Center */}
      <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <header className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-gray-900">
            Evidence Center
            <span className="ml-2 text-xs font-medium text-gray-500">
              {result.verdict} · {result.evidencePointCount} evidence points
            </span>
          </h2>
          <div className="flex flex-wrap gap-3 text-[11px] text-gray-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-500" /> Fleet GPS
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> BrightStar Field duration
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Schedule data
            </span>
          </div>
        </header>

        <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-4 grid grid-cols-3 gap-2">
            <StatBlock label="JOBS" value={`${result.jobsDone}/${result.jobsScheduled}`} />
            <StatBlock label="GPS" value={String(result.gpsPings.length)} />
            <StatBlock label="WINDOW GPS" value={`${result.movingMin}m`} />
          </div>
          <div className="lg:col-span-8">
            <p className="text-[11px] font-semibold tracking-wide text-gray-500 mb-2">SUPPORTING EVIDENCE</p>
            <ul className="space-y-1.5">
              {result.supportingEvidence.map((item) => (
                <li
                  key={item}
                  className="text-sm text-gray-700 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
      <p className="text-[11px] font-semibold tracking-wide text-gray-500">{label}</p>
      <p className="text-xl font-semibold text-gray-900 mt-1 tabular-nums">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{hint}</p>
    </div>
  )
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-center">
      <p className="text-[10px] font-semibold tracking-wide text-gray-500">{label}</p>
      <p className="text-lg font-semibold text-gray-900 mt-1 tabular-nums">{value}</p>
    </div>
  )
}
