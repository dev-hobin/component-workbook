import { useState } from 'react'
import Pagination from './styled'

function getPageFromURL(): number {
  if (typeof window === 'undefined') return 1
  const searchParams = new URLSearchParams(window.location.search)
  const page = searchParams.get('page')
  const pageNumber = page ? parseInt(page, 10) : 1
  return isNaN(pageNumber) || pageNumber < 1 ? 1 : pageNumber
}

export function UncontrolledExample() {
  const initialPage = getPageFromURL()

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="max-w-4xl w-full space-y-8">
        <div>
          <h2 className="text-2xl font-bold mb-4">
            Uncontrolled Pagination (Default)
          </h2>
          <Pagination.Root totalCount={100} pageSize={10}>
            <Pagination.PreviousTrigger>Previous</Pagination.PreviousTrigger>
            <Pagination.Pages
              action={{ type: 'button', onPageClick: () => {} }}
            />
            <Pagination.NextTrigger>Next</Pagination.NextTrigger>
          </Pagination.Root>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-4">
            Uncontrolled Pagination (Custom Page Size)
          </h2>
          <Pagination.Root totalCount={250} pageSize={25}>
            <Pagination.PreviousTrigger>Previous</Pagination.PreviousTrigger>
            <Pagination.Pages
              action={{ type: 'button', onPageClick: () => {} }}
            />
            <Pagination.NextTrigger>Next</Pagination.NextTrigger>
          </Pagination.Root>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-4">
            Uncontrolled Pagination (Many Pages)
          </h2>
          <Pagination.Root totalCount={1000} pageSize={10}>
            <Pagination.PreviousTrigger>Previous</Pagination.PreviousTrigger>
            <Pagination.Pages
              action={{ type: 'button', onPageClick: () => {} }}
              siblingsCount={2}
            />
            <Pagination.NextTrigger>Next</Pagination.NextTrigger>
          </Pagination.Root>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-4">
            Uncontrolled Pagination (Link Mode)
          </h2>
          <Pagination.Root
            totalCount={50}
            pageSize={10}
            defaultPage={initialPage}
          >
            <Pagination.PreviousTrigger>Previous</Pagination.PreviousTrigger>
            <Pagination.Pages
              action={{
                type: 'link',
                getPageLink: (page) => `?page=${page}`,
              }}
            />
            <Pagination.NextTrigger>Next</Pagination.NextTrigger>
          </Pagination.Root>
        </div>
      </div>
    </div>
  )
}

export function ControlledExample() {
  const [currentPage, setCurrentPage] = useState(1)
  const [secondPagination, setSecondPagination] = useState(1)

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="max-w-4xl w-full space-y-8">
        <div>
          <h2 className="text-2xl font-bold mb-4">Controlled Pagination</h2>
          <p className="text-sm text-gray-600 mb-4">
            Current page: <span className="font-semibold">{currentPage}</span>
          </p>
          <Pagination.Root
            totalCount={100}
            pageSize={10}
            page={currentPage}
            onPageChange={setCurrentPage}
          >
            <Pagination.PreviousTrigger>Previous</Pagination.PreviousTrigger>
            <Pagination.Pages
              action={{
                type: 'button',
                onPageClick: (page) => {
                  console.log('Page clicked:', page)
                },
              }}
            />
            <Pagination.NextTrigger>Next</Pagination.NextTrigger>
          </Pagination.Root>
          <div className="mt-4">
            <button
              onClick={() => setCurrentPage(5)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Go to Page 5 (Programmatically)
            </button>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-4">
            Controlled Pagination (Custom Siblings)
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Current page: <span className="font-semibold">{currentPage}</span>
            {' | '}
            Showing 3 siblings on each side
          </p>
          <Pagination.Root
            totalCount={200}
            pageSize={10}
            page={currentPage}
            onPageChange={setCurrentPage}
          >
            <Pagination.PreviousTrigger>Previous</Pagination.PreviousTrigger>
            <Pagination.Pages
              action={{ type: 'button', onPageClick: () => {} }}
              siblingsCount={3}
            />
            <Pagination.NextTrigger>Next</Pagination.NextTrigger>
          </Pagination.Root>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-4">
            Multiple Controlled Paginations
          </h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">
                First pagination page:{' '}
                <span className="font-semibold">{currentPage}</span>
              </p>
              <Pagination.Root
                totalCount={50}
                pageSize={10}
                page={currentPage}
                onPageChange={setCurrentPage}
              >
                <Pagination.PreviousTrigger>
                  Previous
                </Pagination.PreviousTrigger>
                <Pagination.Pages
                  action={{ type: 'button', onPageClick: () => {} }}
                />
                <Pagination.NextTrigger>Next</Pagination.NextTrigger>
              </Pagination.Root>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">
                Second pagination page:{' '}
                <span className="font-semibold">{secondPagination}</span>
              </p>
              <Pagination.Root
                totalCount={75}
                pageSize={15}
                page={secondPagination}
                onPageChange={setSecondPagination}
              >
                <Pagination.PreviousTrigger>
                  Previous
                </Pagination.PreviousTrigger>
                <Pagination.Pages
                  action={{ type: 'button', onPageClick: () => {} }}
                />
                <Pagination.NextTrigger>Next</Pagination.NextTrigger>
              </Pagination.Root>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
