'use client'

import { createContext, useContext, useState, useCallback, useMemo } from 'react'

type ToastType = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  message: string
  type: ToastType
}

interface ToastAPI {
  success: (msg: string) => void
  error: (msg: string) => void
  info: (msg: string) => void
}

const ToastContext = createContext<ToastAPI>({
  success: () => {},
  error: () => {},
  info: () => {},
})

const ICON: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
}

const STYLE: Record<ToastType, string> = {
  success: 'bg-green-500 text-white',
  error: 'bg-red-500 text-white',
  info: 'bg-gray-800 dark:bg-gray-700 text-white',
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => dismiss(id), 3200)
  }, [dismiss])

  const toast = useMemo<ToastAPI>(() => ({
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error'),
    info: (msg) => addToast(msg, 'info'),
  }), [addToast])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast stack — bottom-left, above everything */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="false"
        className="fixed bottom-5 left-5 z-[100] flex flex-col-reverse gap-2"
      >
        {toasts.map(t => (
          <div
            key={t.id}
            className={`flex items-center gap-2.5 pl-4 pr-2 py-2.5 rounded-xl shadow-xl text-sm font-medium animate-toast-in ${STYLE[t.type]}`}
          >
            <span className="text-base leading-none">{ICON[t.type]}</span>
            <span className="flex-1">{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              className="ml-1 opacity-70 hover:opacity-100 transition-opacity text-base leading-none px-1"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
