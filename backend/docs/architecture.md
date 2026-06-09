# Backend Architecture

## Overview

This is a **modular layered monolith** built with FastAPI, SQLAlchemy (async), and Pydantic v2.
The architecture is intentionally stable and not expected to grow significantly beyond its current
scope. The domain complexity is low; the non-trivial work lives in three side systems:
OCR processing, automatic alert generation, and audit tracing. The architecture creates clean
integration points for these without over-engineering the business logic layer.

**Stack:**
- Python 3.11+
- FastAPI (async)
- SQLAlchemy 2.x (async, with `asyncpg`)
- Pydantic v2
- Alembic (migrations)
- PyJWT + bcrypt (auth)
- ARQ (background task queue, Redis-backed) — used for OCR worker
- APScheduler (cron jobs) — used for alert scanning
- PostgreSQL

---

## Directory Structure

```
backend/
├── app/
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   │
│   ├── api/
│   │   ├── deps.py
│   │   ├── auth.py
│   │   ├── alertas.py
│   │   ├── documentos.py
│   │   ├── tiendas.py
│   │   ├── tramites.py
│   │   ├── usuarios.py
│   │   └── dashboard.py
│   │
│   ├── services/
│   │   ├── auth_service.py
│   │   ├── alerta_service.py
│   │   ├── documento_service.py
│   │   ├── tienda_service.py
│   │   ├── tramite_service.py
│   │   └── usuario_service.py
│   │
│   ├── repositories/
│   │   ├── alerta_repo.py
│   │   ├── documento_repo.py
│   │   ├── tienda_repo.py
│   │   ├── tramite_repo.py
│   │   └── usuario_repo.py
│   │
│   ├── models/
│   │   ├── alerta.py
│   │   ├── documento.py
│   │   ├── tienda.py
│   │   ├── tramite.py
│   │   ├── usuario.py
│   │   └── historial.py
│   │
│   ├── schemas/
│   │   ├── alerta.py
│   │   ├── documento.py
│   │   ├── tienda.py
│   │   ├── tramite.py
│   │   └── usuario.py
│   │
│   ├── workers/
│   │   ├── ocr_worker.py
│   │   └── alert_worker.py
│   │
│   └── core/
│       ├── security.py
│       ├── audit.py
│       ├── exceptions.py
│       └── pagination.py
│
├── alembic/
│   ├── env.py
│   └── versions/
│
├── alembic.ini
├── pyproject.toml
└── .env
```

---

## Layer Contracts and Hard Rules

The architecture enforces a strict **unidirectional dependency flow**:

```
api/ → services/ → repositories/ → models/
         ↓
       core/audit.py
```

Violations of this flow are bugs in the architecture, not just style issues.

---

### `app/main.py`
The FastAPI application factory.

- Creates the `FastAPI()` instance.
- Registers all routers from `api/` with their prefixes and tags.
- Registers the global exception handler for `AppException`.
- Manages the `lifespan` context: starts/stops the ARQ worker pool and APScheduler.
- Does **not** contain any business logic or route handlers.

---

### `app/config.py`
Single source of truth for all configuration.

- Uses `pydantic-settings` (`BaseSettings`) to load from environment variables and `.env`.
- Exposes a single `settings` singleton imported everywhere.
- Must include: `DATABASE_URL`, `SECRET_KEY`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `REDIS_URL`,
  `OCR_ENGINE` (e.g. `"tesseract"` or `"textract"`), `OCR_CONFIDENCE_THRESHOLD` (float, default `0.80`),
  `ALERT_SCAN_INTERVAL_HOURS`, `ENVIRONMENT` (`"development"` | `"production"`).

---

### `app/database.py`
All SQLAlchemy engine and session configuration.

- Creates the async engine using `create_async_engine` with `asyncpg`.
- Exposes `AsyncSessionLocal` (session factory) and `Base` (declarative base).
- Exposes `get_db()` as an async generator — this is the dependency injected into routers
  via `deps.py`. It opens a session, yields it, and always closes it.
- **No models are imported here.** Models import `Base` from here; not the reverse.

---

### `app/api/` — HTTP Layer

**Purpose:** Parse HTTP requests, call one service, return an HTTP response. Nothing else.

**Hard rules:**
- Routers **never** import from `repositories/`. They only call `services/`.
- Routers **never** contain `if/else` business logic (e.g. "if document is expired, do X").
- Routers **never** call `audit.record()` directly. Auditing happens inside services.
- Routers **never** catch exceptions — let them bubble to the global handler.
- Each file corresponds to one resource (one `APIRouter` with a prefix).
- Response models are always explicit Pydantic schemas from `schemas/`.

**`deps.py` — Shared FastAPI dependencies:**
- `get_db() -> AsyncSession`: yields a database session.
- `get_current_user(token, db) -> UsuarioModel`: decodes the Bearer JWT, fetches the user,
  raises `UnauthorizedError` if invalid or user is inactive. All protected routes depend on this.
- `require_admin(current_user) -> UsuarioModel`: raises `ForbiddenError` if user role is not `ADMIN`.

**Route handler signature pattern:**
```python
@router.get("/{id}", response_model=schemas.TiendaOut)
async def get_tienda(
    id: str,
    db: AsyncSession = Depends(deps.get_db),
    current_user: models.Usuario = Depends(deps.get_current_user),
):
    return await tienda_service.get_by_id(db, id)
```

---

### `app/services/` — Business Logic Layer

**Purpose:** Orchestrate business operations. The only layer that knows "what should happen."

**Hard rules:**
- Services receive a `db: AsyncSession` as their first argument — they do **not** create sessions.
- Services call `repositories/` for all data access. They never write raw SQL or use
  SQLAlchemy query constructs directly.
- Services call `core/audit.record()` for every mutation (create, update, delete, status change).
- Services may call other services for cross-domain operations (e.g. `documento_service`
  may call `alerta_service.ensure_alert_resolved()` after an OCR review is approved).
- Services raise typed exceptions from `core/exceptions.py`. They never return `None`
  for a not-found — they raise `NotFoundError`.
- Services are plain async functions grouped in a module — **not classes**. No service classes.
- Workers (`workers/`) call service functions, not repo functions. Logic is never duplicated.

**Key responsibilities per service:**

- `auth_service.py`: `login(db, email, password) -> (token, user)`, `get_user_from_token(db, token) -> user`.
- `alerta_service.py`: `generate_alerts_for_tramite(db, tramite)` (idempotent — skips if open alert
  exists), `silenciar(db, id, duracion_dias, nota, actor)`, `resolver(db, id, actor)`,
  `reactivar(db, id, actor)`, `notificar(db, id, canal, actor)`.
- `documento_service.py`: `create_from_upload(db, file, tramite_ids, actor) -> documento` — saves
  file, creates DB record with `estado_ocr='procesando'`, enqueues `ocr_worker.process` task.
  `submit_ocr_review(db, id, datos_extraidos, actor)` — sets `estado_ocr='completado'`,
  `requiere_revision_manual=False`.
- `tienda_service.py`: CRUD + `get_expediente(db, id)` (aggregates tramites + cumplimiento score).
- `tramite_service.py`: CRUD + `recalculate_cumplimiento(db, tienda_id)` — called after any
  tramite mutation to update `tienda.estado_cumplimiento`.
- `usuario_service.py`: CRUD + `assign_tiendas(db, user_id, tienda_ids, actor)` +
  `get_tiendas_resumen(db, user_id)` + `get_performance(db, user_id, range_days)`.

---

### `app/repositories/` — Data Access Layer

**Purpose:** All SQLAlchemy queries live here and nowhere else.

**Hard rules:**
- Repositories only import from `models/`. They never import from `services/` or `api/`.
- Repository functions return ORM model instances or lists thereof. They never return
  Pydantic schemas.
- All filtering, sorting, pagination, and joining logic lives here.
- No business logic. A repo function does not decide *whether* to update — it just executes
  the update it was told to execute.
- No abstract base classes or interfaces. Concrete functions only.
- Naming convention: `get_by_id`, `get_many`, `create`, `update`, `delete`, `count`.

**Pagination pattern** (repos return raw data; `core/pagination.py` wraps it):
```python
async def get_many(
    db: AsyncSession,
    *,
    page: int = 1,
    page_size: int = 25,
    filters: dict,          # passed as kwargs from service
) -> tuple[list[ModelT], int]:   # (items, total_count)
    ...
```

---

### `app/models/` — ORM Models

**Purpose:** SQLAlchemy table definitions.

**Hard rules:**
- All models inherit from `Base` imported from `database.py`.
- No business logic in models. No methods that call the DB. Pure data structure.
- Use `mapped_column` and `Mapped` (SQLAlchemy 2.x typed style).
- All primary keys are `String` UUIDs (generated with `uuid.uuid4()`), not auto-increment integers.
  This ensures IDs are safe to expose publicly and consistent with the frontend's expectations.
- Every model that represents a user-facing entity has `created_at` and `updated_at` columns
  (server-side defaults with `func.now()` and `onupdate`).
- Relationships are defined with `relationship()` and `back_populates`. Lazy loading is
  **disabled globally** (`lazy="raise"`) — all joins must be explicit in repo queries.

**`historial.py` — Audit Log Table:**
```
id          UUID PK
actor_id    FK → usuarios.id (nullable: system-generated events)
accion      String  (e.g. "tramite.update", "alerta.silenciar", "documento.ocr_review")
entidad     String  (e.g. "tramite", "alerta")
entidad_id  String
payload     JSONB   (snapshot of changed fields: { before: {...}, after: {...} })
timestamp   DateTime (server default now, non-nullable, never updated)
```

---

### `app/schemas/` — Pydantic Schemas

**Purpose:** HTTP request/response shapes. Completely separate from ORM models.

**Hard rules:**
- Never import SQLAlchemy models into schemas.
- Use `model_config = ConfigDict(from_attributes=True)` on all output schemas so they can
  be built from ORM instances.
- Naming convention per resource: `{Entity}Create`, `{Entity}Update`, `{Entity}Out`,
  `{Entity}OutDetailed` (for endpoints that return enriched objects).
- Passwords are **never** present in any `Out` schema.
- Shared paginated wrapper lives in `core/pagination.py`, not in schemas.

---

### `app/workers/` — Background Processing

**Purpose:** Asynchronous and scheduled work that is not part of an HTTP request lifecycle.

**`ocr_worker.py`:**
- Triggered by `documento_service.create_from_upload()` via ARQ enqueue.
- Function signature: `async def process_document(ctx, doc_id: str)`.
- Flow:
  1. Fetch document record from DB.
  2. Call the configured OCR engine (abstracted behind a thin `ocr_engine` module inside `workers/`
     — swap engine by changing `settings.OCR_ENGINE`).
  3. If engine confidence >= `settings.OCR_CONFIDENCE_THRESHOLD`: set `estado_ocr='completado'`,
     `datos_extraidos=result`, `requiere_revision_manual=False`.
  4. If confidence < threshold: set `estado_ocr='requiere_revision'`, `requiere_revision_manual=True`.
  5. Call `audit.record()` with actor `"system:ocr"`.
- The OCR engine abstraction is a simple function `run_ocr(file_path) -> OcrResult(text, fields, confidence)`.
  Swapping Tesseract for Textract means reimplementing this one function.

**`alert_worker.py`:**
- Scheduled by APScheduler in `main.py` lifespan, running every `settings.ALERT_SCAN_INTERVAL_HOURS`.
- Function: `async def scan_and_generate_alerts()`.
- Flow:
  1. Fetch all non-permanent tramites with `fecha_vencimiento` within 30 days or already past.
  2. For each, call `alerta_service.ensure_alert_exists(db, tramite)` — this is **idempotent**:
     it checks for an existing open alert before creating, so repeated runs are safe.
  3. Auto-resolve alerts for tramites that have been renewed (i.e., no longer expiring).
  4. Records all creations/resolutions via `audit.record()` with actor `"system:scheduler"`.

---

### `app/core/` — Cross-Cutting Infrastructure

**`security.py`:**
- `hash_password(plain: str) -> str` — bcrypt.
- `verify_password(plain: str, hashed: str) -> bool` — bcrypt.
- `create_access_token(data: dict) -> str` — PyJWT, uses `settings.SECRET_KEY` and
  `settings.ACCESS_TOKEN_EXPIRE_MINUTES`.
- `decode_token(token: str) -> dict` — raises `UnauthorizedError` on invalid/expired.

**`audit.py`:**
- Single public function: `async def record(db, actor_id, accion, entidad, entidad_id, payload)`.
- Writes one row to `historial`. Always awaited inside service calls.
- `actor_id` is a string — pass the user UUID for human actions, `"system:ocr"` or
  `"system:scheduler"` for automated actions.
- `payload` is a free-form dict. Convention: `{"before": {...}, "after": {...}}` for updates,
  `{"data": {...}}` for creates, `{}` for deletes.
- **Every mutation in a service must call this.** This is the only guarantee of a complete
  audit trail. There is no middleware magic — it is a deliberate, explicit call.

**`exceptions.py`:**
```python
class AppException(Exception):
    def __init__(self, status_code: int, code: str, detail: str): ...

class NotFoundError(AppException):       # 404
class UnauthorizedError(AppException):   # 401
class ForbiddenError(AppException):      # 403
class ConflictError(AppException):       # 409
class ValidationError(AppException):     # 422
```
- Registered in `main.py` as a single FastAPI exception handler returning `{"code": ..., "detail": ...}`.
- Services raise these. Routers never catch them.

**`pagination.py`:**
```python
class PaginatedResponse(BaseModel, Generic[T]):
    data: list[T]
    total: int
    page: int
    page_size: int
    total_pages: int

def paginate(items: list[T], total: int, page: int, page_size: int) -> PaginatedResponse[T]:
    ...
```
- All list endpoints that are paginated use this. No endpoint invents its own shape.

---

## The Three Core Motors

These are the systems with real complexity. They integrate at defined seams and do not
bleed into business logic.

### 1. OCR Pipeline

```
POST /api/documentos/upload
  └─ documento_service.create_from_upload()
        ├─ saves file to disk / object storage
        ├─ creates Documento (estado_ocr='procesando')
        ├─ audit.record(actor_id=user.id, accion='documento.create', ...)
        └─ arq.enqueue('ocr_worker.process_document', doc_id)

[Background — ARQ worker]
  ocr_worker.process_document(doc_id)
        ├─ run_ocr(file_path) → OcrResult
        ├─ updates Documento fields
        └─ audit.record(actor_id='system:ocr', accion='documento.ocr_complete', ...)
```

The OCR engine is isolated behind `workers/ocr_engine.py` with a single function signature.
Changing the engine (Tesseract → AWS Textract → Google Vision) requires changes to exactly
one file.

### 2. Automatic Alert Generation

```
[Cron — APScheduler, every N hours]
  alert_worker.scan_and_generate_alerts()
        ├─ tramite_repo.get_expiring(within_days=30)
        ├─ for each tramite:
        │     alerta_service.ensure_alert_exists(db, tramite)  ← idempotent
        └─ audit.record(actor_id='system:scheduler', accion='alerta.auto_create', ...)
```

Alert severity is computed in `alerta_service` based on days until expiration:
- `> 30 days`: no alert
- `15–30 days`: `low`
- `7–14 days`: `medium`
- `1–6 days`: `high`
- `0 or past`: `critical`

These thresholds are constants in `alerta_service.py`, not in the DB.

### 3. Audit Trail

```
Any service mutation
  └─ await audit.record(
         db=db,
         actor_id=actor.id,        # or "system:ocr" / "system:scheduler"
         accion="tramite.update",   # format: "entity.verb"
         entidad="tramite",
         entidad_id=tramite.id,
         payload={"before": old_data, "after": new_data}
     )
```

`GET /api/tiendas/:id/historial` and `GET /api/tramites/:id` (detailed) both read from
`historial` via `historial_repo.get_by_entity(db, entidad, entidad_id)`.

---

## Auth Flow

- Login: `POST /api/auth/login` → `auth_service.login()` → verifies password with bcrypt →
  returns `create_access_token({"sub": user.id})` + user object.
- All protected routes declare `current_user: Usuario = Depends(deps.get_current_user)`.
- `get_current_user` decodes the JWT, reads `sub`, fetches user from DB, checks `estado == 'activo'`.
- Admin-only routes additionally declare `Depends(deps.require_admin)`.
- Token expiry and secret are in `settings`. There is no refresh token at this stage.

---

## Compliance Score Calculation

`tienda.estado_cumplimiento` is a derived field, not stored permanently in the DB as a live
counter. It is recomputed by `tramite_service.recalculate_cumplimiento(db, tienda_id)` and
written to `tienda.cumplimiento` (a stored float, 0–100) whenever:
- A tramite is created, updated, or its expiration changes.
- A document is approved via OCR review.

Formula (in `tramite_service.py`, not in the DB):
```
cumplimiento = (vigentes / total_tramites) * 100
```
Where `vigentes` = tramites with `estado == 'vigente'` (not expired, not critical).
`estado_cumplimiento` enum: `'en_cumplimiento'` (≥80%), `'por_vencer'` (50–79%), `'en_riesgo_critico'` (<50%).

---

## Key Technical Decisions

| Decision | Choice | Reason |
|---|---|---|
| Async | Full async (asyncpg, async SQLAlchemy) | FastAPI is async-native; file I/O and DB are the bottleneck |
| IDs | UUID strings everywhere | Safe to expose; no enumeration attacks; consistent with frontend |
| Lazy loading | Disabled (`lazy="raise"`) | Forces explicit joins; prevents N+1 bugs silently |
| Repo return type | ORM models (not dicts, not schemas) | Services can manipulate before serialization |
| No repo interfaces | Concrete classes only | No current or planned need to swap DB implementations |
| No service classes | Module-level async functions | Simpler, no `__init__` state, easier to test |
| Audit | Explicit `await audit.record()` in services | No magic, no middleware gaps, full coverage guaranteed |
| OCR abstraction | Single function in `workers/ocr_engine.py` | One file to change when swapping engine |
| Alert generation | Idempotent cron scan | Safe to re-run; no duplicate alerts |
| Migrations | Alembic from day one | Required for any production schema change |
| Error handling | Typed `AppException` subclasses + single handler | Consistent error shape, no scattered try/catch |

---

## What This Architecture Intentionally Does NOT Include

- **No DDD aggregates or value objects** — the domain is CRUD-heavy; the overhead is not justified.
- **No CQRS** — read/write volume is low; separate read models would add complexity for no gain.
- **No microservices** — the OCR and alerting complexity does not justify the operational overhead.
- **No repository interfaces/ABCs** — there is no concrete plan to swap the database.
- **No event bus** — the workers communicate via ARQ (task queue) which is sufficient; an event
  bus would be the right next step only if alert generation or OCR needed to fan out to multiple
  independent consumers.
- **No refresh tokens** — out of scope for current requirements; add when needed.