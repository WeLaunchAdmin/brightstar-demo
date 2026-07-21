import { Outlet, useNavigate } from 'react-router-dom'
import { SideNavRail } from './SideNavRail'
import { OnboardingHost } from '../onboarding/OnboardingHost'
import { runOnboardingTour } from '../onboarding/startTour'

export function AppShell() {
  const navigate = useNavigate()

  return (
    <div className="flex h-full bg-gray-50">
      <SideNavRail
        onHelp={() => {
          void runOnboardingTour(navigate, { markSeen: true })
        }}
      />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Outlet />
      </main>
      <OnboardingHost />
    </div>
  )
}
