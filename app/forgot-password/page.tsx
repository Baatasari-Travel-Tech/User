"use client"

import { useState } from "react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { apiRequest } from "@/lib/api/client"

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
})

type Values = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    setMessage(null)
    setError(null)
    setLoading(true)
    try {
      await apiRequest("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify(values),
      })
      setMessage("If that email exists, a reset link has been sent.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  })

  return (
    <main className="page-x flex min-h-[calc(100dvh-96px)] items-center justify-center py-12">
      <div className="w-full max-w-lg rounded-[2rem] border border-white/60 bg-white/90 p-6 shadow-[0_25px_60px_rgba(15,23,42,0.08)] backdrop-blur md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-900">Password recovery</p>
        <h1 className="mt-3 font-bricolage text-4xl text-slate-950">Forgot your password?</h1>
        <p className="mt-3 text-sm text-slate-500">We’ll send a secure reset link to your email address.</p>

        <form className="mt-8 space-y-5" onSubmit={onSubmit}>
          <div>
            <label className="text-sm font-semibold text-slate-700">Email</label>
            <input
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-brand-900 focus:ring-4 focus:ring-brand-900/10"
              type="email"
              {...form.register("email")}
            />
            <p className="mt-1 text-xs text-rose-600">{form.formState.errors.email?.message}</p>
          </div>
          <button
            className="w-full rounded-full bg-brand-900 px-6 py-3 text-sm font-semibold text-white disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>

        {message ? (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </div>
        ) : null}
        {error ? (
          <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}
      </div>
    </main>
  )
}
