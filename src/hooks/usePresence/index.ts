import { useState } from 'react'
// import ReactDOM from 'react-dom'
// import { useStableCallback } from '../useStableCallback'

type TransitionState = 'starting' | 'idle' | 'ending' | undefined

export function usePresence({
  isVisible,
  // resolveElement: resolveElementFn,
}: {
  isVisible: boolean
  // resolveElement: () => Element
}): {
  isPresent: boolean
  transitionState: TransitionState
} {
  const [transitionState, setTransitionState] = useState<TransitionState>(
    isVisible ? 'idle' : undefined,
  )

  if (isVisible && transitionState === undefined) {
    setTransitionState('starting')
  }

  if (!isVisible && transitionState === 'idle') {
    setTransitionState('ending')
  }

  return {
    isPresent: Boolean(transitionState),
    transitionState,
  }
}
