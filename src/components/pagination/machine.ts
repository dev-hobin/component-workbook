import type { EventMachine } from '../../../lib/event-machine'

// ============================================
// Types
// ============================================

export type PageItem =
  | { type: 'page'; page: number }
  | { type: 'ellipsis'; key: string }

// ============================================
// Events
// ============================================

export type PaginationEvents = {
  GO_TO_PAGE: { page: number }
  GO_PREV: void
  GO_NEXT: void
}

// ============================================
// Context
// ============================================

export type PaginationContext = {
  // State
  page: number
  pageSize: number
  totalCount: number

  // Setters
  setPage: (page: number) => void
}

// ============================================
// Machine
// ============================================

export const paginationMachine: EventMachine<PaginationContext, PaginationEvents> = {
  on: {
    GO_TO_PAGE: 'goToPage',
    GO_PREV: [
      { when: (ctx) => ctx.page <= 1, do: 'noop' },
      { do: 'goPrev' },
    ],
    GO_NEXT: [
      { when: (ctx) => ctx.page >= getTotalPages(ctx.totalCount, ctx.pageSize), do: 'noop' },
      { do: 'goNext' },
    ],
  },

  actions: {
    noop: () => {},

    goToPage: (ctx, payload) => {
      const { page } = payload!
      const totalPages = getTotalPages(ctx.totalCount, ctx.pageSize)
      const clampedPage = Math.max(1, Math.min(page, totalPages))
      ctx.setPage(clampedPage)
    },

    goPrev: (ctx) => {
      ctx.setPage(ctx.page - 1)
    },

    goNext: (ctx) => {
      ctx.setPage(ctx.page + 1)
    },
  },
}

// ============================================
// Query Helpers
// ============================================

export function getTotalPages(totalCount: number, pageSize: number): number {
  return Math.ceil(totalCount / pageSize)
}

export function hasPreviousPage(page: number): boolean {
  return page > 1
}

export function hasNextPage(page: number, totalCount: number, pageSize: number): boolean {
  return page < getTotalPages(totalCount, pageSize)
}

export function getPageItems(
  page: number,
  totalCount: number,
  pageSize: number,
  siblingsCount: number = 1,
): PageItem[] {
  const totalPages = getTotalPages(totalCount, pageSize)

  const result: PageItem[] = []
  let prevWasEllipsis = false

  for (let p = 1; p <= totalPages; p++) {
    const isFirstPage = p === 1
    const isLastPage = p === totalPages
    const isNearCurrent = Math.abs(p - page) <= siblingsCount

    if (isFirstPage || isLastPage || isNearCurrent) {
      result.push({ type: 'page', page: p })
      prevWasEllipsis = false
    } else if (!prevWasEllipsis) {
      result.push({ type: 'ellipsis', key: `ellipsis-${p}` })
      prevWasEllipsis = true
    }
  }

  return result
}
