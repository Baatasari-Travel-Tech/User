import { FaInstagram, FaLinkedin, FaEnvelope } from "react-icons/fa"

export const SOCIAL_LINKS = {
  instagram: "https://www.instagram.com/baatasari._",
  linkedin: "https://www.linkedin.com/company/baatasari/",
  email: "contact-us@baatasari.com",
} as const

const ITEMS = [
  { label: "Instagram", href: SOCIAL_LINKS.instagram, Icon: FaInstagram, external: true },
  { label: "LinkedIn", href: SOCIAL_LINKS.linkedin, Icon: FaLinkedin, external: true },
  { label: "Email", href: `mailto:${SOCIAL_LINKS.email}`, Icon: FaEnvelope, external: false },
]

export function FooterSocialLinks() {
  return (
    <div className="flex items-center gap-4">
      {ITEMS.map(({ label, href, Icon, external }) => (
        <a
          key={label}
          href={href}
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          aria-label={label}
          className="rounded-full border border-slate-600 p-2.5 hover:bg-slate-800 transition"
        >
          <Icon className="h-5 w-5" />
        </a>
      ))}
    </div>
  )
}
