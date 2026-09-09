"use client"

import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import { format } from "date-fns"
import { Controller, useFormContext, useWatch } from "react-hook-form"
import {
  Briefcase,
  CalendarIcon,
  CheckCircle2,
  Mail,
  Phone,
  Sparkles,
  User as UserIcon,
} from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useAuth } from "@/app/providers"
import { USER_MIN_AGE } from "@/lib/profile-validation"
import { FieldShell, FormSection } from "../field-primitives"
import { StateDistrictLocalityPicker } from "@/components/common/state-district-locality-picker"
import type { ProfileFormValues } from "../profile-schema"

export function IdentitySection() {
  const { updateProfile, user, session, profile } = useAuth()
  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isDirty },
  } = useFormContext<ProfileFormValues>()

  const [dobOpen, setDobOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Email is read-only — not part of the form. Source it from session/profile.
  const email = session?.user?.email ?? profile?.email ?? ""

  // Live values for the completion meter in the footer.
  const values = useWatch({ control }) as Partial<ProfileFormValues>
  const { completedFields, totalFields, completionPercent } = useMemo(() => {
    const fields = [
      values.name,
      values.phone,
      values.dob,
      values.location,
      values.gender,
      values.profession,
    ]
    const filled = fields.filter((v) => v && String(v).trim().length > 0).length
    const total = fields.length
    return {
      completedFields: filled,
      totalFields: total,
      completionPercent: Math.round((filled / total) * 100),
    }
  }, [values.name, values.phone, values.dob, values.location, values.gender, values.profession])

  const onSubmit = handleSubmit(async (data) => {
    setLoading(true)
    setError(null)
    setMessage(null)
    try {
      await updateProfile({
        fullName: data.name.trim(),
        phone: `+91${data.phone.trim()}`,
        dob: data.dob.trim(),
        location: data.location.trim(),
        locationArea: (data.locationArea ?? "").trim(),
        locationCity: (data.locationCity ?? "").trim(),
        locationState: (data.locationState ?? "").trim(),
        locationPincode: (data.locationPincode ?? "").trim(),
        locationLat: data.locationLat ?? undefined,
        locationLng: data.locationLng ?? undefined,
        gender: data.gender.trim(),
        profession: data.profession.trim(),
      })
      // Establish the saved values as the new clean baseline so isDirty
      // returns false until the user edits again.
      reset(data, { keepValues: true })
      setMessage("Profile updated successfully.")
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Profile could not be updated.")
    } finally {
      setLoading(false)
    }
  })

  const canSubmit = isDirty && !loading

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_60px_-25px_rgba(12,29,55,0.18)]">
        <FormSection
          icon={UserIcon}
          title="Identity"
          description="Basic info that appears across Baatasari."
          accent="navy"
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <FieldShell label="Full name" required>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm focus-within:border-(--brand-navy) focus-within:ring-4 focus-within:ring-(--brand-navy)/10">
                <UserIcon className="h-4 w-4 text-slate-400" />
                <input
                  className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  placeholder="Your name"
                  {...register("name")}
                />
              </div>
              {errors.name ? (
                <p className="mt-1 text-[11px] text-rose-600">{errors.name.message}</p>
              ) : null}
            </FieldShell>

            <FieldShell label="Email" hint="To change your email, contact support.">
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 shadow-sm">
                <Mail className="h-4 w-4 text-slate-400" />
                <input
                  className="w-full bg-transparent text-sm text-slate-900 outline-none"
                  type="email"
                  value={email}
                  readOnly
                  disabled
                />
                {user?.emailVerified ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-label="Verified" />
                ) : null}
              </div>
            </FieldShell>

            <FieldShell label="Phone number" required>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm focus-within:border-(--brand-navy) focus-within:ring-4 focus-within:ring-(--brand-navy)/10">
                <Phone className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-semibold text-slate-500">+91</span>
                <Controller
                  control={control}
                  name="phone"
                  render={({ field }) => (
                    <input
                      className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                      placeholder="10 digit number"
                      inputMode="numeric"
                      maxLength={10}
                      value={field.value}
                      onBlur={field.onBlur}
                      onChange={(e) => field.onChange(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    />
                  )}
                />
              </div>
              {errors.phone ? (
                <p className="mt-1 text-[11px] text-rose-600">{errors.phone.message}</p>
              ) : null}
            </FieldShell>

            <FieldShell label="Date of birth" required hint="You must be 13+ to use Baatasari.">
              <Controller
                control={control}
                name="dob"
                render={({ field }) => (
                  <Popover open={dobOpen} onOpenChange={setDobOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-(--brand-navy) focus:outline-none focus:ring-4 focus:ring-(--brand-navy)/10"
                      >
                        <span className={field.value ? "text-slate-900" : "text-slate-400"}>
                          {field.value ? format(new Date(field.value + "T00:00:00"), "dd/MM/yyyy") : "Select date of birth"}
                        </span>
                        <CalendarIcon className="h-4 w-4 shrink-0 text-slate-400" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value ? new Date(field.value + "T00:00:00") : undefined}
                        onSelect={(date) => {
                          if (date) {
                            field.onChange(format(date, "yyyy-MM-dd"))
                            setDobOpen(false)
                          }
                        }}
                        captionLayout="dropdown"
                        startMonth={new Date(new Date().getFullYear() - 100, 0)}
                        endMonth={new Date(new Date().getFullYear() - USER_MIN_AGE, 11)}
                        autoFocus
                      />
                    </PopoverContent>
                  </Popover>
                )}
              />
              {errors.dob ? (
                <p className="mt-1 text-[11px] text-rose-600">{errors.dob.message}</p>
              ) : null}
            </FieldShell>
          </div>
        </FormSection>

        <div className="border-t border-slate-100" />

        <FormSection
          icon={Sparkles}
          title="About you"
          description="Helps us recommend events you'll actually love."
          accent="emerald"
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <FieldShell
              label="Location"
              required
              hint="Pick your state, district, then area."
            >
              <StateDistrictLocalityPicker
                initialState={values.locationState ?? ""}
                initialDistrict={values.locationCity ?? ""}
                initialLocalityLabel={values.location ?? ""}
                onSelect={(loc) => {
                  setValue("location", loc.label, { shouldValidate: true, shouldDirty: true })
                  setValue("locationArea", loc.area, { shouldDirty: true })
                  setValue("locationCity", loc.city ?? "", { shouldDirty: true })
                  setValue("locationState", loc.state ?? "", { shouldDirty: true })
                  setValue("locationPincode", loc.pincode ?? "", { shouldDirty: true })
                  setValue("locationLat", loc.lat, { shouldDirty: true })
                  setValue("locationLng", loc.lng, { shouldDirty: true })
                }}
              />
              {errors.location ? (
                <p className="mt-1 text-[11px] text-rose-600">{errors.location.message}</p>
              ) : null}
            </FieldShell>

            <FieldShell label="Gender" required>
              <select
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-(--brand-navy) focus:outline-none focus:ring-4 focus:ring-(--brand-navy)/10"
                {...register("gender")}
              >
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
              {errors.gender ? (
                <p className="mt-1 text-[11px] text-rose-600">{errors.gender.message}</p>
              ) : null}
            </FieldShell>

            <FieldShell label="Profession" required>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm focus-within:border-(--brand-navy) focus-within:ring-4 focus-within:ring-(--brand-navy)/10">
                <Briefcase className="h-4 w-4 text-slate-400" />
                <input
                  className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  placeholder="Student, Designer, Engineer..."
                  {...register("profession")}
                />
              </div>
              {errors.profession ? (
                <p className="mt-1 text-[11px] text-rose-600">{errors.profession.message}</p>
              ) : null}
            </FieldShell>
          </div>
        </FormSection>

        <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-4 md:flex-row md:items-center md:justify-between md:px-8">
          <div className="min-w-0 text-xs text-slate-500">
            {error ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-rose-600">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                {error}
              </span>
            ) : message ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {message}
              </span>
            ) : (
              <span>
                {completionPercent === 100
                  ? "Your profile is fully set up."
                  : `${completedFields}/${totalFields} required fields filled.`}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={canSubmit ? { scale: 1.02 } : undefined}
              whileTap={canSubmit ? { scale: 0.97 } : undefined}
              type="submit"
              className="group relative overflow-hidden rounded-full bg-(--brand-navy) px-7 py-2 text-sm font-semibold text-white shadow-lg shadow-(--brand-navy)/20 transition hover:bg-(--brand-navy)/90 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
              disabled={!canSubmit}
            >
              {canSubmit ? (
                <span className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              ) : null}
              <span className="relative">{loading ? "Saving..." : "Save"}</span>
            </motion.button>
          </div>
        </div>
      </div>
    </form>
  )
}
