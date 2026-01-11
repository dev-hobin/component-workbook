import { createEventMachine } from '../../event-machine'

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
  GO_PREV: undefined
  GO_NEXT: undefined
}

// ============================================
// Input
// ============================================

export type PaginationInput = {
  // State
  page: number
  pageSize: number
  totalCount: number

  // Callbacks
  onPageChange: (page: number) => void
}

// ============================================
// Computed
// ============================================

export type PaginationComputed = {
  totalPages: number
  hasPrev: boolean
  hasNext: boolean
}

// ============================================
// Machine
// ============================================

export const paginationMachine = createEventMachine<{
  input: PaginationInput
  events: PaginationEvents
  computed: PaginationComputed
  actions: 'noop' | 'goToPage' | 'goPrev' | 'goNext'
}>({
  computed: {
    totalPages: (input) => Math.ceil(input.totalCount / input.pageSize),
    hasPrev: (input) => input.page > 1,
    hasNext: (input) =>
      input.page < Math.ceil(input.totalCount / input.pageSize),
  },

  on: {
    GO_TO_PAGE: 'goToPage',
    GO_PREV: [
      { when: (context) => !context.hasPrev, do: 'noop' },
      { do: 'goPrev' },
    ],
    GO_NEXT: [
      { when: (context) => !context.hasNext, do: 'noop' },
      { do: 'goNext' },
    ],
  },

  actions: {
    noop: () => {},

    goToPage: (context, payload: { page: number }) => {
      const { page } = payload
      const clampedPage = Math.max(1, Math.min(page, context.totalPages))
      context.onPageChange(clampedPage)
    },

    goPrev: (context) => {
      context.onPageChange(context.page - 1)
    },

    goNext: (context) => {
      context.onPageChange(context.page + 1)
    },
  },
})

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
