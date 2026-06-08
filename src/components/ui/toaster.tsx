'use client'
import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, AlertTriangle, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning'
interface Toast { id: number; type: ToastType; message: string }

let toastFn: ((type: ToastType, message: string) => void) | null = null
export function toast(type: ToastType, message: string) { toastFn?.(type, message) }

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([])
  useEffect(() => {
    toastFn = (type, message) => {
      const id = Date.now()
      setToasts(p => [...p, { id, type, message }])
      setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000)
    }
    return () => { toastFn = null }
  }, [])
  const icons = { success: <CheckCircle className="text-green-600" size={18} />, error: <XCircle className="text-red-600" size={18} />, warning: <AlertTriangle className="text-yellow-600" size={18} /> }
  const colors = { success: 'border-green-200 bg-green-50', error: 'border-red-200 bg-red-50', warning: 'border-yellow-200 bg-yellow-50' }
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full">
      {toasts.map(t => (
        <div key={t.id} className={`flex items-center gap-3 rounded-lg border p-4 shadow-lg animate-in slide-in-from-right ${colors[t.type]}`}>
          {icons[t.type]}
          <p className="flex-1 text-sm font-medium text-gray-800">{t.message}</p>
          <button onClick={() => setToasts(p => p.filter(x => x.id !== t.id))}><X size={14} className="text-gray-400" /></button>
        </div>
      ))}
    </div>
  )
}