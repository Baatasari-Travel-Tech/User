"use client"

import React, { useState } from "react"
import {
  CalendarIcon,
  ClockIcon,
  InfoIcon,
  PlusIcon,
  StarIcon,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import TimePicker from "@/components/ui/time-picker"
import { AreaAutocomplete } from "@/components/common/area-autocomplete"
import { cn } from "@/lib/utils"
import type { EventFormData } from "./validateEventform"
import { EVENT_CATEGORY_GROUPS } from "@/lib/event-categories"
import SectionCard, {
  FieldError,
  FieldLabel,
  GOLD_PILL_BUTTON_CLASS,
  GOLD_TEXT_BUTTON_CLASS,
  fieldInputClass,
} from "./SectionCard"

interface EventFormProps {
  formData: EventFormData
  setFormData: React.Dispatch<React.SetStateAction<EventFormData>>
  handleInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => void
  photoPreview: string | null
  setPhotoPreview: (preview: string | null) => void
  photoError: string
  setPhotoError: (error: string) => void
  addArrayItem: (arrayName: string) => void
  updateArrayField: (arrayName: string, index: number, field: string, value: unknown) => void
  removeArrayItem?: (arrayName: string, index: number) => void
  openSections: { [key: string]: boolean }
  toggleSection: (section: string) => void
  formErrors: { [key: string]: string }
}

const EventForm: React.FC<EventFormProps> = ({
  formData,
  setFormData,
  handleInputChange,
  photoPreview,
  setPhotoPreview,
  photoError,
  addArrayItem,
  updateArrayField,
  removeArrayItem,
  openSections,
  toggleSection,
  formErrors,
}) => {
  const [showStartTimePicker, setShowStartTimePicker] = useState(false)
  const [showEndTimePicker, setShowEndTimePicker] = useState(false)
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [endDatePickerOpen, setEndDatePickerOpen] = useState(false)
  const [activeSlotPicker, setActiveSlotPicker] = useState<{ index: number; field: "startTime" | "endTime" } | null>(null)

  return (
    <div className="flex w-full flex-col gap-5">
      {/* ============ Event Information ============ */}
      <SectionCard
        icon={<InfoIcon className="h-4.5 w-4.5" />}
        title="Event Information"
        open={!!openSections["event-info"]}
        onToggle={() => toggleSection("event-info")}
      >
        <div className="flex flex-col gap-5">
          {/* Banner / cover dropzone */}
          <div className="relative">
            <FieldLabel htmlFor="eventPhoto" required>Event Banner / Image</FieldLabel>
            <label htmlFor="eventPhoto" className="block w-full cursor-pointer">
              <div
                className={`flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-8 text-center transition ${
                  formErrors.eventPhoto ? "border-rose-400 bg-rose-50/40" : "border-(--gold) bg-(--gold-bar-bg)/50"
                }`}
              >
                <input
                  id="eventPhoto"
                  type="file"
                  name="eventPhoto"
                  onChange={handleInputChange}
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                />

                {photoPreview ? (
                  <div className="relative w-full max-w-[180px]">
                    <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl border border-(--gold-bar-border)">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photoPreview}
                        alt="Event cover preview"
                        className="absolute inset-0 h-full w-full object-cover"
                        onError={() => setPhotoPreview(null)}
                      />
                    </div>
                    <span className="absolute bottom-2 right-2 z-10 rounded-full bg-black/55 px-3 py-1 text-[11px] font-medium text-white">
                      Change / adjust
                    </span>
                  </div>
                ) : (
                  <>
                    <UploadCloud className="h-7 w-7 text-(--gold-icon)" />
                    <p className="m-0 text-sm font-semibold text-slate-700">
                      Drag &amp; Drop or <span className="text-(--gold-text) underline underline-offset-2">Browse</span>
                    </p>
                  </>
                )}

                <p className="m-0 text-[11px] text-slate-400">
                  Recommended: PNG, JPG, JPEG &middot; Aspect ratio 2:3 (Portrait) &middot; Max size 5MB
                </p>
              </div>
            </label>
            <FieldError message={photoError || undefined} />
            <FieldError message={formErrors.eventPhoto} />
          </div>

          {/* Name + Category */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="relative">
              <FieldLabel required>Event Name</FieldLabel>
              <input
                className={fieldInputClass(!!formErrors.eventName)}
                placeholder="Enter event title"
                name="eventName"
                value={formData.eventName}
                onChange={handleInputChange}
              />
              <FieldError message={formErrors.eventName} />
            </div>

            <div className="relative">
              <FieldLabel required>Category</FieldLabel>
              <select
                className={`${fieldInputClass(!!formErrors.category)} appearance-none`}
                name="category"
                value={formData.category}
                onChange={handleInputChange}
              >
                <option value="">Select category</option>
                {EVENT_CATEGORY_GROUPS.map((group) => (
                  <optgroup key={group.category} label={group.category}>
                    {group.subcategories.map((sub) => (
                      <option key={`${group.category}-${sub}`} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <FieldError message={formErrors.category} />
            </div>
          </div>

          {/* Tagline */}
          <div className="relative">
            <FieldLabel>Tagline (Optional)</FieldLabel>
            <textarea
              className={`${fieldInputClass(!!formErrors.tagline)} min-h-16 resize-y`}
              placeholder='Write a catchy tagline, e.g., "Unleash Your Inner Techie!"'
              name="tagline"
              value={formData.tagline}
              onChange={handleInputChange}
            />
            <FieldError message={formErrors.tagline} />
          </div>

          {/* Description */}
          <div className="relative">
            <FieldLabel required>Description</FieldLabel>
            <div className="relative">
              <textarea
                className={`${fieldInputClass(!!formErrors.description)} min-h-30 resize-y pb-6`}
                placeholder="Describe the event purpose and attendee experience"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
              />
              <span className="pointer-events-none absolute bottom-3 right-3 text-[10px] text-slate-400">
                {(formData.description || "").length} characters
              </span>
            </div>
            <FieldError message={formErrors.description} />
          </div>

          {/* Personnel */}
          <div className="relative">
            <FieldLabel>Customized Personnel (Optional)</FieldLabel>
            <textarea
              className={`${fieldInputClass(false)} min-h-20 resize-y`}
              placeholder="List speakers, MCs, DJs, or custom personnel requirements"
              name="personnel"
              value={formData.personnel}
              onChange={handleInputChange}
            />
          </div>
        </div>
      </SectionCard>

      {/* ============ Date & Time ============ */}
      <SectionCard
        icon={<CalendarIcon className="h-4.5 w-4.5" />}
        title="Date & Time"
        open={!!openSections["date-time"]}
        onToggle={() => toggleSection("date-time")}
      >
        <div className="flex flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Start date */}
            <div className="relative">
              <FieldLabel required>Start Date</FieldLabel>
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      `${fieldInputClass(!!formErrors.date)} h-auto justify-start text-left font-normal shadow-none hover:bg-white`,
                      formData.date ? "text-slate-800" : "text-slate-400"
                    )}
                  >
                    {formData.date && !Number.isNaN(new Date(formData.date).getTime())
                      ? format(new Date(formData.date), "dd/MM/yyyy")
                      : <span>Pick a date</span>}
                    <CalendarIcon className="ml-auto h-4 w-4 text-slate-400" />
                  </Button>
                </PopoverTrigger>

                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.date && !Number.isNaN(new Date(formData.date).getTime()) ? new Date(formData.date) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        setFormData((prev) => ({ ...prev, date: format(date, "yyyy-MM-dd") }))
                        setDatePickerOpen(false)
                      }
                    }}
                    startMonth={new Date()}
                    endMonth={new Date(new Date().setFullYear(new Date().getFullYear() + 5))}
                    disabled={(date) => {
                      const today = new Date()
                      today.setHours(0, 0, 0, 0)
                      const fiveYearsOut = new Date()
                      fiveYearsOut.setFullYear(today.getFullYear() + 5)
                      return date < today || date > fiveYearsOut
                    }}
                    autoFocus
                  />
                </PopoverContent>
              </Popover>
              <FieldError message={formErrors.date} />
            </div>

            {/* End date — optional; for multi-day events */}
            <div className="relative">
              <FieldLabel>End Date (Optional)</FieldLabel>
              <Popover open={endDatePickerOpen} onOpenChange={setEndDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      `${fieldInputClass(false)} h-auto justify-start text-left font-normal shadow-none hover:bg-white`,
                      formData.endDate ? "text-slate-800" : "text-slate-400"
                    )}
                  >
                    {formData.endDate && !Number.isNaN(new Date(formData.endDate).getTime())
                      ? format(new Date(formData.endDate), "dd/MM/yyyy")
                      : <span>Same day</span>}
                    <CalendarIcon className="ml-auto h-4 w-4 text-slate-400" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.endDate && !Number.isNaN(new Date(formData.endDate).getTime()) ? new Date(formData.endDate) : undefined}
                    onSelect={(date) => {
                      setFormData((prev) => ({ ...prev, endDate: date ? format(date, "yyyy-MM-dd") : "" }))
                      setEndDatePickerOpen(false)
                    }}
                    startMonth={new Date()}
                    endMonth={new Date(new Date().setFullYear(new Date().getFullYear() + 5))}
                    disabled={(date) => {
                      // End date can't be before the start date.
                      const start = formData.date ? new Date(formData.date) : new Date()
                      start.setHours(0, 0, 0, 0)
                      return date < start
                    }}
                    autoFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Start time */}
            <div className="relative">
              <FieldLabel required>Start Time</FieldLabel>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  className={`${fieldInputClass(!!formErrors.time)} cursor-pointer pr-10`}
                  value={formData.time || ""}
                  onClick={() => setShowStartTimePicker(true)}
                  placeholder="HH:MM AM/PM"
                />
                <ClockIcon className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                {showStartTimePicker ? (
                  <TimePicker
                    initialTime={formData.time}
                    onTimeChange={(val) => setFormData((prev) => ({ ...prev, time: val }))}
                    onClose={() => setShowStartTimePicker(false)}
                  />
                ) : null}
              </div>
              <FieldError message={formErrors.time} />
            </div>

            {/* End time */}
            <div className="relative">
              <FieldLabel required>End Time</FieldLabel>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  className={`${fieldInputClass(!!formErrors.endTime)} cursor-pointer pr-10`}
                  value={formData.endTime || ""}
                  onClick={() => setShowEndTimePicker(true)}
                  placeholder="HH:MM AM/PM"
                />
                <ClockIcon className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                {showEndTimePicker ? (
                  <TimePicker
                    initialTime={formData.endTime}
                    onTimeChange={(val) => setFormData((prev) => ({ ...prev, endTime: val }))}
                    onClose={() => setShowEndTimePicker(false)}
                  />
                ) : null}
              </div>
              <FieldError message={formErrors.endTime} />
            </div>
          </div>

          {/* Venue + Maps */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="relative">
              <FieldLabel required>Venue</FieldLabel>
              <input
                className={fieldInputClass(!!formErrors.venue)}
                placeholder="Enter venue address or name"
                name="venue"
                value={formData.venue}
                onChange={handleInputChange}
              />
              <FieldError message={formErrors.venue} />
            </div>

            <div className="relative">
              <FieldLabel required>Google Maps URL</FieldLabel>
              <input
                className={fieldInputClass(!!formErrors.googleMapsUrl)}
                placeholder="Paste Google Maps URL"
                name="googleMapsUrl"
                value={formData.googleMapsUrl}
                onChange={handleInputChange}
              />
              <FieldError message={formErrors.googleMapsUrl} />
            </div>

            <div className="relative sm:col-span-2">
              <FieldLabel>Location (Optional)</FieldLabel>
              <AreaAutocomplete
                value={formData.location}
                onSelect={(loc) =>
                  setFormData((prev) => ({
                    ...prev,
                    location: loc.label,
                    locationArea: loc.area,
                    locationCity: loc.city ?? "",
                    locationState: loc.state ?? "",
                    locationPincode: loc.pincode ?? "",
                    locationLat: loc.lat,
                    locationLng: loc.lng,
                  }))
                }
                placeholder="Search area"
              />
            </div>
          </div>

          {/* Transport + Entry side */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="relative">
              <FieldLabel>Transport to Event (Optional)</FieldLabel>
              <input
                className={fieldInputClass(false)}
                placeholder="How attendees can reach the event"
                name="transportToEvent"
                value={formData.transportToEvent || ""}
                onChange={handleInputChange}
              />
            </div>

            <div className="relative">
              <FieldLabel>Entry Side (Optional)</FieldLabel>
              <input
                className={fieldInputClass(false)}
                placeholder="Entry gate/side details"
                name="entrySide"
                value={formData.entrySide || ""}
                onChange={handleInputChange}
              />
            </div>

            <div className="relative">
              <FieldLabel>Re-entry allowed? (Optional)</FieldLabel>
              <div className="mt-2 inline-flex rounded-full border border-slate-200 bg-white p-1">
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, reEntryAllowed: true }))}
                  className={`rounded-full px-4 py-2 text-xs font-semibold ${
                    formData.reEntryAllowed === true ? "bg-brand-900 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, reEntryAllowed: false }))}
                  className={`rounded-full px-4 py-2 text-xs font-semibold ${
                    formData.reEntryAllowed === false ? "bg-brand-900 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  No
                </button>
              </div>
            </div>

            <div className="relative">
              <FieldLabel>Parking available? (Optional)</FieldLabel>
              <div className="mt-2 inline-flex rounded-full border border-slate-200 bg-white p-1">
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, parkingAvailable: true }))}
                  className={`rounded-full px-4 py-2 text-xs font-semibold ${
                    formData.parkingAvailable === true ? "bg-brand-900 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, parkingAvailable: false }))}
                  className={`rounded-full px-4 py-2 text-xs font-semibold ${
                    formData.parkingAvailable === false ? "bg-brand-900 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  No
                </button>
              </div>
            </div>
          </div>

          {/* Time Slots / Schedule */}
          <div className="mt-1 border-t border-(--gold-bar-border) pt-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="m-0 text-xs font-semibold text-slate-700">Event Schedule (Optional)</p>
                <p className="m-0 mt-0.5 text-[11px] text-slate-400">
                  Break the event into named time slots (e.g. 7 AM - 12 PM: Dance)
                </p>
              </div>
              <button
                type="button"
                onClick={() => addArrayItem("timeSlots")}
                className={GOLD_PILL_BUTTON_CLASS}
              >
                <PlusIcon size={14} /> Add Slot
              </button>
            </div>

            {(formData.timeSlots ?? []).length === 0 ? (
              <p className="m-0 text-xs italic text-slate-400">No slots added yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {(formData.timeSlots ?? []).map((slot, index) => (
                  <div key={index} className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-3">
                    <div className="relative min-w-36 flex-[2_1_160px]">
                      <FieldLabel>Name</FieldLabel>
                      <input
                        className={`${fieldInputClass(false)} px-3 py-2`}
                        placeholder="Slot name (e.g. Dance)"
                        value={slot.name}
                        onChange={(e) => updateArrayField("timeSlots", index, "name", e.target.value)}
                      />
                    </div>
                    <div className="relative min-w-28 flex-[1_1_120px]">
                      <FieldLabel>From</FieldLabel>
                      <div className="relative">
                        <input
                          type="text"
                          readOnly
                          className={`${fieldInputClass(false)} cursor-pointer px-3 py-2 pr-8`}
                          value={slot.startTime || ""}
                          onClick={() => setActiveSlotPicker({ index, field: "startTime" })}
                          placeholder="Start time"
                        />
                        <ClockIcon className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        {activeSlotPicker?.index === index && activeSlotPicker.field === "startTime" ? (
                          <TimePicker
                            initialTime={slot.startTime}
                            onTimeChange={(val) => updateArrayField("timeSlots", index, "startTime", val)}
                            onClose={() => setActiveSlotPicker(null)}
                          />
                        ) : null}
                      </div>
                    </div>
                    <div className="relative min-w-28 flex-[1_1_120px]">
                      <FieldLabel>To</FieldLabel>
                      <div className="relative">
                        <input
                          type="text"
                          readOnly
                          className={`${fieldInputClass(false)} cursor-pointer px-3 py-2 pr-8`}
                          value={slot.endTime || ""}
                          onClick={() => setActiveSlotPicker({ index, field: "endTime" })}
                          placeholder="End time"
                        />
                        <ClockIcon className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        {activeSlotPicker?.index === index && activeSlotPicker.field === "endTime" ? (
                          <TimePicker
                            initialTime={slot.endTime}
                            onTimeChange={(val) => updateArrayField("timeSlots", index, "endTime", val)}
                            onClose={() => setActiveSlotPicker(null)}
                          />
                        ) : null}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeArrayItem?.("timeSlots", index)}
                      className="flex h-9.5 w-9.5 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-100"
                      aria-label={`Remove slot ${index + 1}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SectionCard>

      {/* ============ Event Highlights ============ */}
      <SectionCard
        icon={<StarIcon className="h-4.5 w-4.5" />}
        title="Event Highlights (Optional)"
        open={!!openSections["event-highlights"]}
        onToggle={() => toggleSection("event-highlights")}
      >
        <div className="flex flex-col gap-4">
          {formData.artists.map((artist, index) => (
            <div key={index} className="flex items-center gap-3">
              <input
                className={fieldInputClass(false)}
                placeholder={`Highlight ${index + 1}`}
                value={artist.name}
                onChange={(e) => updateArrayField("artists", index, "name", e.target.value)}
              />
              {formData.artists.length > 1 ? (
                <button
                  type="button"
                  onClick={() => removeArrayItem?.("artists", index)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-100"
                  aria-label={`Remove highlight ${index + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          ))}

          <button
            type="button"
            onClick={() => addArrayItem("artists")}
            className={GOLD_TEXT_BUTTON_CLASS}
          >
            <PlusIcon size={16} /> Add highlight
          </button>
        </div>
      </SectionCard>
    </div>
  )
}

export default EventForm
