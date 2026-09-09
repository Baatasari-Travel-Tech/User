import type { Metadata } from "next"
import { TalentInformationForm } from "@/components/talent/talent_form"

const title = "For Talent"
const description =
  "Artists, performers, and crews — list yourself on Baatasari and get discovered by event organizers across India."

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/talent" },
  openGraph: { type: "website", url: "/talent", title, description },
}

export default function TalentPage() {
  return (
    <main className="min-h-[calc(100dvh-72px)] bg-(--talent-page-bg)">
      <TalentInformationForm />
    </main>
  )
}
