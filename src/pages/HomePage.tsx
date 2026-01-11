import { Link } from 'react-router-dom'

const components = [
  {
    name: 'Accordion',
    path: '/accordion',
    description: 'Vertically stacked set of interactive headings that reveal content.',
  },
  // 추후 컴포넌트 추가
]

export default function HomePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Component Workbook</h1>
        <p className="mt-2 text-gray-600">
          Accessible React components following W3C APG patterns
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {components.map((component) => (
          <Link
            key={component.path}
            to={component.path}
            className="block p-6 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all"
          >
            <h2 className="text-lg font-semibold text-gray-900">
              {component.name}
            </h2>
            <p className="mt-2 text-sm text-gray-600">{component.description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
