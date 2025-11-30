import Menu from './styled'

export function NestedMenuExample() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        <Menu.Root>
          <Menu.Trigger>Root</Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner offset={8}>
              <Menu.Content>
                <Menu.ActionItem value="a">A</Menu.ActionItem>

                <Menu.SubRoot>
                  <Menu.SubTrigger>Sub 1</Menu.SubTrigger>
                  <Menu.Portal>
                    <Menu.Positioner placement="right-start" offset={8}>
                      <Menu.SubContent>
                        <Menu.ActionItem value="s1-1">S1-1</Menu.ActionItem>
                        <Menu.ActionItem value="s1-2">S1-2</Menu.ActionItem>
                      </Menu.SubContent>
                      {/* <Menu.PositionerArrow /> */}
                    </Menu.Positioner>
                  </Menu.Portal>
                </Menu.SubRoot>

                <Menu.SubRoot>
                  <Menu.SubTrigger>Sub 2</Menu.SubTrigger>
                  <Menu.Portal>
                    <Menu.Positioner placement="right-start" offset={8}>
                      <Menu.SubContent>
                        <Menu.ActionItem value="s2-1">S2-1</Menu.ActionItem>
                        <Menu.LinkItem value="s2-2" href="#">
                          S2-2 (Link)
                        </Menu.LinkItem>
                      </Menu.SubContent>
                      {/* <Menu.PositionerArrow /> */}
                    </Menu.Positioner>
                  </Menu.Portal>
                </Menu.SubRoot>

                <Menu.ActionItem value="b">B</Menu.ActionItem>
                <Menu.LinkItem value="c" href="#">
                  C (Link)
                </Menu.LinkItem>
              </Menu.Content>
              {/* <Menu.PositionerArrow /> */}
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      </div>
    </div>
  )
}
