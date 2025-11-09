import { useControllableState } from '@radix-ui/react-use-controllable-state'
import {
  createContext,
  useContext,
  useMemo,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from 'react'

const PaginationContext = createContext<
  | {
      page: number
      pageSize: number
      totalPage: number
      selectPage: (page: number) => void
    }
  | undefined
>(undefined)

function usePaginationContext() {
  const context = useContext(PaginationContext)
  if (!context) {
    throw new Error(
      'usePaginationContext must be used within a PaginationContext',
    )
  }
  return context
}

export type RootProps = {
  page?: number
  pageSize?: number
  totalCount: number
  defaultPage?: number
  onPageChange?: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
} & ComponentPropsWithoutRef<'div'>
const Root = ({
  page,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  defaultPage = 1,
  children,
  ...rest
}: RootProps) => {
  const [currentPage, setCurrentPage] = useControllableState({
    prop: page,
    onChange: onPageChange,
    defaultProp: defaultPage,
  })

  const [currentPageSize] = useControllableState({
    prop: pageSize,
    onChange: onPageSizeChange,
    defaultProp: 10,
  })

  const totalPage = useMemo(() => {
    return Math.ceil(totalCount / currentPageSize)
  }, [totalCount, currentPageSize])

  const selectPage = (page: number) => {
    setCurrentPage(page)
  }

  return (
    <PaginationContext.Provider
      value={{
        page: currentPage,
        pageSize: currentPageSize,
        totalPage,
        selectPage,
      }}
    >
      <div {...rest}>{children}</div>
    </PaginationContext.Provider>
  )
}

export type PreviousTriggerProps = ComponentPropsWithoutRef<'button'>
const PreviousTrigger = ({ children, ...rest }: PreviousTriggerProps) => {
  const { page, selectPage } = usePaginationContext()

  return (
    <button
      type="button"
      onClick={() => selectPage(Math.max(page - 1, 1))}
      disabled={page === 1}
      {...rest}
    >
      {children}
    </button>
  )
}

export type NextTriggerProps = ComponentPropsWithoutRef<'button'>
const NextTrigger = ({ children, ...rest }: NextTriggerProps) => {
  const { page, totalPage, selectPage } = usePaginationContext()

  return (
    <button
      {...rest}
      onClick={() => selectPage(Math.min(page + 1, totalPage))}
      disabled={page === totalPage}
    >
      {children}
    </button>
  )
}

export type PagesProps = {
  TruncationComponent?: ReactNode
  siblingsCount?: number
  action:
    | {
        type: 'button'
        onPageClick: (page: number) => void
      }
    | {
        type: 'link'
        getPageLink: (page: number) => string
      }
} & ComponentPropsWithoutRef<'ul'>

const Pages = ({
  TruncationComponent,
  siblingsCount = 1,
  action,
  ...rest
}: PagesProps) => {
  const { page, totalPage, selectPage } = usePaginationContext()

  const pages = useMemo(() => {
    const result: Array<{ page: number } | null> = []
    let prevWasTruncated = false

    for (let pageNumber = 1; pageNumber <= totalPage; pageNumber++) {
      const shouldShow =
        pageNumber === 1 ||
        pageNumber === totalPage ||
        Math.abs(pageNumber - page) <= siblingsCount

      if (shouldShow) {
        result.push({ page: pageNumber })
        prevWasTruncated = false
      } else {
        if (!prevWasTruncated) {
          result.push(null)
        }
        prevWasTruncated = true
      }
    }

    return result
  }, [totalPage, page, siblingsCount])

  return (
    <ul {...rest}>
      {pages.map((item, index) => {
        if (item === null) {
          return (
            <li
              key={`truncated-${index}`}
              aria-hidden={true}
              data-page-list-item="truncated"
              data-previous-truncated="true"
            >
              {TruncationComponent}
            </li>
          )
        }

        if (action.type === 'link') {
          return (
            <li
              key={item.page}
              data-page-list-item="link"
              data-current-page={page === item.page}
            >
              <a
                href={action.getPageLink(item.page)}
                data-page-item="link"
                data-page={item.page}
                data-current-page={page === item.page}
              >
                {item.page}
              </a>
            </li>
          )
        }

        return (
          <li
            key={item.page}
            data-page-list-item="button"
            data-page={item.page}
            data-current-page={page === item.page}
          >
            <button
              type="button"
              onClick={() => {
                selectPage(item.page)
                action?.onPageClick(item.page)
              }}
              data-page-item="button"
              data-page={item.page}
              data-current-page={page === item.page}
            >
              {item.page}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

const Pagination = {
  Root,
  PreviousTrigger,
  NextTrigger,
  Pages,
}

export default Pagination
