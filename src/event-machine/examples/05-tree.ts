/**
 * 예시 5: TreeView
 * 
 * 모든 기능을 복합적으로 사용하는 복잡한 예시
 * - 조건부 핸들러 (when)
 * - payload 있는/없는 이벤트 혼합
 * - computed (파생 상태)
 * - effects (enter/exit/change)
 * - always (자동 평가)
 * - createEventMachine으로 actions 타입 추론
 */

import { useState, useMemo, useCallback } from 'react';
import { useEventMachine, createEventMachine } from '../index';

// ============================================
// 1. Types
// ============================================

export type TreeNode = {
  id: string;
  label: string;
  children?: TreeNode[];
};

type FlatNode = {
  id: string;
  label: string;
  depth: number;
  parentId: string | null;
  hasChildren: boolean;
  index: number;
};

// ============================================
// 2. Context 타입 정의
// ============================================

type TreeContext = {
  // Data
  items: TreeNode[];
  flatNodes: FlatNode[];

  // State
  expandedIds: Set<string>;
  selectedIds: Set<string>;
  focusedId: string | null;

  // Options
  multiSelect: boolean;

  // Setters
  setExpandedIds: (ids: Set<string>) => void;
  setSelectedIds: (ids: Set<string>) => void;
  setFocusedId: (id: string | null) => void;

  // Callbacks
  onSelect?: (ids: Set<string>) => void;
  onExpand?: (ids: Set<string>) => void;
};

// ============================================
// 3. Events 타입 정의
// ============================================

type TreeEvents = {
  // Payload 있는 이벤트
  FOCUS: { id: string };
  SELECT: { id: string; ctrlKey?: boolean; shiftKey?: boolean };
  EXPAND: { id: string };
  COLLAPSE: { id: string };
  TOGGLE_EXPAND: { id: string };
  TOGGLE_SELECT: { id: string };

  // Payload 없는 이벤트 (키보드)
  ARROW_DOWN: undefined;
  ARROW_UP: undefined;
  ARROW_RIGHT: undefined;
  ARROW_LEFT: undefined;
  ENTER: undefined;
  SPACE: undefined;
  HOME: undefined;
  END: undefined;
  ASTERISK: undefined;  // * 키로 모두 펼치기
};

// Payload 없는 키보드 이벤트 타입 (send 타입 좁히기용)
type KeyboardEventType = 
  | 'ARROW_DOWN' 
  | 'ARROW_UP' 
  | 'ARROW_RIGHT' 
  | 'ARROW_LEFT' 
  | 'ENTER' 
  | 'SPACE' 
  | 'HOME' 
  | 'END' 
  | 'ASTERISK';

// ============================================
// 4. Computed 타입 정의
// ============================================

type TreeComputed = {
  // 현재 보이는 노드들
  visibleNodes: FlatNode[];
  visibleIds: string[];

  // 포커스 관련
  focusedIndex: number;
  focusedNode: FlatNode | null;

  // 헬퍼 (현재 포커스 기준)
  canExpand: boolean;
  canCollapse: boolean;
  hasNextNode: boolean;
  hasPrevNode: boolean;
};

// ============================================
// 5. Helpers
// ============================================

function flattenTree(nodes: TreeNode[], depth = 0, parentId: string | null = null): FlatNode[] {
  let index = 0;
  const result: FlatNode[] = [];

  const traverse = (nodes: TreeNode[], d: number, pid: string | null) => {
    for (const node of nodes) {
      result.push({
        id: node.id,
        label: node.label,
        depth: d,
        parentId: pid,
        hasChildren: (node.children?.length ?? 0) > 0,
        index: index++,
      });
      if (node.children) {
        traverse(node.children, d + 1, node.id);
      }
    }
  };

  traverse(nodes, depth, parentId);
  return result;
}

function getVisibleNodes(flatNodes: FlatNode[], expandedIds: Set<string>): FlatNode[] {
  const result: FlatNode[] = [];
  const hiddenParents = new Set<string>();

  for (const node of flatNodes) {
    // 부모가 숨김 처리되었으면 이 노드도 숨김
    if (node.parentId && hiddenParents.has(node.parentId)) {
      hiddenParents.add(node.id);
      continue;
    }

    // 부모가 접혀있으면 숨김
    if (node.parentId && !expandedIds.has(node.parentId)) {
      hiddenParents.add(node.id);
      continue;
    }

    result.push({ ...node, index: result.length });
  }

  return result;
}

// ============================================
// 6. Actions 타입 (createEventMachine용)
// ============================================

type TreeActions =
  | 'noop'
  | 'focus'
  | 'select'
  | 'addToSelection'
  | 'deselect'
  | 'toggleSelection'
  | 'expand'
  | 'collapse'
  | 'focusNext'
  | 'focusPrev'
  | 'focusFirst'
  | 'focusLast'
  | 'focusFirstChild'
  | 'focusParent'
  | 'expandFocused'
  | 'collapseFocused'
  | 'selectFocused'
  | 'toggleSelectFocused'
  | 'expandAll';

// ============================================
// 7. Machine 정의 (createEventMachine 사용)
// ============================================

const treeMachine = createEventMachine<
  TreeContext,
  TreeEvents,
  TreeComputed,
  TreeActions
>({
  // ============ Computed ============
  computed: {
    visibleNodes: (ctx) => getVisibleNodes(ctx.flatNodes, ctx.expandedIds),

    visibleIds: (ctx) => {
      const visible = getVisibleNodes(ctx.flatNodes, ctx.expandedIds);
      return visible.map((n) => n.id);
    },

    focusedIndex: (ctx) => {
      if (!ctx.focusedId) return -1;
      const visible = getVisibleNodes(ctx.flatNodes, ctx.expandedIds);
      return visible.findIndex((n) => n.id === ctx.focusedId);
    },

    focusedNode: (ctx) => {
      if (!ctx.focusedId) return null;
      const visible = getVisibleNodes(ctx.flatNodes, ctx.expandedIds);
      return visible.find((n) => n.id === ctx.focusedId) ?? null;
    },

    canExpand: (ctx) => {
      if (!ctx.focusedId) return false;
      const node = ctx.flatNodes.find((n) => n.id === ctx.focusedId);
      return node?.hasChildren === true && !ctx.expandedIds.has(ctx.focusedId);
    },

    canCollapse: (ctx) => {
      if (!ctx.focusedId) return false;
      return ctx.expandedIds.has(ctx.focusedId);
    },

    hasNextNode: (ctx) => {
      const visible = getVisibleNodes(ctx.flatNodes, ctx.expandedIds);
      const idx = ctx.focusedId ? visible.findIndex((n) => n.id === ctx.focusedId) : -1;
      return idx < visible.length - 1;
    },

    hasPrevNode: (ctx) => {
      const visible = getVisibleNodes(ctx.flatNodes, ctx.expandedIds);
      const idx = ctx.focusedId ? visible.findIndex((n) => n.id === ctx.focusedId) : -1;
      return idx > 0;
    },
  },

  // ============ On ============
  on: {
    // --- Payload 있는 이벤트 ---

    FOCUS: 'focus',

    SELECT: [
      { when: (ctx, p) => !!p.ctrlKey && ctx.multiSelect, do: 'toggleSelection' },
      { do: 'select' },
    ],

    EXPAND: [
      { when: (ctx, p) => !ctx.flatNodes.find((n) => n.id === p.id)?.hasChildren, do: 'noop' },
      { do: 'expand' },
    ],

    COLLAPSE: 'collapse',

    TOGGLE_EXPAND: [
      { when: (ctx, p) => ctx.expandedIds.has(p.id), do: 'collapse' },
      { when: (ctx, p) => ctx.flatNodes.find((n) => n.id === p.id)?.hasChildren === true, do: 'expand' },
      { do: 'noop' },
    ],

    TOGGLE_SELECT: [
      { when: (ctx, p) => ctx.selectedIds.has(p.id), do: 'deselect' },
      { do: 'addToSelection' },
    ],

    // --- Payload 없는 이벤트 (키보드) ---

    ARROW_DOWN: [
      { when: (ctx) => !ctx.hasNextNode, do: 'noop' },
      { do: 'focusNext' },
    ],

    ARROW_UP: [
      { when: (ctx) => !ctx.hasPrevNode, do: 'noop' },
      { do: 'focusPrev' },
    ],

    ARROW_RIGHT: [
      { when: (ctx) => ctx.canCollapse, do: 'focusFirstChild' },  // 이미 열려있으면 자식으로
      { when: (ctx) => ctx.canExpand, do: 'expandFocused' },
      { do: 'noop' },
    ],

    ARROW_LEFT: [
      { when: (ctx) => ctx.canCollapse, do: 'collapseFocused' },
      { do: 'focusParent' },
    ],

    ENTER: 'selectFocused',
    SPACE: 'toggleSelectFocused',
    HOME: 'focusFirst',
    END: 'focusLast',
    ASTERISK: 'expandAll',
  },

  // ============ Always ============
  always: [
    // 포커스된 노드가 보이지 않으면 첫 번째 노드로 이동
    {
      when: (ctx) => {
        if (!ctx.focusedId) return false;
        return !ctx.visibleIds.includes(ctx.focusedId);
      },
      do: 'focusFirst',
    },
  ],

  // ============ Effects ============
  effects: [
    {
      watch: (ctx) => ctx.selectedIds,
      change: (ctx, _, curr) => {
        ctx.onSelect?.(curr as Set<string>);
      },
    },
    {
      watch: (ctx) => ctx.expandedIds,
      change: (ctx, _, curr) => {
        ctx.onExpand?.(curr as Set<string>);
      },
    },
    {
      watch: (ctx) => ctx.focusedId,
      enter: (ctx) => {
        // 포커스 변경 시 스크롤 처리 등
        console.log(`Focused: ${ctx.focusedId}`);
      },
    },
  ],

  // ============ Actions ============
  actions: {
    noop: () => {},

    // --- Payload 액션 ---
    focus: (ctx, payload: { id: string }) => {
      ctx.setFocusedId(payload.id);
    },

    select: (ctx, payload: { id: string }) => {
      ctx.setSelectedIds(new Set([payload.id]));
    },

    addToSelection: (ctx, payload: { id: string }) => {
      ctx.setSelectedIds(new Set([...ctx.selectedIds, payload.id]));
    },

    deselect: (ctx, payload: { id: string }) => {
      const next = new Set(ctx.selectedIds);
      next.delete(payload.id);
      ctx.setSelectedIds(next);
    },

    toggleSelection: (ctx, payload: { id: string }) => {
      const next = new Set(ctx.selectedIds);
      if (next.has(payload.id)) {
        next.delete(payload.id);
      } else {
        next.add(payload.id);
      }
      ctx.setSelectedIds(next);
    },

    expand: (ctx, payload: { id: string }) => {
      ctx.setExpandedIds(new Set([...ctx.expandedIds, payload.id]));
    },

    collapse: (ctx, payload: { id: string }) => {
      const next = new Set(ctx.expandedIds);
      next.delete(payload.id);
      ctx.setExpandedIds(next);
    },

    // --- 키보드 액션 (focusedId 기준) ---
    focusNext: (ctx) => {
      const idx = ctx.focusedIndex;
      const next = ctx.visibleNodes[idx + 1];
      if (next) ctx.setFocusedId(next.id);
    },

    focusPrev: (ctx) => {
      const idx = ctx.focusedIndex;
      const prev = ctx.visibleNodes[idx - 1];
      if (prev) ctx.setFocusedId(prev.id);
    },

    focusFirst: (ctx) => {
      const first = ctx.visibleNodes[0];
      if (first) ctx.setFocusedId(first.id);
    },

    focusLast: (ctx) => {
      const last = ctx.visibleNodes[ctx.visibleNodes.length - 1];
      if (last) ctx.setFocusedId(last.id);
    },

    focusFirstChild: (ctx) => {
      const idx = ctx.focusedIndex;
      const child = ctx.visibleNodes[idx + 1];
      if (child && child.parentId === ctx.focusedId) {
        ctx.setFocusedId(child.id);
      }
    },

    focusParent: (ctx) => {
      const node = ctx.focusedNode;
      if (node?.parentId) {
        ctx.setFocusedId(node.parentId);
      }
    },

    expandFocused: (ctx) => {
      if (ctx.focusedId) {
        ctx.setExpandedIds(new Set([...ctx.expandedIds, ctx.focusedId]));
      }
    },

    collapseFocused: (ctx) => {
      if (ctx.focusedId) {
        const next = new Set(ctx.expandedIds);
        next.delete(ctx.focusedId);
        ctx.setExpandedIds(next);
      }
    },

    selectFocused: (ctx) => {
      if (ctx.focusedId) {
        ctx.setSelectedIds(new Set([ctx.focusedId]));
      }
    },

    toggleSelectFocused: (ctx) => {
      if (!ctx.focusedId) return;

      if (ctx.multiSelect) {
        const next = new Set(ctx.selectedIds);
        if (next.has(ctx.focusedId)) {
          next.delete(ctx.focusedId);
        } else {
          next.add(ctx.focusedId);
        }
        ctx.setSelectedIds(next);
      } else {
        ctx.setSelectedIds(new Set([ctx.focusedId]));
      }
    },

    expandAll: (ctx) => {
      const allExpandable = ctx.flatNodes
        .filter((n) => n.hasChildren)
        .map((n) => n.id);
      ctx.setExpandedIds(new Set(allExpandable));
    },
  },
});

// ============================================
// 8. Hook
// ============================================

type UseTreeProps = {
  items: TreeNode[];

  // Controlled
  expandedIds?: Set<string>;
  onExpandedChange?: (ids: Set<string>) => void;
  defaultExpandedIds?: Set<string>;

  selectedIds?: Set<string>;
  onSelectedChange?: (ids: Set<string>) => void;
  defaultSelectedIds?: Set<string>;

  // Options
  multiSelect?: boolean;
};

export function useTree(props: UseTreeProps) {
  const {
    items,
    expandedIds: controlledExpanded,
    onExpandedChange,
    defaultExpandedIds = new Set<string>(),
    selectedIds: controlledSelected,
    onSelectedChange,
    defaultSelectedIds = new Set<string>(),
    multiSelect = false,
  } = props;

  // State
  const [internalExpanded, setInternalExpanded] = useState(defaultExpandedIds);
  const [internalSelected, setInternalSelected] = useState(defaultSelectedIds);
  const [focusedId, setFocusedId] = useState<string | null>(null);

  // Controlled vs Uncontrolled
  const expandedIds = controlledExpanded ?? internalExpanded;
  const selectedIds = controlledSelected ?? internalSelected;

  const setExpandedIds = useCallback(
    (ids: Set<string>) => {
      if (controlledExpanded === undefined) {
        setInternalExpanded(ids);
      }
      onExpandedChange?.(ids);
    },
    [controlledExpanded, onExpandedChange]
  );

  const setSelectedIds = useCallback(
    (ids: Set<string>) => {
      if (controlledSelected === undefined) {
        setInternalSelected(ids);
      }
      onSelectedChange?.(ids);
    },
    [controlledSelected, onSelectedChange]
  );

  // Derived
  const flatNodes = useMemo(() => flattenTree(items), [items]);

  // Context
  const ctx = useMemo<TreeContext>(
    () => ({
      items,
      flatNodes,
      expandedIds,
      selectedIds,
      focusedId,
      multiSelect,
      setExpandedIds,
      setSelectedIds,
      setFocusedId,
    }),
    [items, flatNodes, expandedIds, selectedIds, focusedId, multiSelect, setExpandedIds, setSelectedIds]
  );

  const { send, computed } = useEventMachine(treeMachine, ctx);

  // Keyboard handler
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const keyMap: Record<string, KeyboardEventType> = {
        ArrowDown: 'ARROW_DOWN',
        ArrowUp: 'ARROW_UP',
        ArrowRight: 'ARROW_RIGHT',
        ArrowLeft: 'ARROW_LEFT',
        Enter: 'ENTER',
        ' ': 'SPACE',
        Home: 'HOME',
        End: 'END',
        '*': 'ASTERISK',
      };

      const event = keyMap[e.key];
      if (event) {
        e.preventDefault();
        send(event);
      }
    },
    [send]
  );

  return {
    // State
    expandedIds,
    selectedIds,
    focusedId,
    visibleNodes: computed.visibleNodes,

    // Actions
    send,
    focus: (id: string) => send('FOCUS', { id }),
    select: (id: string, opts?: { ctrlKey?: boolean }) => send('SELECT', { id, ...opts }),
    expand: (id: string) => send('EXPAND', { id }),
    collapse: (id: string) => send('COLLAPSE', { id }),
    toggleExpand: (id: string) => send('TOGGLE_EXPAND', { id }),

    // Props getters
    getRootProps: () => ({
      role: 'tree' as const,
      'aria-multiselectable': multiSelect || undefined,
      tabIndex: 0,
      onKeyDown: handleKeyDown,
      onFocus: () => {
        if (focusedId === null && computed.visibleNodes.length > 0) {
          setFocusedId(computed.visibleNodes[0].id);
        }
      },
    }),

    getNodeProps: (id: string) => {
      const node = computed.visibleNodes.find((n) => n.id === id);
      const isExpanded = expandedIds.has(id);
      const isSelected = selectedIds.has(id);
      const isFocused = focusedId === id;

      return {
        role: 'treeitem' as const,
        'aria-expanded': node?.hasChildren ? isExpanded : undefined,
        'aria-selected': isSelected,
        'aria-level': node ? node.depth + 1 : undefined,
        tabIndex: isFocused ? 0 : -1,
        'data-focused': isFocused || undefined,
        'data-selected': isSelected || undefined,
        onClick: (e: React.MouseEvent) => {
          send('FOCUS', { id });
          send('SELECT', { id, ctrlKey: e.ctrlKey || e.metaKey });
        },
        onDoubleClick: () => {
          send('TOGGLE_EXPAND', { id });
        },
      };
    },

    getExpandButtonProps: (id: string) => ({
      'aria-label': expandedIds.has(id) ? 'Collapse' : 'Expand',
      tabIndex: -1,
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation();
        send('TOGGLE_EXPAND', { id });
      },
    }),
  };
}

// ============================================
// 9. 사용 예시
// ============================================

/*
const treeData: TreeNode[] = [
  {
    id: 'documents',
    label: 'Documents',
    children: [
      { id: 'resume', label: 'Resume.pdf' },
      { id: 'cover-letter', label: 'Cover Letter.docx' },
    ],
  },
  {
    id: 'photos',
    label: 'Photos',
    children: [
      {
        id: 'vacation',
        label: 'Vacation',
        children: [
          { id: 'beach', label: 'Beach.jpg' },
          { id: 'mountain', label: 'Mountain.jpg' },
        ],
      },
      { id: 'profile', label: 'Profile.png' },
    ],
  },
  { id: 'notes', label: 'Notes.txt' },
];

function FileTree() {
  const tree = useTree({
    items: treeData,
    multiSelect: true,
    onSelectedChange: (ids) => console.log('Selected:', [...ids]),
  });

  return (
    <div {...tree.getRootProps()} className="tree">
      {tree.visibleNodes.map((node) => (
        <div
          key={node.id}
          {...tree.getNodeProps(node.id)}
          className="tree-node"
          style={{ paddingLeft: node.depth * 20 }}
        >
          {node.hasChildren && (
            <button {...tree.getExpandButtonProps(node.id)} className="expand-btn">
              {tree.expandedIds.has(node.id) ? '▼' : '▶'}
            </button>
          )}
          <span className="label">{node.label}</span>
        </div>
      ))}
    </div>
  );
}
*/
