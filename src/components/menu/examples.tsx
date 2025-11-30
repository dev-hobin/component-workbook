import { useState } from 'react'
import NestedMenu from './nested'

export function ControlledExample() {
  const [openPath, setOpenPath] = useState<string[]>(['1', '2'])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full space-y-8">
        {/* <div>
          <h2 className="text-xl font-semibold mb-4">Basic Menu</h2>
          <p className="text-sm text-gray-600 mb-4">
            Click the trigger or use ArrowDown/ArrowUp keys when focused to open
            the menu. The activedescendant is set automatically based on
            initialFocus.
          </p>
          <div className="flex gap-2 p-2 border border-gray-300">
            <button onClick={() => setOpenPath(['root'])}>Open Menu</button>
            <button onClick={() => setOpenPath(['root', 'sub1'])}>
              Open Sub 1
            </button>
            <button onClick={() => setOpenPath(['root', 'sub2'])}>
              Open Sub 2
            </button>
            <button onClick={() => setOpenPath([])}>Close ALL</button>
          </div> */}
        <NestedMenu.Root
          menuId="1"
          openPath={openPath}
          onOpenPathChange={setOpenPath}
          // defaultOpenPath={['1', '2']}
        >
          <NestedMenu.Trigger>Root</NestedMenu.Trigger>
          <NestedMenu.Positioner>
            <NestedMenu.Content>
              <NestedMenu.ActionItem value="a">A</NestedMenu.ActionItem>

              <NestedMenu.Root menuId="2">
                <NestedMenu.SubTrigger>Sub 1</NestedMenu.SubTrigger>
                <NestedMenu.Positioner placement="right">
                  <NestedMenu.SubContent>
                    <NestedMenu.ActionItem value="s1-1">
                      S1-1
                    </NestedMenu.ActionItem>
                  </NestedMenu.SubContent>
                </NestedMenu.Positioner>
              </NestedMenu.Root>

              <NestedMenu.Root menuId="3">
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

// export function ActivedescendantExample() {
//   return (
//     <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
//       <div className="max-w-2xl w-full space-y-8">
//         <div>
//           <h2 className="text-xl font-semibold mb-4">
//             Activedescendant Visualization
//           </h2>
//           <p className="text-sm text-gray-600 mb-4">
//             This example shows how activedescendant works. The menu Content has
//             an{' '}
//             <code className="text-xs bg-gray-200 px-1">
//               aria-activedescendant
//             </code>{' '}
//             attribute that points to the currently active menu item. The active
//             item is visually highlighted with a blue background. Open the menu
//             and check the DOM inspector to see the{' '}
//             <code className="text-xs bg-gray-200 px-1">
//               aria-activedescendant
//             </code>{' '}
//             attribute on the Content element.
//           </p>
//           <Menu.Root>
//             <Menu.Trigger>Open Menu</Menu.Trigger>
//             <Menu.Positioner offset={8}>
//               <Menu.PositionerArrow />
//               <Menu.Content>
//                 <Menu.ActionItem value="item-1">Action Item 1</Menu.ActionItem>
//                 <Menu.ActionItem value="item-2">Action Item 2</Menu.ActionItem>
//                 <Menu.ActionItem value="item-3">Action Item 3</Menu.ActionItem>
//               </Menu.Content>
//             </Menu.Positioner>
//           </Menu.Root>
//         </div>
//       </div>
//     </div>
//   )
// }

// export function MixedItemsExample() {
//   return (
//     <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
//       <div className="max-w-2xl w-full space-y-8">
//         <div>
//           <h2 className="text-xl font-semibold mb-4">Mixed Menu Items</h2>
//           <p className="text-sm text-gray-600 mb-4">
//             Menu can contain both ActionItem (button) and LinkItem (anchor)
//             elements. Each item requires a unique{' '}
//             <code className="text-xs bg-gray-200 px-1">value</code> prop which
//             is used to generate the ID for activedescendant.
//           </p>
//           <Menu.Root>
//             <Menu.Trigger>Open Menu</Menu.Trigger>
//             <Menu.Positioner offset={8}>
//               <Menu.PositionerArrow />
//               <Menu.Content>
//                 <Menu.ActionItem value="new">New File</Menu.ActionItem>
//                 <Menu.ActionItem value="open">Open File</Menu.ActionItem>
//                 <Menu.LinkItem value="docs" href="/docs">
//                   Documentation
//                 </Menu.LinkItem>
//                 <Menu.LinkItem value="github" href="https://github.com">
//                   GitHub
//                 </Menu.LinkItem>
//                 <Menu.ActionItem value="settings">Settings</Menu.ActionItem>
//               </Menu.Content>
//             </Menu.Positioner>
//           </Menu.Root>
//         </div>
//       </div>
//     </div>
//   )
// }

// export function PlacementExample() {
//   return (
//     <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
//       <div className="max-w-2xl w-full space-y-8">
//         <div>
//           <h2 className="text-xl font-semibold mb-4">Different Placements</h2>
//           <p className="text-sm text-gray-600 mb-4">
//             Menu can be positioned in different directions. The PositionerArrow
//             automatically adjusts its border colors to match the Content border.
//           </p>
//           <div className="grid grid-cols-2 gap-4">
//             <Menu.Root>
//               <Menu.Trigger>Bottom</Menu.Trigger>
//               <Menu.Positioner placement="bottom" offset={8}>
//                 <Menu.PositionerArrow />
//                 <Menu.Content>
//                   <Menu.ActionItem value="1">Item 1</Menu.ActionItem>
//                   <Menu.ActionItem value="2">Item 2</Menu.ActionItem>
//                 </Menu.Content>
//               </Menu.Positioner>
//             </Menu.Root>

//             <Menu.Root>
//               <Menu.Trigger>Top</Menu.Trigger>
//               <Menu.Positioner placement="top" offset={8}>
//                 <Menu.PositionerArrow />
//                 <Menu.Content>
//                   <Menu.ActionItem value="1">Item 1</Menu.ActionItem>
//                   <Menu.ActionItem value="2">Item 2</Menu.ActionItem>
//                 </Menu.Content>
//               </Menu.Positioner>
//             </Menu.Root>

//             <Menu.Root>
//               <Menu.Trigger>Left</Menu.Trigger>
//               <Menu.Positioner placement="left" offset={8}>
//                 <Menu.PositionerArrow />
//                 <Menu.Content>
//                   <Menu.ActionItem value="1">Item 1</Menu.ActionItem>
//                   <Menu.ActionItem value="2">Item 2</Menu.ActionItem>
//                 </Menu.Content>
//               </Menu.Positioner>
//             </Menu.Root>

//             <Menu.Root>
//               <Menu.Trigger>Right</Menu.Trigger>
//               <Menu.Positioner placement="right" offset={8}>
//                 <Menu.PositionerArrow />
//                 <Menu.Content>
//                   <Menu.ActionItem value="1">Item 1</Menu.ActionItem>
//                   <Menu.ActionItem value="2">Item 2</Menu.ActionItem>
//                 </Menu.Content>
//               </Menu.Positioner>
//             </Menu.Root>
//           </div>
//         </div>
//       </div>
//     </div>
//   )
// }

// export function PortalExample() {
//   return (
//     <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
//       <div className="max-w-2xl w-full space-y-8">
//         <div>
//           <h2 className="text-xl font-semibold mb-4">With Portal</h2>
//           <p className="text-sm text-gray-600 mb-4">
//             Menu can be rendered in a portal to avoid z-index issues. The
//             activedescendant logic works the same way regardless of portal
//             usage.
//           </p>
//           <Menu.Root>
//             <Menu.Trigger>Open Menu (Portal)</Menu.Trigger>
//             <Menu.Portal>
//               <Menu.Positioner offset={8}>
//                 <Menu.PositionerArrow />
//                 <Menu.Content>
//                   <Menu.ActionItem value="item-1">
//                     Action Item 1
//                   </Menu.ActionItem>
//                   <Menu.ActionItem value="item-2">
//                     Action Item 2
//                   </Menu.ActionItem>
//                   <Menu.ActionItem value="item-3">
//                     Action Item 3
//                   </Menu.ActionItem>
//                 </Menu.Content>
//               </Menu.Positioner>
//             </Menu.Portal>
//           </Menu.Root>
//         </div>
//       </div>
//     </div>
//   )
// }

// export function ControlledExample() {
//   const [open, setOpen] = useState(false)

//   return (
//     <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
//       <div className="max-w-2xl w-full space-y-8">
//         <div>
//           <h2 className="text-xl font-semibold mb-4">Controlled Menu</h2>
//           <p className="text-sm text-gray-600 mb-4">
//             Menu can be controlled externally. The activedescendant is still
//             managed internally by the Menu component.
//           </p>
//           <div className="mb-4">
//             <button
//               type="button"
//               onClick={() => setOpen(!open)}
//               className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
//             >
//               {open ? 'Close' : 'Open'} Menu (External Control)
//             </button>
//           </div>
//           <Menu.Root open={open} onOpenChange={setOpen}>
//             <Menu.Trigger>Open Menu</Menu.Trigger>
//             <Menu.Positioner offset={8}>
//               <Menu.PositionerArrow />
//               <Menu.Content>
//                 <Menu.ActionItem value="item-1">Action Item 1</Menu.ActionItem>
//                 <Menu.ActionItem value="item-2">Action Item 2</Menu.ActionItem>
//                 <Menu.ActionItem value="item-3">Action Item 3</Menu.ActionItem>
//               </Menu.Content>
//             </Menu.Positioner>
//           </Menu.Root>
//         </div>
//       </div>
//     </div>
//   )
// }
