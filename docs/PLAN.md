# Vertiche Frontend — PLAN.md

This is the implementation plan and tracking document for the Vertiche Legal Platform Frontend.

---

## 1. Current Sprint

*(No active tasks — Sprint completed)*

---

## 2. Completed

- **Iteration 1 — Scaffold + Layout + Auth + MSW ✅**
  - **Components:** AppLayout, AuthLayout, LoginPage, ToastContainer
  - **Shared:** authStore, uiStore, API client, MSW browser worker
  - **Mock handlers:** auth (login, /me)

- **Iteration 2 — Design System Components ✅**
  - **Components:** Badge, Toast, Skeleton, EmptyState, Pagination, Modal, ProgressBar, SearchInput, Breadcrumbs
  - **Shared:** utils.ts (formatDate, timeAgo, daysRemaining, label maps)

- **Iteration 3 — Dashboard ✅**
  - **Components:** DashboardPage, MetricCard, ComplianceChart (bar chart), RecentAlerts, UpcomingExpirations
  - **Mock handlers:** dashboard/metrics, cumplimiento-por-estado, alertas-recientes, tramites-proximos
  - **Mock data:** 55 tiendas, trámites, 28+ alertas

- **Iteration 4 — Tiendas ✅**
  - **Components:** TiendasPage (list), TiendaDetailPage (header + 4 tabs)
  - **Tabs:** ExpedienteTab, DocumentosTab, AlertasTab, HistorialTab
  - **Mock handlers:** tiendas CRUD, expediente, documentos, alertas, historial per store

- **Iteration 5 — Trámites ✅**
  - **Components:** TramitesPage (global list), TramiteDetailPage (info, observaciones, historial)
  - **Mock handlers:** tramites list with filters, tramite detail

- **Iteration 6 — Alertas ✅**
  - **Components:** AlertasPage (active/silenced tabs), SilenciarModal
  - **Mock handlers:** alertas list, silenciar endpoint, count endpoint

- **Iteration 7 — Documentos ✅**
  - **Components:** DocumentosPage (global list with filters)
  - **Mock handlers:** documentos list, upload

- **Iteration 8 — Trámites refinement ✅**
  - Make mocked tramites have associated documents
  - Tramite detail page: documents section
  - Link tramites asociados in documentos tab and global page
  - Separate expediente into two collapsible sections

- **Iteration 9 — Document Upload & OCR Review ✅**
  - **Components:** DocumentUploadModal, OCRReviewModal, PDFViewer, InlineEdit
  - **Features:** Drag & drop upload, inline document renaming, side-by-side PDF viewer, manual OCR review with confidence highlights
  - **Mock handlers:** extended `/documentos` with `rename`, `ocr-review`, and `upload` (in-memory)

- **Iteration 10 — Editing & Management ✅**
  - **Components:** NuevoTramiteModal, TramiteEditModal, TiendaEditModal
  - **Features:** Create tramites from tienda Expediente, edit tramite details (permanency, dates), edit tienda details, advanced table filtering (dropdowns for geographic states and quick filters)
  - **Mock handlers:** extended `POST /tiendas/:id/tramites`, `PUT /tramites/:id`, `PUT /tiendas/:id`

- **Iteration 11 — Alertas Workflow & UX Refinement ✅**
  - **Components:** AlertasPage, TiendaAlertasTab
  - **Features:** Bulk WhatsApp/Email notifications with visual selection checkboxes, ability to reactivate resolved alerts, debounced expandable search bar for triage, synchronized global/local alert state.
  - **Mock handlers:** `mockAlertas` array direct mutability, extended `GET /api/alertas` with text search support.

---

## 3. Backlog
- Allow column sorting in all tables

All data tables in the application (tiendas list, tramites global, documentos global, alertas) should support ascending and descending sort by clicking column headers. Sortable columns should have a visual indicator (chevron icon) that shows current sort direction. Clicking the same column header again reverses the direction. Clicking a different header resets to ascending for that column. Sort state should be maintained when the user navigates back to the page within the same session. Sorting is done client-side for tables with full data loaded, and passed as query params to the backend for paginated tables.

- User management screen (ADMIN only)

Add a "Usuarios" item to the sidebar, visible only to ADMIN role, linking to `/usuarios`. This page shows a table of all system users with columns: nombre, email, rol (badge), fecha de creación, and acciones. Actions per user: "Editar rol" (opens a small modal with a role selector: ADMIN / OPERATOR / VIEWER) and "Desactivar" (soft delete, with confirmation dialog). At the top of the page, an "Invitar usuario" button opens a modal with fields: nombre, email, and rol. Submitting sends an invite (mocked for now). Deactivated users appear in a separate "Inactivos" tab and can be reactivated. ADMIN cannot deactivate their own account.

- SVG map of Mexico for dashboard compliance visualization

Replace the horizontal bar chart on the dashboard with an SVG map of Mexico showing all 32 states. Each state is colored based on the aggregated compliance level of its tiendas using the existing color scale (dark green >85%, amber 60–85%, dark red <60%, light grey for states with no tiendas). On hover, show a tooltip with: state name, number of tiendas, compliance percentage, and number of critical tramites. Clicking a state navigates to `/tiendas?estado=[nombre]`. State color transitions should be animated with CSS (fill transition 300ms). Use a clean, minimalist SVG with no unnecessary detail — just state outlines with fills. The SVG asset needs to be sourced or built with each state as a separate `<path>` element with a `data-estado` attribute matching the state names used in the rest of the app.

- WebSocket integration for real-time alerts

Replace the 60-second polling for the sidebar alert count and the alert list with a WebSocket connection. On new alert received, update the sidebar badge count, append the alert to the active list if the user is on the alertas page, and show a toast notification. If the WebSocket connection drops, fall back to polling at 60 seconds and show a subtle "reconectando..." indicator in the sidebar. On reconnect, do a full refetch of alerts to catch any missed updates. The WebSocket URL should come from an environment variable.

- OpenAPI client generation

Remove the manually defined types in `src/types/index.ts` and the manually written API functions. Replace them with an auto-generated client using `@hey-api/openapi-ts` pointed at the backend's `openapi.json`. Set up a `generate:api` script in `package.json` that runs the generation. All React Query hooks should continue to work unchanged since they wrap the generated functions. Document the generation command and workflow in the project README.