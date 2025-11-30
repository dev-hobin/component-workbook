import Menu from './menu'

export function NestedMenuExample() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full space-y-8">
        <Menu.Root>
          <Menu.Trigger>Root</Menu.Trigger>
          <Menu.Positioner>
            <Menu.Content>
              <Menu.ActionItem value="a">A</Menu.ActionItem>

              <Menu.SubRoot>
                <Menu.SubTrigger>Sub 1</Menu.SubTrigger>
                <Menu.Positioner placement="right">
                  <Menu.SubContent>
                    <Menu.ActionItem value="s1-1">S1-1</Menu.ActionItem>
                  </Menu.SubContent>
                </Menu.Positioner>
              </Menu.SubRoot>

              <Menu.SubRoot>
                <Menu.SubTrigger>Sub 2</Menu.SubTrigger>
                <Menu.Positioner placement="right">
                  <Menu.SubContent>
                    <Menu.ActionItem value="s2-1">S2-1</Menu.ActionItem>
                  </Menu.SubContent>
                </Menu.Positioner>
              </Menu.SubRoot>
            </Menu.Content>
          </Menu.Positioner>
        </Menu.Root>
      </div>
    </div>
  )
}
