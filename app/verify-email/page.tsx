"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/app/providers"
import { apiRequest } from "@/lib/api/client"

export default function VerifyEmailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { bootstrap } = useAuth()
  const token = searchParams.get("token")
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const message = !token
    ? "Verification token is missing."
    : status === "success"
      ? "Email verified successfully. Redirecting..."
      : status === "error"
        ? "Could not verify email."
        : "Verifying your email..."

  useEffect(() => {
    if (!token) return

    void apiRequest("/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
    })
      .then(async () => {
        setStatus("success")
        await bootstrap().catch(() => undefined)
        setTimeout(() => router.replace("/organizer/document-upload"), 1200)
      })
      .catch((error) => {
        setStatus("error")
        setErrorMessage(error instanceof Error ? error.message : "Could not verify email.")
      })
  }, [bootstrap, router, token])

  return (
    <main className="page-x flex min-h-[calc(100dvh-96px)] items-center justify-center py-12">
      <div className="w-full max-w-lg rounded-[2rem] border border-white/60 bg-white/90 p-6 text-center shadow-[0_25px_60px_rgba(15,23,42,0.08)] backdrop-blur md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-900">Organizer verification</p>
        <h1 className="mt-3 font-bricolage text-4xl text-slate-950">Email Verification</h1>
        <p className="mt-4 text-sm text-slate-600">{errorMessage ?? message}</p>
        {status === "success" ? (
          <p className="mt-3 text-xs uppercase tracking-[0.24em] text-slate-400">Redirecting to document upload</p>
        ) : null}
      </div>
    </main>
  )
}
