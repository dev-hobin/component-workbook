import { useState } from 'react'

export function useHighlight(
  count: number,
  options?: { loop?: boolean },
) {
  const loop = options?.loop ?? false
  const [index, setIndex] = useState(-1)
  const safe = count === 0 ? -1 : index >= count ? count - 1 : index

  return {
    index: safe,
    set: setIndex,
    next: () =>
      setIndex((i) => {
        if (count === 0) return -1
        if (i === -1) return 0
        if (i >= count - 1) return loop ? 0 : i
        return i + 1
      }),
    prev: () =>
      setIndex((i) => {
        if (count === 0) return -1
        if (i === -1) return count - 1
        if (i <= 0) return loop ? count - 1 : i
        return i - 1
      }),
    first: () => setIndex(count > 0 ? 0 : -1),
    last: () => setIndex(count > 0 ? count - 1 : -1),
    clear: () => setIndex(-1),
  }
}

export type UseHighlightReturn = ReturnType<typeof useHighlight>
