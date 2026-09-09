export const OTHER_PROFESSION_VALUE = "Other"

export const PROFESSION_OPTIONS = [
  "Student (School / College)",
  "Job Seeker",
  "Working Professional - IT / Tech",
  "Working Professional - Non-Tech",
  "Entrepreneur / Founder",
  "Freelancer / Creator",
  "Business Owner (SME)",
  "Corporate Executive / Manager",
  "Developer / Engineer",
  "Designer / Creative Professional",
  "Marketing / Sales Professional",
  "Finance / Banking Professional",
  "Healthcare Professional",
  "Educator / Trainer",
  "Government / Public Sector",
  "Homemaker",
  "Retired",
  OTHER_PROFESSION_VALUE,
] as const

export const isPredefinedProfession = (value: string) =>
  PROFESSION_OPTIONS.includes(value as (typeof PROFESSION_OPTIONS)[number])

/**
 * Splits a saved free-text profession back into the dropdown + "Other" pair
 * the form uses. A predefined value round-trips as-is; anything else (an
 * older free-text save, or a custom value) becomes "Other" + that text.
 */
export const getProfessionFormValues = (profession: string | null | undefined) => {
  const trimmedProfession = (profession ?? "").trim()
  if (!trimmedProfession) {
    return { profession: "", otherProfession: "" }
  }

  if (isPredefinedProfession(trimmedProfession)) {
    return { profession: trimmedProfession, otherProfession: "" }
  }

  return { profession: OTHER_PROFESSION_VALUE, otherProfession: trimmedProfession }
}

const pad = (value: number) => value.toString().padStart(2, "0")

const formatDateInputValue = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

/** Minimum age required to use the user experience (attend events). */
export const USER_MIN_AGE = 13
/** Minimum age required to register / operate as an event organizer. */
export const ORGANIZER_MIN_AGE = 18

/**
 * DOB bounds for date pickers.
 *   - `min` = today - 100 years (oldest reasonable DOB)
 *   - `max` = today - minAge years (newest DOB satisfying the age floor)
 * Default `minAge` is the user floor (13). Pass `ORGANIZER_MIN_AGE` for organizers.
 */
export const getDobDateBounds = (
  today: Date = new Date(),
  minAge: number = USER_MIN_AGE,
) => {
  const minDate = new Date(today)
  minDate.setFullYear(minDate.getFullYear() - 100)

  const maxDate = new Date(today)
  maxDate.setFullYear(maxDate.getFullYear() - minAge)

  return {
    min: formatDateInputValue(minDate),
    max: formatDateInputValue(maxDate),
    minAge,
  }
}

export const isDobWithinBounds = (
  dob: string,
  bounds: { min: string; max: string },
) => dob >= bounds.min && dob <= bounds.max
