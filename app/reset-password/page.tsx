"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { apiRequest } from "@/lib/api/client"

const schema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Confirm your password"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

type Values = z.infer<typeof schema>

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    if (!token) {
      setError("This reset link is invalid. Please request a new one.")
      return
    }
    setError(null)
    setLoading(true)
    try {
      await apiRequest("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          token,
          newPassword: values.password,
        }),
      })
      setMessage("Password reset successfully. Redirecting to login...")
      setTimeout(() => router.replace("/login"), 1200)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "This reset link is invalid or has expired. Please request a new one.",
      )
    } finally {
      setLoading(false)
    }
  })

  return (
    <main className="page-x flex min-h-[calc(100dvh-96px)] items-center justify-center py-12">
      <div className="w-full max-w-lg rounded-[2rem] border border-white/60 bg-white/90 p-6 shadow-[0_25px_60px_rgba(15,23,42,0.08)] backdrop-blur md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-900">Secure reset</p>
        <h1 className="mt-3 font-bricolage text-4xl text-slate-950">Set a new password</h1>
        {!token ? (
          <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            This reset link is invalid or missing. Please{" "}
            <a href="/forgot-password" className="font-semibold underline">request a new one</a>.
          </div>
        ) : null}
        <form className="mt-8 space-y-5" onSubmit={onSubmit}>
          <div>
            <label className="text-sm font-semibold text-slate-700">New Password</label>
            <input className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3" type="password" {...form.register("password")} />
            <p className="mt-1 text-xs text-rose-600">{form.formState.errors.password?.message}</p>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Confirm Password</label>
            <input className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3" type="password" {...form.register("confirmPassword")} />
            <p className="mt-1 text-xs text-rose-600">{form.formState.errors.confirmPassword?.message}</p>
          </div>
          <button
            className="w-full rounded-full bg-brand-900 px-6 py-3 text-sm font-semibold text-white disabled:opacity-60"
            disabled={!token || loading}
          >
            {loading ? "Resetting…" : "Reset password"}
          </button>
        </form>
        {message ? <p className="mt-4 text-sm text-emerald-700">{message}</p> : null}
        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}
      </div>
    </main>
  )
}
