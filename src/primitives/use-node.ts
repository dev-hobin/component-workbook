import { useCallback, useEffect, useId, useLayoutEffect, useRef } from 'react'
import { useNodeStore } from './use-node-store'
import { useParentId } from './use-parent-context'
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
          domId,
          meta: options.meta ?? ({} as Meta),
          element,
        })
      }
    },
    [store, id, options.role, parentId, domId, options.meta],
  )

  // meta가 바뀌면 store에 반영
  useEffect(() => {
    if (elementRef.current && options.meta) {
      store.updateMeta(id, options.role, options.meta)
    }
  }, [store, id, options.role, options.meta])

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

  const domId = `${options.role}::${id}`

  useLayoutEffect(() => {
    store.register({
      id,
      parentId,
      role: options.role,
      domId,
      meta: options.meta ?? ({} as Meta),
      element: null,
    })

    return () => store.unregister(id, options.role)
  }, [id, parentId, options.role, domId, store, options.meta])

  // meta가 바뀌면 store에 반영
  useEffect(() => {
    if (options.meta) {
      store.updateMeta(id, options.role, options.meta)
    }
  }, [store, id, options.role, options.meta])

  return { id, domId }
}
