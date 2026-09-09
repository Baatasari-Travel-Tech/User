export default function Loading() {
  // Suppress the global loader on this route — the page renders its own intro.
  return <div className="min-h-screen bg-background" />
}
