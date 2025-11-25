import { useLayoutEffect, useState } from 'react'
import { useLatestRef } from '../useLatestRef'

type TransitionState = 'starting' | 'idle' | 'ending' | undefined

export function usePresence({
  isVisible,
  resolveElement: resolveElementFn,
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

  const resolveElementRef = useLatestRef(resolveElementFn)
  const isVisibleRef = useLatestRef(isVisible)
  const transitionStateRef = useLatestRef(transitionState)

  useLayoutEffect(() => {
    let rafId: number | null = null
    const scheduleTransitionUpdate = (nextState: TransitionState) => {
      rafId = requestAnimationFrame(() => {
        if (isVisibleRef.current !== isVisible) {
          return
        }
        if (transitionStateRef.current !== transitionState) {
          return
        }
        setTransitionState(nextState)
      })
    }

    const waitForAnimations = (callback: () => void): void => {
      const element = resolveElementRef.current()
      if (element === null) {
        return
      }

      Promise.all(
        element
          .getAnimations({ subtree: true })
          .map((animation) => animation.finished),
      ).finally(() => {
        callback()
      })
    }

    switch (transitionState) {
      case 'starting': {
        if (isVisible) {
          waitForAnimations(() => scheduleTransitionUpdate('idle'))
        } else {
          scheduleTransitionUpdate('ending')
        }
        break
      }
      case 'idle': {
        if (isVisible) {
          return
        }
        scheduleTransitionUpdate('ending')
        break
      }
      case 'ending': {
        if (isVisible) {
          scheduleTransitionUpdate('idle')
        } else {
          waitForAnimations(() => scheduleTransitionUpdate(undefined))
        }
        break
      }
      default: {
        if (!isVisible) {
          return
        }
        setTransitionState('starting')
        // scheduleTransitionUpdate('starting')
        break
      }
    }

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
      }
    }
  }, [
    isVisible,
    isVisibleRef,
    resolveElementRef,
    transitionState,
    transitionStateRef,
  ])

  return {
    isPresent: Boolean(transitionState),
    transitionState,
  }
}
