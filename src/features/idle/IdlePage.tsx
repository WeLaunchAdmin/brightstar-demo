import { useMemo, useState } from 'react'
import { PageHeader } from '../../shell/PageHeader'
import { TabBar } from '../../shell/TabBar'
import { Pause } from '../../shell/icons'
import { getFleetTelemetry, getIdleAlerts, getIdleMonitorCounts } from '../../mock/queries'
import { MonitoredTechniciansTab } from './MonitoredTechniciansTab'
import { IdleAlertsTab } from './IdleAlertsTab'
import { exportIdleCsv } from './exportIdleCsv'

const TABS = [
  {
    id: 'monitored',
    label: 'Monitored technicians',
    description: 'Live telemetry',
  },
  {
    id: 'alerts',
    label: 'Alerts',
    description: 'Idle events sent to alerts pipeline (8 AM–1 AM ET)',
  },
]

export function IdlePage() {
  const [activeTab, setActiveTab] = useState('monitored')
  const [refreshKey, setRefreshKey] = useState(0)

  const monitoredCount = useMemo(() => {
    void refreshKey
    return getIdleMonitorCounts(true).all
  }, [refreshKey])

  const tabs = useMemo(
    () => [
      {
        ...TABS[0],
        description: `${monitoredCount} technicians · live telemetry`,
      },
      TABS[1],
    ],
    [monitoredCount],
  )

  function handleExport() {
    if (activeTab === 'monitored') {
      exportIdleCsv(
        'monitored',
        getFleetTelemetry({ active: true }).map((r) => ({
          assetId: r.assetId,
          status: r.gpsStatus,
          engineOn: r.engineOn,
          speed: r.speed,
          idleMinutes: r.idleMinutes,
          address: r.address,
          lastPingAt: r.lastPingAt,
        })),
      )
    } else {
      exportIdleCsv(
        'alerts',
        getIdleAlerts({ date: '2026-07-21' }).map((a) => ({
          alertId: a.alertId,
          assetId: a.assetId,
          minutes: a.minutes,
          location: a.location,
          callStatus: a.callStatus,
          sessionEnded: a.sessionEnded,
          notifiedAckAt: a.notifiedAckAt ?? '',
          idleSinceAt: a.idleSinceAt,
          idleDetectedAt: a.idleDetectedAt,
          stoppedIdlingAt: a.stoppedIdlingAt ?? '',
        })),
      )
    }
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        icon={<Pause className="w-5 h-5" />}
        title="Idle Monitoring"
        subtitle={`Detects engine-on idling ≥ 8 minutes during 8 AM–1 AM ET for ${monitoredCount} monitored technicians.`}
        onRefresh={() => setRefreshKey((k) => k + 1)}
      >
        <button
          type="button"
          onClick={handleExport}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Export CSV
        </button>
      </PageHeader>

      <div className="px-6 py-3 bg-white border-b border-gray-200">
        <TabBar tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      {activeTab === 'monitored' && <MonitoredTechniciansTab key={refreshKey} />}
      {activeTab === 'alerts' && <IdleAlertsTab key={refreshKey} />}
    </div>
  )
}
