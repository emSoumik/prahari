import { useEffect } from 'react'

/** Sets the tab title to `Prahari · <page>`. */
export function useTitle(page: string) {
  useEffect(() => {
    document.title = `Prahari · ${page}`
  }, [page])
}
