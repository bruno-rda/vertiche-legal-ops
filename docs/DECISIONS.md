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
