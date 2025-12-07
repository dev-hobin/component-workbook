import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  type ComponentPropsWithoutRef,
} from 'react'
import {
  buildVisibleNodes,
  createCompositeStore,
  useCompositeNodeRegistration,
  useCompositeSnapshot,
  type CompositeStore,
  type NodeId,
  type VisibleNode,
} from '../../core/composite-store'
import { useControllableState } from '@radix-ui/react-use-controllable-state'
import {
  getNextActiveIdByKey,
  getNextActiveIdHorizontalByKey,
  getNextExpandedIdsByKey,
  type TreeViewContext,
} from './strategy'
import { TreeViewDomSystem } from './dom'
import { composeEventHandlers } from '../../utils/composeEventHandlers'

type TreeRole = 'item'
type TreeExtraMeta = object
type TreeStore = CompositeStore<TreeRole, TreeExtraMeta>

// ─────────────────────────────────────────────
// Store Context
// ─────────────────────────────────────────────

type TreeSystemContextValue = {
  store: TreeStore
}

const TreeSystemContext = createContext<TreeSystemContextValue | null>(null)

function useTreeSystemContext(): TreeSystemContextValue {
  const ctx = useContext(TreeSystemContext)
  if (!ctx) {
    throw new Error(
      'TreeView.* 컴포넌트는 TreeView.Root 안에서만 사용할 수 있습니다.',
    )
  }
  return ctx
}

// TopRoot에서만 써줄 Provider (메뉴의 MenuSystem.Provider 역할)
function TreeSystemProvider({ children }: { children: React.ReactNode }) {
  const storeRef = useRef<TreeStore | null>(null)
  if (!storeRef.current) {
    storeRef.current = createCompositeStore<TreeRole, TreeExtraMeta>()
  }

  const value = useMemo<TreeSystemContextValue>(
    () => ({ store: storeRef.current! }),
    [],
  )

  return (
    <TreeSystemContext.Provider value={value}>
      {children}
    </TreeSystemContext.Provider>
  )
}

// ─────────────────────────────────────────────
// Level (parentId 컨텍스트)
// ─────────────────────────────────────────────

type TreeLevelContextValue = {
  parentId: NodeId | null
}

const TreeLevelContext = createContext<TreeLevelContextValue | null>(null)

function useTreeLevelContext(): TreeLevelContextValue {
  const ctx = useContext(TreeLevelContext)
  if (!ctx) {
    throw new Error(
      'TreeView.Item/SubRoot 는 TreeView.Root 안에서만 사용할 수 있습니다.',
    )
  }
  return ctx
}

// ─────────────────────────────────────────────
// Item Context
// ─────────────────────────────────────────────

type ItemContextValue = { id: NodeId; domId: string }
const TreeItemContext = createContext<ItemContextValue | null>(null)

function useTreeItemContext(): ItemContextValue {
  const ctx = useContext(TreeItemContext)
  if (!ctx) {
    throw new Error(
      'TreeView.SubRoot 는 TreeView.Item 안에서만 사용할 수 있습니다.',
    )
  }
  return ctx
}

// ─────────────────────────────────────────────
// Tree State Context
// ─────────────────────────────────────────────

type TreeStateContextValue = {
  expandedIds: NodeId[]
  setExpandedIds: React.Dispatch<React.SetStateAction<NodeId[]>>
  selectedIds: NodeId[]
  setSelectedIds: React.Dispatch<React.SetStateAction<NodeId[]>>
  activeId: NodeId | null
  setActiveId: React.Dispatch<React.SetStateAction<NodeId | null>>
}

const TreeStateContext = createContext<TreeStateContextValue | null>(null)

function useTreeStateContext() {
  const ctx = useContext(TreeStateContext)
  if (!ctx) {
    throw new Error(
      'TreeView 내부 상태는 TreeView.Root 안에서만 사용할 수 있습니다.',
    )
  }
  return ctx
}

// ─────────────────────────────────────────────
// Tree Visible Nodes
// ─────────────────────────────────────────────

function useTreeVisibleNodes() {
  const { store } = useTreeSystemContext()
  const { expandedIds } = useTreeStateContext()

  const snapshot = useCompositeSnapshot(store)

  const visibleNodes = useMemo(
    () => buildVisibleNodes(snapshot, expandedIds),
    [snapshot, expandedIds],
  )

  return visibleNodes as VisibleNode<TreeRole, TreeExtraMeta>[]
}

// ─────────────────────────────────────────────
// Root
// ─────────────────────────────────────────────

type RootProps = ComponentPropsWithoutRef<'ul'> & {
  /** 펼침 상태 (컨트롤드) */
  expandedIds?: NodeId[]
  defaultExpandedIds?: NodeId[]
  onExpandedIdsChange?: (next: NodeId[]) => void

  /** 선택 상태 (컨트롤드) */
  selectedIds?: NodeId[]
  defaultSelectedIds?: NodeId[]
  onSelectedIdsChange?: (next: NodeId[]) => void

  activeId?: NodeId | null
  defaultActiveId?: NodeId | null
  onActiveIdChange?: (next: NodeId | null) => void
}

function Root({
  expandedIds: expandedIdsProp,
  defaultExpandedIds,
  onExpandedIdsChange,
  selectedIds: selectedIdsProp,
  defaultSelectedIds,
  onSelectedIdsChange,
  activeId: activeIdProp,
  defaultActiveId,
  onActiveIdChange,
  ...rest
}: RootProps) {
  const existingSystem = useContext(TreeSystemContext)

  const [expandedIds, setExpandedIds] = useControllableState<NodeId[]>({
    prop: expandedIdsProp,
    defaultProp: defaultExpandedIds ?? [],
    onChange: onExpandedIdsChange,
  })
  const [selectedIds, setSelectedIds] = useControllableState<NodeId[]>({
    prop: selectedIdsProp,
    defaultProp: defaultSelectedIds ?? [],
    onChange: onSelectedIdsChange,
  })

  const [activeId, setActiveId] = useControllableState<NodeId | null>({
    prop: activeIdProp,
    defaultProp: defaultActiveId ?? null,
    onChange: onActiveIdChange,
  })

  const value = useMemo<TreeStateContextValue>(
    () => ({
      expandedIds,
      setExpandedIds,
      selectedIds,
      setSelectedIds,
      activeId,
      setActiveId,
    }),
    [
      expandedIds,
      setExpandedIds,
      selectedIds,
      setSelectedIds,
      activeId,
      setActiveId,
    ],
  )

  // 아직 시스템 컨텍스트가 없으면 → TopRoot
  if (existingSystem) {
    // 이미 트리 안에서 Root를 쓰는 건 피하고 싶다면:
    // 여기서 경고/에러를 던지고, SubRoot만 쓰도록 강제해도 됨.
    throw new Error(
      '트리 안에서는 TreeView.Root 대신 TreeView.SubRoot를 사용하세요.',
    )
  }

  return (
    <TreeSystemProvider>
      <TreeViewDomSystem.Provider>
        <TreeLevelContext.Provider value={{ parentId: null }}>
          <TreeStateContext.Provider value={value}>
            <ParentRoot {...rest} />
          </TreeStateContext.Provider>
        </TreeLevelContext.Provider>
      </TreeViewDomSystem.Provider>
    </TreeSystemProvider>
  )
}

type SubRootProps = ComponentPropsWithoutRef<'ul'>
function SubRoot(props: SubRootProps) {
  useTreeSystemContext() // 트리 안인지 확인

  const itemContext = useTreeItemContext() // 어떤 Item 아래인지
  const { expandedIds } = useTreeStateContext()

  const parentId = itemContext.id

  const isExpanded = expandedIds.includes(parentId)

  return (
    <TreeLevelContext.Provider value={{ parentId }}>
      <ChildRoot data-expanded={isExpanded} {...props} />
    </TreeLevelContext.Provider>
  )
}

type ParentRootProps = ComponentPropsWithoutRef<'ul'>
function ParentRoot(props: ParentRootProps) {
  useTreeFocusEffect()

  return <ChildRoot {...props} />
}

type ChildRootProps = ComponentPropsWithoutRef<'ul'>
function ChildRoot(props: ChildRootProps) {
  const handleKeyDown = useTreeKeyboardNavigation()
  const { parentId } = useTreeLevelContext()

  return (
    <ul
      {...props}
      role={parentId ? 'group' : 'tree'}
      onKeyDown={handleKeyDown}
    />
  )
}

type ItemProps = ComponentPropsWithoutRef<'li'> & {
  nodeId?: NodeId
}

function Item(props: ItemProps) {
  const { nodeId, children, ...liProps } = props

  const { store } = useTreeSystemContext()
  const { parentId } = useTreeLevelContext()
  const visibleNodes = useTreeVisibleNodes()
  const { activeId, selectedIds, expandedIds } = useTreeStateContext()

  const reactId = useId()
  const id: NodeId = useMemo(() => nodeId ?? reactId, [nodeId, reactId])

  useCompositeNodeRegistration(store, {
    id,
    parentId,
    role: 'item',
  })

  const labelId = TreeViewDomSystem.useCompositeDomId('label', id)
  const { domId, ref } = TreeViewDomSystem.useCompositeItemRegistration(
    'item',
    id,
    {
      id: props.id, // 사용자가 id를 넘겼으면 그걸 우선 사용
    },
  )

  const itemContextValue = useMemo<ItemContextValue>(
    () => ({ id, domId }),
    [id, domId],
  )

  const isTabbable = (activeId || visibleNodes[0]?.id) === id
  const isSelected = selectedIds.includes(id)

  const nodeInfo = visibleNodes.find((n) => n.id === id)
  const hasChildren = nodeInfo?.hasChildren ?? false
  const isExpanded = expandedIds.includes(id)
  const ariaExpanded = hasChildren ? isExpanded : undefined
  const ariaLevel = nodeInfo ? nodeInfo.depth + 1 : undefined // depth 0 → level 1
  const ariaPosInSet = nodeInfo ? nodeInfo.index + 1 : undefined
  const ariaSetSize = nodeInfo ? nodeInfo.size : undefined

  const { handleClick, handleKeyDown } = useTreeItemInteractions({
    id,
    hasChildren: nodeInfo?.hasChildren ?? false,
  })

  return (
    <TreeItemContext.Provider value={itemContextValue}>
      <li
        {...liProps}
        ref={ref}
        id={domId}
        role="treeitem"
        tabIndex={isTabbable ? 0 : -1}
        aria-selected={isSelected}
        aria-labelledby={labelId ?? domId}
        aria-expanded={ariaExpanded}
        aria-level={ariaLevel}
        aria-posinset={ariaPosInSet}
        aria-setsize={ariaSetSize}
        data-selected={isSelected}
        onClick={composeEventHandlers(handleClick, liProps.onClick)}
        onKeyDown={composeEventHandlers(handleKeyDown, liProps.onKeyDown)}
      >
        {children}
      </li>
    </TreeItemContext.Provider>
  )
}

function Indicator({ children }: { children?: React.ReactNode }) {
  const item = useTreeItemContext() // { id, domId }
  const { selectedIds, expandedIds } = useTreeStateContext()

  const isSelected = selectedIds.includes(item.id)
  const isExpanded = expandedIds.includes(item.id)

  const { domId, ref } = TreeViewDomSystem.useCompositeItemRegistration(
    'indicator',
    item.id,
  )

  return (
    <span
      ref={ref}
      id={domId}
      data-selected={isSelected}
      data-expanded={isExpanded}
    >
      {children}
    </span>
  )
}

function Text({ children }: { children?: React.ReactNode }) {
  const item = useTreeItemContext() // { id, domId }
  const { selectedIds, expandedIds } = useTreeStateContext()

  const isSelected = selectedIds.includes(item.id)
  const isExpanded = expandedIds.includes(item.id)

  const { domId, ref } = TreeViewDomSystem.useCompositeItemRegistration(
    'label',
    item.id,
  )

  return (
    <span
      ref={ref}
      id={domId}
      data-selected={isSelected}
      data-expanded={isExpanded}
    >
      {children}
    </span>
  )
}

const TreeView = {
  Root,
  SubRoot,
  Item,
  Indicator,
  Text,
}

function useTreeKeyboardNavigation(): React.KeyboardEventHandler<HTMLUListElement> {
  const { activeId, setActiveId, expandedIds, setExpandedIds } =
    useTreeStateContext()
  const visibleNodes = useTreeVisibleNodes()
  const baseActiveId = activeId ?? visibleNodes[0]?.id ?? null

  const handleKeyDown = useCallback<
    React.KeyboardEventHandler<HTMLUListElement>
  >(
    (event) => {
      const key = event.key

      const isVerticalKey =
        key === 'ArrowUp' ||
        key === 'ArrowDown' ||
        key === 'Home' ||
        key === 'End'

      const isHorizontalKey = key === 'ArrowLeft' || key === 'ArrowRight'

      if (!isVerticalKey && !isHorizontalKey) {
        return
      }

      // 스크롤/브라우저 기본 동작 막기
      event.preventDefault()

      const ctx: TreeViewContext = { visibleNodes }

      let nextActiveId: string | null = baseActiveId
      let nextExpandedIds = expandedIds

      // 1) 위/아래/Home/End → activeId만 변경
      if (isVerticalKey) {
        nextActiveId = getNextActiveIdByKey({
          state: { activeId: baseActiveId },
          ctx,
          key,
        })
      }

      // 2) 좌/우 → expandedIds + 수평 active 이동
      if (isHorizontalKey) {
        // (1) 펼침/접힘: expandedIds만 담당
        nextExpandedIds = getNextExpandedIdsByKey({
          state: { expandedIds, activeId: baseActiveId },
          ctx,
          key,
        })

        // (2) 수평 active 이동: 열린 parent → 첫 자식, child → parent 등
        nextActiveId = getNextActiveIdHorizontalByKey({
          state: { expandedIds, activeId: baseActiveId },
          ctx,
          key,
        })
      }

      if (nextActiveId !== activeId) {
        setActiveId(nextActiveId)
      }
      if (nextExpandedIds !== expandedIds) {
        setExpandedIds(nextExpandedIds)
      }
    },
    [
      activeId,
      baseActiveId,
      expandedIds,
      setActiveId,
      setExpandedIds,
      visibleNodes,
    ],
  )

  return handleKeyDown
}

function useTreeFocusEffect() {
  const { activeId } = useTreeStateContext()
  const domSystem = TreeViewDomSystem.useCompositeContext() // or useCompositeRegistry()
  const lastFocusedRef = useRef<NodeId | null>(null)

  useEffect(() => {
    if (!activeId) return

    const node = domSystem.registry.getNode('item', activeId)
    if (!node) return

    if (lastFocusedRef.current === activeId) return
    if (node === document.activeElement) {
      lastFocusedRef.current = activeId
      return
    }

    node.focus()
    lastFocusedRef.current = activeId
  }, [activeId, domSystem.registry])
}

function useTreeItemInteractions(args: { id: NodeId; hasChildren: boolean }) {
  const { id, hasChildren } = args
  const { activeId, setActiveId, setExpandedIds, setSelectedIds } =
    useTreeStateContext()

  const toggleExpanded = useCallback(() => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }, [id, setExpandedIds])

  const selectSingle = useCallback(() => {
    // 지금은 단일 선택만 지원 (나중에 selectionMode로 확장 가능)
    setSelectedIds([id])
  }, [id, setSelectedIds])

  const handleClick: React.MouseEventHandler<HTMLLIElement> = useCallback(
    (event) => {
      event.preventDefault()
      event.stopPropagation() // TODO: stopPropagation 말고 다른 방식으로 교체

      // 항상 이 아이템으로 포커스
      if (activeId !== id) {
        setActiveId(id)
      }

      // 폴더면 열고/닫기
      if (hasChildren) {
        toggleExpanded()
      }

      // 폴더든 파일이든 "선택"은 동일하게 수행
      selectSingle()
    },
    [activeId, id, hasChildren, selectSingle, setActiveId, toggleExpanded],
  )

  const handleKeyDown: React.KeyboardEventHandler<HTMLLIElement> = useCallback(
    (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return

      event.preventDefault()
      event.stopPropagation() // TODO: stopPropagation 말고 다른 방식으로 교체

      if (activeId !== id) {
        setActiveId(id)
      }

      if (hasChildren) {
        toggleExpanded()
      }

      selectSingle()
    },
    [activeId, id, hasChildren, setActiveId, toggleExpanded, selectSingle],
  )

  return { handleClick, handleKeyDown }
}

export default TreeView
