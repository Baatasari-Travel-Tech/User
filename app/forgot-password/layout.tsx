import type { Metadata } from "next"

// The page itself is a client component (it hands off to the sign-in dialog),
// which cannot export metadata, so the title and the noindex live here.
export const metadata: Metadata = {
  title: "Reset your password",
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
