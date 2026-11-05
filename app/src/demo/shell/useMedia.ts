import { useSyncExternalStore } from 'react'

/** Subscribes to a CSS media query. Server/first render reports `false`. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      const mq = window.matchMedia(query)
      mq.addEventListener('change', notify)
      return () => mq.removeEventListener('change', notify)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** Phone layout: the shell swaps to its own mobile component below 768px. */
export const PHONE_QUERY = '(max-width: 767px)'
