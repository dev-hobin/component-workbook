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

This is a React component library that implements accessible UI components following W3C APG patterns. The codebase uses a **Machine + Shell** architecture pattern that separates pure state logic from React integration.

### Machine + Shell Pattern

Each component has two main parts:

**Machine** (`src/components/*/machine.ts`)
- Pure TypeScript with no React dependencies
- Defines input, events, computed, and action types
- Uses `createMachine` from `controlled-machine` package
- Integrates via `useMachine` hook from `controlled-machine/react`

**Shell/Index** (`src/components/*/index.tsx`)
- React compound components (Root, Item, Trigger, Content, etc.)
- Integrates machine via `useMachine` hook which returns `{ send, computed }`
- Handles DOM interactions and accessibility attributes

```ts
// Example: machine.ts
export const accordionMachine = createMachine<{
  input: AccordionInput
  events: AccordionEvents
  computed: AccordionComputed
  actions: AccordionActions
}>({
  computed: {
    expandedSet: (input) => new Set(input.value),
  },
  on: {
    TOGGLE: 'toggle',
    EXPAND: 'expand',
  },
  actions: {
    toggle: (context, payload) => { /* ... */ },
  },
})
```

### Primitives (`src/primitives/`)

Component infrastructure for tracking nodes across the tree:

- **NodeStore** (`node-store.ts`): Tracks nodes by `id:role` keys with parent-child relationships
- **useNode** (`use-node.ts`): Registers DOM elements to the store with role and metadata
- **useStoreSubscribe** (`use-store-subscribe.ts`): Subscribe to store changes using `useSyncExternalStore`
- **ParentProvider/useParentId** (`use-parent-context.tsx`): Tracks parent-child relationships via React context

### Utility Functions (`src/utils/`)

- `compose-refs`: Merges multiple refs into one
- `merge-props`: Merges props with special handling for event handlers (compose), className (concat), and style (merge)
- `compose-event-handlers`: Chains event handlers, external runs first and can call `preventDefault()` to cancel internal

### Hooks (`src/hooks/`)

- `use-latest-ref`: Ref that always holds the latest value
- `use-presence`: Animation presence tracking with transition states
- `use-stable-callback`: Stable callback reference that always calls latest version

## Key Dependencies

- React 19 with React Compiler (`babel-plugin-react-compiler`)
- Tailwind CSS v4 via Vite plugin
- `controlled-machine` for state machine logic
- `@radix-ui/react-use-controllable-state` for controlled/uncontrolled state
- `@floating-ui/dom` for positioning
- `focus-trap` for focus management

## Patterns

- Components export compound component objects (e.g., `Accordion.Root`, `Accordion.Item`)
- State is lifted to Root via Context, child components access via hooks
- Context passed to machine includes state, setters, options, and lazy helper functions (e.g., `getEnabledItemIds`)
- ARIA attributes are managed in Shell components
- Animation uses CSS grid-template-rows trick for height transitions
