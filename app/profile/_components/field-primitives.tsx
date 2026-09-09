import { Trash2, User as UserIcon } from "lucide-react"

type LucideIcon = typeof UserIcon

export function FormSection({
  icon: Icon,
  title,
  description,
  accent = "navy",
  children,
}: {
  icon: LucideIcon
  title: string
  description?: string
  accent?: "navy" | "emerald" | "blue"
  children: React.ReactNode
}) {
  const tones: Record<string, string> = {
    navy: "bg-(--brand-navy)/8 text-(--brand-navy)",
    emerald: "bg-emerald-50 text-emerald-600",
    blue: "bg-(--blue-50) text-(--brand-blue)",
  }
  return (
    <div className="p-6 md:p-8">
      <div className="mb-5 flex items-center gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[accent]}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h3 className="text-base font-semibold text-slate-900 md:text-lg">{title}</h3>
          {description ? <p className="text-xs text-slate-500">{description}</p> : null}
        </div>
      </div>
      {children}
    </div>
  )
}

export function FieldShell({
  label,
  required,
  hint,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1 text-sm font-semibold text-slate-700">
        {label}
        {required ? <span className="text-rose-500">*</span> : null}
      </label>
      {children}
      {hint ? <p className="text-[11px] text-slate-400">{hint}</p> : null}
    </div>
  )
}

export function FieldInput({
  icon: Icon,
  placeholder,
  value,
  onChange,
}: {
  icon: LucideIcon
  placeholder: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm focus-within:border-(--brand-navy) focus-within:ring-4 focus-within:ring-(--brand-navy)/10">
      <Icon className="h-4 w-4 text-slate-400" />
      <input
        className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  )
}

export function SectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: LucideIcon
  title: string
  subtitle?: string
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-(--brand-navy)/8 text-(--brand-navy)">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <h3 className="font-bricolage text-2xl font-bold text-slate-900">{title}</h3>
        {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
      </div>
    </div>
  )
}

export function InfoCard({
  icon: Icon,
  label,
  value,
  pill,
  pillTone,
  action,
}: {
  icon: LucideIcon
  label: string
  value: string
  pill?: string
  pillTone?: "emerald" | "amber" | "blue"
  action?: React.ReactNode
}) {
  const toneClass =
    pillTone === "emerald"
      ? "bg-emerald-50 text-emerald-700"
      : pillTone === "amber"
        ? "bg-amber-50 text-amber-700"
        : "bg-(--blue-50) text-(--brand-blue)"
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_15px_40px_-25px_rgba(12,29,55,0.18)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>
            <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">{value}</p>
          </div>
        </div>
        {action}
      </div>
      {pill ? (
        <span className={`mt-3 inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold ${toneClass}`}>
          {pill}
        </span>
      ) : null}
    </div>
  )
}

export function DangerZone({
  title,
  description,
  actionLabel,
  onAction,
  disabled,
}: {
  title: string
  description: string
  actionLabel: string
  onAction?: () => void
  disabled?: boolean
}) {
  return (
    <div className="rounded-3xl border border-rose-200 bg-rose-50/60 p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
          <Trash2 className="h-4 w-4" />
        </span>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-rose-700">{title}</h4>
          <p className="mt-1 text-xs text-rose-600/90">{description}</p>
          <button
            type="button"
            onClick={onAction}
            disabled={disabled || !onAction}
            className="mt-3 inline-flex items-center rounded-full border border-rose-300 bg-white px-4 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
