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

---

## 3. Backlog
- User management screen with store assignment (ADMIN only)

Replace the previously planned basic user management screen with a richer version. The `/usuarios` page is accessible only to ADMIN and shows a table of all users with columns: nombre, email, rol (badge), tiendas asignadas (count badge, only meaningful for OPERATOR role), fecha de creación, and acciones. Actions per row: "Ver perfil" and "Desactivar". Deactivated users live in an "Inactivos" tab and can be reactivated. ADMIN cannot deactivate their own account. An "Invitar usuario" button at the top opens a modal with nombre, email, and rol fields.

Clicking "Ver perfil" on any user opens their profile page (see operator profile item). For OPERATOR rows, the tiendas count badge is a clickable link that jumps directly to the store assignment section of their profile.

The table should support filtering by rol and searching by nombre or email. Empty state when no users exist should be friendly and direct ("Aún no hay usuarios. Invita al primero.").

- Store assignment interface in operator profile (ADMIN view)

Inside the operator's profile page, a dedicated "Tiendas asignadas" section allows the ADMIN to manage which stores the operator is responsible for. The interaction must feel clean and not overwhelming given the scale (thousands of stores).

The assignment flow works in two steps. First, a state selector: a visual list of Mexican states, each showing how many stores exist in that state and how many are already assigned to this operator. States with partial assignment show a distinct visual treatment (e.g. a partial fill indicator). Clicking a state expands it inline to show the individual tiendas in that state as a checklist. Each tienda row shows its nombre, municipio, and current compliance badge. The ADMIN can check/uncheck individual tiendas. A "Seleccionar todo el estado" checkbox at the top of each expanded state allows bulk selection.

Changes are not saved until the ADMIN clicks a "Guardar cambios" button that appears as a sticky bar at the bottom of the section when there are unsaved changes. The sticky bar also shows a summary of pending changes ("Agregando 12, eliminando 3"). Clicking "Descartar" reverts to the last saved state. On save, a success toast confirms and the sticky bar disappears.

If the operator has no stores assigned yet, the section shows a friendly empty state ("Este operador aún no tiene tiendas asignadas. Selecciona un estado para comenzar.") with the state selector visible immediately below.

- Assigned stores summary in operator profile

In both the ADMIN view of an operator's profile and the operator's own profile view, show a read-only "Tiendas asignadas" section that summarizes the stores they are responsible for. Stores are grouped by state, with each state showing as a collapsible row: state name, store count, and a compliance summary (e.g. "14 vigentes, 3 por vencer, 1 crítica"). Expanding a state reveals the individual tienda rows with nombre, municipio, and compliance badge. Each tienda name is a clickable link that navigates to that tienda's detail page.

If the operator has no assigned stores, show a clear empty state. For ADMIN viewing this section, the edit assignment button ("Editar asignación") appears at the top right of this section and scrolls to or activates the assignment interface. For the operator viewing their own profile, this section is fully read-only with no edit controls visible.

The total store count should be prominently displayed at the top of the section (e.g. "47 tiendas asignadas en 5 estados").

- Operator performance metrics

A "Desempeño" section appears in the operator profile page, visible to ADMIN (for any operator) and to the operator themselves (their own profile only). At the top of the section, a time range selector with three options: "Últimos 30 días", "Mes en curso", and "Últimos 90 días". Changing the range updates all metrics instantly.

The metrics displayed are:

* Documentos cargados: total documents uploaded in the period
* Trámites resueltos: tramites that moved to `vigente` state during the period while under this operator's responsibility
* Alertas atendidas: alerts that were silenced or resolved during the period for this operator's tiendas
* Tiempo promedio de resolución: average time in days between an alert being generated and being resolved, for this operator's tiendas
* Trámites vencidos bajo responsabilidad: tramites that reached `vencido` state during the period while this operator was assigned to the tienda

Each metric is displayed as a card with a large number, a label, and a subtle trend indicator comparing to the previous equivalent period (e.g. if viewing last 30 days, compare to the 30 days before that). Trend up is green for positive metrics (documentos cargados, trámites resueltos, alertas atendidas) and red for negative ones (trámites vencidos, tiempo promedio). Trend direction for tiempo promedio is inverted: lower is better.

Below the metric cards, a simple activity timeline shows the last 20 actions this operator has taken (document uploads, state changes, alert resolutions) with timestamp, action description, and the tienda involved. Each tienda name in the timeline is a clickable link.

Add mock data that makes these metrics feel realistic and varied across different operators.

- Allow column sorting in all tables

All data tables in the application (tiendas list, tramites global, documentos global, alertas) should support ascending and descending sort by clicking column headers. Sortable columns should have a visual indicator (chevron icon) that shows the current sort direction. Clicking the same column toggles direction. Clicking a different column resets to ascending for that column. Sort state is maintained within the session when navigating back to the page. For paginated tables, sort params are passed to the backend as query parameters. For fully client-side loaded tables, sorting is handled in the browser.

- WebSocket integration for real-time alerts

Replace the 60-second polling for the sidebar alert count and the alert list with a WebSocket connection. On receiving a new alert, update the sidebar badge count, append the alert to the active list if the user is currently on the alertas page, and show a toast notification with the alert message and a link to the affected tienda. If the WebSocket connection drops, fall back silently to 60-second polling and show a subtle "Reconectando..." indicator in the sidebar footer. On reconnect, do a full refetch of alerts to catch any missed updates. The WebSocket URL comes from an environment variable. Operator-scoped users should only receive WebSocket events for their assigned tiendas.

- OpenAPI client generation

Remove manually defined types in `src/types/index.ts` and manually written API functions. Replace with an auto-generated client using `@hey-api/openapi-ts` pointed at the backend's `openapi.json`. Add a `generate:api` script to `package.json`. All existing React Query hooks should continue working unchanged since they wrap the generated functions. Document the generation command and workflow in the README. This task should be done last as it touches the entire data layer.