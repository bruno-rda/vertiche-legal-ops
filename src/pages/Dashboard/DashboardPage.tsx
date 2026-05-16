import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useNavigate } from 'react-router-dom';
import type { DashboardMetrics, CumplimientoEstado, Alerta, Tramite } from '@/types';
import { Badge } from '@/components/Badge';
import { ProgressBar } from '@/components/ProgressBar';
import { Skeleton } from '@/components/Skeleton';
import { formatDate, daysRemaining, timeAgo, formatPercent } from '@/lib/utils';
import {
  Store, CheckCircle, AlertTriangle, XCircle,
  ArrowRight, Clock,
} from 'lucide-react';

export function DashboardPage() {
  const navigate = useNavigate();

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['dashboard', 'metrics'],
    queryFn: () => api.get<DashboardMetrics>('/api/dashboard/metrics'),
  });

  const { data: cumplimiento, isLoading: cumplimientoLoading } = useQuery({
    queryKey: ['dashboard', 'cumplimiento-por-estado'],
    queryFn: () => api.get<CumplimientoEstado[]>('/api/dashboard/cumplimiento-por-estado'),
  });

  const { data: alertas, isLoading: alertasLoading } = useQuery({
    queryKey: ['dashboard', 'alertas-recientes'],
    queryFn: () => api.get<Alerta[]>('/api/dashboard/alertas-recientes'),
  });

  const { data: tramites, isLoading: tramitesLoading } = useQuery({
    queryKey: ['dashboard', 'tramites-proximos'],
    queryFn: () => api.get<Tramite[]>('/api/dashboard/tramites-proximos'),
  });

  return (
    <div className="space-y-8">
      {/* Page title */}
      <div>
        <h1 className="font-display text-3xl text-text-primary">Dashboard</h1>
        <p className="text-sm text-text-secondary mt-1">
          Vista general del cumplimiento legal de la red
        </p>
      </div>

      {/* Metric cards */}
      {metricsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-surface-card rounded-xl border border-border p-5">
              <Skeleton className="h-8 w-20 mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
      ) : metrics ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            icon={Store}
            value={metrics.total_tiendas}
            label="Tiendas totales"
            color="text-text-primary"
            bgColor="bg-neutral-light"
          />
          <MetricCard
            icon={CheckCircle}
            value={metrics.en_cumplimiento}
            label="En cumplimiento"
            subtitle={formatPercent(metrics.porcentaje_cumplimiento)}
            color="text-success"
            bgColor="bg-success-light"
          />
          <MetricCard
            icon={AlertTriangle}
            value={metrics.por_vencer}
            label="Por vencer"
            color="text-warning"
            bgColor="bg-warning-light"
            onClick={() => navigate('/tiendas?estado_cumplimiento=en_riesgo')}
          />
          <MetricCard
            icon={XCircle}
            value={metrics.en_riesgo_critico}
            label="En riesgo crítico"
            color="text-danger"
            bgColor="bg-danger-light"
            onClick={() => navigate('/tiendas?estado_cumplimiento=critico')}
          />
        </div>
      ) : null}

      {/* Compliance by state chart */}
      <div className="bg-surface-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              Cumplimiento por estado
            </h2>
            <p className="text-sm text-text-secondary mt-0.5">
              Nivel de cumplimiento agregado por estado geográfico
            </p>
          </div>
        </div>

        {cumplimientoLoading ? (
          <Skeleton count={8} className="h-8" />
        ) : cumplimiento && cumplimiento.length > 0 ? (
          <div className="space-y-3">
            {cumplimiento.map((c) => (
              <button
                key={c.estado}
                onClick={() => navigate(`/tiendas?estado=${encodeURIComponent(c.estado)}`)}
                className="w-full flex items-center gap-4 group hover:bg-surface rounded-lg px-3 py-2 -mx-3 transition-colors"
              >
                <span className="text-sm font-medium text-text-primary w-36 text-left truncate">
                  {c.estado}
                </span>
                <div className="flex-1">
                  <ProgressBar value={c.cumplimiento} size="sm" />
                </div>
                <span className="text-sm font-semibold text-text-primary w-12 text-right">
                  {c.cumplimiento}%
                </span>
                <span className="text-xs text-text-muted w-20 text-right">
                  {c.total_tiendas} tienda{c.total_tiendas !== 1 ? 's' : ''}
                </span>
                {c.tramites_criticos > 0 && (
                  <Badge variant="critical" size="sm">
                    {c.tramites_criticos} crít.
                  </Badge>
                )}
                <ArrowRight className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* Bottom row: Alerts + Expirations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent alerts */}
        <div className="bg-surface-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-text-primary">
              Alertas recientes
            </h2>
            <button
              onClick={() => navigate('/alertas')}
              className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1"
            >
              Ver todas
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {alertasLoading ? (
            <Skeleton count={5} className="h-12" />
          ) : alertas && alertas.length > 0 ? (
            <div className="space-y-1">
              {alertas.map((alerta) => (
                <div
                  key={alerta.id}
                  className="flex items-start gap-3 px-3 py-3 rounded-lg hover:bg-surface transition-colors cursor-pointer -mx-3"
                  onClick={() => {
                    if (alerta.tramite_id) {
                      navigate(`/tiendas/${alerta.tienda_id}/tramites/${alerta.tramite_id}`);
                    } else {
                      navigate(`/tiendas/${alerta.tienda_id}`);
                    }
                  }}
                >
                  <SeverityIcon severidad={alerta.severidad} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary line-clamp-2">
                      {alerta.mensaje}
                    </p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {alerta.tienda_nombre} · {timeAgo(alerta.fecha_generacion)}
                    </p>
                  </div>
                  <Badge variant={alerta.severidad} size="sm" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted py-8 text-center">
              No hay alertas activas
            </p>
          )}
        </div>

        {/* Upcoming expirations */}
        <div className="bg-surface-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-text-primary">
              Trámites próximos a vencer
            </h2>
            <button
              onClick={() => navigate('/tramites?solo_vencidos=false&por_vencer_dias=30')}
              className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1"
            >
              Ver todos
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {tramitesLoading ? (
            <Skeleton count={5} className="h-12" />
          ) : tramites && tramites.length > 0 ? (
            <div className="space-y-1">
              {tramites.map((tramite) => {
                const days = daysRemaining(tramite.fecha_vencimiento);
                return (
                  <div
                    key={tramite.id}
                    className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-surface transition-colors cursor-pointer -mx-3"
                    onClick={() => navigate(`/tiendas/${tramite.tienda_id}/tramites/${tramite.id}`)}
                  >
                    <Clock className="w-4 h-4 text-text-muted shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {tramite.nombre}
                      </p>
                      <p className="text-xs text-text-muted truncate">
                        {tramite.tienda_nombre}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-text-muted">
                        {formatDate(tramite.fecha_vencimiento)}
                      </p>
                      <p className={`text-xs font-semibold ${
                        days < 0 ? 'text-danger' : days <= 15 ? 'text-warning' : 'text-text-secondary'
                      }`}>
                        {days < 0
                          ? `${Math.abs(days)} días vencido`
                          : days === 0
                            ? 'Vence hoy'
                            : `${days} días restantes`
                        }
                      </p>
                    </div>
                    <Badge variant={tramite.estado} size="sm" />
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-text-muted py-8 text-center">
              No hay trámites próximos a vencer
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Sub-components ---

function MetricCard({
  icon: Icon,
  value,
  label,
  subtitle,
  color,
  bgColor,
  onClick,
}: {
  icon: React.ElementType;
  value: number;
  label: string;
  subtitle?: string;
  color: string;
  bgColor: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-surface-card rounded-xl border border-border p-5 transition-all ${
        onClick
          ? 'cursor-pointer hover:shadow-card-hover hover:border-border-strong'
          : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="font-display text-3xl text-text-primary">{value}</p>
          <p className="text-sm text-text-secondary mt-1">{label}</p>
          {subtitle && (
            <p className={`text-xs font-semibold mt-0.5 ${color}`}>{subtitle}</p>
          )}
        </div>
        <div className={`w-10 h-10 rounded-xl ${bgColor} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </div>
    </div>
  );
}

function SeverityIcon({ severidad }: { severidad: string }) {
  const config = {
    critical: { icon: XCircle, color: 'text-danger' },
    warning: { icon: AlertTriangle, color: 'text-warning' },
    info: { icon: CheckCircle, color: 'text-info' },
  };
  const c = config[severidad as keyof typeof config] || config.info;
  return <c.icon className={`w-4 h-4 mt-0.5 shrink-0 ${c.color}`} />;
}
