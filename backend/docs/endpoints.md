# Backend Endpoints Expected by Frontend

The following is a comprehensive list of all API endpoints currently expected by the frontend, extracted from the mock API handlers and component API calls. It details the expected URL parameters, query string parameters, request body payload types, and the expected response data types for each endpoint.

Use this document as the primary reference when implementing or validating backend APIs.

If you identify missing details or inconsistencies, refer to the following frontend sources:

backend/
├── docs/
│   └── endpoints.md (this file)

frontend/
├── src/
│   ├── mocks/
│   │   └── handlers/
│   └── types/

The mock handlers define the expected API behavior, while the shared type definitions provide the request and response contracts used throughout the frontend.

## Authentication (Auth)

### `POST /api/auth/login`
- **Description**: Authenticates a user and returns a token along with the user profile.
- **Request Body**:
  - `email` (string): User's email address.
  - `password` (string): User's password.
- **Returns**:
  - `200 OK`: `{ token: string, user: UserObject }` (UserObject without password).
  - `401 Unauthorized`: `{ detail: string }`

### `GET /api/auth/me`
- **Description**: Retrieves the authenticated user's profile based on their token.
- **Headers**:
  - `Authorization` (string): Bearer token (e.g., `Bearer mock-jwt-token-id`).
- **Returns**:
  - `200 OK`: `UserObject` (without password).
  - `401 Unauthorized`: `{ detail: string }`

## Alertas (Alerts)

### `GET /api/alertas`
- **Description**: Retrieves a list of alerts, optionally filtered by parameters.
- **Query Parameters**:
  - `severidad` (string, optional): Filter by severity (e.g., 'low', 'medium', 'high', 'critical').
  - `tipo` (string, optional): Filter by type (e.g., 'vencimiento', 'falta_documento').
  - `silenciada` (boolean string 'true'|'false', optional): Filter by silenced status.
  - `resuelta` (boolean string 'true'|'false', optional): Filter by resolved status.
  - `tienda_id` (string, optional): Filter by a specific store ID.
  - `search` (string, optional): Free text search matching alert message, store name, or procedure name.
- **Returns**: Array of `Alerta` objects.

### `GET /api/alertas/count`
- **Description**: Retrieves the total count of active critical alerts (used for sidebar badges).
- **Returns**: `{ count: number }`

### `POST /api/alertas/:id/silenciar`
- **Description**: Silences a specific alert for a given number of days.
- **URL Parameters**: `id` (string) - Alert ID.
- **Request Body**:
  - `duracion_dias` (number): Number of days to silence the alert.
  - `nota` (string, optional): Reason or note for silencing.
- **Returns**: Updated `Alerta` object.

### `POST /api/alertas/:id/resolver`
- **Description**: Marks an alert as resolved.
- **URL Parameters**: `id` (string) - Alert ID.
- **Returns**: Updated `Alerta` object (with `resuelta: true`).

### `POST /api/alertas/:id/reactivar`
- **Description**: Reactivates an alert that was previously silenced.
- **URL Parameters**: `id` (string) - Alert ID.
- **Returns**: Updated `Alerta` object (with `silenciada: false`).

### `POST /api/alertas/:id/notificar/:canal`
- **Description**: Registers that a notification has been sent for the alert via a specific channel.
- **URL Parameters**: 
  - `id` (string) - Alert ID.
  - `canal` (string) - Channel used (e.g., 'email', 'whatsapp').
- **Returns**: Updated `Alerta` object (with `notificaciones_enviadas` mapped).

## Documentos (Documents)

### `GET /api/documentos`
- **Description**: Retrieves a paginated and filterable list of documents.
- **Query Parameters**:
  - `page` (number, optional): Page number (default: 1).
  - `page_size` (number, optional): Results per page (default: 25).
  - `estado_ocr` (string, optional): Filter by OCR status.
  - `requiere_revision` (boolean string 'true', optional): Filter for documents needing manual OCR review.
  - `tienda_id` (string, optional): Filter by store ID.
  - `tramite_id` (string, optional): Filter by procedure ID.
- **Returns**: Paginated object `{ data: Documento[], total: number, page: number, page_size: number, total_pages: number }`.

### `GET /api/documentos/:id`
- **Description**: Retrieves details for a specific document.
- **URL Parameters**: `id` (string) - Document ID.
- **Returns**: `Documento` object.

### `PATCH /api/documentos/:id`
- **Description**: Updates fields of a document (e.g., linking it to procedures).
- **URL Parameters**: `id` (string) - Document ID.
- **Request Body**: Partial `Documento` object (e.g., `{ tramite_ids: string[] }`).
- **Returns**: Updated `Documento` object.

### `POST /api/documentos/upload`
- **Description**: Uploads a new document file.
- **Request Body**: `FormData` containing:
  - `file` (File): The file being uploaded.
  - `tramite_ids` (string[]): Multiple procedure IDs this document applies to.
- **Returns**: Newly created `Documento` object (status: 'procesando').

### `POST /api/documentos/:id/rename`
- **Description**: Renames an existing document.
- **URL Parameters**: `id` (string) - Document ID.
- **Request Body**:
  - `nombre_archivo` (string): The new file name.
- **Returns**: Updated `Documento` object.

### `POST /api/documentos/:id/ocr-review`
- **Description**: Submits manual review corrections for extracted OCR data.
- **URL Parameters**: `id` (string) - Document ID.
- **Request Body**:
  - `datos_extraidos` (object): Map of key-value pairs representing corrected OCR fields.
- **Returns**: Updated `Documento` object (estado_ocr='completado', requiere_revision_manual=false).

## Tiendas (Stores)

### `GET /api/tiendas`
- **Description**: Retrieves a paginated, sorted, and filterable list of stores.
- **Query Parameters**:
  - `page` (number, optional): Page number (default: 1).
  - `page_size` (number, optional): Results per page (default: 25).
  - `search` (string, optional): Text search on name or municipality.
  - `estado` (string, optional): Filter by geographic state.
  - `estado_cumplimiento` (string, optional): Filter by compliance status.
  - `sort_by` (string, optional): Field to sort by (default: 'nombre').
  - `sort_order` (string, optional): 'asc' or 'desc' (default: 'asc').
  - `operador_id` (string, optional): Filter by assigned operator ID (or 'unassigned').
- **Returns**: Paginated object `{ data: Tienda[], total: number, page: number, page_size: number, total_pages: number }`.

### `GET /api/tiendas/:id`
- **Description**: Retrieves details for a specific store.
- **URL Parameters**: `id` (string) - Store ID.
- **Returns**: `Tienda` object.

### `PUT /api/tiendas/:id`
- **Description**: Updates basic information of a specific store.
- **URL Parameters**: `id` (string) - Store ID.
- **Request Body**:
  - `nombre` (string, optional)
  - `estado` (string, optional)
  - `municipio` (string, optional)
  - `direccion` (string, optional)
- **Returns**: Updated `Tienda` object.

### `GET /api/tiendas/:id/expediente`
- **Description**: Retrieves a summary of the store's compliance dossier (procedures).
- **URL Parameters**: `id` (string) - Store ID.
- **Returns**: Object `{ id: string, tienda_id: string, tramites: Tramite[], cumplimiento: number, ultima_actualizacion: string }`.

### `POST /api/tiendas/:id/tramites`
- **Description**: Creates a new procedure (trámite) manually linked to a store.
- **URL Parameters**: `id` (string) - Store ID.
- **Request Body**:
  - `nombre` (string): Procedure name.
  - `tipo` (string): Type of procedure.
  - `fecha_inicio` (string): ISO Start date.
  - `fecha_vencimiento` (string, optional): ISO Expiration date.
  - `es_permanente` (boolean): If true, doesn't expire.
  - `es_recurrente` (boolean): If true, it recurs.
  - `periodo_recurrencia` (string, optional): Recurrence period text.
- **Returns**: `201 Created` with the newly created `Tramite` object.

### `GET /api/tiendas/:id/alertas`
- **Description**: Retrieves all alerts belonging to a specific store.
- **URL Parameters**: `id` (string) - Store ID.
- **Returns**: Array of `Alerta` objects.

### `GET /api/tiendas/:id/documentos`
- **Description**: Retrieves all documents linked to a specific store.
- **URL Parameters**: `id` (string) - Store ID.
- **Returns**: Array of `Documento` objects.

### `GET /api/tiendas/:id/historial`
- **Description**: Retrieves activity history log for a store.
- **URL Parameters**: `id` (string) - Store ID.
- **Returns**: Array of `HistorialEntry` objects.

### `POST /api/tiendas/:id/documentos`
- **Description**: Legacy/alternative endpoint to create a document linked specifically to a store.
- **URL Parameters**: `id` (string) - Store ID.
- **Request Body**:
  - `fileName` (string, optional): File name.
  - `tramiteIds` (string[]): IDs of procedures associated.
- **Returns**: Newly created `Documento` object.

## Dashboard

### `GET /api/dashboard/metrics`
- **Description**: Retrieves global KPIs for the dashboard.
- **Returns**: Object `{ total_tiendas: number, en_cumplimiento: number, por_vencer: number, en_riesgo_critico: number, porcentaje_cumplimiento: number }`.

### `GET /api/dashboard/cumplimiento-por-estado`
- **Description**: Retrieves compliance statistics grouped by geographic state.
- **Returns**: Array of objects `[{ estado: string, total_tiendas: number, cumplimiento: number, tramites_criticos: number }]`.

### `GET /api/dashboard/alertas-recientes`
- **Description**: Retrieves the most recent active alerts.
- **Returns**: Array of `Alerta` objects (typically max 10).

### `GET /api/dashboard/tramites-proximos`
- **Description**: Retrieves procedures that are about to expire or have just expired, sorted by expiration date.
- **Returns**: Array of `Tramite` objects (typically max 10).

## Tramites (Procedures)

### `GET /api/tramites`
- **Description**: Retrieves a paginated and filterable list of procedures across all stores.
- **Query Parameters**:
  - `page` (number, optional)
  - `page_size` (number, optional)
  - `search` (string, optional): Search by procedure name or store name.
  - `estado` (string, optional): Filter by status (e.g., 'vigente', 'vencido').
  - `tipo` (string, optional): Filter by type.
  - `estado_geografico` (string, optional): Filter by store's geographic state.
  - `solo_vencidos` (boolean string 'true', optional): Filter to only show expired procedures.
  - `por_vencer_dias` (number, optional): Filter to show procedures expiring within N days.
- **Returns**: Paginated object `{ data: Tramite[], total: number, page: number, page_size: number, total_pages: number }`.

### `GET /api/tramites/:id`
- **Description**: Retrieves details of a specific procedure.
- **URL Parameters**: `id` (string) - Procedure ID.
- **Returns**: `Tramite` object enriched with `documentos`, `observaciones`, and `historial`.

### `PUT /api/tramites/:id`
- **Description**: Updates procedure details.
- **URL Parameters**: `id` (string) - Procedure ID.
- **Request Body**:
  - `nombre` (string, optional)
  - `fecha_inicio` (string, optional)
  - `fecha_vencimiento` (string, optional)
  - `es_permanente` (boolean, optional)
- **Returns**: Updated `Tramite` object.

## Usuarios (Users)

### `GET /api/usuarios`
- **Description**: Retrieves a list of users.
- **Query Parameters**:
  - `rol` (string, optional): Filter by role ('ADMIN', 'OPERATOR', 'VIEWER').
  - `search` (string, optional): Search by name or email.
- **Returns**: Array of `User` objects (omits passwords).

### `GET /api/usuarios/:id`
- **Description**: Retrieves details for a specific user.
- **URL Parameters**: `id` (string) - User ID.
- **Returns**: `User` object (omits password).

### `POST /api/usuarios`
- **Description**: Creates a new user.
- **Request Body**:
  - `nombre` (string): User name.
  - `email` (string): User email address.
  - `rol` (string): User role.
- **Returns**: `201 Created` with the newly created `User` object.

### `DELETE /api/usuarios/:id`
- **Description**: Deletes a user.
- **URL Parameters**: `id` (string) - User ID.
- **Returns**: `200 OK` (No Content).

### `PUT /api/usuarios/:id/status`
- **Description**: Updates a user's active status.
- **URL Parameters**: `id` (string) - User ID.
- **Request Body**:
  - `estado` (string): 'activo' or 'inactivo'.
- **Returns**: Updated `User` object.

### `PUT /api/usuarios/:id/tiendas`
- **Description**: Assigns or unassigns stores to an operator.
- **URL Parameters**: `id` (string) - User ID.
- **Request Body**:
  - `tiendas_asignadas` (string[]): Array of store IDs to assign to the user.
- **Returns**: Updated `User` object.

### `GET /api/usuarios/:id/tiendas-resumen`
- **Description**: Retrieves a summary of the compliance metrics for all stores assigned to an operator, grouped by geographic state.
- **URL Parameters**: `id` (string) - User ID.
- **Returns**: Array of objects `[{ estado: string, total_tiendas: number, cumplimiento_total: number, tramites_criticos: number, tiendas: array, vigentes: number, por_vencer: number, criticas: number, cumplimiento_promedio: number }]`.

### `GET /api/usuarios/:id/performance`
- **Description**: Retrieves an operator's performance metrics and recent activity timeline.
- **URL Parameters**: `id` (string) - User ID.
- **Query Parameters**:
  - `range` (string, optional): '30', 'month', '90' - representing days to calculate metrics over.
- **Returns**: Object `{ metrics: PerformanceMetricsObject, timeline: TimelineEventObject[] }`.
