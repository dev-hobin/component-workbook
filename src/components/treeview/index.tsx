import { createContext, useContext } from 'react'
import {
  createCompositeStore,
  type CompositeStore,
  type NodeId,
} from '../../core/composite-store'

type TreeRole = 'item'
type TreeExtraMeta = object
type TreeStore = CompositeStore<TreeRole, TreeExtraMeta>

// Tree 전체 시스템 (스토어 등)
type TreeSystemContextValue = {
  store: TreeStore
}

// 현재 레벨 정보 (이 레벨의 parentId)
type TreeLevelContextValue = {
  parentId: NodeId | null
}

// 현재 Item (자기 자신 id) – SubRoot에서 parent로 쓰기 위함
type TreeItemContextValue = {
  id: NodeId
}

const TreeSystemContext = createContext<TreeSystemContextValue | null>(null)
const TreeLevelContext = createContext<TreeLevelContextValue | null>(null)
const TreeItemContext = createContext<TreeItemContextValue | null>(null)

// 안전하게 쓰기 위한 헬퍼 훅
function useTreeSystem(): TreeSystemContextValue {
  const ctx = useContext(TreeSystemContext)
  if (!ctx) {
    throw new Error(
      'TreeView 컴포넌트는 TreeView.Root 안에서만 사용할 수 있습니다.',
    )
  }
  return ctx
}

function useTreeLevel(): TreeLevelContextValue {
  const ctx = useContext(TreeLevelContext)
  if (!ctx) {
    throw new Error(
      'TreeView.Item/SubRoot는 TreeView.Root 안에서만 사용할 수 있습니다.',
    )
  }
  return ctx
}

function useTreeItem(optional = false): TreeItemContextValue | null {
  const ctx = useContext(TreeItemContext)
  if (!ctx && !optional) {
    throw new Error(
      'TreeView.SubRoot는 TreeView.Item 안에서만 사용할 수 있습니다.',
    )
  }
  return ctx
}

// ========================================================

function Root({ children }: { children?: React.ReactNode }) {
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
