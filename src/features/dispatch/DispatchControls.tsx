import { FilterChips } from '../../shell/FilterChips'
import { useDispatchStore, type CrewFilter } from '../../store/dispatchStore'

const CREW_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'Maintenance', label: 'Maintenance' },
  { value: 'Nassau', label: 'Nassau' },
  { value: 'FP', label: 'FP' },
]

/** Slim top-left controls: Fit + crew chips (layers/date live in bottom pills). */
export function DispatchControls() {
  const crewFilter = useDispatchStore((s) => s.crewFilter)
  const setCrewFilter = useDispatchStore((s) => s.setCrewFilter)
  const requestFit = useDispatchStore((s) => s.requestFit)
  const showLiveTechs = useDispatchStore((s) => s.showLiveTechs)
  const techSearch = useDispatchStore((s) => s.techSearch)

  const visibleCountLabel = showLiveTechs
    ? techSearch.trim()
      ? 'Filtered techs'
      : 'All crews'
    : 'Techs hidden'

  return (
    <div className="absolute top-3 left-3 z-20 space-y-2" data-tour="crew-chips">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={requestFit}
          className="px-3 py-1.5 text-xs font-semibold bg-white border border-gray-200 rounded-full shadow-sm text-gray-800 hover:bg-gray-50"
        >
          Fit all
        </button>
        <FilterChips
          options={CREW_OPTIONS}
          activeValue={crewFilter}
          onChange={(value) => setCrewFilter(value as CrewFilter)}
        />
      </div>
      <p className="text-[11px] text-gray-600 bg-white/90 border border-gray-200 rounded-full px-3 py-1 shadow-sm inline-flex">
        {visibleCountLabel}
      </p>
    </div>
  )
}
