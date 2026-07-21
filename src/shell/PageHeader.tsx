import { RefreshCw } from './icons'

type PageHeaderProps = {
  icon: React.ReactNode
  title: string
  subtitle: string
  onRefresh?: () => void
  children?: React.ReactNode
  /** Optional onboarding tour anchor, e.g. "overtime-header" */
  tourId?: string
}

export function PageHeader({
  icon,
  title,
  subtitle,
  onRefresh,
  children,
  tourId,
}: PageHeaderProps) {
  return (
    <header
      className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200"
      {...(tourId ? { 'data-tour': tourId } : {})}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
          {icon}
        </div>
        <div>
          <h1 className="text-lg font-semibold text-gray-900 leading-tight">{title}</h1>
          <p className="text-sm text-gray-500">{subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {children}
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        )}
      </div>
    </header>
  )
}
