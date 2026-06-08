// Types for the Vertiche Legal Compliance Platform
// These mirror the backend entities described in the docs.
// Once the OpenAPI spec is available, these should be auto-generated.

export type UserRole = 'ADMIN' | 'OPERATOR' | 'VIEWER';

export interface User {
  id: string;
  nombre: string;
  email: string;
  rol: UserRole;
  tiendas_asignadas?: string[];
  fecha_creacion: string;
  estado: 'activo' | 'inactivo';
}

export type TramiteEstado =
  | 'pendiente_documentacion'
  | 'en_revision'
  | 'presentado'
  | 'en_espera_resolucion'
  | 'vigente'
  | 'por_vencer'
  | 'vencido';

export type EstadoCumplimiento = 'vigente' | 'en_riesgo' | 'critico';

export interface Tienda {
  id: string;
  nombre: string;
  estado: string;
  municipio: string;
  direccion: string;
  marcas: string[];
  cumplimiento: number;
  estado_cumplimiento: EstadoCumplimiento;
  total_tramites: number;
  tramites_vencidos: number;
  tramites_por_vencer: number;
  ultima_actualizacion: string;
}

export interface Tramite {
  id: string;
  tienda_id: string;
  tienda_nombre?: string;
  nombre: string;
  tipo: 'federal' | 'estatal' | 'municipal';
  estado: TramiteEstado;
  fecha_inicio: string;
  fecha_vencimiento: string;
  es_permanente?: boolean;
  es_recurrente: boolean;
  periodo_recurrencia?: string;
  observaciones: Observacion[];
  documentos: Documento[];
  historial: HistorialItem[];
  asignado_a?: string;
}

export type EstadoOCR = 'procesando' | 'completado' | 'baja_confianza' | 'error';

export interface OCRExtractedField {
  value: string;
  confidence: number;
}

export interface Documento {
  id: string;
  tramite_ids: string[];
  tramite_nombres?: string[];
  nombre_archivo: string;
  url: string;
  estado_ocr: EstadoOCR;
  datos_extraidos?: Record<string, OCRExtractedField>;
  requiere_revision_manual: boolean;
  cargado_por: string;
  cargado_por_nombre?: string;
  cargado_en: string;
  tienda_id?: string;
  tienda_nombre?: string;
}

export type AlertaSeveridad = 'info' | 'warning' | 'critical';
export type AlertaTipo = 'vencimiento_proximo' | 'vencido' | 'inconsistencia' | 'baja_confianza_ocr';

export interface Alerta {
  id: string;
  tipo: AlertaTipo;
  severidad: AlertaSeveridad;
  tienda_id: string;
  tienda_nombre?: string;
  tramite_id?: string;
  tramite_nombre?: string;
  documento_id?: string;
  mensaje: string;
  fecha_generacion: string;
  silenciada: boolean;
  silenciada_hasta?: string;
  silenciada_por?: string;
  resuelta: boolean;
  fecha_resolucion?: string;
  resuelta_por?: string;
  notificaciones_enviadas?: {
    email: boolean;
    whatsapp: boolean;
  };
}

export interface Observacion {
  id: string;
  descripcion: string;
  severidad: AlertaSeveridad;
  fecha: string;
}

export interface HistorialItem {
  id: string;
  entidad_tipo: 'tramite' | 'documento';
  entidad_id: string;
  accion: string;
  usuario_id: string;
  usuario_nombre: string;
  fecha: string;
  detalle?: string;
  valor_anterior?: unknown;
  valor_nuevo?: unknown;
}

export interface Expediente {
  id: string;
  tienda_id: string;
  tramites: Tramite[];
  cumplimiento: number;
  ultima_actualizacion: string;
}

// Dashboard-specific types
export interface DashboardMetrics {
  total_tiendas: number;
  en_cumplimiento: number;
  por_vencer: number;
  en_riesgo_critico: number;
  porcentaje_cumplimiento: number;
}

export interface CumplimientoEstado {
  estado: string;
  total_tiendas: number;
  cumplimiento: number;
  tramites_criticos: number;
}

// Pagination
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// Auth
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface MetricTrend {
  value: number;
  previous_value: number;
  trend: 'up' | 'down' | 'neutral';
}

export interface OperatorPerformanceMetrics {
  documentos_cargados: MetricTrend;
  tramites_resueltos: MetricTrend;
  alertas_atendidas: MetricTrend;
  tiempo_promedio_resolucion: MetricTrend;
  tramites_vencidos_responsabilidad: MetricTrend;
}

export interface ActivityTimelineItem {
  id: string;
  accion: string;
  fecha: string;
  tienda_id: string;
  tienda_nombre: string;
  tramite_id?: string;
  tramite_nombre?: string;
}

export interface OperatorPerformanceData {
  metrics: OperatorPerformanceMetrics;
  timeline: ActivityTimelineItem[];
}
