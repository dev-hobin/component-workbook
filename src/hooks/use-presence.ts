import { useEffect, useLayoutEffect, useState } from 'react'

type TransitionState = 'starting' | 'idle' | 'ending' | undefined

const ANIMATION_EVENTS = [
  'transitionend',
  'transitioncancel',
  'animationend',
  'animationcancel',
] as const

export function usePresence({
  isVisible,
  resolveElement,
}: {
  isVisible: boolean
  resolveElement: () => Element | null
}): {
  isPresent: boolean
  transitionState: TransitionState
} {
  const [transitionState, setTransitionState] = useState<TransitionState>(
    isVisible ? 'idle' : undefined,
  )

  // State machine: derive next transitionState from (current state, isVisible)
  useLayoutEffect(() => {
    switch (transitionState) {
      case undefined: {
        if (!isVisible) return
        setTransitionState('starting')
        break
      }
      case 'starting': {
        if (!isVisible) setTransitionState('ending')
        break
      }
      case 'idle': {
        if (!isVisible) setTransitionState('ending')
        break
      }
      case 'ending': {
        if (isVisible) setTransitionState('starting')
        break
      }
    }
  }, [isVisible, transitionState])

  // Wait for animations to complete, then settle
  useEffect(() => {
    if (transitionState !== 'starting' && transitionState !== 'ending') return

    const completeState: TransitionState =
      transitionState === 'starting' ? 'idle' : undefined

    const element = resolveElement()
    if (!element || element.getAnimations({ subtree: true }).length === 0) {
      setTransitionState(completeState)
      return
    }

    function onAnimationEvent(event: Event) {
      const el = resolveElement()
      if (!el || !el.contains(event.target as Node)) return
      if (el.getAnimations({ subtree: true }).length > 0) return
      setTransitionState(completeState)
    }

    for (const name of ANIMATION_EVENTS) {
      element.addEventListener(name, onAnimationEvent)
    }
    return () => {
      for (const name of ANIMATION_EVENTS) {
        element.removeEventListener(name, onAnimationEvent)
      }
    }
  }, [transitionState, resolveElement])

  return {
    isPresent: Boolean(transitionState),
    transitionState,
  }
}
