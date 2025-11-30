import { useState } from 'react'
import NestedMenu from './nested'
import Menu from './menu'

export function NestedMenuExample() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full space-y-8">
        <NestedMenu.Root
        // openPath={openPath}
        // onOpenPathChange={setOpenPath}
        // defaultOpenPath={['1', '2']}
        >
          <NestedMenu.Trigger>Root</NestedMenu.Trigger>
          <NestedMenu.Positioner>
            <NestedMenu.Content>
              <NestedMenu.ActionItem value="a">A</NestedMenu.ActionItem>

              <NestedMenu.Root>
                <NestedMenu.SubTrigger>Sub 1</NestedMenu.SubTrigger>
                <NestedMenu.Positioner placement="right">
                  <NestedMenu.SubContent>
                    <NestedMenu.ActionItem value="s1-1">
                      S1-1
                    </NestedMenu.ActionItem>
                  </NestedMenu.SubContent>
                </NestedMenu.Positioner>
              </NestedMenu.Root>

              <NestedMenu.Root>
                <NestedMenu.SubTrigger>Sub 2</NestedMenu.SubTrigger>
                <NestedMenu.Positioner placement="right">
                  <NestedMenu.SubContent>
                    <NestedMenu.ActionItem value="s2-1">
                      S2-1
                    </NestedMenu.ActionItem>
                  </NestedMenu.SubContent>
                </NestedMenu.Positioner>
              </NestedMenu.Root>
            </NestedMenu.Content>
          </NestedMenu.Positioner>
        </NestedMenu.Root>
      </div>
    </div>
  )
}

export function MenuExample() {
  const [open, setOpen] = useState(false)

  return (
    <Menu.Root
      menuId="file-menu"
      open={open}
      onOpenChange={setOpen}
      defaultOpen={false}
    >
      <Menu.Trigger>File</Menu.Trigger>
      <Menu.Positioner>
        <Menu.Content>
          <Menu.ActionItem value="new">New</Menu.ActionItem>
          <Menu.ActionItem value="open">Open</Menu.ActionItem>
          <Menu.LinkItem value="doc" href="/docs">
            Docs
          </Menu.LinkItem>
        </Menu.Content>
      </Menu.Positioner>
    </Menu.Root>
  )
}
