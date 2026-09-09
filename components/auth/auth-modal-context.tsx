'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

export type AuthMode = 'login' | 'register'

type AuthModalCtx = {
  open: boolean
  mode: AuthMode
  openModal: (mode?: AuthMode) => void
  closeModal: () => void
  setMode: (mode: AuthMode) => void
  isAuthenticating: boolean
  setIsAuthenticating: (loading: boolean) => void
}

const AuthModalContext = createContext<AuthModalCtx | undefined>(undefined)

export function useAuthModal(): AuthModalCtx {
  const ctx = useContext(AuthModalContext)
  if (!ctx) throw new Error('useAuthModal must be inside <AuthModalProvider>')
  return ctx
}

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<AuthMode>('login')
  const [isAuthenticating, setIsAuthenticating] = useState(false)

  const openModal = useCallback((nextMode?: AuthMode) => {
    if (nextMode) setMode(nextMode)
    setOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setOpen(false)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = original
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const value = useMemo<AuthModalCtx>(() => ({
    open,
    mode,
    openModal,
    closeModal,
    setMode,
    isAuthenticating,
    setIsAuthenticating,
  }), [open, mode, openModal, closeModal, isAuthenticating])

  return (
    <AuthModalContext.Provider value={value}>
      {children}
    </AuthModalContext.Provider>
  )
}
