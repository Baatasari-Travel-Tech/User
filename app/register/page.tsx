'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function RegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const role = searchParams.get('role')
    const params = new URLSearchParams()
    params.set('auth', 'register')
    if (role) params.set('role', role)
    router.replace(`/?${params.toString()}`)
  }, [router, searchParams])

  return null
}


