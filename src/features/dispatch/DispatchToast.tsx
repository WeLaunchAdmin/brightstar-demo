import { useEffect } from 'react'
import { useDispatchStore } from '../../store/dispatchStore'

export function DispatchToast() {
  const toast = useDispatchStore((s) => s.toast)
  const clearToast = useDispatchStore((s) => s.clearToast)

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => clearToast(), 3500)
    return () => window.clearTimeout(timer)
  }, [toast, clearToast])

  if (!toast) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-md px-4">
      <div
        className={`rounded-xl border shadow-lg px-4 py-3 text-sm ${
          toast.tone === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : 'bg-white border-gray-200 text-gray-800'
        }`}
      >
        <p className="font-medium">{toast.message}</p>
        <p className="text-xs mt-1 opacity-80">Verify results before dispatching crews.</p>
      </div>
    </div>
  )
}
