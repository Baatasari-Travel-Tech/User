import './globals.css'
import Providers from './providers'
import SiteShell from '../components/site-shell'
import { Bricolage_Grotesque, Albert_Sans, Poppins } from 'next/font/google'
import { SITE_NAME, SITE_ORIGIN, organizationJsonLd, webSiteJsonLd } from '@/lib/seo'

// Brand typefaces. These were referenced everywhere (`font-bricolage`,
// `font-albert`, `font-poppins` and the var()s in globals.css) but never
// actually loaded, so the whole site silently fell back to system-ui. Loading
// them here and exposing the CSS variables on <html> fixes the brand
// typography in one place.
//
// Sora and Inter used to be loaded here too. Neither had a single usage —
// no class, no var() reference — so five families' worth of font files were
// being preloaded on every page to render nothing. Anything added back here
// must have a real consumer; each family costs a render-blocking preload.
const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  // 800 was loaded and never asked for — `font-extrabold` appears nowhere in
  // the codebase, and no inline style requests it. Keep this list matched to
  // the weights actually used: an unused weight is a whole extra file on every
  // page, and a MISSING one is worse, since the browser silently synthesises a
  // fake face instead of failing.
  weight: ['400', '500', '600', '700'],
  variable: '--font-bricolage',
  display: 'swap',
})

const albert = Albert_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-albert',
  display: 'swap',
})

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
})

export const metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  // A template rather than a bare string: every page that sets its own title
  // was previously replacing the brand entirely, so search results for an
  // event read as an unattributed title with no site behind it.
  title: {
    default: 'Baatasari - Discover, Connect, Experience',
    template: '%s · Baatasari',
  },
  description: 'Book the best events, dining, and activities near you.',
  // Derived from nlogo.png rather than pointing at it: the source is 870x870
  // and 164 KiB, and icons are fetched raw — the optimizer never sees them.
  icons: {
    icon: '/icon-32.png',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    siteName: SITE_NAME,
    locale: 'en_IN',
    type: 'website',
    // Site-wide fallback card. Pages that set their own images override this;
    // the rest previously shared with no image at all, which renders as a bare
    // grey link in every chat app.
    images: [{ url: '/og-home.jpg', width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/og-home.jpg'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${albert.variable} ${poppins.variable}`}
    >
      <body className="font-sans antialiased" suppressHydrationWarning>
        {/* Site identity + the sitelinks search box. Emitted once here rather
            than per page — repeating Organization on every route gives search
            engines nothing extra to work with. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([organizationJsonLd(), webSiteJsonLd()]),
          }}
        />
        <Providers>
          <SiteShell>{children}</SiteShell>
        </Providers>
      </body>
    </html>
  )
}

