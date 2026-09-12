'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/app/providers'
import { resolveUserHome } from '@/lib/auth/navigation'
import { useAuthStore } from '@/lib/auth/store'
import { useAuthModal } from './auth-modal-context'
import InlineSpinner from '@/components/ui/inline-spinner'
import { CalendarPlus, Eye, EyeOff } from 'lucide-react'
import { logAuth, logAuthError } from '@/lib/auth-log'
import { ApiError } from '@/types/api'
import { supportMailto } from '@/lib/support-mailto'

const PENDING_DELETION_CODE = 'ACCOUNT_PENDING_DELETION'
// Same code, lowercased — matches what the OAuth callback redirects with.
const PENDING_DELETION_URL_CODE = PENDING_DELETION_CODE.toLowerCase()

const isPendingDeletionError = (err: unknown): boolean =>
  err instanceof ApiError && err.code === PENDING_DELETION_CODE

// Registering with an email that already has an account (backend: 409 EMAIL_EXISTS).
const isEmailExistsError = (err: unknown): boolean =>
  err instanceof ApiError && err.code === 'EMAIL_EXISTS'

// Shared banner for the pending-deletion case. Embeds a click-through
// to the retrieve-account mailto template so the user can immediately
// reach support without typing anything.
function PendingDeletionBanner({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      <p>{message}</p>
      <a
        href={supportMailto.retrieveAccount()}
        className="mt-2 inline-flex items-center font-semibold text-rose-700 underline underline-offset-2 hover:text-rose-900"
      >
        Contact support to retrieve →
      </a>
    </div>
  )
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
)

type AuthSwitch = {
  onSwitchMode?: () => void
}

const getOrganizerVerificationStatus = () => {
  const currentUser = useAuthStore.getState().user
  if (!currentUser || currentUser.role !== 'ORGANIZER') return null
  if (!currentUser.emailVerified) return 'EMAIL_NOT_VERIFIED'
  if (!currentUser.organizerDocumentsSubmitted) return 'DOCUMENTS_REQUIRED'
  if (currentUser.organizerApproved) return 'APPROVED'
  if (currentUser.organizerReviewStatus === 'CHANGES_REQUESTED') return 'CHANGES_REQUESTED'
  if (currentUser.organizerReviewStatus === 'REJECTED') return 'REJECTED'
  return 'PENDING'
}

const resolvePostAuthDestination = () =>
  resolveUserHome({
    user: useAuthStore.getState().user,
    activeRole: useAuthStore.getState().activeRole === 'ORGANIZER' ? 'EVENT_ORGANIZER' : 'USER',
    organizerVerificationStatus: getOrganizerVerificationStatus(),
  })

const resolveAuthDestination = (searchParams: { get: (key: string) => string | null }) => {
  const redirect = searchParams.get('redirect')
  if (redirect && redirect.startsWith('/')) return redirect
  return resolvePostAuthDestination()
}

const resolveGoogleOAuthRedirectUrl = (role: 'USER' | 'ORGANIZER', redirectPath: string) => {
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? ''
  const params = new URLSearchParams()
  params.set('role', role)
  if (redirectPath.startsWith('/')) {
    params.set('redirect', redirectPath)
  }
  return `${base}/api/v1/auth/google/redirect?${params.toString()}`
}

export function LoginForm({ onSwitchMode }: AuthSwitch) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, verifyTwoFactor, requestTwoFactorRecovery, confirmTwoFactorRecovery } = useAuth()
  const { closeModal, setIsAuthenticating } = useAuthModal()

  // A Google sign-in that hit a 2FA-enabled account arrives here via
  // ?totpPending=<pending> (see app/auth/callback/page.tsx) — open straight
  // into the code-entry step instead of the credentials form.
  const [step, setStep] = useState<'credentials' | 'totp' | 'recovery'>(() =>
    searchParams.get('totpPending') ? 'totp' : 'credentials',
  )
  const [pending, setPending] = useState<string | null>(() => searchParams.get('totpPending'))
  const [totpCode, setTotpCode] = useState('')
  const [recoveryOtp, setRecoveryOtp] = useState('')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingDeletion, setPendingDeletion] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const authErrorFromUrl = searchParams.get('authError')
  const authErrorDescription = searchParams.get('authErrorDescription') ?? ''
  const isPendingDeletionFromUrl = authErrorFromUrl === PENDING_DELETION_URL_CODE

  const authErrorMessage = (() => {
    if (!authErrorFromUrl) return null
    if (isPendingDeletionFromUrl) {
      return authErrorDescription || 'This account is pending deletion. To retrieve it, contact support.'
    }
    let message = 'Sign in failed. Please try again.'
    if (authErrorDescription.toLowerCase().includes('already') || authErrorDescription.toLowerCase().includes('exists')) {
      message = 'This email already has an account. Please sign in with email/password.'
    }
    return message
  })()

  const errorToShow = error ?? authErrorMessage
  const showPendingDeletionBanner = pendingDeletion || isPendingDeletionFromUrl

  const completeLogin = () => {
    closeModal()
    router.replace(resolveAuthDestination(searchParams))
  }

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields.')
      return
    }

    setLoading(true)
    setError(null)
    setIsAuthenticating(true)
    logAuth('login:submit', { email })

    try {
      const result = await login({ email, password })
      if (result.requires2FA) {
        setPending(result.pending)
        setStep('totp')
        setIsAuthenticating(false)
        setLoading(false)
        return
      }
      completeLogin()
    } catch (authError) {
      const message = authError instanceof Error ? authError.message : 'Invalid email or password.'
      logAuthError('login:error', { message })
      setError(message)
      setPendingDeletion(isPendingDeletionError(authError))
    } finally {
      setLoading(false)
      setIsAuthenticating(false)
    }
  }

  const handleVerifyTotp = async () => {
    if (!pending || !/^\d{6}$/.test(totpCode)) return

    setLoading(true)
    setError(null)
    setIsAuthenticating(true)

    try {
      await verifyTwoFactor(pending, totpCode)
      completeLogin()
    } catch (authError) {
      const message = authError instanceof Error ? authError.message : 'Invalid code. Please try again.'
      setError(message)
    } finally {
      setLoading(false)
      setIsAuthenticating(false)
    }
  }

  const handleRequestRecovery = async () => {
    if (!pending) return

    setLoading(true)
    setError(null)

    try {
      await requestTwoFactorRecovery(pending)
      setStep('recovery')
    } catch (authError) {
      const message = authError instanceof Error ? authError.message : 'Could not send a code. Please try again.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmRecovery = async () => {
    if (!pending || !/^\d{6}$/.test(recoveryOtp)) return

    setLoading(true)
    setError(null)
    setIsAuthenticating(true)

    try {
      await confirmTwoFactorRecovery(pending, recoveryOtp)
      completeLogin()
    } catch (authError) {
      const message = authError instanceof Error ? authError.message : 'Invalid or expired code.'
      setError(message)
    } finally {
      setLoading(false)
      setIsAuthenticating(false)
    }
  }

  const handleGoogle = () => {
    setError(null)
    setGoogleLoading(true)
    logAuth('login:google:redirect-start')

    try {
      const redirectPath = resolveAuthDestination(searchParams)
      const googleUrl = resolveGoogleOAuthRedirectUrl('USER', redirectPath)
      window.location.assign(googleUrl)
    } catch (authError) {
      const message = authError instanceof Error ? authError.message : 'Google sign-in failed. Please try again.'
      logAuthError('login:google:redirect-error', { message })
      setError(message)
      setGoogleLoading(false)
    }
  }

  if (step === 'totp') {
    return (
      <div className="space-y-5">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Two-factor authentication</p>
          <h2 className="text-2xl font-semibold text-slate-900">Enter your code</h2>
          <p className="text-sm text-slate-500">Open your authenticator app and enter the current 6-digit code.</p>
        </div>

        <label className="block text-sm font-semibold text-slate-700">
          Authentication code
          <input
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-center text-lg tracking-[0.4em] text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-900 focus:outline-none focus:ring-4 focus:ring-brand-900/10"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            autoComplete="one-time-code"
            placeholder="000000"
            value={totpCode}
            onChange={e => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            onKeyDown={e => e.key === 'Enter' && void handleVerifyTotp()}
            autoFocus
          />
        </label>

        {errorToShow && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-600">
            {errorToShow}
          </p>
        )}

        <button
          className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800 disabled:opacity-60"
          onClick={() => void handleVerifyTotp()}
          disabled={loading || !/^\d{6}$/.test(totpCode)}
        >
          {loading && <InlineSpinner />}
          <span>{loading ? 'Verifying...' : 'Verify'}</span>
        </button>

        <button
          type="button"
          className="w-full text-center text-xs font-semibold text-brand-800 hover:underline"
          onClick={() => void handleRequestRecovery()}
          disabled={loading}
        >
          Lost access to your authenticator?
        </button>

        <button
          type="button"
          className="w-full text-center text-xs font-semibold text-slate-500 hover:text-slate-700"
          onClick={() => {
            setStep('credentials')
            setPending(null)
            setTotpCode('')
            setError(null)
          }}
          disabled={loading}
        >
          Back to login
        </button>
      </div>
    )
  }

  if (step === 'recovery') {
    return (
      <div className="space-y-5">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Two-factor authentication</p>
          <h2 className="text-2xl font-semibold text-slate-900">Check your email</h2>
          <p className="text-sm text-slate-500">
            We emailed a 6-digit code to {email || 'your account email'}. Entering it turns two-factor
            authentication OFF and signs you in — you can set it back up from Security settings.
          </p>
        </div>

        <label className="block text-sm font-semibold text-slate-700">
          Email code
          <input
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-center text-lg tracking-[0.4em] text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-900 focus:outline-none focus:ring-4 focus:ring-brand-900/10"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            autoComplete="one-time-code"
            placeholder="000000"
            value={recoveryOtp}
            onChange={e => setRecoveryOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            onKeyDown={e => e.key === 'Enter' && void handleConfirmRecovery()}
            autoFocus
          />
        </label>

        {errorToShow && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-600">
            {errorToShow}
          </p>
        )}

        <button
          className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800 disabled:opacity-60"
          onClick={() => void handleConfirmRecovery()}
          disabled={loading || !/^\d{6}$/.test(recoveryOtp)}
        >
          {loading && <InlineSpinner />}
          <span>{loading ? 'Disabling...' : 'Disable 2FA & sign in'}</span>
        </button>

        <button
          type="button"
          className="w-full text-center text-xs font-semibold text-slate-500 hover:text-slate-700"
          onClick={() => {
            setStep('totp')
            setRecoveryOtp('')
            setError(null)
          }}
          disabled={loading}
        >
          Back
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Login</p>
        <h2 className="text-2xl font-semibold text-slate-900">Login to Baatasari</h2>
      </div>

      <div className="space-y-4">
        <label className="block text-sm font-semibold text-slate-700">
          Email
          <input
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-900 focus:outline-none focus:ring-4 focus:ring-brand-900/10"
            type="email"
            placeholder="contactus@baatasari.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Password
          <div className="relative mt-2">
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-11 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-900 focus:outline-none focus:ring-4 focus:ring-brand-900/10"
              type={showPassword ? 'text' : 'password'}
              placeholder="********"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && void handleLogin()}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-700"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
          </div>
        </label>
      </div>

      <div className="flex justify-end">
        <a href="/forgot-password" className="text-xs font-semibold text-brand-800 hover:underline">
          Forgot password?
        </a>
      </div>

      {errorToShow && (
        showPendingDeletionBanner ? (
          <PendingDeletionBanner message={errorToShow} />
        ) : (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-600">
            {errorToShow}
          </p>
        )
      )}

      <div className="space-y-4">
        <button
          className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800 disabled:opacity-60"
          onClick={() => void handleLogin()}
          disabled={loading || !email || !password}
        >
          {loading && <InlineSpinner />}
          <span>{loading ? 'Signing in...' : 'Login'}</span>
        </button>

        <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          or
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <button
          className="flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          onClick={() => void handleGoogle()}
          disabled={loading || googleLoading}
        >
          {googleLoading ? <InlineSpinner /> : <GoogleIcon />}
          {googleLoading ? 'Opening Google...' : 'Continue with Google'}
        </button>
      </div>

      <div className="space-y-2 text-center text-sm text-slate-500">
        <p>
          Don&apos;t have an account?{' '}
          <button
            onClick={onSwitchMode}
            className="font-semibold text-brand-800"
          >
            Sign Up
          </button>
        </p>

        <p className="text-xs">
          By continuing, you agree to our{' '}
          <a href="/terms-and-conditions" target="_blank" className="font-semibold text-brand-800 underline-offset-2 hover:underline">
            Terms &amp; Conditions
          </a>{' '}
          and{' '}
          <a href="/privacy-policy" target="_blank" className="font-semibold text-brand-800 underline-offset-2 hover:underline">
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  )
}

export function RegisterForm({ onSwitchMode }: AuthSwitch) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { register } = useAuth()
  const { closeModal, setIsAuthenticating } = useAuthModal()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  // Role is fixed by the entry point (organizer CTAs pass ?role=organizer,
  // e.g. from /for-organizers) — there is deliberately no in-form toggle.
  // Latched rather than derived live: the URL cleanup in SiteShell can strip
  // ?role while the modal is open, and the form must not flip back to user.
  const roleParam = searchParams.get('role')
  const [role, setLatchedRole] = useState<'user' | 'organizer'>(
    roleParam === 'organizer' ? 'organizer' : 'user'
  )
  // Adjust-during-render latch (guarded, so it can't loop).
  if (roleParam === 'organizer' && role !== 'organizer') {
    setLatchedRole('organizer')
  }
  const [error, setError] = useState<string | null>(null)
  const [pendingDeletion, setPendingDeletion] = useState(false)
  const [existingAccount, setExistingAccount] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [isPasswordFocused, setIsPasswordFocused] = useState(false)
  const [acceptedTermsChecked, setAcceptedTerms] = useState(false)

  const selectedRole: 'USER' | 'ORGANIZER' = role === 'organizer' ? 'ORGANIZER' : 'USER'
  // Minimum age differs by role: attendees 13+, organizers 18+.
  const minAge = role === 'organizer' ? 18 : 13
  // Users consent implicitly by continuing (clickwrap — the notice sits by the
  // buttons); organizers must tick the explicit checkbox.
  const acceptedTerms = role === 'organizer' ? acceptedTermsChecked : true

  const handleRegister = async () => {
    if (!email || !password || !confirm) {
      setError('Please fill all fields')
      return
    }

    const normalizedEmail = email.trim().toLowerCase()
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setError('Please enter a valid email address')
      return
    }

    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }

    if (!acceptedTerms) {
      setError('Please accept the Terms & Privacy Policy to continue.')
      return
    }

    setLoading(true)
    setError(null)
    setExistingAccount(false)
    setIsAuthenticating(true)
    logAuth('register:submit', { email: normalizedEmail, role: selectedRole })

    try {
      await register({
        email: normalizedEmail,
        password,
        role: selectedRole,
        acceptedTerms: true,
      })
      closeModal()
      router.replace(resolveAuthDestination(searchParams))
    } catch (authError) {
      const message = authError instanceof Error ? authError.message : 'Unable to create account.'
      logAuthError('register:error', { message, role: selectedRole })
      setError(message)
      setPendingDeletion(isPendingDeletionError(authError))
      setExistingAccount(isEmailExistsError(authError))
    } finally {
      setLoading(false)
      setIsAuthenticating(false)
    }
  }

  const handleGoogle = () => {
    setError(null)
    setGoogleLoading(true)
    logAuth('register:google:redirect-start', { role: selectedRole })

    try {
      const redirectPath = resolveAuthDestination(searchParams)
      const googleUrl = resolveGoogleOAuthRedirectUrl(selectedRole, redirectPath)
      window.location.assign(googleUrl)
    } catch (authError) {
      const message = authError instanceof Error ? authError.message : 'Google sign-in failed. Please try again.'
      logAuthError('register:google:redirect-error', { message, role: selectedRole })
      setError(message)
      setGoogleLoading(false)
    }
  }

  const passwordChecks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  }

  const strength = Object.values(passwordChecks).filter(Boolean).length
  const strengthLabel =
    strength <= 1 ? 'Weak' : strength <= 3 ? 'Medium' : 'Strong'

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        {role === 'organizer' && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-900/5 px-3 py-1 text-xs font-semibold text-brand-800">
            <CalendarPlus className="h-3.5 w-3.5" />
            Event organizer
          </span>
        )}
        <h2 className="text-2xl font-semibold text-slate-900">
          {role === 'organizer' ? 'Create your organizer account' : 'Create your account'}
        </h2>
        <p className="text-sm text-slate-500">
          {role === 'organizer' ? 'Start hosting events on Baatasari' : 'Get started in seconds'}
        </p>
      </div>

      <div className="space-y-4">
        <input
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-900 focus:ring-4 focus:ring-brand-900/10"
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <div className="space-y-2">
          <div className="relative">
            <input
              className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-11 text-sm outline-none focus:border-brand-900 focus:ring-4 focus:ring-brand-900/10"
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setIsPasswordFocused(true)}
              onBlur={() => setIsPasswordFocused(false)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-700"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
          </div>

          {isPasswordFocused && (
            <>
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full transition-all duration-300 ${
                      strength <= 1
                        ? 'w-1/4 bg-rose-500'
                        : strength <= 3
                          ? 'w-2/4 bg-amber-500'
                          : 'w-full bg-emerald-500'
                    }`}
                  />
                </div>
                <span className="text-xs text-slate-500">{strengthLabel}</span>
              </div>

              <div className="grid grid-cols-2 gap-1 text-xs">
                <p className={passwordChecks.length ? 'text-green-900' : 'text-slate-400'}>
                  [ok] 8+ characters
                </p>
                <p className={passwordChecks.uppercase ? 'text-green-900' : 'text-slate-400'}>
                  [ok] Uppercase
                </p>
                <p className={passwordChecks.number ? 'text-green-900' : 'text-slate-400'}>
                  [ok] Number
                </p>
                <p className={passwordChecks.special ? 'text-green-900' : 'text-slate-400'}>
                  [ok] Special char
                </p>
              </div>
            </>
          )}
        </div>

        <input
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-900 focus:ring-4 focus:ring-brand-900/10"
          type="password"
          placeholder="Confirm password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void handleRegister()}
        />
      </div>

      {role === 'organizer' && (
        <label className="flex items-start gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={acceptedTermsChecked}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300"
          />
          <span>
            I am <strong>{minAge} years or older</strong> and agree to the{" "}
            <a href="/terms-and-conditions" target="_blank" className="font-semibold text-brand-700 underline">
              Terms &amp; Conditions
            </a>{" "}
            and{" "}
            <a href="/privacy-policy" target="_blank" className="font-semibold text-brand-700 underline">
              Privacy Policy
            </a>
            .
          </span>
        </label>
      )}

      {error && (
        pendingDeletion ? (
          <PendingDeletionBanner message={error} />
        ) : existingAccount ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <p>{error}</p>
            <button
              type="button"
              onClick={onSwitchMode}
              className="mt-1.5 font-semibold text-brand-800 underline underline-offset-2"
            >
              Sign in instead →
            </button>
          </div>
        ) : (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-600">
            {error}
          </p>
        )
      )}

      <button
        onClick={() => void handleRegister()}
        disabled={loading || !email || !password || !confirm || !acceptedTerms}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-900 py-3 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:opacity-60"
      >
        {loading && <InlineSpinner />}
        {loading ? 'Creating account...' : 'Create account'}
      </button>

      <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />
        or
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <button
        onClick={() => void handleGoogle()}
        disabled={loading || googleLoading || !acceptedTerms}
        className="flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
      >
        {googleLoading ? <InlineSpinner /> : <GoogleIcon />}
        {googleLoading ? 'Opening Google...' : 'Continue with Google'}
      </button>

      <div className="space-y-2 text-center text-sm text-slate-500">
        <p>
          Already have an account?{' '}
          <button
            onClick={onSwitchMode}
            className="font-semibold text-brand-800"
          >
            Sign in
          </button>
        </p>

        {role === 'user' && (
          <p className="text-xs">
            By continuing, you agree to our{' '}
            <a href="/terms-and-conditions" target="_blank" className="font-semibold text-brand-800 underline-offset-2 hover:underline">
              Terms &amp; Conditions
            </a>{' '}
            and{' '}
            <a href="/privacy-policy" target="_blank" className="font-semibold text-brand-800 underline-offset-2 hover:underline">
              Privacy Policy
            </a>
          </p>
        )}
      </div>
    </div>
  )
}
