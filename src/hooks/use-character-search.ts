import { useRef } from 'react'

export function useCharacterSearch(
  getItems: () => string[],
  onMatch: (index: number) => void,
  startIndex?: number,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bufferRef = useRef('')

  return (char: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    bufferRef.current += char.toLowerCase()
    timerRef.current = setTimeout(() => {
      bufferRef.current = ''
    }, 500)

    const items = getItems()
    const search = bufferRef.current
    const start = (startIndex ?? -1) + 1

    for (let i = 0; i < items.length; i++) {
      const idx = (start + i) % items.length
      if (items[idx].toLowerCase().startsWith(search)) {
        onMatch(idx)
        return
      }
    }
  }
}
