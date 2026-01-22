# Agent Guidance for `webapp`

This repository is a Next.js App Router project with Supabase utilities and a small UI component library. Follow the conventions below to keep changes consistent and safe.

---

## 1) Quick Commands

### Install
- `npm install`

### Dev Server
- `npm run dev`

### Build
- `npm run build`

### Start (prod)
- `npm run start`

### Lint
- `npm run lint`

### Tests
- No test runner is configured in `package.json`.
- There is no single-test command. If tests are added later, document the runner here.

---

## 2) Project Layout (high level)

- `app/` — Next.js App Router routes and layouts
- `components/` — UI components (`components/ui`) and layout elements (`components/layout`)
- `utils/` — Supabase client/server helpers
- `lib/` — shared types and data helpers

---

## 3) TypeScript & React Conventions

### General
- TypeScript is `strict: true` (see `tsconfig.json`). Keep types explicit and safe.
- Prefer typed objects and `type` aliases for data shapes (`type Foo = { ... }`).
- Avoid `any` and type suppression (`as any`, `@ts-ignore`, `@ts-expect-error`).

### React Components
- Most UI components are functional components using `React.FC`.
- Use `useMemo`, `useCallback`, `useEffect` for derived values and handlers when needed.
- Keep component logic in the same file as the component unless reused.
- Use `'use client'` only in client components.

### Data Fetching
- Supabase client helpers live under `utils/supabase/*`.
- Client pages typically call `createClient()` inside components.
- Keep role-based filtering in the query layer (see `app/(dashboard)/shops/page.tsx`).

---

## 4) Styling & UI Patterns

### Styling Approach
- CSS Modules are used for shared UI components (e.g., `components/ui/Button.tsx`).
- Pages often use inline `style={{ ... }}` blocks for layout and spacing.
- Prefer existing CSS variables for colors: `var(--primary)`, `var(--border)`, `var(--muted-foreground)`, `var(--foreground)`.

### Responsiveness
- Tables use an `overflowX: 'auto'` wrapper.
- For small screens, inline styles with `flexWrap`, `gap`, and min widths are common.
- When adding mobile responsiveness, prefer small, targeted changes rather than refactors.

---

## 5) Imports & Pathing

- Use absolute path aliases: `@/components/...`, `@/utils/...`, `@/lib/...`.
- Group imports by external first, then internal (`next`, `react`, then `@/...`).
- Keep import order stable within a file.

---

## 6) Naming & Structure

- Files and components are `PascalCase` for components, `camelCase` for variables.
- React props interfaces are usually `InterfaceNameProps` or `type NameProps`.
- `handleX` prefix is used for event handlers.
- `setX` is used for state setters.

---

## 7) Error Handling

- Favor user-visible feedback for errors (e.g., toasts) in UI actions.
- Avoid empty `catch` blocks. Handle errors or rethrow.
- Where possible, keep `try/catch/finally` for async flows that set loading state.

---

## 8) UI Feedback & Loading

- Use the `LoadingIndicator` component for initial page loads.
- Use `useToast()` for success/error notifications instead of `alert()`.

---

## 9) Lint/Formatting

- ESLint is configured via `eslint.config.mjs` using Next.js presets.
- There is no dedicated formatter configured; keep formatting consistent with nearby code.

---

## 10) Cursor/Copilot Rules

- No `.cursorrules`, `.cursor/rules/`, or `.github/copilot-instructions.md` files exist in this repo.

---

## 11) Notes for Agents

- Prefer small, isolated changes. Avoid refactors unless requested.
- Do not add new dependencies unless explicitly asked.
- If adding tests in the future, update this file with the test runner and single-test command.

---

(Approx. 150 lines per request.)
