import { Outlet } from 'react-router-dom'
import { SideNavRail } from './SideNavRail'
import { OnboardingHost } from '../onboarding/OnboardingHost'

export function AppShell() {
  return (
    <div className="flex h-full bg-gray-50">
      <SideNavRail />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Outlet />
      </main>
      <OnboardingHost />
    </div>
  )
}
