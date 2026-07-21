import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { AppShell } from '../shell/AppShell'
import { DispatchPage } from '../features/dispatch/DispatchPage'
import { OvertimePage } from '../features/overtime/OvertimePage'
import { CheckoutPage } from '../features/checkout/CheckoutPage'
import { IdlePage } from '../features/idle/IdlePage'
import { ChatPage } from '../features/chat/ChatPage'

const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <AppShell />,
      children: [
        { index: true, element: <Navigate to="/supervisor/dispatch" replace /> },
        { path: 'supervisor/dispatch', element: <DispatchPage /> },
        { path: 'supervisor/overtime', element: <OvertimePage /> },
        { path: 'supervisor/checkout', element: <CheckoutPage /> },
        { path: 'supervisor/idle', element: <IdlePage /> },
        { path: 'supervisor/chat', element: <ChatPage /> },
      ],
    },
  ],
  { basename: '/brightstar/demo' },
)

export function AppRouter() {
  return <RouterProvider router={router} />
}
