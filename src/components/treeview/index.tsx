import {
  createContext,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from 'react'
import {
  createCompositeStore,
  type CompositeStore,
  type NodeId,
} from '../../core/composite-store'

type TreeRole = 'item'
type TreeExtraMeta = object
type TreeStore = CompositeStore<TreeRole, TreeExtraMeta>

// store를 담을 컨텍스트
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
// Root
// ─────────────────────────────────────────────

type RootProps = {
  children: React.ReactNode
}

export function Root(props: RootProps) {
  const existingSystem = useContext(TreeSystemContext)

  if (!existingSystem) {
    return (
      <TreeSystemProvider>
        <ParentRoot {...props} />
      </TreeSystemProvider>
    )
  }

  return <ChildRoot {...props} />
}

function ParentRoot({ children }: { children: ReactNode }) {
  return <ChildRoot>{children}</ChildRoot>
}

function ChildRoot({ children }: { children: ReactNode }) {
  const { store } = useTreeSystemContext()

  return <ul>{children}</ul>
}

function Item({ children }: { children?: React.ReactNode }) {
  return <li>{children}</li>
}

function Indicator() {
  return <span>Indicator</span>
}

function Text({ children }: { children?: React.ReactNode }) {
  return <span>{children}</span>
}

const TreeView = {
  Root,
  Item,
  Indicator,
  Text,
}

export default TreeView
