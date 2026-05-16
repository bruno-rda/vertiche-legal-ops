import type { TramiteEstado, AlertaSeveridad, EstadoOCR, EstadoCumplimiento } from '@/types';
import { TRAMITE_ESTADO_LABELS, SEVERIDAD_LABELS, OCR_ESTADO_LABELS, CUMPLIMIENTO_LABELS } from '@/lib/utils';

type BadgeVariant =
  | TramiteEstado
  | AlertaSeveridad
  | EstadoOCR
  | EstadoCumplimiento
  | 'default';

const variantStyles: Record<string, string> = {
  // Tramite states
  pendiente_documentacion: 'bg-neutral-light text-text-secondary',
  en_revision: 'bg-blue-light text-blue',
  presentado: 'bg-blue-light text-blue',
  en_espera_resolucion: 'bg-warning-light text-warning',
  vigente: 'bg-success-light text-success',
  por_vencer: 'bg-warning-light text-warning',
  vencido: 'bg-danger-light text-danger',

  // Alert severities
  info: 'bg-info-light text-info',
  warning: 'bg-warning-light text-warning',
  critical: 'bg-danger-light text-danger',

  // OCR states
  procesando: 'bg-neutral-light text-text-secondary',
  completado: 'bg-success-light text-success',
  baja_confianza: 'bg-warning-light text-warning',
  error: 'bg-danger-light text-danger',

  // Compliance
  en_riesgo: 'bg-warning-light text-warning',
  critico: 'bg-danger-light text-danger',

  default: 'bg-neutral-light text-text-secondary',
};

// Mapping from variant to label — aggregated from all label sets
const variantLabels: Record<string, string> = {
  ...TRAMITE_ESTADO_LABELS,
  ...SEVERIDAD_LABELS,
  ...OCR_ESTADO_LABELS,
  ...CUMPLIMIENTO_LABELS,
};

interface BadgeProps {
  variant: BadgeVariant;
  children?: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md';
  dot?: boolean;
}

export function Badge({ variant, children, className = '', size = 'md', dot = false }: BadgeProps) {
  const styles = variantStyles[variant] || variantStyles.default;
  const sizeClass = size === 'sm' ? 'text-[11px] px-1.5 py-0.5' : 'text-xs px-2.5 py-1';
  const label = children || variantLabels[variant] || variant;

  return (
    <span
      className={`inline-flex items-center gap-1 font-medium rounded-full whitespace-nowrap transition-colors duration-200 ${styles} ${sizeClass} ${className}`}
    >
      {dot && (
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      )}
      {label}
    </span>
  );
}
