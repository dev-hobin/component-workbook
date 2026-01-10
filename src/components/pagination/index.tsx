import React, {
  createContext,
  forwardRef,
  useContext,
  useId,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from 'react'
import { useControllableState } from '@radix-ui/react-use-controllable-state'
import { useEventMachine, type Send } from '../../event-machine'

import {
  paginationMachine,
  hasPreviousPage,
  hasNextPage,
  getPageItems,
  type PaginationContext as MachineContext,
  type PaginationEvents,
} from './machine'
import { composeRefs } from '../../utils/compose-refs'
import { mergeProps } from '../../utils/merge-props'

import {
  ComponentStoreProvider,
  useComponentStore,
} from '../../primitives/use-component-store'
import { useNode } from '../../primitives/use-node'
import type { ComponentStore } from '../../primitives/component-store'

// ============================================
// Types
// ============================================

type PaginationRole = 'root' | 'previous' | 'next' | 'page' | 'ellipsis'

type PaginationMeta = {
  page?: number
}

type PaginationContextValue = {
  paginationId: string
  page: number
  pageSize: number
  totalCount: number
  store: ComponentStore<PaginationRole, PaginationMeta>
  send: Send<PaginationEvents>
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

    const page = currentPage ?? 1

    // Machine context
    const machineCtx: MachineContext = {
      page,
      pageSize,
      totalCount,
      setPage: setCurrentPage,
    }

    // Event machine
    const { send } = useEventMachine(paginationMachine, machineCtx)

    const { ref, domId } = useNode<PaginationRole>({
      role: 'root',
      id: paginationId,
    })

    const contextValue: PaginationContextValue = {
      paginationId,
      page,
      pageSize,
      totalCount,
      store,
      send,
    }

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
    const { paginationId, page, send } = usePaginationContext()

    const { ref, domId } = useNode<PaginationRole>({
      role: 'previous',
      id: paginationId,
    })

    const isDisabled = !hasPreviousPage(page)

    const handleClick = () => {
      send('GO_PREV')
    }

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
    const { paginationId, page, pageSize, totalCount, send } = usePaginationContext()

    const { ref, domId } = useNode<PaginationRole>({
      role: 'next',
      id: paginationId,
    })

    const isDisabled = !hasNextPage(page, totalCount, pageSize)

    const handleClick = () => {
      send('GO_NEXT')
    }

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
    const { page, pageSize, totalCount, send } = usePaginationContext()

    const pageItems = getPageItems(page, totalCount, pageSize, siblingsCount)

    const handlePageClick = (targetPage: number) => {
      send('GO_TO_PAGE', { page: targetPage })
      if (action.type === 'button') {
        action.onPageClick?.(targetPage)
      }
    }

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

          const isCurrent = page === item.page

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
