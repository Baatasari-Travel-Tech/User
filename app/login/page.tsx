'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const redirect = searchParams.get('redirect')
    if (redirect) {
      router.replace(`/?auth=login&redirect=${encodeURIComponent(redirect)}`)
      return
    }
    router.replace('/?auth=login')
  }, [router, searchParams])

  return null
}


