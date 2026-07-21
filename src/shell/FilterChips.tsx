type FilterOption = {
  value: string
  label: string
  count?: number
}

type FilterChipsProps = {
  options: FilterOption[]
  activeValue: string
  onChange: (value: string) => void
}

export function FilterChips({ options, activeValue, onChange }: FilterChipsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {options.map((option) => {
        const isActive = option.value === activeValue
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
              isActive
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {option.label}
            {typeof option.count === 'number' && (
              <span
                className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 text-xs rounded-full ${
                  isActive ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {option.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
