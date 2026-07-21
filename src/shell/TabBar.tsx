type Tab = {
  id: string
  label: string
  description?: string
  count?: number
}

type TabBarProps = {
  tabs: Tab[]
  activeTab: string
  onChange: (id: string) => void
}

export function TabBar({ tabs, activeTab, onChange }: TabBarProps) {
  return (
    <div className="inline-flex items-center gap-1 p-1 bg-white border border-gray-200 rounded-xl">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`relative px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              tab.description ? 'text-left' : ''
            } ${
              isActive
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <span className="inline-flex items-center">
              {tab.label}
              {typeof tab.count === 'number' && (
                <span
                  className={`ml-2 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 text-xs rounded-full ${
                    isActive ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </span>
            {tab.description && (
              <span
                className={`block text-[10px] font-normal mt-0.5 leading-snug ${
                  isActive ? 'text-gray-300' : 'text-gray-400'
                }`}
              >
                {tab.description}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
