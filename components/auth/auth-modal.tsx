'use client'

import { AuthModalProvider, useAuthModal } from './auth-modal-context'
import { LoginForm, RegisterForm } from './auth-forms'

function AuthModalContent() {
  const { open, mode, closeModal, setMode, isAuthenticating } = useAuthModal()

  if (!open && !isAuthenticating) return null

  if (!open && isAuthenticating) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" aria-hidden />
        <div
          role="dialog"
          aria-modal="true"
          className="relative w-[min(92vw,28rem)] rounded-2xl border border-white/70 bg-white p-6 shadow-[0_30px_70px_rgba(15,23,42,0.25)]"
        >
          <div className="flex flex-col items-center justify-center py-8">
            <div className="relative w-fit">
              <div className="absolute inset-0 rounded-full bg-brand-900/10 blur-sm animate-pulse" />
              <div className="relative h-14 w-14 rounded-full border-4 border-transparent border-t-brand-900/80 animate-spin motion-reduce:animate-none animation-duration-[3s]">
                <div className="absolute inset-0.5 rounded-full border-[3px] border-transparent border-t-brand-700/70 animate-spin motion-reduce:animate-none animation-duration-[2s] direction-[reverse]" />
                <div className="absolute inset-1.25 rounded-full border-2 border-transparent border-b-brand-900/60 animate-spin motion-reduce:animate-none animation-duration-[1s]" />
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-600">Authenticating...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={closeModal}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-[min(92vw,28rem)] rounded-2xl border border-white/70 bg-white p-6 shadow-[0_30px_70px_rgba(15,23,42,0.25)]"
      >
        <button
          className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
          onClick={closeModal}
          aria-label="Close"
          disabled={isAuthenticating}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
            <path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>

        {mode === 'login' ? (
          <LoginForm onSwitchMode={() => setMode('register')} />
        ) : (
          <RegisterForm onSwitchMode={() => setMode('login')} />
        )}

        {isAuthenticating && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-white/80 backdrop-blur-sm">
            <div className="relative w-fit">
              <div className="absolute inset-0 rounded-full bg-brand-900/10 blur-sm animate-pulse" />
              <div className="relative h-14 w-14 rounded-full border-4 border-transparent border-t-brand-900/80 animate-spin motion-reduce:animate-none animation-duration-[3s]">
                <div className="absolute inset-0.5 rounded-full border-[3px] border-transparent border-t-brand-700/70 animate-spin motion-reduce:animate-none animation-duration-[2s] direction-[reverse]" />
                <div className="absolute inset-1.25 rounded-full border-2 border-transparent border-b-brand-900/60 animate-spin motion-reduce:animate-none animation-duration-[1s]" />
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-600">Authenticating...</p>
          </div>
        )}
      </div>
    </div>
  )
}

export function AuthModalRoot({ children }: { children: React.ReactNode }) {
  return (
    <AuthModalProvider>
      {children}
      <AuthModalContent />
    </AuthModalProvider>
  )
}
