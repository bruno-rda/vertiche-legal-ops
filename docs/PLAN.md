# Vertiche Frontend — PLAN.md

This is the implementation plan and tracking document for the Vertiche Legal Platform Frontend.

---

## 1. Current Sprint
*(No active sprint items.)*

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

---

## 3. Backlog
- Document upload modal (drag & drop) in tienda detail — Documentos tab

Replace or enhance the existing upload trigger in the Documentos tab of the tienda detail page with a proper upload modal. The modal should have: a drag-and-drop zone that also accepts click-to-browse, accepts PDF files only (show a clear error if another format is dropped), a file name field that is pre-filled with the filename but editable (this becomes the descriptive name of the document, not just the raw filename), a multi-select of tramites from the current tienda's expediente to associate the document to (required, at least one must be selected), a real upload progress bar that reflects actual upload progress (not a fake timer), and a cancel button that aborts the upload if in progress. After successful upload the modal closes, a success toast appears, and the new document appears in the list with OCR status `procesando`.

- Allow document metadata editing (descriptive name and OCR-extracted fields)

In every place where a document appears with an edit action (documentos tab in tienda, documentos global page, tramite detail documents section), allow editing two things. First, the descriptive name of the document (the user-facing name, not the original filename). This should be an inline edit: click the name, it becomes an input, press Enter or click outside to save. Second, the OCR-extracted fields (fecha de vigencia, número de permiso, referencia de pago, domicilio, and any other fields the backend returns). These are editable only by ADMIN. The edit UI for OCR fields should be the same modal already planned for OCR review (see "OCR review modal" item). When saving edits to OCR fields, if the field being edited is a date (fecha de vigencia), show a confirmation dialog before saving since it affects compliance calculations. All edits are recorded in the document's history and in the tienda's historial tab.

- In-app PDF viewer

Implement a reusable in-app PDF viewer that can be triggered from any document reference in the application. The viewer opens as a full-screen modal overlay. It should render the PDF using `react-pdf` (which uses PDF.js under the hood). The viewer should support: page navigation (previous/next with keyboard arrow support), zoom in/out, and a download button. While the PDF is loading, show a skeleton loader inside the modal. If the PDF fails to load, show an error state with a fallback download button. The viewer receives a URL (the signed URL from the document entity) and a title (the descriptive name of the document). This component is used in: the tramite detail documents section, the documentos tab in tienda detail, the documentos global page, and the OCR review modal.

- OCR review modal with side-by-side PDF viewer

When a document has `estado_ocr: 'baja_confianza'` or `requiere_revision_manual: true`, a "Revisar" button appears. Clicking it opens a large modal (90vw, 85vh) split into two panels. Left panel: the in-app PDF viewer (see PDF viewer item) showing the document. Right panel: a form with all OCR-extracted fields, each showing its extracted value and a confidence indicator. Fields with low confidence are visually highlighted (amber border or background). Each field is editable. At the bottom of the right panel: a "Guardar correcciones" button and a "Cancelar" button. On save, if any date field was modified, show a confirmation dialog ("Estás modificando una fecha de vigencia. Esta acción quedará registrada en el historial. ¿Confirmar?"). After saving successfully, the document's `requiere_revision_manual` flag is cleared, the OCR status updates to `completado`, and the modal closes with a success toast. This action is ADMIN only. The edit is recorded in historial.

- Allow tramite detail editing (name, dates, permanency)

On the tramite detail page, ADMIN users can edit the following fields: nombre del trámite, fecha de inicio, fecha de vencimiento, and whether the trámite is permanent. A permanent trámite has no expiration date, never generates vencimiento alerts, and displays a "Permanente" badge instead of a date. The edit UI should be an "Editar" button in the tramite detail header that toggles the fields into editable inputs inline (not a separate page or modal). Editing the fecha de vencimiento should show a confirmation dialog since it affects alert thresholds. Toggling a trámite to permanent should also confirm ("Este trámite no generará alertas de vencimiento. ¿Confirmar?"). All edits are recorded in the tramite's historial.

- Allow tramite creation from tienda detail

ADMIN users can create a new trámite directly from the Expediente tab in the tienda detail page. A "Nuevo trámite" button opens a modal with the following fields: nombre (text, required), tipo jurisdiccional (select: federal / estatal / municipal, required), fecha de inicio (date picker, required), fecha de vencimiento (date picker, required unless "Permanente" is checked), es permanente (checkbox, if checked disables and clears fecha de vencimiento), and es recurrente (checkbox, if checked shows a select for periodo: anual / bianual). On submit, the new trámite appears in the Expediente tab in the correct section (activos) with state `pendiente_documentacion`. A success toast confirms creation. The creation is recorded in the tienda's historial.

- Allow tramite filtering in tramites global page

Add the following filters to the tramites global page, in addition to what already exists: filter by geographic state (dropdown of Mexican states), date range filter for fecha de vencimiento (from / to date pickers), and three quick-filter buttons: "Solo vencidos", "Por vencer en 30 días", "Por vencer en 60 días". The quick-filter buttons are mutually exclusive and visually toggled (active state). When a quick filter is active, the date range filter is disabled. All filters combine with AND logic. The active filter count should be shown as a badge on a "Filtros" button if any non-default filters are active, so the user knows filters are applied.

- Allow column sorting in all tables

All data tables in the application (tiendas list, tramites global, documentos global, alertas) should support ascending and descending sort by clicking column headers. Sortable columns should have a visual indicator (chevron icon) that shows current sort direction. Clicking the same column header again reverses the direction. Clicking a different header resets to ascending for that column. Sort state should be maintained when the user navigates back to the page within the same session. Sorting is done client-side for tables with full data loaded, and passed as query params to the backend for paginated tables.

- Allow alert silencing from Alertas tab in tienda detail

The Alertas tab in the tienda detail page should support the same silencing action as the global alertas page. Each alert row should have a "Silenciar" button that opens the same SilenciarModal (duration options + optional note). After silencing, the alert moves out of the active list in that tab with the same animation as in the global alerts page.

- Allow reactivation of silenced alerts and mark as resolved

Add a "Resueltas" tab to the alertas page alongside "Activas" and "Silenciadas". An alert can be marked as resolved from any view where it appears (active or silenced). Resolving an alert removes it from both Activas and Silenciadas and moves it to Resueltas, with the timestamp and user who resolved it recorded. Resolved alerts cannot be reactivated. Silenced alerts can be reactivated (remove silence before expiry) via a "Reactivar" button in the Silenciadas tab, which moves them back to Activas. Resolved alerts in the Resueltas tab are read-only and shown in chronological order. Add the same three-tab structure to the Alertas tab inside the tienda detail page.

- WhatsApp and email alert sending

In the global alertas page, each alert in the Activas tab should show which notification channels have already been used for that alert: email and/or WhatsApp, shown as small channel badges (e.g. an envelope icon for email, a phone icon for WhatsApp), greyed out if not yet sent, filled/colored if already sent. Each alert should also have a "Enviar" dropdown button with two options: "Enviar por email" and "Enviar por WhatsApp". Clicking either triggers the corresponding backend action and updates the channel badge state immediately (optimistic update). If the send fails, revert the badge and show an error toast. This feature is only visible to ADMIN and OPERATOR roles. The backend integration for this is not yet defined; for now implement the UI with MSW mocks that simulate success after a short delay.

- Allow store editing

In the tienda detail page header, ADMIN users can edit the tienda's basic data: nombre, estado (dropdown of Mexican states), municipio (text field), and dirección. An "Editar" button in the header toggles the fields into editable inputs inline. Save and cancel buttons appear while editing. On save, a success toast confirms. The edit is recorded in the tienda's historial.

- User management screen (ADMIN only)

Add a "Usuarios" item to the sidebar, visible only to ADMIN role, linking to `/usuarios`. This page shows a table of all system users with columns: nombre, email, rol (badge), fecha de creación, and acciones. Actions per user: "Editar rol" (opens a small modal with a role selector: ADMIN / OPERATOR / VIEWER) and "Desactivar" (soft delete, with confirmation dialog). At the top of the page, an "Invitar usuario" button opens a modal with fields: nombre, email, and rol. Submitting sends an invite (mocked for now). Deactivated users appear in a separate "Inactivos" tab and can be reactivated. ADMIN cannot deactivate their own account.

- SVG map of Mexico for dashboard compliance visualization

Replace the horizontal bar chart on the dashboard with an SVG map of Mexico showing all 32 states. Each state is colored based on the aggregated compliance level of its tiendas using the existing color scale (dark green >85%, amber 60–85%, dark red <60%, light grey for states with no tiendas). On hover, show a tooltip with: state name, number of tiendas, compliance percentage, and number of critical tramites. Clicking a state navigates to `/tiendas?estado=[nombre]`. State color transitions should be animated with CSS (fill transition 300ms). Use a clean, minimalist SVG with no unnecessary detail — just state outlines with fills. The SVG asset needs to be sourced or built with each state as a separate `<path>` element with a `data-estado` attribute matching the state names used in the rest of the app.

- WebSocket integration for real-time alerts

Replace the 60-second polling for the sidebar alert count and the alert list with a WebSocket connection. On new alert received, update the sidebar badge count, append the alert to the active list if the user is on the alertas page, and show a toast notification. If the WebSocket connection drops, fall back to polling at 60 seconds and show a subtle "reconectando..." indicator in the sidebar. On reconnect, do a full refetch of alerts to catch any missed updates. The WebSocket URL should come from an environment variable.

- OpenAPI client generation

Remove the manually defined types in `src/types/index.ts` and the manually written API functions. Replace them with an auto-generated client using `@hey-api/openapi-ts` pointed at the backend's `openapi.json`. Set up a `generate:api` script in `package.json` that runs the generation. All React Query hooks should continue to work unchanged since they wrap the generated functions. Document the generation command and workflow in the project README.