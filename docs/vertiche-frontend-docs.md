# Vertiche — Documentación de Frontend
### Plataforma de Cumplimiento Legal para Red Nacional de Tiendas
**Versión:** 1.0 — MVP  
**Fecha:** Mayo 2026  
**Destinatario:** Antigravity (implementación frontend)

---

## Índice

1. [Contexto del producto](#1-contexto-del-producto)
2. [Usuarios y roles](#2-usuarios-y-roles)
3. [Principios de diseño y dirección visual](#3-principios-de-diseño-y-dirección-visual)
4. [Arquitectura de la aplicación](#4-arquitectura-de-la-aplicación)
5. [Estructura de navegación](#5-estructura-de-navegación)
6. [Entidades de datos clave](#6-entidades-de-datos-clave)
7. [Pantallas del MVP](#7-pantallas-del-mvp)
8. [Flujos operativos principales](#8-flujos-operativos-principales)
9. [Sistema de estados y semáforo](#9-sistema-de-estados-y-semáforo)
10. [Sistema de alertas y notificaciones](#10-sistema-de-alertas-y-notificaciones)
11. [Procesamiento asíncrono y OCR](#11-procesamiento-asíncrono-y-ocr)
12. [Estrategia de mocking para MVP](#12-estrategia-de-mocking-para-mvp)
13. [Integración con el backend (FastAPI / OpenAPI)](#13-integración-con-el-backend-fastapi--openapi)
14. [Comportamiento responsive y plataforma objetivo](#14-comportamiento-responsive-y-plataforma-objetivo)
15. [Glosario](#15-glosario)

---

## 1. Contexto del producto

### Qué es

Vertiche opera una red nacional de miles de tiendas en México en las que renta espacios físicos a marcas de ropa (ej. Cuidado con el Perro). Cada tienda está sujeta a permisos, licencias y trámites regulatorios en tres niveles jurisdiccionales: federal, estatal y municipal. Los requisitos varían por ubicación geográfica.

Esta plataforma es una **herramienta interna de gestión legal** para el equipo central de Vertiche (~10 personas). Su objetivo es centralizar, trazar y anticipar el cumplimiento legal de toda la red de tiendas, eliminando la dependencia de búsquedas manuales, seguimiento informal y revisión documental no estructurada.

### Por qué importa

El riesgo operativo es concreto: multas, incumplimientos y clausuras de tiendas. El sistema tiene valor de negocio directamente cuantificable. Un vencimiento no detectado a tiempo puede detener la operación de una sucursal.

### Lo que el sistema hace

- Centraliza todos los trámites de todas las tiendas en un solo lugar
- Alerta proactivamente sobre vencimientos próximos
- Procesa documentos con OCR para extraer datos automáticamente
- Valida expedientes mediante un motor de reglas
- Mantiene trazabilidad histórica de cada acción sobre cada trámite
- Actualiza requisitos regulatorios vía ETL desde fuentes gubernamentales

### Lo que el frontend hace

El frontend **no contiene lógica de negocio**. Toda la lógica vive en el backend. El frontend se encarga exclusivamente de:

- Presentar información de manera clara, jerarquizada y accionable
- Proveer flujos operativos intuitivos para las tareas diarias del equipo legal
- Gestionar estados asíncronos (procesamiento OCR, validaciones)
- Comunicar alertas y observaciones de manera que generen acción inmediata

---

## 2. Usuarios y roles

### Contexto

El sistema es de uso exclusivo del equipo central de Vertiche. Las sucursales no tienen acceso. El equipo es de aproximadamente 10 personas.

### Roles del MVP

El backend maneja la flexibilidad de roles. El frontend debe contemplar al menos tres niveles de permiso y adaptar la UI según el rol del usuario autenticado:

#### `ADMIN`
- Acceso total al sistema
- Puede crear, editar y eliminar entidades (tiendas, trámites, documentos, usuarios)
- Puede configurar alertas y ver logs de auditoría
- Puede modificar datos extraídos por OCR
- Puede gestionar usuarios del sistema

#### `OPERATOR`
- Puede cargar documentos
- Puede ver el estado de trámites y expedientes
- Puede ver y silenciar alertas propias
- No puede eliminar ni modificar trámites o datos ya validados
- No puede gestionar usuarios

#### `VIEWER` (vista ejecutiva)
- Solo lectura
- Acceso al dashboard general y métricas de cumplimiento
- No puede cargar documentos ni modificar nada

### Comportamiento según rol en la UI

- Los botones de acción destructiva o sensible (`Eliminar`, `Modificar`, `Aprobar`) solo son visibles para `ADMIN`
- El botón `Cargar documento` es visible para `ADMIN` y `OPERATOR`
- Si un `VIEWER` intenta acceder a una ruta restringida, se le redirige al dashboard con un mensaje informativo (no un error genérico)
- El perfil de usuario y su rol deben ser visibles en la interfaz (header o sidebar)

---

## 3. Principios de diseño y dirección visual

### Filosofía general

La aplicación debe sentirse como **software profesional ejecutivo**: sobria, clara, de buenas proporciones, fácil de entender para alguien del área legal (no técnica). No debe parecer un SaaS genérico ni una herramienta técnica compleja.

La referencia visual de Vertiche es: blanco y negro predominante, tipografía en mayúsculas similar a Praxis Next Medium, simplicidad. El diseño de la aplicación debe honrar esa identidad sin replicar literalmente la deck de presentación.

### Dirección estética: Editorial Ejecutivo

**Paleta de color:**
- Fondo base: blanco roto o gris muy claro (`#F7F7F5` o similar). No blanco puro.
- Texto principal: negro casi puro (`#111111`)
- Superficie de tarjetas y paneles: blanco (`#FFFFFF`) con sombra muy sutil
- Acento primario: negro (`#111111`) para botones principales y elementos activos
- Acento de alerta crítica: rojo oscuro, no brillante (`#8B1A1A` o similar)
- Acento de advertencia: ámbar apagado (`#B45309` o similar)
- Acento de éxito/vigente: verde oscuro (`#2D6A4F` o similar)
- Gris intermedio para bordes y elementos secundarios: `#E5E5E0`

**No usar:** azules corporativos genéricos, gradientes de colores, paletas multi-color, fondos oscuros en la aplicación principal.

**Tipografía:**
- Display / headings: fuente con carácter editorial, de alta legibilidad en tamaños grandes. Candidatos: `Instrument Serif`, `DM Serif Display`, `Playfair Display`. Usada para títulos de sección y números grandes en el dashboard.
- UI / cuerpo: fuente sans-serif geométrica y limpia pero no genérica. Candidatos: `Geist`, `Neue Haas Grotesk`, `DM Sans`. Usada en etiquetas, tablas, botones, navegación.
- Monoespaciada (opcional): para IDs, fechas técnicas, códigos de trámite.

**Espaciado y proporciones:**
- Generoso. El sistema maneja mucha información; el espacio en blanco es el principal herramienta para que no se sienta abrumador.
- Márgenes de contenido amplios. Padding interno de tarjetas holgado.
- Tipografía bien jerarquizada: tamaños claros entre h1, h2, label, body, caption.

### El factor "wow"

El dashboard debe tener un elemento visual memorable. La propuesta es una **visualización de cumplimiento por estado** que funcione como mapa de calor sobre el mapa de México (SVG estático de estados), donde el color de cada estado refleja el nivel de cumplimiento agregado de las tiendas en ese estado.

- Escala de color: del verde oscuro (cumplimiento alto) al rojo oscuro (riesgo crítico), pasando por ámbar
- Al hacer hover sobre un estado, aparece un tooltip con: nombre del estado, número de tiendas, % de cumplimiento, número de trámites críticos
- Al hacer click, filtra la vista de la tabla de alertas/tiendas por ese estado
- La transición entre estados del mapa debe estar animada suavemente (CSS transition en fill)
- Si el mapa resulta técnicamente complejo para el MVP, puede diferirse a la fase 2 y reemplazarse por un gráfico de barras horizontales por estado con la misma lógica de color

### Microinteracciones esperadas

- Hover en filas de tabla: highlight suave, no abrupto
- Transición de página: fade sutil (150ms), no slide brusco
- Apertura de modales: scale + fade desde el centro (200ms)
- Carga de datos: skeleton loaders, nunca spinners centrados en pantalla completa
- Notificaciones toast: aparecen en esquina superior derecha, se auto-descartan en 4s
- Cambio de estado de trámite: animación de transición en el badge de estado
- Upload de documento: barra de progreso real, no falsa

---

## 4. Arquitectura de la aplicación

### Stack

| Capa | Tecnología |
|---|---|
| Framework | React 18+ |
| Routing | React Router v6 |
| Estado global | Zustand (preferido por simplicidad) o React Query + Context |
| Data fetching | React Query (TanStack Query) — manejo de cache, loading, error, refetch |
| Formularios | React Hook Form + Zod para validación |
| UI base | Componentes propios sobre primitivos (Radix UI para accesibilidad) |
| Styling | Tailwind CSS o CSS Modules (consistente en todo el proyecto) |
| Animaciones | Framer Motion para transiciones de página y elementos complejos; CSS para microinteracciones simples |
| Cliente API | Generado desde `openapi.json` con `openapi-typescript` o `orval` |
| Mocking | MSW (Mock Service Worker) — ver sección 12 |

### Principios de arquitectura frontend

**1. El frontend es tonto en lógica de negocio.**
No calcules estados de cumplimiento, no determines si un trámite está vencido, no inferas qué documentos faltan. Todo eso lo devuelve el backend. El frontend solo renderiza lo que recibe.

**2. React Query como capa de datos.**
Todos los datos remotos pasan por React Query. Nada se guarda en estado local si viene del servidor. Esto garantiza que la UI siempre refleje el estado real del backend y facilita el refetch automático.

**3. Componentes pequeños y componibles.**
Seguir el patrón: `Page → Section → Component → Primitive`. Las páginas solo ensamblan secciones. Las secciones contienen lógica de layout. Los componentes son reutilizables y sin side effects de datos.

**4. Separación estricta de capas:**
```
/src
  /api          → cliente generado + hooks de React Query
  /components   → componentes reutilizables de UI
  /pages        → una carpeta por ruta principal
  /layouts      → layouts de aplicación (AppLayout, AuthLayout)
  /stores       → estado global (Zustand) solo para UI state (sidebar, modales abiertos)
  /hooks        → custom hooks
  /lib          → utilidades, constantes, helpers de formato
  /mocks        → handlers de MSW
  /types        → tipos TypeScript derivados del OpenAPI
```

**5. TypeScript estricto.**
Todo el proyecto en TypeScript. Los tipos de entidades deben derivarse del `openapi.json` del backend, nunca definirse manualmente en el frontend.

---

## 5. Estructura de navegación

### Layout general

La aplicación usa un **layout de dos columnas**: sidebar fijo a la izquierda + área de contenido a la derecha.

```
┌─────────────────────────────────────────────────────┐
│  [Logo Vertiche]                    [User] [Alerts] │  ← Header (48px)
├──────────┬──────────────────────────────────────────┤
│          │                                          │
│ Sidebar  │  Contenido principal                     │
│ (220px)  │                                          │
│          │                                          │
│ Nav      │                                          │
│ items    │                                          │
│          │                                          │
└──────────┴──────────────────────────────────────────┘
```

### Sidebar — Items de navegación

```
VERTICHE
────────────────
▸ Dashboard         /dashboard
▸ Tiendas           /tiendas
▸ Trámites          /tramites
▸ Alertas           /alertas        [badge con count de alertas críticas]
▸ Documentos        /documentos
────────────────
  [Ícono usuario]  Nombre del usuario
  [Rol]
```

El sidebar es colapsable a íconos para maximizar el área de contenido. El estado de colapso se persiste en localStorage.

### Breadcrumbs

Presentes en todas las páginas de detalle. Ejemplo:
```
Tiendas  /  Tienda Centro Monterrey  /  Expediente  /  Licencia de Funcionamiento
```

### Rutas del MVP

| Ruta | Descripción |
|---|---|
| `/` | Redirige a `/dashboard` |
| `/dashboard` | Vista general de cumplimiento |
| `/tiendas` | Listado y búsqueda de tiendas |
| `/tiendas/:id` | Ficha de tienda + expediente |
| `/tiendas/:id/tramites/:tramiteId` | Detalle de un trámite específico |
| `/tramites` | Vista global de todos los trámites (filtrable) |
| `/alertas` | Centro de alertas |
| `/documentos` | Vista global de documentos cargados |
| `/login` | Autenticación |

---

## 6. Entidades de datos clave

Estas son las entidades centrales del sistema. Los campos exactos deben derivarse del `openapi.json` del backend; esto es una descripción funcional para guiar decisiones de UI.

### `Tienda`
Unidad mínima de gestión. Representa una sucursal física de Vertiche.

```typescript
{
  id: string
  nombre: string
  estado: string           // Estado de México (ej. "Jalisco")
  municipio: string
  direccion: string
  marcas: string[]         // Marcas que operan en esa tienda (solo dato)
  cumplimiento: number     // % calculado por el backend (0-100)
  estado_cumplimiento: 'vigente' | 'en_riesgo' | 'critico'
  total_tramites: number
  tramites_vencidos: number
  tramites_por_vencer: number
}
```

### `Tramite`
Representa un permiso o licencia específica que una tienda debe mantener vigente.

```typescript
{
  id: string
  tienda_id: string
  nombre: string           // Ej. "Licencia de Funcionamiento"
  tipo: string             // Ej. "municipal", "federal", "estatal"
  estado: TramiteEstado
  fecha_inicio: string     // ISO 8601
  fecha_vencimiento: string
  es_recurrente: boolean
  periodo_recurrencia?: string  // Ej. "anual", "bianual"
  observaciones: Observacion[]
  documentos: Documento[]
  historial: HistorialItem[]
  asignado_a?: string      // usuario_id responsable
}

type TramiteEstado = 
  | 'pendiente_documentacion'
  | 'en_revision'
  | 'presentado'
  | 'en_espera_resolucion'
  | 'vigente'
  | 'por_vencer'           // dentro del umbral de alerta
  | 'vencido'
```

### `Expediente`
Agrupación de todos los trámites de una tienda. Existe como entidad explícita en el backend.

```typescript
{
  id: string
  tienda_id: string
  tramites: Tramite[]
  cumplimiento: number
  ultima_actualizacion: string
}
```

### `Documento`
Archivo PDF asociado a uno o más trámites.

```typescript
{
  id: string
  tramite_ids: string[]    // Puede asociarse a más de un trámite
  nombre_archivo: string
  url: string              // URL firmada para descarga
  estado_ocr: 'procesando' | 'completado' | 'baja_confianza' | 'error'
  datos_extraidos?: {
    fecha_vigencia?: string
    numero_permiso?: string
    referencia_pago?: string
    domicilio?: string
    [key: string]: string | undefined
  }
  requiere_revision_manual: boolean
  cargado_por: string      // usuario_id
  cargado_en: string       // ISO 8601
}
```

### `Alerta`
Generada por el motor de reglas del backend.

```typescript
{
  id: string
  tipo: 'vencimiento_proximo' | 'vencido' | 'inconsistencia' | 'baja_confianza_ocr'
  severidad: 'info' | 'warning' | 'critical'
  tienda_id: string
  tramite_id?: string
  documento_id?: string
  mensaje: string
  fecha_generacion: string
  silenciada: boolean
  silenciada_hasta?: string
  silenciada_por?: string
}
```

### `HistorialItem`
Registro de auditoría de cada acción sobre un trámite o documento.

```typescript
{
  id: string
  entidad_tipo: 'tramite' | 'documento'
  entidad_id: string
  accion: string           // Ej. "documento_cargado", "estado_cambiado", "datos_modificados"
  usuario_id: string
  usuario_nombre: string
  fecha: string
  detalle?: string         // Descripción adicional
  valor_anterior?: unknown
  valor_nuevo?: unknown
}
```

---

## 7. Pantallas del MVP

### 7.1 Dashboard (`/dashboard`)

**Propósito:** Vista general del estado de cumplimiento de toda la red. Primera pantalla al entrar.

**Secciones:**

#### Métricas globales (fila superior)
Cuatro tarjetas de número grande con etiqueta:
- **Tiendas totales** — número absoluto
- **En cumplimiento** — número + porcentaje del total
- **Por vencer** — número de tiendas con al menos un trámite por vencer
- **En riesgo crítico** — número de tiendas con al menos un trámite vencido

Cada tarjeta usa el color del sistema de estados correspondiente. Las tarjetas de "Por vencer" y "En riesgo crítico" son clickeables y filtran la tabla inferior.

#### Visualización de cumplimiento por estado (elemento "wow")
Mapa SVG de México con los 32 estados. Cada estado recibe un color basado en el nivel de cumplimiento agregado de sus tiendas:
- Verde oscuro: >85% cumplimiento
- Ámbar: 60–85%
- Rojo oscuro: <60%
- Gris claro: sin tiendas en ese estado

Interacciones:
- Hover: tooltip con nombre del estado, # tiendas, % cumplimiento, # trámites críticos
- Click: navega a `/tiendas?estado=[nombre]` (lista de tiendas de ese estado)
- Transición de color animada con CSS (fill transition 300ms)

Si el mapa SVG no está disponible en el MVP, reemplazar con un gráfico de barras horizontales ordenadas por nivel de cumplimiento (de peor a mejor), con la misma lógica de color. El gráfico debe ser igualmente clickeable para filtrar.

#### Alertas recientes
Lista de las últimas 10 alertas activas (no silenciadas), ordenadas por severidad y luego por fecha. Cada fila muestra:
- Ícono de severidad (color del sistema)
- Mensaje de la alerta
- Nombre de la tienda (link a `/tiendas/:id`)
- Tiempo relativo (ej. "hace 2 días")
- Botón "Ver todas" → `/alertas`

#### Trámites próximos a vencer
Tabla compacta de los 10 trámites más urgentes por vencer. Columnas:
- Tienda
- Nombre del trámite
- Fecha de vencimiento
- Días restantes (con color del sistema)
- Estado

---

### 7.2 Listado de tiendas (`/tiendas`)

**Propósito:** Encontrar y acceder a cualquier tienda de la red.

**Controles superiores:**
- Buscador por nombre de tienda (búsqueda en tiempo real, debounce 300ms)
- Filtro por estado de México (dropdown de selección única)
- Filtro por estado de cumplimiento (`vigente` / `en_riesgo` / `critico`)
- Ordenamiento: por nombre, por % cumplimiento, por trámites vencidos

**Vista de resultados:**
Tabla con las siguientes columnas:
- Nombre de tienda
- Estado (geográfico)
- Municipio
- % Cumplimiento (barra de progreso visual + número)
- Trámites vigentes / por vencer / vencidos (tres badges de conteo con color)
- Última actualización

Cada fila es clickeable → `/tiendas/:id`

**Estados vacíos:**
- Sin resultados de búsqueda: mensaje claro + botón para limpiar filtros
- Cargando: skeleton de 8 filas
- Error de red: mensaje con botón de reintento

**Paginación:** 25 tiendas por página. Paginación con número de página + navegación anterior/siguiente. El backend maneja la paginación; el frontend solo envía `page` y `page_size`.

---

### 7.3 Ficha de tienda (`/tiendas/:id`)

**Propósito:** Ver el estado completo del expediente de una tienda y gestionar sus trámites y documentos.

**Header de la tienda:**
- Nombre de la tienda (grande)
- Estado y municipio
- Marcas que operan en ella
- Badge de estado de cumplimiento general
- % de cumplimiento con indicador visual circular o barra

**Tabs principales:**
```
[ Expediente ]  [ Documentos ]  [ Alertas ]  [ Historial ]
```

#### Tab: Expediente
Lista de todos los trámites de la tienda, agrupados por tipo (federal, estatal, municipal) o en una sola lista filtrable.

Cada trámite se muestra como una fila o tarjeta con:
- Nombre del trámite
- Estado actual (badge con color del sistema)
- Fecha de vencimiento
- Días restantes o días vencido
- Botón "Ver detalle" → `/tiendas/:id/tramites/:tramiteId`

Filtros dentro del tab: por estado del trámite, por tipo jurisdiccional.

#### Tab: Documentos
Lista de todos los documentos cargados en el expediente de esta tienda.

Cada documento muestra:
- Nombre del archivo
- Estado OCR (badge: procesando / completado / baja confianza / error)
- Trámites asociados (links)
- Quién lo cargó y cuándo
- Botón de descarga
- Si `requiere_revision_manual === true`: banner de advertencia amarillo con acción "Revisar"

Botón principal (visible para ADMIN y OPERATOR): **"Cargar documento"** → abre modal de carga.

#### Tab: Alertas
Alertas activas específicas de esta tienda. Misma estructura que el centro de alertas pero filtrado. Permite silenciar alertas desde aquí.

#### Tab: Historial
Log cronológico de todas las acciones sobre el expediente de esta tienda. Muestra quién hizo qué y cuándo. Solo lectura.

---

### 7.4 Detalle de trámite (`/tiendas/:id/tramites/:tramiteId`)

**Propósito:** Ver y gestionar un trámite específico en profundidad.

**Secciones:**

**Información del trámite:**
- Nombre, tipo, jurisdicción
- Estado actual (badge editable por ADMIN)
- Fechas de inicio y vencimiento
- Indicador de recurrencia si aplica
- Campo de asignado a (usuario responsable)

**Observaciones del motor de reglas:**
Si el expediente tiene observaciones, aparecen como una sección destacada con:
- Descripción de la observación
- Severidad
- Botón "Escalar a alerta" (solo ADMIN) — convierte la observación en una alerta activa

**Documentos asociados:**
Lista de documentos vinculados a este trámite específico. Botón para asociar documentos existentes del expediente o cargar uno nuevo.

**Datos extraídos por OCR:**
Si hay documentos con OCR completado, tabla de datos extraídos:
- Campo (ej. "Fecha de vigencia")
- Valor extraído
- Botón de edición (solo ADMIN) — abre inline edit o modal de corrección

Si el estado OCR es `baja_confianza`, cada campo tiene un ícono de advertencia y la sección tiene un banner que recomienda revisión manual.

**Historial del trámite:**
Timeline vertical de todas las acciones sobre este trámite, con fecha, usuario y descripción.

---

### 7.5 Vista global de trámites (`/tramites`)

**Propósito:** Vista cruzada de todos los trámites de toda la red, para encontrar patrones, urgencias y gestión masiva.

**Filtros:**
- Búsqueda por nombre de trámite o tienda
- Filtro por estado del trámite
- Filtro por estado geográfico
- Filtro por tipo jurisdiccional (federal / estatal / municipal)
- Filtro por rango de fecha de vencimiento
- Filtro: "Solo vencidos", "Por vencer en 30 días", "Por vencer en 60 días"

**Tabla:**
Columnas: Tienda | Trámite | Tipo | Estado | Vencimiento | Días restantes | Documentos adjuntos

Clickeable por fila → `/tiendas/:id/tramites/:tramiteId`

**Ordenamiento:** Por fecha de vencimiento (default, ascendente), por tienda, por estado.

---

### 7.6 Centro de alertas (`/alertas`)

**Propósito:** Vista completa de todas las alertas activas del sistema. Es el primer lugar al que va el equipo legal al iniciar su día.

**Tabs:**
```
[ Activas ]  [ Silenciadas ]
```

**Filtros (tab Activas):**
- Por severidad (info / warning / critical)
- Por tipo de alerta
- Por estado geográfico
- Por tienda

**Cada alerta muestra:**
- Ícono y color de severidad
- Tipo de alerta
- Mensaje descriptivo
- Tienda afectada (link)
- Trámite afectado si aplica (link)
- Tiempo desde generación
- Acciones: **Ir al trámite** | **Silenciar** (abre modal)

**Modal de silenciar alerta:**
- Duración: 7 días / 15 días / 30 días / fecha personalizada
- Campo de nota opcional (queda en historial)
- Confirmación

**Tab Silenciadas:**
Lista de alertas silenciadas con fecha de expiración del silencio y quién la silenció.

---

### 7.7 Vista global de documentos (`/documentos`)

**Propósito:** Visibilidad global de todos los documentos del sistema.

**Filtros:**
- Por estado OCR
- Por `requiere_revision_manual`
- Por tienda
- Por rango de fecha de carga

**Tabla:**
Nombre | Tienda | Estado OCR | Cargado por | Fecha | Trámites asociados | Acciones

**Acciones por documento:**
- Descargar
- Ver datos extraídos
- Si `requiere_revision_manual`: botón "Revisar" → abre modal de revisión OCR

---

### 7.8 Login (`/login`)

**Propósito:** Autenticación del usuario.

Pantalla centrada, minimalista. Logo de Vertiche. Formulario de email + contraseña. Sin opciones de registro (usuarios son creados por ADMIN). Manejo de error claro si credenciales incorrectas.

Después del login exitoso, redirige a `/dashboard`.

---

## 8. Flujos operativos principales

### Flujo 1: Revisión matutina de alertas

1. Usuario entra al sistema → llega al Dashboard
2. Ve métricas globales → identifica número de tiendas en riesgo crítico
3. Ve la sección "Alertas recientes" → identifica las más urgentes
4. Click en una alerta → lo lleva al trámite afectado
5. Desde el detalle del trámite → revisa documentos y observaciones
6. Toma acción (carga documento / escala observación / silencia alerta)

**Consideraciones UX:**
- El path Dashboard → Alerta → Trámite debe ser de 2 clicks máximo
- El botón "Ir al trámite" en una alerta debe ser el CTA más prominente
- Al silenciar una alerta, no debe desaparecer abruptamente; debe moverse con animación al tab "Silenciadas"

---

### Flujo 2: Buscar una tienda y cargar un documento

1. Usuario va a `/tiendas`
2. Escribe el nombre de la tienda en el buscador
3. Click en la tienda → ficha de tienda
4. Tab "Documentos" → botón "Cargar documento"
5. Modal de carga:
   - Drag & drop o selector de archivo (PDF)
   - Campo para seleccionar los trámites a los que aplica (multi-select del expediente de la tienda)
   - Botón "Cargar"
6. Se muestra barra de progreso real del upload
7. Una vez cargado, el documento aparece en la lista con estado OCR: `procesando`
8. El estado del OCR se actualiza automáticamente (polling o WebSocket — ver sección 11)
9. Si el OCR termina con `baja_confianza`, aparece banner de advertencia en el documento

**Consideraciones UX:**
- El modal de carga debe ser grande y cómodo (no un tooltip pequeño)
- Mostrar claramente qué trámites tiene la tienda para que el usuario seleccione correctamente
- Si el archivo no es PDF, mostrar error inmediato antes de intentar el upload
- Permitir ver el archivo recién cargado desde la lista sin necesidad de descargarlo

---

### Flujo 3: Revisión y corrección de datos OCR

1. Usuario recibe notificación in-app de documento con baja confianza
2. Va al documento (desde la notificación o desde la lista de documentos)
3. Ve los datos extraídos con íconos de advertencia en los campos de baja confianza
4. Click "Revisar" → abre modal o panel lateral con:
   - Vista del PDF (si es posible renderizar en el navegador) o nombre del archivo con botón de descarga
   - Formulario con los datos extraídos, editables
   - Campo de confianza de OCR visible por campo
5. Usuario corrige los campos incorrectos
6. Click "Guardar correcciones" → se envía al backend
7. El historial del trámite registra la corrección y quién la hizo

**Consideraciones UX:**
- Este flujo es crítico para la integridad de los datos. Debe sentirse seguro y deliberado
- La corrección debe requerir confirmación si se modifican fechas de vigencia (son datos sensibles)
- Después de guardar, mostrar confirmación clara de éxito

---

### Flujo 4: Consulta ejecutiva del dashboard

1. Usuario VIEWER entra al sistema
2. Dashboard muestra métricas globales y mapa/gráfico de cumplimiento por estado
3. Hover en el mapa para explorar estados
4. Click en un estado → lista de tiendas de ese estado filtrada
5. Usuario puede ordenar y explorar pero no puede modificar nada

**Consideraciones UX:**
- Para VIEWER, todos los botones de acción están ocultos o deshabilitados (no solo bloqueados)
- El dashboard debe ser legible y comunicar el estado general en menos de 10 segundos de lectura
- Los números grandes y el mapa deben funcionar como una "pantalla de control" ejecutiva

---

## 9. Sistema de estados y semáforo

El backend determina los estados. El frontend los representa de manera consistente en toda la aplicación.

### Estados de trámite y su representación visual

| Estado | Label en UI | Color | Ícono |
|---|---|---|---|
| `pendiente_documentacion` | Pendiente | Gris | Círculo vacío |
| `en_revision` | En revisión | Azul neutro | Reloj |
| `presentado` | Presentado | Azul neutro | Flecha hacia arriba |
| `en_espera_resolucion` | En espera | Ámbar | Pausa |
| `vigente` | Vigente | Verde oscuro | Check |
| `por_vencer` | Por vencer | Ámbar | Advertencia |
| `vencido` | Vencido | Rojo oscuro | X |

### Estados de alerta

| Severidad | Color de fondo | Color de texto | Uso |
|---|---|---|---|
| `info` | Gris claro | Gris oscuro | Cambios informativos |
| `warning` | Ámbar muy claro | Ámbar oscuro | Por vencer, baja confianza OCR |
| `critical` | Rojo muy claro | Rojo oscuro | Vencido, inconsistencia grave |

### Estados OCR

| Estado | Label | Color | Acción sugerida |
|---|---|---|---|
| `procesando` | Procesando... | Gris con spinner | Esperar |
| `completado` | Procesado | Verde | — |
| `baja_confianza` | Requiere revisión | Ámbar | Botón "Revisar" |
| `error` | Error de procesamiento | Rojo | Botón "Reintentar" o "Cargar manualmente" |

### Componente Badge

Debe existir un único componente `<Badge>` que acepte `variant` y renderice de manera consistente en toda la app. Nunca definir colores de estado inline en componentes de página.

```tsx
<Badge variant="vencido">Vencido</Badge>
<Badge variant="vigente">Vigente</Badge>
<Badge variant="warning">Por vencer</Badge>
```

---

## 10. Sistema de alertas y notificaciones

### Notificaciones in-app

Existen en dos formas:

**1. Badge en el sidebar**
El ítem "Alertas" en el sidebar muestra un badge rojo con el conteo de alertas críticas no silenciadas. Se actualiza periódicamente (polling cada 60 segundos o WebSocket si está disponible).

**2. Toast notifications**
Para eventos que ocurren durante la sesión activa del usuario (ej. un documento termina de procesar, una nueva alerta crítica llega). Aparecen en la esquina superior derecha, duran 4 segundos, son dismissibles.

- Toast de éxito: verde claro, ícono de check
- Toast de error: rojo claro, ícono de X
- Toast de advertencia: ámbar claro, ícono de alerta
- Toast de info: gris claro, ícono de info

Las notificaciones de sistema (nueva alerta crítica) deben ser más prominentes que los toasts de acción del usuario. Considerar un panel lateral de notificaciones (campana en el header) que muestre el historial de notificaciones de la sesión.

### Centro de alertas

Descrito en la sección 7.6. Adicionalmente:

- Las alertas críticas deben tener un indicador visual más urgente (borde izquierdo grueso de color rojo, o fondo muy sutil de rojo claro)
- El conteo de alertas activas debe estar siempre visible mientras el usuario está en el sistema
- Silenciar una alerta nunca la elimina; solo la mueve al tab de silenciadas

---

## 11. Procesamiento asíncrono y OCR

El OCR y los agentes de validación son procesos que ocurren en el backend de manera asíncrona. El frontend debe manejar esto correctamente.

### Estrategia recomendada: Polling con React Query

Para el MVP, la estrategia más simple y robusta es polling. Una vez que un documento está en estado `procesando`, React Query hace refetch del documento cada 5 segundos hasta que el estado cambie a `completado`, `baja_confianza` o `error`.

```typescript
// Ejemplo conceptual
useQuery({
  queryKey: ['documento', documentoId],
  queryFn: () => fetchDocumento(documentoId),
  refetchInterval: (data) => 
    data?.estado_ocr === 'procesando' ? 5000 : false,
})
```

Si el backend implementa WebSockets o Server-Sent Events, el frontend puede migrar a ese modelo sin cambios en la UI.

### Estados de UI durante el procesamiento

Cuando un documento está en `procesando`:
- La fila del documento muestra un spinner sutil junto al badge de estado
- Los datos extraídos muestran un skeleton loader
- El botón "Ver datos extraídos" está deshabilitado con tooltip "El documento está siendo procesado"

Cuando termina el procesamiento:
- Si el usuario está en la pantalla, el estado se actualiza automáticamente (React Query refetch)
- Si el resultado es `baja_confianza`, aparece un toast de advertencia: "El documento [nombre] requiere revisión manual"
- Si el resultado es `completado`, aparece un toast de éxito sutil

---

## 12. Estrategia de mocking para MVP

El frontend debe poder funcionar completamente sin el backend. Usar **MSW (Mock Service Worker)** para interceptar todas las llamadas a la API y devolver datos de prueba realistas.

### Estructura de mocks

```
/src/mocks
  handlers/
    tiendas.ts
    tramites.ts
    documentos.ts
    alertas.ts
    auth.ts
  data/
    tiendas.json      // 50 tiendas de prueba distribuidas en ~15 estados
    tramites.json     // Variedad de estados de trámite
    documentos.json   // Documentos en distintos estados OCR
    alertas.json      // Mix de severidades
  browser.ts          // Setup de MSW para browser
  server.ts           // Setup de MSW para tests
```

### Datos de prueba importantes

Los datos de mock deben ser suficientemente realistas para validar la UI:

- **Tiendas:** Mínimo 50, distribuidas en al menos 10 estados. Incluir tiendas con cumplimiento alto, medio y bajo. Usar nombres de ciudades y colonias reales de México.
- **Trámites:** Incluir ejemplos de todos los estados posibles, incluyendo trámites ya vencidos y trámites por vencer en los próximos 7, 15 y 30 días.
- **Documentos:** Incluir documentos en todos los estados OCR, incluyendo varios con `baja_confianza` y `requiere_revision_manual: true`.
- **Alertas:** Mínimo 20 alertas de prueba, con mix de severidades.

### Variable de entorno

```env
VITE_USE_MOCKS=true   # Activa MSW en desarrollo
VITE_API_URL=https://api.vertiche.com
```

MSW solo se activa si `VITE_USE_MOCKS=true`. El switch entre mock y API real no debe requerir ningún cambio de código.

---

## 13. Integración con el backend (FastAPI / OpenAPI)

### Generación del cliente

Una vez que el backend exponga el `openapi.json`, el cliente HTTP del frontend debe generarse automáticamente usando `orval` o `openapi-typescript-codegen`:

```bash
npx orval --input https://api.vertiche.com/openapi.json --output src/api
```

Esto genera:
- Tipos TypeScript para todas las entidades
- Funciones de fetch tipadas para cada endpoint
- (Opcionalmente) hooks de React Query por endpoint

### Autenticación

El backend define el mecanismo. El frontend debe soportar:
- JWT almacenado en `httpOnly cookie` (preferido por seguridad) o en memoria (no en localStorage)
- Interceptor de peticiones que agrega el token en el header `Authorization: Bearer {token}`
- Interceptor de respuesta que detecta 401 y redirige a `/login`
- Refresh de token transparente si el backend lo soporta

### Manejo de errores HTTP

| Código | Comportamiento en UI |
|---|---|
| 400 | Mostrar mensaje de error de validación en el formulario correspondiente |
| 401 | Redirigir a `/login` |
| 403 | Mostrar mensaje "No tienes permisos para esta acción" (toast error) |
| 404 | Mostrar pantalla de "No encontrado" con link de regreso |
| 422 | Mapear errores de validación de FastAPI a campos del formulario |
| 500 | Toast de error genérico + botón "Reintentar" si aplica |
| Network error | Toast de error de conectividad con reintento automático (React Query) |

---

## 14. Comportamiento responsive y plataforma objetivo

### Plataforma primaria

**Desktop**, resoluciones desde 1280px de ancho. El equipo legal usa la aplicación en computadoras de escritorio o laptops.

### Comportamiento en pantallas menores

- **1024–1279px:** Sidebar se colapsa automáticamente a íconos. El contenido se ajusta.
- **768–1023px:** Layout de una columna, sidebar se convierte en drawer (hamburger menu).
- **< 768px:** No es prioridad del MVP. La app puede no estar optimizada para móvil. Mostrar un banner que recomiende usar en desktop si la pantalla es menor a 768px.

---

## 15. Glosario

| Término | Definición en el contexto de Vertiche |
|---|---|
| **Tienda** | Sucursal física de Vertiche donde operan una o más marcas |
| **Expediente** | Conjunto de todos los trámites y documentos de una tienda |
| **Trámite** | Permiso, licencia u obligación legal que una tienda debe mantener vigente |
| **Documento** | Archivo PDF cargado al sistema, asociado a uno o más trámites |
| **OCR** | Proceso automático de extracción de datos del documento (fecha de vigencia, número de permiso, etc.) |
| **Motor de reglas** | Componente del backend que valida expedientes, detecta inconsistencias y genera alertas |
| **ETL** | Proceso automático que extrae requisitos regulatorios de fuentes gubernamentales |
| **Alerta** | Notificación generada por el motor de reglas ante un vencimiento próximo, vencimiento, o inconsistencia |
| **Silenciar alerta** | Acción de posponer temporalmente una alerta, con duración y nota de justificación |
| **Cumplimiento** | Porcentaje de trámites vigentes sobre el total requerido para una tienda o región |
| **Baja confianza OCR** | Condición en la que el sistema no pudo leer el documento con suficiente certeza y recomienda revisión manual |
| **Observación** | Resultado del motor de reglas al detectar una inconsistencia en un expediente |
| **Historial** | Log de auditoría cronológico de todas las acciones sobre un trámite o expediente |

---

*Fin del documento. Versión 1.0 — MVP de Vertiche Legal Compliance Platform.*
