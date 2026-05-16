import type { TramiteEstado, AlertaSeveridad, EstadoOCR, EstadoCumplimiento } from '@/types';

/**
 * Format a date string to a localized Spanish date
 */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Get relative time string in Spanish (e.g., "hace 2 días")
 */
export function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'hace un momento';
  if (diffMins < 60) return `hace ${diffMins} min`;
  if (diffHours < 24) return `hace ${diffHours}h`;
  if (diffDays === 1) return 'hace 1 día';
  if (diffDays < 30) return `hace ${diffDays} días`;
  if (diffDays < 365) return `hace ${Math.floor(diffDays / 30)} meses`;
  return `hace ${Math.floor(diffDays / 365)} años`;
}

/**
 * Calculate days remaining until a date. Negative means overdue.
 */
export function daysRemaining(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / 86400000);
}

/**
 * Spanish labels for trámite states
 */
export const TRAMITE_ESTADO_LABELS: Record<TramiteEstado, string> = {
  pendiente_documentacion: 'Pendiente',
  en_revision: 'En revisión',
  presentado: 'Presentado',
  en_espera_resolucion: 'En espera',
  vigente: 'Vigente',
  por_vencer: 'Por vencer',
  vencido: 'Vencido',
};

/**
 * Spanish labels for alert severities
 */
export const SEVERIDAD_LABELS: Record<AlertaSeveridad, string> = {
  info: 'Información',
  warning: 'Advertencia',
  critical: 'Crítico',
};

/**
 * Spanish labels for OCR states
 */
export const OCR_ESTADO_LABELS: Record<EstadoOCR, string> = {
  procesando: 'Procesando...',
  completado: 'Procesado',
  baja_confianza: 'Requiere revisión',
  error: 'Error de procesamiento',
};

/**
 * Spanish labels for compliance states
 */
export const CUMPLIMIENTO_LABELS: Record<EstadoCumplimiento, string> = {
  vigente: 'En cumplimiento',
  en_riesgo: 'En riesgo',
  critico: 'Crítico',
};

/**
 * Truncate a string to a max length with ellipsis
 */
export function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max) + '...';
}

/**
 * Format percentage
 */
export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}
