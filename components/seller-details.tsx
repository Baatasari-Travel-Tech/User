import type { ReactNode } from "react"
import type { SellerDetails as Seller } from "@/types/api"

/**
 * Who the buyer is buying from: the organizer's legal name, address and contact
 * details, shown on the event page and at checkout before they pay. The
 * Consumer Protection (E-Commerce) Rules ask a marketplace for this; the
 * organizer's profile is where it comes from (the Backend sends it as
 * event.seller).
 */
export function SellerDetails({
  seller,
  compact = false,
  className = "",
}: {
  seller: Seller | null | undefined
  /** One short line each, for the checkout summary. */
  compact?: boolean
  className?: string
}) {
  if (!seller?.legalName) return null

  const rows: Array<{ label: string; value: ReactNode }> = [
    { label: "Seller", value: seller.legalName },
  ]
  if (seller.tradeName && seller.tradeName !== seller.legalName) {
    rows.push({ label: "Trade name", value: seller.tradeName })
  }
  if (seller.address) rows.push({ label: "Address", value: seller.address })
  if (seller.email) {
    rows.push({
      label: "Email",
      value: (
        <a href={`mailto:${seller.email}`} className="underline underline-offset-2">
          {seller.email}
        </a>
      ),
    })
  }
  if (seller.phone) {
    rows.push({
      label: "Phone",
      value: (
        <a href={`tel:${seller.phone}`} className="underline underline-offset-2">
          {seller.phone}
        </a>
      ),
    })
  }
  if (seller.gstin) rows.push({ label: "GSTIN", value: seller.gstin })

  return (
    <section
      aria-label="Seller details"
      className={`rounded-2xl border border-(--gray-200) bg-white px-4 py-3 text-sm text-(--gray-700) ${className}`}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Sold by</p>
      <dl className={`mt-2 grid gap-x-4 gap-y-1 ${compact ? "text-xs" : "text-sm"} sm:grid-cols-[7rem_1fr]`}>
        {rows.map((row) => (
          <div key={row.label} className="contents">
            <dt className="text-slate-500">{row.label}</dt>
            <dd className="min-w-0 break-words text-(--brand-navy)">{row.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-[11px] text-slate-500">
        The event is run, and the ticket is sold, by the seller above. Baatasari is the booking platform.
      </p>
    </section>
  )
}
