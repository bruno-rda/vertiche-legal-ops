# AGENTS.md — Vertiche Legal Platform Frontend

Operational guide for AI agents making changes to this codebase. Read this entirely before writing any code.

---

## 1. Source of Truth

| Document                    | Purpose                                                                                                                                       |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `vertiche-frontend-docs.md` | Product requirements, entity definitions, roles, UI/UX principles, business rules. **Read before any feature work.**                          |
| `DECISIONS.md`              | All technical and design decisions made during implementation that are **not** explicit in the docs. Check here before re-deciding something. |
| `PLAN.md`                   | Implementation iterations and current MVP scope.                                                                                              |
| `AGENTS.md`                 | This file. Coding standards and agent workflow.                                                                                               |

> **Rule:** If you make a decision not covered in the above docs, add it to `DECISIONS.md` with the date and your reasoning.

---

## 2. Tech Stack

| Concern      | Tool                                               |
| ------------ | -------------------------------------------------- |
| Framework    | React 19 + TypeScript (`~6.0.2`)                   |
| Build        | Vite 8                                             |
| Styling      | **Tailwind CSS v4** via `@tailwindcss/vite` plugin |
| Routing      | React Router v7                                    |
| Server state | TanStack Query v5                                  |
| Client state | Zustand v5                                         |
| Forms        | React Hook Form + Zod                              |
| Animations   | Framer Motion                                      |
| Icons        | lucide-react                                       |
| Mocking      | MSW v2 (browser mode)                              |

**Do not introduce new libraries** without a strong reason. Document any addition in `DECISIONS.md`.

---

## 3. Language Policy — Strict

| Context                                                                                               | Language    |
| ----------------------------------------------------------------------------------------------------- | ----------- |
| All UI text (labels, buttons, placeholders, empty states, toasts, errors, table headers, page titles) | **Spanish** |
| Code: variable names, function names, types, comments, prop names                                     | **English** |
| Console logs and thrown errors in logic code                                                          | English     |

This rule is **non-negotiable**. Any user-visible string must be in Spanish, including aria-labels and title attributes on interactive elements.

---

## 4. Project Structure

```
src/
├── api/
│   └── client.ts           # Typed fetch wrapper; auth interceptors live here
├── components/             # Shared, stateless UI primitives (no API calls)
├── layouts/
│   ├── AppLayout.tsx       # Authenticated shell: sidebar + header
│   └── AuthLayout.tsx      # Unauthenticated shell: centered card
├── lib/
│   └── utils.ts            # Pure utility functions and Spanish label maps
├── mocks/
│   ├── browser.ts          # MSW worker setup
│   ├── handlers.ts         # Aggregates all handler arrays
│   ├── data/               # In-memory mock datasets (source of truth for dev)
│   └── handlers/           # MSW route handlers per domain
├── pages/                  # Route-level components, one folder per feature
├── stores/
│   ├── authStore.ts        # Auth state (user, token, isAuthenticated)
│   └── uiStore.ts          # UI state (sidebar collapse, toast queue)
└── types/
    └── index.ts            # Domain types mirroring backend entities
```

---

## 5. Design System

All styling uses **Tailwind CSS v4 with custom design tokens** defined in `src/index.css` under `@theme`. Never use raw hex values or hardcoded colors in components — always use the design tokens.

### Color Tokens

```
Backgrounds:   surface, surface-card
Borders:       border, border-strong
Text:          text-primary, text-secondary, text-muted
Accent:        accent (#111111), accent-hover
Status:        success, success-light, warning, warning-light, danger, danger-light
Neutral:       neutral-light (for hover backgrounds, skeleton, tag backgrounds)
Info:          info, info-light
Blue:          blue, blue-light (used for in-progress states only)
```

### Typography

- **Display headings** (page titles): `font-display` utility class → DM Serif Display
- **Body** (all other text): DM Sans (set globally via `html`)
- **Monospace**: `font-mono` utility class → JetBrains Mono

### Compliance Color Coding

This pattern is **systemic** and must be consistent everywhere:

| Threshold | Color                               |
| --------- | ----------------------------------- |
| ≥ 85%     | `text-success` / `bg-success-light` |
| 60–84%    | `text-warning` / `bg-warning-light` |
| < 60%     | `text-danger` / `bg-danger-light`   |

The `ProgressBar` component implements this automatically. Use it.

### Shadows & Elevation

- Cards at rest: `shadow-card`
- Cards on hover: `shadow-card-hover`
- Modals: `shadow-modal`

---

## 6. Component Conventions

### Shared Components (`src/components/`)

These are **pure UI primitives** — they receive all data via props, make no API calls, and hold no state except local UI state (e.g., hover).

- **`Badge`**: Use for all status chips. Pass a `variant` matching a domain type (`TramiteEstado`, `AlertaSeveridad`, etc.) and the label resolves automatically from the label maps in `utils.ts`. Never hardcode a status string.
- **`EmptyState`**: Use for all empty/error/no-results states. Three variants: `no-data`, `no-results`, `error`.
- **`Skeleton` / `TableSkeleton`**: Use during loading. The `TableSkeleton` matches the column count of the table it replaces.
- **`SearchInput`**: Built-in 300ms debounce. Use for all text search inputs.
- **`Pagination`**: Handles ellipsis logic internally. Always driven by `page` and `total_pages` from the API response.
- **`Modal`**: Use for confirmations and short forms. Has `sm`, `md`, `lg` sizes. Closes on `Escape` and backdrop click.
- **`Toast`**: Never render directly. Use `useUIStore(s => s.addToast)` to trigger.

### Page Components (`src/pages/`)

- Each page has its own folder: `src/pages/FeatureName/FeaturePage.tsx`
- Pages own their data fetching via `useQuery` / `useMutation`.
- Pages own their filter state via `useSearchParams` (URL is the source of truth for filters/pagination — this enables deep linking and browser back/forward).
- Pages are **not** responsible for layout chrome (sidebar, header) — that is `AppLayout`.

---

## 7. Data Fetching Rules

### TanStack Query

- All server state lives in React Query. **Do not** store fetched data in Zustand.
- Query keys follow the pattern: `['entity', id?, 'sub-entity?', filters?]`
  - Example: `['tienda', id, 'expediente']`
- Default `staleTime`: 30,000ms (set in `App.tsx` `QueryClient`).
- Mutations must call `queryClient.invalidateQueries` on success for relevant keys.
- On mutation success, always call `addToast({ type: 'success', message: '...' })` with a Spanish message.

### API Client (`src/api/client.ts`)

- All requests go through `api.get<T>()`, `api.post<T>()`, etc. — never use raw `fetch`.
- Auth token is injected automatically from `useAuthStore.getState().token`.
- A 401 response automatically logs out and redirects to `/login`.
- The `baseUrl` comes from `VITE_API_URL` in `.env`.

---

## 8. Mock Service Worker (MSW)

### When mocks are active

MSW is enabled when `.env` has `VITE_USE_MOCKS=true`. The service worker is registered in `src/main.tsx` before React mounts.

### Mock data (source of truth in dev)

All generated data lives in `src/mocks/data/`. When adding new fields to an entity type in `src/types/index.ts`, **you must also update the corresponding mock data file** to include that field. Otherwise the UI will silently receive `undefined`.

### Handler conventions

- Handlers are grouped per domain in `src/mocks/handlers/` and aggregated in `src/mocks/handlers.ts`.
- All URL patterns use `*/api/...` with a wildcard prefix to match regardless of `baseUrl`.
- Use **ESM imports only** — `require()` is not available in this ESM project. If a handler needs data from another domain's file, import it at the top of the file.
- Paginated handlers must return the shape `{ data, total, page, page_size, total_pages }` to match `PaginatedResponse<T>`.

### Mock credentials (for testing)

| Role     | Email                          | Password      |
| -------- | ------------------------------ | ------------- |
| ADMIN    | `ana.garcia@vertiche.com`      | `admin123`    |
| OPERATOR | `carlos.mendoza@vertiche.com`  | `operator123` |
| VIEWER   | `maria.fernandez@vertiche.com` | `viewer123`   |

---

## 9. State Management

### Zustand stores

| Store       | Holds                                                         |
| ----------- | ------------------------------------------------------------- |
| `authStore` | `user`, `token`, `isAuthenticated`, `login()`, `logout()`     |
| `uiStore`   | `sidebarCollapsed` (persisted to `localStorage`), toast queue |

**Do not** add new Zustand stores for server data — that is React Query's job. New client-side global state (e.g., a user preference) can go in `uiStore`.

### URL as state for filters

All filter, sort, and pagination state on list pages lives in `useSearchParams`. This ensures:

- The URL is shareable and deep-linkable.
- Browser back/forward works correctly.
- Filters survive a page refresh.

Pattern used in every list page:

```typescript
const [sp, setSp] = useSearchParams();
const up = (key: string, value: string) => {
  const p = new URLSearchParams(sp);
  value ? p.set(key, value) : p.delete(key);
  if (key !== 'page') p.set('page', '1'); // reset page on filter change
  setSp(p);
};
```

---

## 10. Routing & Auth Guards

Defined in `src/App.tsx`:

- `ProtectedRoute`: redirects to `/login` if not authenticated.
- `PublicRoute`: redirects to `/dashboard` if already authenticated.
- Auth state is checked from `useAuthStore(s => s.isAuthenticated)`.
- Auth is **in-memory only** — it is lost on page refresh (intentional for MVP; see `DECISIONS.md`).

Route structure:

```
/login                              → LoginPage (PublicRoute + AuthLayout)
/dashboard                          → DashboardPage
/tiendas                            → TiendasPage (list)
/tiendas/:id                        → TiendaDetailPage (4-tab detail)
/tiendas/:id/tramites/:tramiteId    → TramiteDetailPage
/tramites                           → TramitesPage (global list)
/alertas                            → AlertasPage
/documentos                         → DocumentosPage
```

---

## 11. TypeScript Rules

- **Strict mode is on.** `noImplicitAny`, `strictNullChecks`, and all strict flags apply.
- Never use `any`. Use `unknown` for untyped external data, then narrow.
- All domain entities are in `src/types/index.ts`. Do not duplicate type definitions in component files.
- When adding new entity fields, update `src/types/index.ts` first, then mock data, then the UI.
- Unused imports are **errors** (`noUnusedLocals` behavior enforced by TypeScript). Clean them up before finishing.
- The `ignoreDeprecations: "6.0"` flag is set to silence the `baseUrl` deprecation from TypeScript 6 — do not remove it.

---

## 12. Verification Checklist

Before considering any change done, verify:

- [ ] `npx tsc -b --noEmit` passes with zero errors (warnings are acceptable only if documented).
- [ ] All new user-visible strings are in Spanish.
- [ ] New entity fields are reflected in both `src/types/index.ts` and the relevant `src/mocks/data/` file.
- [ ] New API endpoints have a corresponding MSW handler in `src/mocks/handlers/`.
- [ ] New handlers are exported and aggregated in `src/mocks/handlers.ts`.
- [ ] Mutations invalidate the correct React Query keys.
- [ ] Mutations trigger a Spanish toast on success and handle errors gracefully.
- [ ] Any new design decision is added to `DECISIONS.md`.
- [ ] No raw hex colors or hardcoded font families in component files — use design tokens.
- [ ] Role-gating applied where the action is ADMIN-only.

---

## 13. What Not To Do

- **Do not** call `window.location.reload()` as a primary error recovery mechanism — use React Query's `refetch`.
- **Do not** store server-fetched data in Zustand.
- **Do not** use `require()` — this is a pure ESM project.
- **Do not** add `console.log` debug statements in committed code.
- **Do not** use raw hardcoded colors (`#AABBCC`, `red`, etc.) — use design tokens.
- **Do not** add Tailwind `@apply` directives — use utility classes directly in JSX or `@utility` blocks in `index.css` for truly reusable animations/utilities.
- **Do not** bypass the `api` client with raw `fetch` calls.
- **Do not** modify `src/index.css` design tokens without considering the cascading visual impact across the entire app.
