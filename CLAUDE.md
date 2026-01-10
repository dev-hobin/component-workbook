# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev        # Start dev server
pnpm build      # Type check + production build
pnpm lint       # Run ESLint
pnpm format     # Format with Prettier
```

## Architecture

This is a React component library that implements accessible UI components following W3C APG patterns. The codebase uses a **Machine + Shell** architecture pattern that separates pure state logic from React integration.

### Machine + Shell Pattern

Each component has two main parts:

**Machine** (`src/components/*/machine.ts`)
- Pure TypeScript with no React dependencies
- Defines event types, context types, and action handlers
- Uses `createEventMachine` from `src/event-machine`
- Conditional logic via `on` handlers with `when` guards
- Side effects via `effects` (watch-based triggers)

**Shell/Index** (`src/components/*/index.tsx`)
- React compound components (Root, Item, Trigger, Panel, etc.)
- Integrates machine via `useEventMachine` hook which returns `{ send, computed }`
- Handles DOM interactions and accessibility attributes

### Event Machine (`src/event-machine`)

A stateless declarative event handler pattern:
- `computed`: Derived values from context
- `on`: Event → conditional actions (with `when` guards)
- `effects`: Watch-based side effects with `enter`/`exit`/`change` callbacks
- `always`: Auto-evaluated rules on context change
- `actions`: Named action implementations

```ts
// Example: machine.ts
export const accordionMachine = createEventMachine<Context, Events, Computed, Actions>({
  on: {
    TOGGLE: [
      { when: (ctx) => ctx.disabled, do: 'noop' },
      { when: (ctx, { itemId }) => ctx.expandedIds.has(itemId), do: 'collapse' },
      { do: 'expand' },
    ],
  },
  effects: [{ watch: (ctx) => ctx.focusedId, change: (ctx) => { /* focus element */ } }],
  actions: { expand: (ctx, payload) => { /* ... */ } },
})
```

### Primitives (`src/primitives/`)

Component infrastructure for tracking nodes across the tree:

- **ComponentStore** (`component-store.ts`): Tracks nodes by `id:role` keys with parent-child relationships
- **useNode** (`use-node.ts`): Registers DOM elements to the store with role and metadata
- **useComponentSubscribe** (`use-component-subscribe.ts`): Subscribe to store changes using `useSyncExternalStore`
- **ParentProvider/useParentId** (`use-parent-context.tsx`): Tracks parent-child relationships via React context

### Utility Functions (`src/utils/`)

- `compose-refs`: Merges multiple refs into one
- `merge-props`: Merges props with special handling for event handlers (compose), className (concat), and style (merge)
- `compose-event-handlers`: Chains event handlers, internal runs first

### Hooks (`src/hooks/`)

- `use-latest-ref`: Ref that always holds the latest value
- `use-presence`: Animation presence tracking with transition states
- `use-stable-callback`: Stable callback reference that always calls latest version

## Key Dependencies

- React 19 with React Compiler (`babel-plugin-react-compiler`)
- Tailwind CSS v4 via Vite plugin
- `@radix-ui/react-use-controllable-state` for controlled/uncontrolled state
- `@floating-ui/dom` for positioning
- `focus-trap` for focus management

## Patterns

- Components export compound component objects (e.g., `Accordion.Root`, `Accordion.Item`)
- State is lifted to Root via Context, child components access via hooks
- Context passed to machine includes state, setters, options, and lazy helper functions (e.g., `getEnabledItemIds`)
- ARIA attributes are managed in Shell components
- Animation uses CSS grid-template-rows trick for height transitions
