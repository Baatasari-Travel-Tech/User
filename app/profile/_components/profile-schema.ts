import { z } from "zod"

export const profileSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name."),
  phone: z.string().regex(/^\d{10}$/, "Phone number must be exactly 10 digits."),
  dob: z.string().min(1, "Please select your date of birth."),
  location: z.string().trim().min(1, "Please enter your location."),
  locationArea: z.string().trim().optional(),
  locationCity: z.string().trim().optional(),
  locationState: z.string().trim().optional(),
  locationPincode: z.string().trim().optional(),
  locationLat: z.number().nullable().optional(),
  locationLng: z.number().nullable().optional(),
  gender: z.string().min(1, "Please select a gender."),
  profession: z.string().trim().min(1, "Please enter your profession."),
})

export type ProfileFormValues = z.infer<typeof profileSchema>
