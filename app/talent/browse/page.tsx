import { redirect } from "next/navigation"

// Talent profiles are private to the performer and to organizers, so there is no
// public directory on baatasari.com. An old link lands on the talent page.
export default function Page() {
  redirect("/talent")
}
