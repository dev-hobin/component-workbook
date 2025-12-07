import {
  createContext,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  type ComponentPropsWithoutRef,
  type ReactNode,
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
import { getInitialActiveId } from './strategy'

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

type ItemContextValue = { id: NodeId }
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

function Root(props: RootProps) {
  const existingSystem = useContext(TreeSystemContext)

  // 아직 시스템 컨텍스트가 없으면 → TopRoot
  if (!existingSystem) {
    return (
      <TreeSystemProvider>
        <TreeLevelContext.Provider value={{ parentId: null }}>
          <ParentRoot {...props} />
        </TreeLevelContext.Provider>
      </TreeSystemProvider>
    )
  }

  // 이미 트리 안에서 Root를 쓰는 건 피하고 싶다면:
  // 여기서 경고/에러를 던지고, SubRoot만 쓰도록 강제해도 됨.
  throw new Error(
    '트리 안에서는 TreeView.Root 대신 TreeView.SubRoot를 사용하세요.',
  )
}

type SubRootProps = ComponentPropsWithoutRef<'ul'>
function SubRoot(props: SubRootProps) {
  useTreeSystemContext() // 트리 안인지 확인
  const itemContext = useTreeItemContext() // 어떤 Item 아래인지

  const levelValue: TreeLevelContextValue = { parentId: itemContext.id }

  return (
    <TreeLevelContext.Provider value={levelValue}>
      <ChildRoot {...props} />
    </TreeLevelContext.Provider>
  )
}

function ParentRoot({
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

  console.log('activeId', activeId)

  return (
    <TreeStateContext.Provider value={value}>
      {/* <DebugVisibleNodes /> */}
      <InitActiveIdOnce />
      <ChildRoot {...rest} />
    </TreeStateContext.Provider>
  )
}

type ChildRootProps = ComponentPropsWithoutRef<'ul'>
function ChildRoot(props: ChildRootProps) {
  return <ul {...props} />
}

type ItemProps = ComponentPropsWithoutRef<'li'> & {
  nodeId?: NodeId
}

function Item(props: ItemProps) {
  const { nodeId, children, ...liProps } = props

  const { store } = useTreeSystemContext()
  const { parentId } = useTreeLevelContext()

  const reactId = useId()
  const id: NodeId = useMemo(() => nodeId ?? reactId, [nodeId, reactId])

  useCompositeNodeRegistration(store, {
    id,
    parentId,
    role: 'item',
  })

  const itemContextValue = useMemo<ItemContextValue>(() => ({ id }), [id])

  return (
    <TreeItemContext.Provider value={itemContextValue}>
      <li {...liProps}>{children}</li>
    </TreeItemContext.Provider>
  )
}

function Indicator() {
  return <span>Indicator</span>
}

function Text({ children }: { children?: React.ReactNode }) {
  return <span>{children}</span>
}

const TreeView = {
  Root,
  SubRoot,
  Item,
  Indicator,
  Text,
}

// function DebugVisibleNodes() {
//   const visibleNodes = useTreeVisibleNodes()

//   useEffect(() => {
//     console.log('==== VISIBLE NODES ====')
//     visibleNodes.forEach((node) => {
//       console.log(
//         `id=${node.id}, depth=${node.depth}, parent=${node.parentId}, index=${node.index}`,
//       )
//     })
//     console.log('=======================')
//   }, [visibleNodes])

//   return null
// }

function InitActiveIdOnce() {
  const { activeId, setActiveId } = useTreeStateContext()
  const visibleNodes = useTreeVisibleNodes()

  useEffect(() => {
    const next = getInitialActiveId({
      state: { activeId },
      ctx: { visibleNodes },
    })

    if (next !== activeId) {
      setActiveId(next)
    }
  }, [activeId, setActiveId, visibleNodes])

  return null
}

export default TreeView
