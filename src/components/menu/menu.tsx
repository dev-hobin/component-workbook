import * as React from 'react'
import { useControllableState } from '@radix-ui/react-use-controllable-state'
import * as NestedMenu from './nested'

export type SingleMenuRootProps = {
  /** 이 메뉴를 식별하는 논리 키 (openPath 매핑용) */
  menuId?: string

  /** 외부 제어용: 열림 상태 */
  open?: boolean
  /** 비제어(default) 열림 상태 */
  defaultOpen?: boolean
  /** 열림 상태 변경 콜백 */
  onOpenChange?: (open: boolean) => void

  children: React.ReactNode
}

function SingleMenuRoot({
  menuId: menuIdProp,
  open: openProp,
  defaultOpen,
  onOpenChange,
  children,
}: SingleMenuRootProps) {
  // boolean 기반 컨트롤
  const [open, setOpen] = useControllableState<boolean>({
    prop: openProp,
    defaultProp: defaultOpen ?? false,
    onChange: onOpenChange,
  })

  // 이 메뉴의 논리 id (NestedMenu의 menuId와 동일 개념)
  const autoId = React.useId()
  const menuId = menuIdProp ?? autoId

  // boolean ↔ path 매핑
  const openPath = open ? [menuId] : []
  const defaultOpenPath = defaultOpen ? [menuId] : []

  const handleOpenPathChange = React.useCallback(
    (path: string[]) => {
      // depth 1 이라서 "path에 내 menuId가 있냐"만 보면 됨
      const nextOpen = path.includes(menuId)
      setOpen(nextOpen)
    },
    [menuId, setOpen],
  )

  return (
    <NestedMenu.Root
      // NestedMenu 입장에서는 트리 기반 인터페이스 유지
      menuId={menuId}
      openPath={openPath}
      defaultOpenPath={defaultOpenPath}
      onOpenPathChange={handleOpenPathChange}
    >
      {children}
    </NestedMenu.Root>
  )
}

const Menu = {
  Root: SingleMenuRoot,
  Trigger: NestedMenu.Trigger,
  Positioner: NestedMenu.Positioner,
  PositionerArrow: NestedMenu.PositionerArrow,
  Content: NestedMenu.Content,
  ActionItem: NestedMenu.ActionItem,
  LinkItem: NestedMenu.LinkItem,
}

export default Menu
