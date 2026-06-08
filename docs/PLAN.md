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

- **Iteration 12 — Dashboard Map Visualization ✅**
  - **Components:** MexicoMap, MapTooltip
  - **Features:** Interactive SVG map of Mexico with 32 states colored by compliance level. Custom tooltip showing state metrics. Toggle view between map and list in the dashboard. Shared layout dimensions extracted for easy maintainability.
  - **Mock handlers:** Used existing `cumplimiento-por-estado` mock data.

- **Iteration 13 — Operator Scoping & Profiles ✅**
  - **Components:** ProfilePage, EmptyState
  - **Features:** Operator-scoped data visibility across all global views. Context-aware empty states for unassigned operators. Read-only user profile page with assigned stores summary. Admin-only "Operador encargado" filter in the Tiendas list including a "Sin asignar" option.
  - **Mock handlers:** Centralized token parsing (`getUserFromRequest`) to auto-filter `tiendas`, `tramites`, `alertas`, `documentos`, and `dashboard` data based on the caller's `tiendas_asignadas`.

- **Iteration 14 — User Management & Store Assignment ✅**
  - **Components:** UsuariosPage, UsersTable, InviteUserModal, ProfilePage (StoreAssignment, StoreSummary)
  - **Features:** Comprehensive user list with a clean, card-based layout (replacing standard tables), role-based badges, and soft-delete/permanent delete capabilities. Implemented an interactive geographic state-based store assignment interface for admins in the operator profile, complete with a sticky save/discard bar and computed changes summary. Added a collapsible read-only store assignment summary grouped by geographic state.
  - **Mock handlers:** User CRUD (`GET /usuarios`, `POST /usuarios`, `PUT /usuarios/:id/status`, `DELETE /usuarios/:id`), and profile assignment mutations (`PUT /usuarios/:id/tiendas`).

- **Iteration 15 — Operator Performance Metrics ✅**
  - **Components:** OperatorPerformance, ProfilePage
  - **Features:** A new performance dashboard within the Operator's profile displaying 5 key metrics with trend indicators across selectable time ranges (30 days, current month, 90 days). Added a visually sleek, chronological "Actividad Reciente" timeline with dynamic links to stores and procedures.
  - **Mock handlers:** Added `GET /api/usuarios/:id/performance` which generates pseudo-random but deterministic data based on the selected user ID and time range.

---

## 3. Backlog
- Allow column sorting in all tables

All data tables in the application (tiendas list, tramites global, documentos global, alertas) should support ascending and descending sort by clicking column headers. Sortable columns should have a visual indicator (chevron icon) that shows the current sort direction. Clicking the same column toggles direction. Clicking a different column resets to ascending for that column. Sort state is maintained within the session when navigating back to the page. For paginated tables, sort params are passed to the backend as query parameters. For fully client-side loaded tables, sorting is handled in the browser.

- WebSocket integration for real-time alerts

Replace the 60-second polling for the sidebar alert count and the alert list with a WebSocket connection. On receiving a new alert, update the sidebar badge count, append the alert to the active list if the user is currently on the alertas page, and show a toast notification with the alert message and a link to the affected tienda. If the WebSocket connection drops, fall back silently to 60-second polling and show a subtle "Reconectando..." indicator in the sidebar footer. On reconnect, do a full refetch of alerts to catch any missed updates. The WebSocket URL comes from an environment variable. Operator-scoped users should only receive WebSocket events for their assigned tiendas.

- OpenAPI client generation

Remove manually defined types in `src/types/index.ts` and manually written API functions. Replace with an auto-generated client using `@hey-api/openapi-ts` pointed at the backend's `openapi.json`. Add a `generate:api` script to `package.json`. All existing React Query hooks should continue working unchanged since they wrap the generated functions. Document the generation command and workflow in the README. This task should be done last as it touches the entire data layer.