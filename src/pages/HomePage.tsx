import { Link } from 'react-router-dom'

const components = [
  {
    name: 'Accordion',
    path: '/accordion',
    description: 'Vertically stacked set of interactive headings that reveal content.',
    anatomy: `<Root>
  <Item>
    <ItemTrigger />
    <ItemContent />
  </Item>
</Root>`,
  },
  {
    name: 'Tabs',
    path: '/tabs',
    description: 'A set of layered sections of content that display one panel at a time.',
    anatomy: `<Root>
  <List>
    <Trigger />
    <Indicator />
  </List>
  <Content />
</Root>`,
  },
  {
    name: 'Modal',
    path: '/modal',
    description: 'A dialog that appears on top of the main content.',
    anatomy: `<Root>
  <Trigger />
  <Portal>
    <Backdrop />
    <Content>
      <Title />
      <Description />
      <Close />
    </Content>
  </Portal>
</Root>`,
  },
  {
    name: 'Menu',
    path: '/menu',
    description: 'A list of actions or options that can be triggered by a button.',
    anatomy: `<Root>
  <Trigger />
  <Portal>
    <Content>
      <Item />
      <Separator />
      <Sub>
        <SubTrigger />
        <SubContent />
      </Sub>
    </Content>
  </Portal>
</Root>`,
  },
  {
    name: 'Tree',
    path: '/tree',
    description: 'A hierarchical list of items that can be expanded and collapsed.',
    anatomy: `<Root>
  <Item>
    <ItemLabel />
    <ItemIndicator />
    <ItemGroup>
      <Item>...</Item>
    </ItemGroup>
  </Item>
</Root>`,
  },
  {
    name: 'Combobox',
    path: '/combobox',
    description: 'An input with a dropdown list for selecting or filtering options.',
    anatomy: `<Root>
  <Label />
  <Control>
    <Input />
    <Trigger />
  </Control>
  <Positioner>
    <Listbox>
      <Option />
    </Listbox>
  </Positioner>
</Root>`,
  },
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
            className="group block p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
          >
            <h2 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
              {component.name}
            </h2>
            <p className="mt-2 text-sm text-gray-600">{component.description}</p>
            <pre className="mt-4 p-3 bg-gray-50 rounded-md text-xs text-gray-700 font-mono overflow-x-auto border border-gray-100">
              {component.anatomy}
            </pre>
          </Link>
        ))}
      </div>
    </div>
  )
}
