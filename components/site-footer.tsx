import Image from "next/image"
import Link from "next/link"
import { FooterSocialLinks } from "@/components/events/footer-social-edit"

// Shared footer for every public page — extracted so legal/static pages
// (which previously rendered with none at all) get the same nav back into
// the app instead of each page copy-pasting its own version.
export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-slate-900 text-white">
      <div className="mx-auto w-full max-w-[1680px] px-4 py-10 sm:px-6 md:px-10 lg:px-16">
        <div className="grid grid-cols-1 gap-x-6 gap-y-8 md:grid-cols-[2fr_1fr_1fr_1fr]">
          <div className="md:col-span-1">
            <Image
              src="/FLogo.png"
              alt="Baatasari"
              width={132}
              height={48}
              className="h-10 w-auto"
            />
          </div>

          <div className="hidden md:block" />
          <div className="hidden md:block" />
          <div className="hidden md:block" />

          <div className="max-w-sm text-sm text-slate-300">
            Discover, connect, experience. Official platform for curated events, venues, and experiences.
          </div>

          <div className="space-y-3 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Company</p>
            <div className="grid gap-2 text-slate-300">
              <Link className="transition hover:text-white" href="/">
                About
              </Link>
              <a className="transition hover:text-white" href="/contact-us">
                Contact
              </a>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Resources</p>
            <div className="grid gap-2 text-slate-300">
              <Link className="transition hover:text-white" href="/events">
                Events
              </Link>
              <Link className="transition hover:text-white" href="/talent">
                Talents
              </Link>
              <Link className="transition hover:text-white" href="/for-organizers">
                Organizers
              </Link>
              {/* Plain <a>: /for-restaurants is a 308 to venue.baatasari.com
                  (see next.config.ts), so let the browser follow it rather than
                  asking the client router to discover it cannot. */}
              <a className="transition hover:text-white" href="/for-restaurants">
                Venues
              </a>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Legal</p>
            <div className="grid gap-2 text-slate-300">
              <a className="transition hover:text-white" href="/terms-and-conditions">
                Terms &amp; Conditions
              </a>
              <a className="transition hover:text-white" href="/privacy-policy">
                Privacy Policy
              </a>
              <a className="transition hover:text-white" href="/refund-policy">
                Refund &amp; Cancellation
              </a>
              <a className="transition hover:text-white" href="/grievance">
                Grievance Redressal
              </a>
            </div>
          </div>

          <FooterSocialLinks />
        </div>

        <div className="mt-4 flex flex-col gap-2 border-t border-slate-700 pt-4 text-xs text-slate-400 md:flex-row md:items-center md:justify-between">
          <p>Copyright {new Date().getFullYear()} Baatasari. All rights reserved.</p>
          <p>Built for personalized experiences.</p>
        </div>
      </div>
    </footer>
  )
}
