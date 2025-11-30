import Menu from './styled'

export function NestedMenuExample() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        <Menu.Root>
          <Menu.Trigger>메뉴</Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner offset={8}>
              <Menu.Content>
                <Menu.ActionItem value="a">메뉴 1</Menu.ActionItem>

                <Menu.SubRoot>
                  <Menu.SubTrigger>서브메뉴 1</Menu.SubTrigger>
                  <Menu.Portal>
                    <Menu.Positioner placement="right-start" offset={8}>
                      <Menu.SubContent>
                        <Menu.ActionItem value="s1-1">
                          액션 아이템 1-1
                        </Menu.ActionItem>
                        <Menu.ActionItem value="s1-2">
                          액션 아이템 1-2
                        </Menu.ActionItem>
                      </Menu.SubContent>
                      {/* <Menu.PositionerArrow /> */}
                    </Menu.Positioner>
                  </Menu.Portal>
                </Menu.SubRoot>

                <Menu.SubRoot>
                  <Menu.SubTrigger>서브메뉴 2</Menu.SubTrigger>
                  <Menu.Portal>
                    <Menu.Positioner placement="right-start" offset={8}>
                      <Menu.SubContent>
                        <Menu.ActionItem value="s2-1">
                          액션 아이템 2-1
                        </Menu.ActionItem>
                        <Menu.LinkItem value="s2-2" href="#">
                          링크 아이템 2-2
                        </Menu.LinkItem>
                      </Menu.SubContent>
                      {/* <Menu.PositionerArrow /> */}
                    </Menu.Positioner>
                  </Menu.Portal>
                </Menu.SubRoot>

                <Menu.ActionItem value="b">액션 아이템 1</Menu.ActionItem>
                <Menu.LinkItem value="c" href="#">
                  링크 아이템 1
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
