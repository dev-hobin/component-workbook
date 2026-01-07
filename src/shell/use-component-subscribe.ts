import { useSyncExternalStore } from 'react'
import type { ComponentStore } from '../core/component-store'

/**
 * store의 파생값을 구독하는 훅
 * store가 변경되면 selector 결과가 달라질 때만 리렌더
 */
export function useComponentSubscribe<
  Role extends string,
  Meta extends object,
  T,
>(
  store: ComponentStore<Role, Meta>,
  selector: (store: ComponentStore<Role, Meta>) => T,
): T {
  return useSyncExternalStore(store.subscribe, () => selector(store))
}
