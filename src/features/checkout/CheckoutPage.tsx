import { useMemo, useState } from 'react'
import { PageHeader } from '../../shell/PageHeader'
import { TabBar } from '../../shell/TabBar'
import { Shield } from '../../shell/icons'
import { getCheckoutAlerts } from '../../mock/queries'
import { ActiveWatchesTab } from './ActiveWatchesTab'
import { AlertsTab } from './AlertsTab'
import { exportCheckoutAlertsCsv } from './exportCheckoutAlertsCsv'

const TABS = [
  {
    id: 'watches',
    label: 'Active watches',
    description: 'Check-ins today · Checkout Monitor is monitoring',
  },
  {
    id: 'alerts',
    label: 'Alerts',
    description: 'Geofence breaches sent to alerts pipeline',
  },
]

export function CheckoutPage() {
  const [activeTab, setActiveTab] = useState('watches')
  const [refreshKey, setRefreshKey] = useState(0)

  const tabs = useMemo(() => TABS, [])

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        icon={<Shield className="w-5 h-5" />}
        title="Checkout Compliance"
        subtitle="Checkout Monitor is watching today's check-ins — tiered alerts at 0.5, 1, and 2 mi past the on-site zone until BrightStar Field check-out."
        onRefresh={() => setRefreshKey((k) => k + 1)}
        tourId="checkout-header"
      >
        {activeTab === 'alerts' && (
          <button
            type="button"
            onClick={() => exportCheckoutAlertsCsv(getCheckoutAlerts({ date: '2026-07-21' }))}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Export CSV
          </button>
        )}
      </PageHeader>

      <div className="px-6 py-3 bg-white border-b border-gray-200" data-tour="checkout-tabs">
        <TabBar tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      <div className="flex-1 min-h-0" data-tour="checkout-body">
        {activeTab === 'watches' && <ActiveWatchesTab key={refreshKey} />}
        {activeTab === 'alerts' && <AlertsTab key={refreshKey} />}
      </div>
    </div>
  )
}
