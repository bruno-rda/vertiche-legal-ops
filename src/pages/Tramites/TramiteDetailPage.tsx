import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { api } from '@/api/client';
import type { Tramite } from '@/types';
import { Badge } from '@/components/Badge';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Skeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { formatDate, daysRemaining } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { Calendar, RotateCcw, User, AlertTriangle, FileText, Clock } from 'lucide-react';

export function TramiteDetailPage() {
  const { id, tramiteId } = useParams<{ id: string; tramiteId: string }>();
  const user = useAuthStore(s => s.user);

  const { data: tramite, isLoading } = useQuery({
    queryKey: ['tramite', tramiteId],
    queryFn: () => api.get<Tramite>(`/api/tramites/${tramiteId}`),
  });

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton variant="card" count={3} /></div>;
  if (!tramite) return <EmptyState variant="error" title="Trámite no encontrado" />;

  const days = daysRemaining(tramite.fecha_vencimiento);
  const isAdmin = user?.rol === 'ADMIN';

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: 'Tiendas', href: '/tiendas' },
        { label: tramite.tienda_nombre || 'Tienda', href: `/tiendas/${id}` },
        { label: tramite.nombre },
      ]} />

      {/* Header card */}
      <div className="bg-surface-card rounded-xl border border-border p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="font-display text-2xl text-text-primary">{tramite.nombre}</h1>
              <Badge variant={tramite.estado} dot />
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-text-secondary">
              <span className="capitalize flex items-center gap-1"><FileText className="w-4 h-4" />{tramite.tipo}</span>
              <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />Vence: {formatDate(tramite.fecha_vencimiento)}</span>
              {tramite.es_recurrente && <span className="flex items-center gap-1"><RotateCcw className="w-4 h-4" />{tramite.periodo_recurrencia}</span>}
              {tramite.asignado_a && <span className="flex items-center gap-1"><User className="w-4 h-4" />Asignado</span>}
            </div>
          </div>
          <div className="text-right">
            <p className={`text-lg font-semibold ${days < 0 ? 'text-danger' : days <= 15 ? 'text-warning' : 'text-success'}`}>
              {days < 0 ? `${Math.abs(days)} días vencido` : days === 0 ? 'Vence hoy' : `${days} días restantes`}
            </p>
          </div>
        </div>
      </div>

      {/* Observaciones */}
      {tramite.observaciones && tramite.observaciones.length > 0 && (
        <div className="bg-surface-card rounded-xl border border-border p-6">
          <h2 className="text-base font-semibold text-text-primary mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />Observaciones
          </h2>
          <div className="space-y-3">
            {tramite.observaciones.map(obs => (
              <div key={obs.id} className="flex items-start gap-3 p-3 bg-warning-light/50 rounded-lg border border-warning/10">
                <div className="flex-1">
                  <p className="text-sm text-text-primary">{obs.descripcion}</p>
                  <p className="text-xs text-text-muted mt-1">{formatDate(obs.fecha)}</p>
                </div>
                <Badge variant={obs.severidad} size="sm" />
                {isAdmin && (
                  <button className="text-xs font-medium text-warning hover:text-warning-muted transition-colors">
                    Escalar a alerta
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historial */}
      {tramite.historial && tramite.historial.length > 0 && (
        <div className="bg-surface-card rounded-xl border border-border p-6">
          <h2 className="text-base font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-text-muted" />Historial
          </h2>
          <div className="relative pl-6 border-l-2 border-border space-y-4">
            {tramite.historial.map(h => (
              <div key={h.id} className="relative">
                <div className="absolute -left-[25px] w-3 h-3 rounded-full bg-surface-card border-2 border-border" />
                <p className="text-sm text-text-primary">{h.detalle || h.accion}</p>
                <p className="text-xs text-text-muted mt-0.5">{h.usuario_nombre} · {formatDate(h.fecha)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
