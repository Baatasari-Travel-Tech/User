import { isValidElement } from "react"
import type { ReactNode } from "react"

/** Plain text of a React node (strings, numbers, nested elements), for structured data. */
export function nodeText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return ""
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(nodeText).join("")
  if (isValidElement(node)) return nodeText((node.props as { children?: ReactNode }).children)
  return ""
}

/**
 * schema.org/FAQPage built from the same question list the page renders, so the
 * markup can never say something the page doesn't. (Google now shows FAQ rich
 * results only for a few site types, but answer engines and other search
 * engines still read it.)
 */
export const faqJsonLd = (items: ReadonlyArray<{ q: string; a: ReactNode }>) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: items.map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: nodeText(a).replace(/\s+/g, " ").trim() },
  })),
})

/** Safe to inline in a <script>: a literal "<" can't close the tag early. */
export const jsonLdString = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c")
