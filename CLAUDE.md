# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev        # Start dev server
pnpm build      # Type check + production build
pnpm lint       # Run ESLint
pnpm format     # Format with Prettier
pnpm test       # Run Vitest tests
```

## Architecture

This is a React component library that implements accessible UI components following W3C APG patterns. Each component uses **hooks + direct functions** for state management — no external state machine library.

### Component Structure

Each component lives in `src/components/*/index.tsx` as a single file:

- React compound components (Root, Item, Trigger, Content, etc.)
- State managed via `useState` + `useControllableState` in Root
- Logic as inline functions passed through React Context
- DOM effects via `useEffect`/`useLayoutEffect`
- ARIA attributes managed directly in component props

```ts
// Example: accordion Root pattern
function Root(props) {
  const [value, setValue] = useControllableState(...)
  const expandedSet = useMemo(() => new Set(value), [value])

  const toggle = (itemId: string) => {
    // direct state mutation logic
  }

  // Context provides: toggle, expandedSet, etc.
}
```

### Primitives (`src/primitives/`)

Component infrastructure for tracking nodes across the tree:

- **NodeStore** (`node-store.ts`): Tracks nodes by `id:role` keys with parent-child relationships. Supports `updateMeta` for dynamic meta updates and `getNodesByRoleInDomOrder` for DOM-ordered queries.
- **useNode** (`use-node.ts`): Registers DOM elements to the store with role and metadata. Auto-syncs meta changes via `useEffect`.
- **useStoreSubscribe** (`use-store-subscribe.ts`): Subscribe to store changes using `useSyncExternalStore`
- **ParentProvider/useParentId** (`use-parent-context.tsx`): Tracks parent-child relationships via React context
- **DismissableLayer** (`dismissable-layer.tsx`): Global layer stack for escape key and outside click handling

### Utility Functions (`src/utils/`)

- `compose-refs`: Merges multiple refs into one
- `merge-props`: Merges props with special handling for event handlers (compose), className (concat), and style (merge)
- `compose-event-handlers`: Chains event handlers — `overrideHandler` runs first, can call `preventDefault()` to cancel `originalHandler`

### Hooks (`src/hooks/`)

- `use-latest-ref`: Ref that always holds the latest value
- `use-presence`: Animation presence tracking with transition states
- `use-highlight`: Index-based highlight navigation (`useHighlight(count, { loop? })` → `{ index, set, next, prev, first, last, clear }`). Used by Menu, Combobox, Tree. `loop` wraps at boundaries; `index=-1` auto-resolves (`next→0`, `prev→last`).
- `use-character-search`: Typeahead search with 500ms buffer (`useCharacterSearch(getItems, onMatch, startIndex?)` → `(char) => void`). Used by Menu and Tree for keyboard character navigation.

## Key Dependencies

- React 19 with React Compiler (`babel-plugin-react-compiler`)
- Tailwind CSS v4 via Vite plugin
- `@radix-ui/react-use-controllable-state` for controlled/uncontrolled state
- `@floating-ui/dom` for positioning
- `focus-trap` for focus management

## Patterns

- Components export compound component objects (e.g., `Accordion.Root`, `Accordion.Item`)
- State is lifted to Root via Context, child components access via hooks
- Root contains all state (`useState`/`useControllableState`) and action functions
- NodeStore queries replace event payload data passing — functions access store directly
- ARIA attributes are managed directly in component props
- Animation uses CSS grid-template-rows trick for height transitions
