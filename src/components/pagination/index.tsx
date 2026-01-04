import React, {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useId,
  useMemo,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from 'react'
import { useControllableState } from '@radix-ui/react-use-controllable-state'

import {
  goToPage,
  goToPreviousPage,
  goToNextPage,
  hasPreviousPage,
  hasNextPage,
  getPageItems,
  type PaginationState,
} from './core'
import { composeRefs } from '../../utils/composeRefs'
import { mergeProps } from '../../utils/mergeProps'

import {
  ComponentStoreProvider,
  useComponentStore,
} from '../../shell/use-component-store'
import { useNode } from '../../shell/use-node'
import type { ComponentStore } from '../../core/component-store'

// ============================================
// Types
// ============================================

type PaginationRole = 'root' | 'previous' | 'next' | 'page' | 'ellipsis'

type PaginationMeta = {
  page?: number
}

type PaginationContextValue = {
  paginationId: string
  state: PaginationState
  setState: React.Dispatch<React.SetStateAction<PaginationState>>
  store: ComponentStore<PaginationRole, PaginationMeta>
}

// ============================================
// Contexts
// ============================================

const PaginationContext = createContext<PaginationContextValue | null>(null)

function usePaginationContext() {
  const context = useContext(PaginationContext)
  if (!context) {
    throw new Error('Pagination 컴포넌트는 Pagination.Root 안에서 사용해야 합니다.')
  }
  return context
}

// ============================================
// Root
// ============================================

export type RootProps = {
  children: React.ReactNode
  page?: number
  pageSize?: number
  totalCount: number
  defaultPage?: number
  onPageChange?: (page: number) => void
} & ComponentPropsWithoutRef<'nav'>

export function Root(props: RootProps) {
  return (
    <ComponentStoreProvider<PaginationRole, PaginationMeta>>
      <RootInner {...props} />
    </ComponentStoreProvider>
  )
}

const RootInner = forwardRef<HTMLElement, RootProps>(
  (
    {
      children,
      page: pageProp,
      pageSize = 10,
      totalCount,
      defaultPage = 1,
      onPageChange,
      ...rest
    },
    forwardedRef,
  ) => {
    const { store } = useComponentStore<PaginationRole, PaginationMeta>()
    const paginationId = useId()

    const [currentPage, setCurrentPage] = useControllableState({
      prop: pageProp,
      onChange: onPageChange,
      defaultProp: defaultPage,
    })

    const state: PaginationState = useMemo(
      () => ({
        page: currentPage,
        pageSize,
        totalCount,
      }),
      [currentPage, pageSize, totalCount],
    )

    const setState: React.Dispatch<React.SetStateAction<PaginationState>> =
      useCallback(
        (action) => {
          const nextState = typeof action === 'function' ? action(state) : action
          if (nextState.page !== state.page) {
            setCurrentPage(nextState.page)
          }
        },
        [state, setCurrentPage],
      )

    const { ref, domId } = useNode<PaginationRole>({
      role: 'root',
      id: paginationId,
    })

    const contextValue = useMemo<PaginationContextValue>(
      () => ({
        paginationId,
        state,
        setState,
        store,
      }),
      [paginationId, state, setState, store],
    )

    return (
      <PaginationContext.Provider value={contextValue}>
        <nav
          ref={composeRefs(forwardedRef, ref)}
          {...mergeProps(
            {
              id: domId,
              'aria-label': 'Pagination',
            },
            rest,
          )}
        >
          {children}
        </nav>
      </PaginationContext.Provider>
    )
  },
)

// ============================================
// PreviousTrigger
// ============================================

export type PreviousTriggerProps = ComponentPropsWithoutRef<'button'>

export const PreviousTrigger = forwardRef<HTMLButtonElement, PreviousTriggerProps>(
  ({ children, ...rest }, forwardedRef) => {
    const { paginationId, state, setState } = usePaginationContext()

    const { ref, domId } = useNode<PaginationRole>({
      role: 'previous',
      id: paginationId,
    })

    const isDisabled = !hasPreviousPage(state)

    const handleClick = useCallback(() => {
      setState(goToPreviousPage(state))
    }, [state, setState])

    return (
      <button
        ref={composeRefs(forwardedRef, ref)}
        {...mergeProps(
          {
            type: 'button',
            id: domId,
            disabled: isDisabled,
            onClick: handleClick,
            'aria-label': 'Go to previous page',
          },
          rest,
        )}
      >
        {children}
      </button>
    )
  },
)

// ============================================
// NextTrigger
// ============================================

export type NextTriggerProps = ComponentPropsWithoutRef<'button'>

export const NextTrigger = forwardRef<HTMLButtonElement, NextTriggerProps>(
  ({ children, ...rest }, forwardedRef) => {
    const { paginationId, state, setState } = usePaginationContext()

    const { ref, domId } = useNode<PaginationRole>({
      role: 'next',
      id: paginationId,
    })

    const isDisabled = !hasNextPage(state)

    const handleClick = useCallback(() => {
      setState(goToNextPage(state))
    }, [state, setState])

    return (
      <button
        ref={composeRefs(forwardedRef, ref)}
        {...mergeProps(
          {
            type: 'button',
            id: domId,
            disabled: isDisabled,
            onClick: handleClick,
            'aria-label': 'Go to next page',
          },
          rest,
        )}
      >
        {children}
      </button>
    )
  },
)

// ============================================
// Pages
// ============================================

export type PagesProps = {
  siblingsCount?: number
  action:
    | { type: 'button'; onPageClick?: (page: number) => void }
    | { type: 'link'; getPageLink: (page: number) => string }
  ellipsis?: ReactNode
} & ComponentPropsWithoutRef<'ul'>

export const Pages = forwardRef<HTMLUListElement, PagesProps>(
  (
    { siblingsCount = 1, action, ellipsis = '...', ...rest },
    forwardedRef,
  ) => {
    const { state, setState } = usePaginationContext()

    const pageItems = getPageItems(state, siblingsCount)

    const handlePageClick = useCallback(
      (page: number) => {
        setState(goToPage(state, page))
        if (action.type === 'button') {
          action.onPageClick?.(page)
        }
      },
      [state, setState, action],
    )

    return (
      <ul ref={forwardedRef} {...rest}>
        {pageItems.map((item) => {
          if (item.type === 'ellipsis') {
            return (
              <li
                key={item.key}
                aria-hidden
                data-type="ellipsis"
              >
                {ellipsis}
              </li>
            )
          }

          const isCurrent = state.page === item.page

          if (action.type === 'link') {
            return (
              <li key={item.page} data-type="page">
                <a
                  href={action.getPageLink(item.page)}
                  aria-current={isCurrent ? 'page' : undefined}
                  data-current={isCurrent || undefined}
                  data-page={item.page}
                >
                  {item.page}
                </a>
              </li>
            )
          }

          return (
            <li key={item.page} data-type="page">
              <button
                type="button"
                onClick={() => handlePageClick(item.page)}
                aria-current={isCurrent ? 'page' : undefined}
                data-current={isCurrent || undefined}
                data-page={item.page}
              >
                {item.page}
              </button>
            </li>
          )
        })}
      </ul>
    )
  },
)

// ============================================
// Export
// ============================================

const Pagination = {
  Root,
  PreviousTrigger,
  NextTrigger,
  Pages,
}

export default Pagination
