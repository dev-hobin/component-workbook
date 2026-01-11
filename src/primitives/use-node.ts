import { useCallback, useId, useLayoutEffect, useRef } from 'react'
import { useNodeStore } from './use-node-store'
import { useParentId } from './use-parent-context'
import { useLatestRef } from '../hooks/use-latest-ref'
import type { NodeId } from './node-store'

export function useNode<
  Role extends string,
  Meta extends object = object,
>(options: { role: Role; id?: NodeId; domId?: string; meta?: Meta }) {
  const generatedId = useId()
  const id = options.id ?? generatedId
  const parentId = useParentId()
  const store = useNodeStore<Role, Meta>()
  const elementRef = useRef<HTMLElement | null>(null)
  const metaRef = useLatestRef(options.meta)

  const domId = options.domId ?? `${options.role}::${id}`

  const ref = useCallback(
    (element: HTMLElement | null) => {
      // 이전 element와 같으면 skip
      if (elementRef.current === element) return

      // 이전 element가 있었으면 해제
      if (elementRef.current) {
        store.unregister(id, options.role)
      }

      elementRef.current = element

      // 새 element가 있으면 등록
      if (element) {
        store.register({
          id,
          parentId,
          role: options.role,
          meta: metaRef.current ?? ({} as Meta),
          element,
        })
      }
    },
    [id, parentId, options.role, store, metaRef],
  )

  return { id, domId, ref, elementRef }
}

export function useLogicalNode<
  Role extends string,
  Meta extends object = object,
>(options: { role: Role; id?: NodeId; meta?: Meta }) {
  const generatedId = useId()
  const id = options.id ?? generatedId
  const parentId = useParentId()
  const store = useNodeStore<Role, Meta>()
  const metaRef = useLatestRef(options.meta)

  useLayoutEffect(() => {
    store.register({
      id,
      parentId,
      role: options.role,
      meta: metaRef.current ?? ({} as Meta),
      element: null,
    })

    return () => store.unregister(id, options.role)
  }, [id, parentId, options.role, store, metaRef])

  return { id }
}
