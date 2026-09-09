"use client"

import { useSyncExternalStore } from "react"

// A store that never emits: subscribing is a no-op, so React only ever reads
// the two snapshots below.
const neverChanges = () => () => {}
const clientSnapshot = () => true
const serverSnapshot = () => false

/**
 * `false` during SSR and the first (hydrating) client render, `true` from the
 * commit onward.
 *
 * Use this to gate anything that can't exist on the server — `window`,
 * `document`, a canvas, a chart library that measures the DOM — without the
 * usual `useState(false)` + `useEffect(() => setMounted(true))` pair. That pair
 * is a setState-in-effect, which React's compiler-aware lint rules reject
 * because it schedules a second render pass on every mount.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(neverChanges, clientSnapshot, serverSnapshot)
}
