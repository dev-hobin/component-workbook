import Menu from './styled'

export function UncontrolledExample() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        <Menu.Root>
          <Menu.Trigger>Open Menu</Menu.Trigger>
          <Menu.Positioner offset={8}>
            <Menu.PositionerArrow />
            <Menu.Content>
              <Menu.ActionItem value="item-1">Action Item 1</Menu.ActionItem>
              <Menu.ActionItem value="item-2">Action Item 2</Menu.ActionItem>
              <Menu.LinkItem value="link-item-1">Link Item 1</Menu.LinkItem>
              <Menu.LinkItem value="link-item-2">Link Item 2</Menu.LinkItem>
            </Menu.Content>
          </Menu.Positioner>
        </Menu.Root>
      </div>
    </div>
  )
}
