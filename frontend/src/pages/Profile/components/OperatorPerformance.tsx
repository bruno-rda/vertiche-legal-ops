import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/Skeleton';
import type { OperatorPerformanceData, MetricTrend } from '@/types';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  FileText,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Store,
  Plus,
} from 'lucide-react';

interface OperatorPerformanceProps {
  userId: string;
}

type TimeRange = '30' | 'month' | '90';

export function OperatorPerformance({ userId }: OperatorPerformanceProps) {
  const [range, setRange] = useState<TimeRange>('30');
  const [visibleCount, setVisibleCount] = useState(5);

  const handleRangeChange = (newRange: TimeRange) => {
    setRange(newRange);
    setVisibleCount(5);
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ['usuario-performance', userId, range],
    queryFn: () =>
      api.get<OperatorPerformanceData>(`/api/usuarios/${userId}/performance?range=${range}`),
  });

  const getTrendColor = (trend: 'up' | 'down' | 'neutral', isNegativeMetric: boolean) => {
    if (trend === 'neutral') return 'text-text-muted';
    if (isNegativeMetric) {
      return trend === 'up' ? 'text-danger' : 'text-success';
    }
    return trend === 'up' ? 'text-success' : 'text-danger';
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'neutral') => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4" />;
    return <Minus className="w-4 h-4" />;
  };

  const renderMetricCard = (
    title: string,
    metric: MetricTrend | undefined,
    icon: React.ReactNode,
    isNegativeMetric = false,
    suffix = '',
  ) => {
    if (!metric) return <Skeleton count={1} className="h-32" />;

    const trendColor = getTrendColor(metric.trend, isNegativeMetric);
    const trendText =
      metric.trend === 'up'
        ? `+${Math.abs(metric.value - metric.previous_value)
            .toFixed(isNegativeMetric ? 1 : 0)
            .replace(/\.0$/, '')}`
        : metric.trend === 'down'
          ? `-${Math.abs(metric.previous_value - metric.value)
              .toFixed(isNegativeMetric ? 1 : 0)
              .replace(/\.0$/, '')}`
          : 'Sin cambio';

    return (
      <div className="bg-surface rounded-xl border border-border p-6 flex flex-col hover:border-border-strong transition-colors shadow-sm">
        <div className="flex items-center gap-3 text-text-secondary mb-4">
          <div className="p-2.5 rounded-lg bg-neutral-light text-text-primary">{icon}</div>
          <span className="text-base font-medium leading-tight">{title}</span>
        </div>
        <div className="flex items-baseline gap-1 mt-auto">
          <span className="text-4xl font-display text-text-primary">{metric.value}</span>
          {suffix && <span className="text-sm font-medium text-text-secondary ml-1">{suffix}</span>}
        </div>
        <div className={`flex items-center gap-1.5 mt-3 text-sm font-semibold ${trendColor}`}>
          {getTrendIcon(metric.trend)}
          <span>{trendText}</span>
          <span className="text-text-muted text-xs font-normal ml-1 hidden sm:inline">
            vs periodo ant.
          </span>
        </div>
      </div>
    );
  };

  const groupedTimeline =
    data?.timeline.slice(0, visibleCount).reduce(
      (acc, item) => {
        const dateStr = new Date(item.fecha).toLocaleDateString('es-MX', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
        if (!acc[dateStr]) acc[dateStr] = [];
        acc[dateStr].push(item);
        return acc;
      },
      {} as Record<string, typeof data.timeline>,
    ) || {};

  return (
    <div className="bg-surface-card rounded-xl border border-border p-6 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-text-primary" />
          <h2 className="text-xl font-bold text-text-primary">Desempeño</h2>
        </div>

        <div className="flex items-center bg-surface border border-border rounded-lg p-1">
          <button
            onClick={() => handleRangeChange('30')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              range === '30'
                ? 'bg-surface-card shadow-sm text-text-primary'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Últimos 30 días
          </button>
          <button
            onClick={() => handleRangeChange('month')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              range === 'month'
                ? 'bg-surface-card shadow-sm text-text-primary'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Mes en curso
          </button>
          <button
            onClick={() => handleRangeChange('90')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              range === '90'
                ? 'bg-surface-card shadow-sm text-text-primary'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Últimos 90 días
          </button>
        </div>
      </div>

      {isError ? (
        <div className="py-8 text-center text-danger bg-danger-light rounded-lg">
          Error al cargar las métricas de desempeño.
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {renderMetricCard(
              'Documentos cargados',
              data?.metrics.documentos_cargados,
              <FileText className="w-4 h-4" />,
            )}
            {renderMetricCard(
              'Trámites resueltos',
              data?.metrics.tramites_resueltos,
              <CheckCircle className="w-4 h-4" />,
            )}
            {renderMetricCard(
              'Alertas atendidas',
              data?.metrics.alertas_atendidas,
              <AlertTriangle className="w-4 h-4" />,
            )}
            {renderMetricCard(
              'Tiempo promedio',
              data?.metrics.tiempo_promedio_resolucion,
              <Clock className="w-4 h-4" />,
              true,
              'días',
            )}
            {renderMetricCard(
              'Trámites vencidos',
              data?.metrics.tramites_vencidos_responsabilidad,
              <XCircle className="w-4 h-4" />,
              true,
            )}
          </div>

          <div>
            <h3 className="text-sm font-bold text-text-primary mb-4 uppercase tracking-wider">
              Actividad Reciente
            </h3>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton count={3} className="h-16" />
              </div>
            ) : (
              <div className="space-y-8 py-4">
                {Object.entries(groupedTimeline).map(([dateStr, items]) => (
                  <div key={dateStr} className="space-y-4">
                    <div className="flex items-center gap-4">
                      <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                        {dateStr}
                      </h4>
                      <div className="flex-1 h-px bg-border"></div>
                    </div>
                    <div className="relative pl-6 border-l border-border ml-2 space-y-6 py-2">
                      {items.map((item) => (
                        <div key={item.id} className="relative">
                          <div className="absolute -left-[29px] top-1.5 w-2 h-2 rounded-full bg-border" />
                          <div className="pl-2">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-text-primary">{item.accion}</p>
                              <span className="text-xs text-text-muted">
                                {new Date(item.fecha).toLocaleTimeString('es-MX', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1.5 text-sm text-text-secondary">
                              <Store className="w-3.5 h-3.5 text-text-muted" />
                              <Link
                                to={`/tiendas/${item.tienda_id}`}
                                className="hover:text-accent hover:underline font-medium"
                              >
                                {item.tienda_nombre}
                              </Link>
                              {item.tramite_nombre && (
                                <>
                                  <span className="text-border">•</span>
                                  <Link
                                    to={`/tiendas/${item.tienda_id}/tramites/${item.tramite_id}`}
                                    className="hover:text-accent hover:underline truncate max-w-[250px]"
                                  >
                                    {item.tramite_nombre}
                                  </Link>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {data?.timeline && data.timeline.length > visibleCount && (
                  <div className="pt-2">
                    <button
                      onClick={() => setVisibleCount((v) => v + 5)}
                      className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Cargar más actividad
                    </button>
                  </div>
                )}

                {data?.timeline.length === 0 && (
                  <div className="p-8 text-center text-text-secondary bg-surface border border-dashed border-border rounded-lg">
                    No hay actividad registrada en este periodo.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
