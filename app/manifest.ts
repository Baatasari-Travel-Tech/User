import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Baatasari",
    short_name: "Baatasari",
    description: "Book the best events, talent and experiences near you.",
    start_url: "/",
    display: "browser",
    background_color: "#ffffff",
    theme_color: "#0c1d37",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  }
}
