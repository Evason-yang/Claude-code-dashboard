import React, { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

const TYPE_STYLES = {
  success: { background: '#1a3a2a', border: '1px solid #3fb950', color: '#3fb950' },
  error:   { background: '#3a1a1a', border: '1px solid #f85149', color: '#f85149' },
  info:    { background: '#1a2a3a', border: '1px solid #58a6ff', color: '#58a6ff' },
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3000)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{
        position: 'fixed', top: 16, right: 16, zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none'
      }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            ...TYPE_STYLES[t.type] || TYPE_STYLES.info,
            padding: '9px 14px', borderRadius: 7, fontSize: 13,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            maxWidth: 320, wordBreak: 'break-word',
            animation: 'toast-in 0.2s ease',
          }}>
            {t.message}
          </div>
        ))}
      </div>
      <style>{`@keyframes toast-in { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: none; } }`}</style>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) return { showToast: () => {} }
  return ctx
}
