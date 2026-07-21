import { useState } from 'react'
import { PageHeader } from '../../shell/PageHeader'
import { TabBar } from '../../shell/TabBar'
import { Clock } from '../../shell/icons'
import { FleetHoursTab } from './FleetHoursTab'
import { DayAnalysisTab } from './DayAnalysisTab'

const TABS = [
  { id: 'fleet', label: 'Fleet hours' },
  { id: 'day', label: 'Day analysis' },
]

export function OvertimePage() {
  const [activeTab, setActiveTab] = useState('fleet')
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        icon={<Clock className="w-5 h-5" />}
        title="Overtime"
        subtitle="Fleet week table from site-punch rules, plus single-tech day GPS and evidence."
        onRefresh={() => setRefreshKey((k) => k + 1)}
        tourId="overtime-header"
      />

      <div className="px-6 py-3 bg-white border-b border-gray-200" data-tour="overtime-tabs">
        <TabBar tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      <div className="flex-1 min-h-0" data-tour="overtime-body">
        {activeTab === 'fleet' && <FleetHoursTab key={refreshKey} />}
        {activeTab === 'day' && <DayAnalysisTab />}
      </div>
    </div>
  )
}
