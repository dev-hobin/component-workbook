import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
} from 'react'

// ============================================
// Global Layer Stack
// ============================================

type LayerId = string
type LayerListener = () => void

interface LayerStack {
  push(id: LayerId): void
  pop(id: LayerId): void
  isTopmost(id: LayerId): boolean
  subscribe(listener: LayerListener): () => void
}

function createLayerStack(): LayerStack {
  const stack: LayerId[] = []
  const listeners = new Set<LayerListener>()

  function notify() {
    for (const listener of listeners) {
      listener()
    }
  }

  return {
    push(id) {
      if (!stack.includes(id)) {
        stack.push(id)
        notify()
      }
    },

    pop(id) {
      const index = stack.indexOf(id)
      if (index !== -1) {
        stack.splice(index, 1)
        notify()
      }
    },

    isTopmost(id) {
      return stack.length > 0 && stack[stack.length - 1] === id
    },

    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

// Global singleton
const globalLayerStack = createLayerStack()

// ============================================
// DismissableLayer
// ============================================

export interface DismissableLayerProps {
  children: ReactNode
  /**
   * 레이어가 활성화되었는지 여부
   * true일 때만 스택에 등록됨
   */
  isActive: boolean
  /**
   * Escape 키로 닫을 수 있는지 여부
   * @default true
   */
  dismissOnEscape?: boolean
  /**
   * Escape 키를 눌렀을 때 호출되는 콜백
   * isTopmost일 때만 호출됨
   */
  onEscapeKeyDown?: () => void
  /**
   * 외부 클릭 시 호출되는 콜백
   * isTopmost일 때만 호출됨
   * excludeRefs에 포함된 요소 클릭은 외부 클릭으로 간주하지 않음
   */
  onPointerDownOutside?: (event: PointerEvent) => void
  /**
   * 외부 클릭 감지 대상 요소
   */
  contentRef?: React.RefObject<HTMLElement | null>
  /**
   * 외부 클릭에서 제외할 요소들
   * 이 요소들 클릭은 외부 클릭으로 간주하지 않음
   */
  excludeRefs?: React.RefObject<HTMLElement | null>[]
}

export function DismissableLayer({
  children,
  isActive,
  dismissOnEscape = true,
  onEscapeKeyDown,
  onPointerDownOutside,
  contentRef,
  excludeRefs = [],
}: DismissableLayerProps) {
  const layerId = useId()
  const isTopmostRef = useRef(false)

  // 스택 등록/해제
  useEffect(() => {
    if (isActive) {
      globalLayerStack.push(layerId)
      return () => globalLayerStack.pop(layerId)
    }
  }, [isActive, layerId])

  // isTopmost 상태 추적
  useEffect(() => {
    const updateTopmost = () => {
      isTopmostRef.current = globalLayerStack.isTopmost(layerId)
    }
    updateTopmost()
    return globalLayerStack.subscribe(updateTopmost)
  }, [layerId])

  // Escape 키 핸들러
  useEffect(() => {
    if (!isActive || !dismissOnEscape || !onEscapeKeyDown) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && globalLayerStack.isTopmost(layerId)) {
        event.preventDefault()
        onEscapeKeyDown()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isActive, dismissOnEscape, onEscapeKeyDown, layerId])

  // 외부 클릭 핸들러
  useEffect(() => {
    if (!isActive || !onPointerDownOutside || !contentRef) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!globalLayerStack.isTopmost(layerId)) return

      const target = event.target as Node | null
      const content = contentRef.current

      if (!target || !content) return

      // content 내부 클릭이면 무시
      if (content.contains(target)) return

      // excludeRefs에 포함된 요소 클릭이면 무시
      for (const ref of excludeRefs) {
        if (ref.current?.contains(target)) {
          return
        }
      }

      onPointerDownOutside(event)
    }

    // capture phase로 먼저 감지
    document.addEventListener('pointerdown', handlePointerDown, true)
    return () => document.removeEventListener('pointerdown', handlePointerDown, true)
  }, [isActive, onPointerDownOutside, contentRef, excludeRefs, layerId])

  return <>{children}</>
}
