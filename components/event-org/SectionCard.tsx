"use client"

import React from "react"
import { ChevronDown } from "lucide-react"

/**
 * Shared styling primitives for the Create Event flow (restyle only —
 * all form state and handlers live in the step components).
 */

export const FIELD_INPUT_CLASS =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-(--gold) focus:ring-2 focus:ring-(--gold)/20 placeholder:text-slate-400"

export const FIELD_INPUT_ERROR_CLASS =
  "w-full rounded-xl border border-rose-400 bg-white px-4 py-3 text-sm outline-none transition focus:border-(--gold) focus:ring-2 focus:ring-(--gold)/20 placeholder:text-slate-400"

export const fieldInputClass = (hasError?: boolean) =>
  hasError ? FIELD_INPUT_ERROR_CLASS : FIELD_INPUT_CLASS

export const FieldLabel: React.FC<{
  children: React.ReactNode
  required?: boolean
  htmlFor?: string
  className?: string
}> = ({ children, required, htmlFor, className }) => (
  <label htmlFor={htmlFor} className={`mb-1.5 block text-xs font-semibold text-slate-700 ${className ?? ""}`}>
    {children}
    {required ? <span className="text-rose-500"> *</span> : null}
  </label>
)

/**
 * Error text. Keeps the legacy `text-danger-red` class because
 * EventPage.scrollToFirstError locates the first invalid field via
 * `document.querySelector(".text-danger-red")`.
 */
export const FieldError: React.FC<{ message?: string }> = ({ message }) =>
  message ? <span className="text-danger-red mt-1 block text-xs text-rose-600">{message}</span> : null

export const GOLD_TEXT_BUTTON_CLASS =
  "inline-flex items-center gap-1.5 text-sm font-semibold text-(--gold-text) cursor-pointer bg-transparent border-none p-0 hover:opacity-80 transition"

export const GOLD_PILL_BUTTON_CLASS =
  "inline-flex items-center gap-1.5 rounded-full border border-(--gold) px-4 py-1.5 text-xs font-semibold text-(--gold-text) cursor-pointer bg-transparent hover:bg-(--gold-bar-bg) transition"

interface SectionCardProps {
  icon: React.ReactNode
  title: string
  required?: boolean
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}

const SectionCard: React.FC<SectionCardProps> = ({ icon, title, required, open, onToggle, children }) => (
  <section className="w-full rounded-2xl border border-(--gold-bar-border) bg-white p-5 sm:p-6">
    <div
      role="button"
      tabIndex={0}
      aria-expanded={open}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onToggle()
        }
      }}
      className="flex w-full cursor-pointer items-center justify-between gap-3"
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="shrink-0 text-(--gold-icon)">{icon}</span>
        <h3 className="m-0 truncate text-sm font-bold text-slate-900 sm:text-base">
          {title}
          {required ? <span className="ml-1 text-rose-500">*</span> : null}
        </h3>
      </div>
      <span
        aria-hidden="true"
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-transform duration-200 ${open ? "" : "-rotate-90"}`}
      >
        <ChevronDown className="h-4 w-4" />
      </span>
    </div>

    {open ? <div className="mt-5">{children}</div> : null}
  </section>
)

export default SectionCard
