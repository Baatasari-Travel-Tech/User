'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/app/providers'
import LoadingScreen from '@/components/loading-screen'

const normalizeRedirectPath = (value: string | null) => {
  if (!value || !value.startsWith('/')) return '/'
  return value
}

export default function AuthCallback() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isLoading, user } = useAuth()

  useEffect(() => {
    const status = searchParams.get('status')
    const redirectPath = normalizeRedirectPath(searchParams.get('redirect'))
    const authError = searchParams.get('authError') ?? 'google_oauth_failed'
    const authErrorDescription =
      searchParams.get('authErrorDescription') ?? 'Google sign-in failed. Please try again.'

    if (status === 'error') {
      router.replace(
        `/?auth=login&authError=${encodeURIComponent(authError)}&authErrorDescription=${encodeURIComponent(authErrorDescription)}`,
      )
      return
    }

    // Google verified identity, but the account also has 2FA enabled — no
    // session yet. Hand the pending ticket to the login modal so it opens
    // straight into the code-entry step instead of the credentials form.
    if (status === '2fa_required') {
      const pending = searchParams.get('pending')
      if (pending) {
        router.replace(
          `/?auth=login&totpPending=${encodeURIComponent(pending)}&redirect=${encodeURIComponent(redirectPath)}`,
        )
        return
      }
    }

    if (isLoading) return

    if (user) {
      router.replace(redirectPath)
      return
    }

    router.replace(
      `/?auth=login&authError=google_oauth_failed&authErrorDescription=${encodeURIComponent('Unable to complete Google sign-in.')}`,
    )
  }, [isLoading, router, searchParams, user])

  return <LoadingScreen />
}
