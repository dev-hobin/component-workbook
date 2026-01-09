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

This is a React component library that implements accessible UI components following W3C APG patterns. The codebase uses a **Core + Shell** architecture pattern that separates pure state logic from React integration.

### Core + Shell Pattern

Each component has two main parts:

**Core** (`src/components/*/core.ts`)
- Pure TypeScript functions with no React dependencies
- State types, state creation, and state update functions
- Keyboard action handlers, option filtering, and query functions
- Side effect types (but not implementations)

**Shell/Index** (`src/components/*/index.tsx`)
- React compound components (Root, Item, Trigger, Panel, etc.)
- Integrates core logic with React hooks and context
- Handles DOM interactions and accessibility attributes

### Component Store System

Located in `src/core/` and `src/shell/`, this system tracks component nodes across the tree:

- **ComponentStore** (`src/core/component-store.ts`): Tracks nodes by `id:role` keys with parent-child relationships
- **useNode**: Registers DOM elements to the store with role and metadata
- **useLogicalNode**: Registers logical nodes without DOM elements
- **useComponentSubscribe**: Subscribe to store changes using `useSyncExternalStore`
- **ParentProvider/useParentId**: Tracks parent-child relationships via React context

### Utility Functions

- `composeRefs`: Merges multiple refs into one
- `mergeProps`: Merges props with special handling for event handlers (compose), className (concat), and style (merge)
- `composeEventHandlers`: Chains event handlers, internal runs first

### Event Machine (src/event-machine)

A stateless declarative event handler pattern. Defines `on` (event handlers), `effects` (value watchers), `computed` (derived values), and `actions`. Used via `useEventMachine` hook which returns `{ send, computed }`.

## Key Dependencies

- React 19 with React Compiler (`babel-plugin-react-compiler`)
- Tailwind CSS v4 via Vite plugin
- `@radix-ui/react-use-controllable-state` for controlled/uncontrolled state
- `@floating-ui/dom` for positioning
- `focus-trap` for focus management

## Patterns

- Components export compound component objects (e.g., `Accordion.Root`, `Accordion.Item`)
- State is lifted to Root via Context, child components access via hooks
- ARIA attributes are managed in Shell components
- Animation uses CSS grid-template-rows trick for height transitions
