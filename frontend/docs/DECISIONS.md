# Vertiche Frontend — DECISIONS.md

Technical and design decisions not explicitly covered by the documentation.

---

### 2026-05-14 — Tailwind CSS v4 over CSS Modules

User explicitly requested Tailwind CSS. Using v4 with `@tailwindcss/vite` plugin and `@theme` block for design tokens in a single `index.css` file.

### 2026-05-14 — DM Serif Display + DM Sans from Google Fonts

Docs suggested candidates: Instrument Serif/DM Serif Display for display, Geist/DM Sans for body. Chose DM Serif Display + DM Sans because both are from the same family (DM), ensuring visual harmony, and both are freely available on Google Fonts without licensing complexity.

### 2026-05-14 — Token-in-memory auth (Zustand store) instead of httpOnly cookie

Docs say "JWT in httpOnly cookie (preferred) or in memory." Since MSW handles auth for MVP and httpOnly cookies require server-side coordination, using in-memory token via Zustand. The token is lost on page refresh (by design for MVP). This can be upgraded to httpOnly cookies when the backend is ready.

### 2026-05-14 — Horizontal bar chart fallback for compliance visualization

The "wow" element (SVG map of Mexico) would require a detailed SVG asset for all 32 states. Using the documented fallback: horizontal bar chart sorted by compliance level, with color coding and click-to-filter behavior. The SVG map can be added in phase 2.

### 2026-05-14 — Types defined manually, not auto-generated from OpenAPI

Docs say types should be generated from `openapi.json`. Since there's no backend yet, types are manually defined in `src/types/index.ts` following the entity definitions in the docs. The `orval` generation command is ready for when the OpenAPI spec is available.

### 2026-05-14 — lucide-react for icons

The docs don't specify an icon library. Chose lucide-react because it's lightweight, tree-shakeable, consistent with the editorial aesthetic (thin, clean strokes), and widely used with React.

### 2026-05-14 — Spanish for all user-facing text

Per user instruction: all UI labels, buttons, placeholders, empty states, toasts, etc. are in Spanish. Code/comments/variable names remain in English.

### 2026-05-14 — MSW `require()` avoided in tramites handler for geographic state filter

The tramites handler's geographic state filter needs to cross-reference tiendas data. Using dynamic import pattern instead of `require()` which isn't available in ESM. For MVP, this filter is simplified.

### 2026-05-14 — Sidebar alert count polling every 60 seconds

Docs specify 60s polling or WebSocket. Implementing polling via React Query's `refetchInterval` for simplicity. WebSocket can be added later without UI changes.

### 2026-06-04 — Documentos global table routes to Tienda detail

Instead of trying to squeeze too much information (like associated trámites) into the global Documentos page table, clicking a row navigates to the specific Tienda's detail page (`/tiendas/:id?tab=documentos`). This keeps the global view uncluttered and routes users to the most contextual place for managing that document's linkages and actions.

### 2026-06-04 — Local Worker for react-pdf

To avoid CORS issues and external CDN dependencies that might block rendering offline or in secure environments, the `react-pdf` worker is bundled locally using Vite's `?url` import strategy (`pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();`). This ensures reliable PDF parsing.

### 2026-06-04 — Quick filters converted to Dropdowns

To ensure URL query param updates do not suffer from stale state/closure bugs (where rapid sequential React updates overwrite each other), the pill buttons in `TramitesPage` were converted to a native select dropdown. This simplifies state management and unifies the UI with the rest of the application's table filters.

### 2026-06-08 — Direct Mutation of Mock Data Array for MSW Sync

To ensure that store-specific alert queries (e.g., `GET /api/tiendas/:id/alertas`) correctly reflect mutations made from the global alerts page (e.g., `POST /api/alertas/:id/silenciar`), the MSW handlers were updated to directly mutate the underlying `mockAlertas` array using `Object.assign` or direct reassignment, rather than maintaining localized mutable copies. This enables immediate state synchronicity across the app.

### 2026-06-08 — Debounced Expandable Search + Keep Previous Data

To maintain the "wow" aesthetic of the clean UI while offering powerful bulk triage capabilities, the search function in the Global Alertas page was hidden behind an expandable icon interaction. To prevent the UI from jumping heavily on each keystroke, the input state was separated from the query parameter and debounced by 300ms, combined with React Query's `placeholderData: keepPreviousData` to ensure seamless transitions.

### 2026-06-08 — Dynamic SVG Parsing for Map over Static Component

To implement the interactive map without artificially inflating the JavaScript bundle size by ~160KB with a massive static SVG file, the map is loaded dynamically via `fetch('/mx.svg')` and parsed using `DOMParser`. The extracted paths are then mapped into reactive `<path>` elements. This keeps the initial load lean while granting full React-level interactivity (hover, click, styling) over the SVG paths.

### 2026-06-08 — Shared Layout Sizing Constants

Extracted `MAP_CONTAINER_CLASSES` to a shared constant within `MexicoMap.tsx` and applied it to the alternate list view in `DashboardPage.tsx`. This ensures that toggling between the map and list views feels perfectly stable with no layout shifting, establishing a single source of truth for potential future dimensional changes.

### 2026-06-08 — Centralized MSW Token Parsing for Operator Scoping

To enforce operator-scoped data visibility purely in the frontend for MVP, a centralized `getUserFromRequest` utility was implemented for MSW handlers. It decodes the mock Bearer token to identify the acting user and their assigned store IDs. All handlers intercept requests and slice their static mock arrays based on this user context, ensuring `OPERATOR` roles inherently see restricted data without needing distinct API routes.

### 2026-06-08 — Operator Filter Visibility and "Unassigned" Option

The operator filter in the Tiendas list was restricted to `ADMIN` roles instead of both `ADMIN` and `VIEWER` to match the current mock user definitions, as a `VIEWER` mock role was not fully built out. An explicitly handled "Sin asignar" (Unassigned) option was also added to the filter, which dynamically aggregates all assigned store IDs across all operators in the mock database and returns the inverse selection.

### 2026-06-08 — Card-Based Layout over Standard Tables for Users

Although the initial project requirements specified a "table with columns" for the global `UsuariosPage`, it was decided during implementation to replace the `<table>` structure with a clean, row-card layout. This decision reduces visual clutter (removing dense table headers), aligns the UX closely with the established design language of the `AlertasPage`, and creates a tighter grouping of metadata beside primary identifiers (e.g., placing the creation date and assigned store counts directly inline with the user's email).

### 2026-06-08 — Operator Performance Timeline Design

The initial plan called for a standard list of 20 timeline items for the operator's recent activity. To prevent visual clutter and maintain the elegant aesthetic of the application, this was adapted into a sleeker, card-less design grouped by explicit date separators. Additionally, an incremental "Cargar más" feature (loading 5 items at a time) was implemented to prevent overwhelming the profile UI instead of loading all 20 items statically at once.
