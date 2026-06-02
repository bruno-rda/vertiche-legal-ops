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

---

## 3. Backlog
- SVG map of Mexico for dashboard compliance visualization
- Document upload modal with drag & drop and real progress bar
- OCR review modal with side-by-side PDF viewer
- WebSocket integration for real-time alerts
- User management screen (ADMIN only)
- OpenAPI client generation with orval
