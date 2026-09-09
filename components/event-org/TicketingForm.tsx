"use client"

import React, { useCallback, useRef } from "react"
import { GiftIcon, PlusIcon, ScrollIcon, TicketIcon, TrashIcon, UsersIcon } from "lucide-react"
import {
  EventFormData,
  ADD_ON_OPTIONS,
  TARGET_AUDIENCE_OPTIONS,
  AGE_GROUP_PRESETS,
} from "./data/create-event-data"
import SectionCard, {
  FieldError,
  FieldLabel,
  GOLD_TEXT_BUTTON_CLASS,
  fieldInputClass,
} from "./SectionCard"

interface TicketingFormProps {
  formData: EventFormData
  setFormData: React.Dispatch<React.SetStateAction<EventFormData>>
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  addArrayItem: (arrayName: string) => void
  updateArrayField: (arrayName: string, index: number, field: string, value: unknown) => void
  removeArrayItem: (arrayName: string, index: number) => void
  openSections: { [key: string]: boolean }
  toggleSection: (section: string) => void
  formErrors: { [key: string]: string }
}

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(val, max))
}

const minGap = 5

const DualThumbSlider: React.FC<{
  min: number
  max: number
  valueMin: number
  valueMax: number
  onChange: (values: { min: number; max: number }) => void
  disabled?: boolean
}> = ({ min = 0, max = 100, valueMin, valueMax, onChange, disabled = false }) => {
  const trackRef = useRef<HTMLDivElement>(null)
  const percent = (v: number) => ((v - min) / (max - min)) * 100

  const startDrag = (thumb: "min" | "max") => () => {
    if (disabled) return
    const moveHandler = (moveEvent: MouseEvent | TouchEvent) => {
      const clientX = "touches" in moveEvent ? moveEvent.touches[0]?.clientX : moveEvent.clientX
      if (!clientX || !trackRef.current) return

      const rect = trackRef.current.getBoundingClientRect()
      const percentVal = clamp((clientX - rect.left) / rect.width, 0, 1)
      let value = Math.round(percentVal * (max - min) + min)

      if (thumb === "min") {
        value = clamp(value, min, valueMax - minGap)
        onChange({ min: value, max: valueMax })
      } else {
        value = clamp(value, valueMin + minGap, max)
        onChange({ min: valueMin, max: value })
      }
    }

    const stopHandler = () => {
      document.removeEventListener("mousemove", moveHandler)
      document.removeEventListener("touchmove", moveHandler)
      document.removeEventListener("mouseup", stopHandler)
      document.removeEventListener("touchend", stopHandler)
    }

    document.addEventListener("mousemove", moveHandler)
    document.addEventListener("touchmove", moveHandler)
    document.addEventListener("mouseup", stopHandler)
    document.addEventListener("touchend", stopHandler)
  }

  const minLeft = `calc(${percent(valueMin)}% - 10px)`
  const maxLeft = `calc(${percent(valueMax)}% - 10px)`

  // Track: top 18px + 6px tall → centre at 21px. Thumbs are 20px tall, so
  // top = 21 - 10 = 11px keeps them vertically centred on the line.
  return (
    <div className={`relative h-10 my-5 ${disabled ? "opacity-40 pointer-events-none" : ""}`}>
      <div ref={trackRef} className="absolute top-[18px] left-0 right-0 h-1.5 bg-slate-200 rounded-[3px] z-1" />
      <div
        className="absolute top-[18px] h-1.5 rounded-[3px] z-2 transition-all duration-100 bg-(--gold)"
        style={{
          left: `${percent(valueMin)}%`,
          width: `${percent(valueMax) - percent(valueMin)}%`,
        }}
      />
      {/* Min thumb + value bubble */}
      <div
        className="absolute top-[11px] w-5 h-5 bg-white rounded-full cursor-grab shadow-[0_2px_6px_rgb(0_0_0/0.2)] z-3 transition-all duration-200 border-[3px] border-(--gold)"
        style={{ left: minLeft }}
        onMouseDown={startDrag("min")}
        onTouchStart={startDrag("min")}
      >
        <span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 rounded-md bg-(--brand-navy) px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white">
          {valueMin}
        </span>
      </div>
      {/* Max thumb + value bubble */}
      <div
        className="absolute top-[11px] w-5 h-5 bg-white rounded-full cursor-grab shadow-[0_2px_6px_rgb(0_0_0/0.2)] z-3 transition-all duration-200 border-[3px] border-(--gold)"
        style={{ left: maxLeft }}
        onMouseDown={startDrag("max")}
        onTouchStart={startDrag("max")}
      >
        <span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 rounded-md bg-(--brand-navy) px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white">
          {valueMax}
        </span>
      </div>
    </div>
  )
}

function PriceSummaryTable({ price, gatewayBearer, onGatewayBearerToggle }: {
  price: number
  gatewayBearer: "customer" | "organizer"
  onGatewayBearerToggle: () => void
}) {
  const PLATFORM_FEE = 10
  const RAZORPAY_RATE = 0.02 * 1.18
  const net = price + PLATFORM_FEE
  const gatewayFee = price > 0 ? Number((net * RAZORPAY_RATE / (1 - RAZORPAY_RATE)).toFixed(2)) : 0

  const customerPays = net + (gatewayBearer === "customer" ? gatewayFee : 0)
  const organizerGets = price - (gatewayBearer === "organizer" ? Number((net * RAZORPAY_RATE).toFixed(2)) : 0)
  const totalCharges = PLATFORM_FEE + gatewayFee

  return (
    <div className="mt-1 rounded-xl border border-(--gold-bar-border) bg-(--gold-bar-bg)/40 p-4 text-sm">
      <p className="m-0 mb-3 text-xs font-bold uppercase tracking-wide text-slate-700">Fee Summary</p>
      <table className="w-full text-xs">
        <tbody>
          <tr className="border-b border-(--gold-bar-border)">
            <td className="py-2 text-slate-600">Platform Fee</td>
            <td className="py-2 text-center font-medium text-slate-800">₹10/-</td>
            <td className="py-2 text-right text-slate-500">Organizer</td>
          </tr>
          <tr className="border-b border-(--gold-bar-border)">
            <td className="py-2 text-slate-600">Payment Gateway Fee <span className="text-slate-400">(2% + 18% GST)</span></td>
            <td className="py-2 text-center font-medium text-slate-800">
              {price > 0 ? `₹${gatewayFee.toFixed(2)}` : "—"}
            </td>
            <td className="py-2 text-right">
              <div className="inline-flex rounded-full border border-(--gold-soft-border) bg-white p-0.5 text-[11px] font-medium">
                <button
                  type="button"
                  onClick={() => gatewayBearer !== "organizer" && onGatewayBearerToggle()}
                  className={`rounded-full px-2 py-0.5 transition-colors duration-150 ${gatewayBearer === "organizer" ? "bg-(--gold) text-white shadow-sm" : "text-slate-500"}`}
                >
                  Organizer
                </button>
                <button
                  type="button"
                  onClick={() => gatewayBearer !== "customer" && onGatewayBearerToggle()}
                  className={`rounded-full px-2 py-0.5 transition-colors duration-150 ${gatewayBearer === "customer" ? "bg-(--gold) text-white shadow-sm" : "text-slate-500"}`}
                >
                  Customer
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div className="mt-3 space-y-1.5 border-t border-(--gold-soft-border) pt-3">
        <div className="flex justify-between text-xs">
          <span className="text-slate-600">Customer pays</span>
          <span className="font-semibold text-slate-800">{price > 0 ? `₹${customerPays.toFixed(2)}` : "Free"}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-600">Organizer gets</span>
          <span className="font-semibold text-green-700">{price > 0 ? `₹${Math.max(0, organizerGets).toFixed(2)}` : "—"}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-600">Charges (Platform + Gateway)</span>
          <span className="font-medium text-slate-600">{price > 0 ? `₹${totalCharges.toFixed(2)}` : "₹10.00 (on organizer)"}</span>
        </div>
        <div className="mt-1 flex justify-between border-t border-(--gold-soft-border) pt-1.5 text-xs">
          <span className="font-semibold text-slate-800">Total</span>
          <span className="font-bold text-slate-900">{price > 0 ? `₹${customerPays.toFixed(2)}` : "Free"}</span>
        </div>
      </div>
    </div>
  )
}

const Toggle: React.FC<{ on: boolean; onClick: () => void; label: string }> = ({ on, onClick, label }) => (
  <button
    type="button"
    className={`relative h-6 w-12 shrink-0 cursor-pointer rounded-full transition-colors duration-300 ${on ? "bg-(--gold)" : "bg-slate-300"}`}
    onClick={onClick}
    aria-checked={on}
    aria-label={label}
    role="switch"
  >
    <div className={`absolute top-0.75 h-4.5 w-4.5 rounded-full bg-white transition-[left] duration-300 ${on ? "left-6.75" : "left-0.75"}`} />
  </button>
)

const TicketingForm: React.FC<TicketingFormProps> = ({
  formData,
  setFormData,
  addArrayItem,
  updateArrayField,
  removeArrayItem,
  openSections,
  toggleSection,
  formErrors,
}) => {
  const audienceCategory = formData.audienceCategory || []
  const gatewayBearer = formData.gatewayBearer ?? "customer"

  const handleAudienceSelection = useCallback(
    (audience: string) => {
      setFormData((prev) => ({
        ...prev,
        targetAudience: {
          ...prev.targetAudience,
          [audience]: !prev.targetAudience[audience],
        },
      }))
    },
    [setFormData]
  )

  const handleTierFreeToggle = (index: number, isFree: boolean) => {
    updateArrayField("audienceCategory", index, "isFree", isFree)
    const updatedTiers = audienceCategory.map((tier, i) =>
      i === index ? { ...tier, isFree } : tier
    )
    const allFree = updatedTiers.every((t) => t.isFree)
    setFormData((prev) => ({ ...prev, ticketType: allFree ? "free" : "paid" }))
  }

  // Presets are MULTI-select (stored comma-joined in the same string field so
  // drafts/edits stay compatible). The slider range becomes the union of the
  // selected presets: lowest min → highest max.
  const selectedPresets = (formData.ageGroupPreset ?? "").split(",").filter(Boolean)

  const handleAgePresetToggle = (preset: { label: string; min: number; max: number }) => {
    setFormData((prev) => {
      const current = (prev.ageGroupPreset ?? "").split(",").filter(Boolean)
      const next = current.includes(preset.label)
        ? current.filter((label) => label !== preset.label)
        : [...current, preset.label]

      if (next.length === 0) {
        // Nothing selected — keep the current slider range, just clear presets.
        return { ...prev, ageGroupPreset: "" }
      }

      const active = AGE_GROUP_PRESETS.filter((p) => next.includes(p.label))
      return {
        ...prev,
        ageGroupPreset: next.join(","),
        audienceRange: {
          min: Math.min(...active.map((p) => p.min)),
          max: Math.max(...active.map((p) => p.max)),
        },
      }
    })
  }

  return (
    <div className="flex w-full flex-col gap-5">
      {/* ============ Ticketing ============ */}
      <SectionCard
        icon={<TicketIcon className="h-4.5 w-4.5" />}
        title="Ticketing"
        required
        open={!!openSections.ticketing}
        onToggle={() => toggleSection("ticketing")}
      >
        <FieldError message={formErrors.ticketType} />

        <div className="flex flex-col gap-4">
          {audienceCategory.map((tier, index) => (
            <div key={index} className="relative flex flex-col gap-4 rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <h4 className="m-0 text-sm font-bold text-slate-900">Category {index + 1}</h4>
                {audienceCategory.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeArrayItem("audienceCategory", index)}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-rose-500 transition hover:bg-rose-50"
                    aria-label={`Remove audience category ${index + 1}`}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                ) : null}
              </div>

              {/* Ticket name */}
              <div className="relative">
                <FieldLabel required>Ticket Name</FieldLabel>
                <input
                  type="text"
                  value={tier.category || ""}
                  onChange={(e) => updateArrayField("audienceCategory", index, "category", e.target.value)}
                  className={fieldInputClass(!!formErrors[`audienceCategory.${index}.category`])}
                  placeholder="Ex: Gold Pass"
                />
                <FieldError message={formErrors[`audienceCategory.${index}.category`]} />
              </div>

              {/* Limited tickets toggle + quantity */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
                  <span className="text-sm font-medium text-slate-700">Limited tickets</span>
                  <Toggle
                    on={!!tier.isLimited}
                    onClick={() => updateArrayField("audienceCategory", index, "isLimited", !tier.isLimited)}
                    label="Limited tickets"
                  />
                </div>

                {tier.isLimited ? (
                  <div className="relative">
                    <FieldLabel required>Number of Tickets</FieldLabel>
                    <input
                      type="number"
                      min="1"
                      value={tier.numberOfTickets || ""}
                      onChange={(e) => updateArrayField("audienceCategory", index, "numberOfTickets", e.target.value)}
                      className={fieldInputClass(!!formErrors[`audienceCategory.${index}.numberOfTickets`])}
                      placeholder="Ex: 100"
                    />
                    <FieldError message={formErrors[`audienceCategory.${index}.numberOfTickets`]} />
                  </div>
                ) : null}
              </div>

              {/* Price row: input + Free toggle */}
              <div className="flex items-start gap-3">
                {!tier.isFree ? (
                  <div className="relative flex-1">
                    <FieldLabel required>Price</FieldLabel>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500">₹</span>
                      <input
                        type="number"
                        min="10"
                        max="15000"
                        step="1"
                        value={tier.price || ""}
                        onChange={(e) => updateArrayField("audienceCategory", index, "price", e.target.value)}
                        className={`${fieldInputClass(!!formErrors[`audienceCategory.${index}.price`])} pl-9`}
                        placeholder="Min ₹10"
                      />
                    </div>
                    <FieldError message={formErrors[`audienceCategory.${index}.price`]} />
                  </div>
                ) : (
                  <div className="flex flex-1 items-center self-end rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3">
                    <span className="text-sm italic text-slate-400">Free ticket — no charge to attendee</span>
                  </div>
                )}

                <div className="flex items-center gap-2 self-end py-3">
                  <Toggle
                    on={!!tier.isFree}
                    onClick={() => handleTierFreeToggle(index, !tier.isFree)}
                    label="Free ticket"
                  />
                  <span className="whitespace-nowrap text-sm font-medium text-slate-700">Free</span>
                </div>
              </div>

              {/* Note + price range */}
              {!tier.isFree && (
                <p className="-mt-2 m-0 text-xs text-slate-500">
                  Price range: ₹10 – ₹15,000 &nbsp;·&nbsp;
                  <span className="font-medium text-slate-600">
                    Note: A platform fee of ₹10 will be included in the ticket price.
                  </span>
                </p>
              )}

              {/* Fee summary table */}
              {!tier.isFree && (
                <PriceSummaryTable
                  price={Number(tier.price) || 0}
                  gatewayBearer={gatewayBearer}
                  onGatewayBearerToggle={() =>
                    setFormData((prev) => ({
                      ...prev,
                      gatewayBearer: prev.gatewayBearer === "customer" ? "organizer" : "customer",
                    }))
                  }
                />
              )}

              {/* Description */}
              <div className="relative w-full">
                <FieldLabel required>Description</FieldLabel>
                <textarea
                  value={tier.description || ""}
                  onChange={(e) => updateArrayField("audienceCategory", index, "description", e.target.value)}
                  className={`${fieldInputClass(!!formErrors[`audienceCategory.${index}.description`])} min-h-20 resize-y`}
                  placeholder="Describe this ticket category"
                />
                <FieldError message={formErrors[`audienceCategory.${index}.description`]} />
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() => addArrayItem("audienceCategory")}
            className={GOLD_TEXT_BUTTON_CLASS}
          >
            <PlusIcon size={16} /> Add category
          </button>
        </div>
      </SectionCard>

      {/* ============ Guidelines ============ */}
      <SectionCard
        icon={<ScrollIcon className="h-4.5 w-4.5" />}
        title="Guidelines / Rules (Optional)"
        open={!!openSections.guidelines}
        onToggle={() => toggleSection("guidelines")}
      >
        <div className="relative w-full">
          <textarea
            name="guidelines"
            value={formData.guidelines || ""}
            onChange={(e) => setFormData((prev) => ({ ...prev, guidelines: e.target.value }))}
            className={`${fieldInputClass(!!formErrors.guidelines)} min-h-28 resize-y`}
            placeholder="Add entry rules, restrictions, age policy, etc."
          />
          <FieldError message={formErrors.guidelines} />
        </div>
      </SectionCard>

      {/* ============ Add-ons ============ */}
      {formData.ticketType === "paid" ? (
        <SectionCard
          icon={<GiftIcon className="h-4.5 w-4.5" />}
          title="Add-ons (Optional)"
          open={!!openSections.addOns}
          onToggle={() => toggleSection("addOns")}
        >
          <div className="flex flex-wrap gap-3">
            {ADD_ON_OPTIONS.map((option) => {
              const active = !!formData.addOns?.[option.id]
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      addOns: { ...prev.addOns, [option.id]: !active },
                    }))
                  }
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors duration-150 ${
                    active
                      ? "border-(--gold) bg-(--gold-soft-bg) text-(--gold-text)"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {option.label}
                </button>
              )
            })}
          </div>

          {!!formData.addOns?.giftHampers ? (
            <div className="relative mt-4">
              <textarea
                value={(formData.addOns.giftHampersDescription as string) || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    addOns: { ...prev.addOns, giftHampersDescription: e.target.value },
                  }))
                }
                className={`${fieldInputClass(!!formErrors["addOns.giftHampersDescription"])} min-h-20 resize-y`}
                placeholder="Describe gift hampers"
              />
              <FieldError message={formErrors["addOns.giftHampersDescription"]} />
            </div>
          ) : null}

          {!!formData.addOns?.addOther ? (
            <div className="relative mt-4">
              <textarea
                value={(formData.addOns.addOtherDescription as string) || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    addOns: { ...prev.addOns, addOtherDescription: e.target.value },
                  }))
                }
                className={`${fieldInputClass(!!formErrors["addOns.addOtherDescription"])} min-h-20 resize-y`}
                placeholder="Describe other add-ons"
              />
              <FieldError message={formErrors["addOns.addOtherDescription"]} />
            </div>
          ) : null}
        </SectionCard>
      ) : null}

      {/* ============ Audience ============ */}
      <SectionCard
        icon={<UsersIcon className="h-4.5 w-4.5" />}
        title="Audience"
        open={!!openSections.audience}
        onToggle={() => toggleSection("audience")}
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h4 className="m-0 text-xs font-semibold text-slate-700">Age Range</h4>
            <div className="flex items-center gap-1.5 text-sm font-semibold text-(--gold-text)">
              <span>{formData.audienceRange?.min ?? 18}</span>
              <span className="text-xs font-normal text-slate-400">–</span>
              <span>{formData.audienceRange?.max ?? 60}</span>
              <span className="text-xs font-normal text-slate-400">years</span>
            </div>
          </div>

          <div className="mx-auto w-[92%] py-2 sm:w-[80%]" style={{ paddingBottom: 28 }}>
            <DualThumbSlider
              min={0}
              max={100}
              valueMin={formData.audienceRange?.min ?? 18}
              valueMax={formData.audienceRange?.max ?? 60}
              onChange={({ min, max }) => {
                setFormData((prev) => ({
                  ...prev,
                  audienceRange: { min, max },
                  ageGroupPreset: "",
                }))
              }}
            />
          </div>

          <p className="-mt-4 m-0 mb-1 text-[11px] text-slate-400">
            Or pick one or more presets — the slider covers all of them
          </p>

          <div className="flex flex-wrap gap-2">
            {AGE_GROUP_PRESETS.map((preset) => {
              const isActive = selectedPresets.includes(preset.label)
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleAgePresetToggle(preset)}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors duration-150 ${
                    isActive
                      ? "border-(--gold) bg-(--gold-soft-bg) text-(--gold-text)"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {preset.label}
                  <span className="ml-1 text-[10px] opacity-70">({preset.min}–{preset.max})</span>
                </button>
              )
            })}
          </div>

          <h4 className="m-0 mt-4 text-xs font-semibold text-slate-700">Audience Category</h4>
          <div className="flex w-full flex-wrap gap-2">
            {TARGET_AUDIENCE_OPTIONS.map((audience) => {
              const active = !!formData.targetAudience?.[audience]
              return (
                <div
                  key={audience}
                  className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                    active
                      ? "border-(--gold) bg-(--gold-soft-bg) text-(--gold-text)"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                  onClick={() => handleAudienceSelection(audience)}
                  onKeyDown={(e) => e.key === "Enter" && handleAudienceSelection(audience)}
                  role="button"
                  tabIndex={0}
                >
                  {audience}
                </div>
              )
            })}
          </div>
        </div>
      </SectionCard>
    </div>
  )
}

export default TicketingForm
