// ============================================
// Pagination Core - 순수 함수 모듈
// ============================================

export type PaginationState = {
  page: number
  pageSize: number
  totalCount: number
}

// ============================================
// 상태 생성
// ============================================

export function createPaginationState(options: {
  page?: number
  pageSize?: number
  totalCount: number
}): PaginationState {
  return {
    page: options.page ?? 1,
    pageSize: options.pageSize ?? 10,
    totalCount: options.totalCount,
  }
}

// ============================================
// 파생값
// ============================================

export function getTotalPages(state: PaginationState): number {
  return Math.ceil(state.totalCount / state.pageSize)
}

export function hasPreviousPage(state: PaginationState): boolean {
  return state.page > 1
}

export function hasNextPage(state: PaginationState): boolean {
  return state.page < getTotalPages(state)
}

// ============================================
// 상태 업데이트
// ============================================

export function goToPage(state: PaginationState, page: number): PaginationState {
  const totalPages = getTotalPages(state)
  const clampedPage = Math.max(1, Math.min(page, totalPages))
  return { ...state, page: clampedPage }
}

export function goToPreviousPage(state: PaginationState): PaginationState {
  return goToPage(state, state.page - 1)
}

export function goToNextPage(state: PaginationState): PaginationState {
  return goToPage(state, state.page + 1)
}

export function goToFirstPage(state: PaginationState): PaginationState {
  return goToPage(state, 1)
}

export function goToLastPage(state: PaginationState): PaginationState {
  return goToPage(state, getTotalPages(state))
}

// ============================================
// 페이지 리스트 생성
// ============================================

export type PageItem =
  | { type: 'page'; page: number }
  | { type: 'ellipsis'; key: string }

export function getPageItems(
  state: PaginationState,
  siblingsCount: number = 1,
): PageItem[] {
  const totalPages = getTotalPages(state)
  const currentPage = state.page

  const result: PageItem[] = []
  let prevWasEllipsis = false

  for (let page = 1; page <= totalPages; page++) {
    const isFirstPage = page === 1
    const isLastPage = page === totalPages
    const isNearCurrent = Math.abs(page - currentPage) <= siblingsCount

    if (isFirstPage || isLastPage || isNearCurrent) {
      result.push({ type: 'page', page })
      prevWasEllipsis = false
    } else if (!prevWasEllipsis) {
      result.push({ type: 'ellipsis', key: `ellipsis-${page}` })
      prevWasEllipsis = true
    }
  }

  return result
}
