import { useQuery } from '@tanstack/react-query';
import { getTiendasResumen } from '@/client/sdk.gen';
import type { UsuarioResumenTiendas } from '@/client/types.gen';
import { Badge } from '@/components/Badge';
import type { BadgeVariant } from '@/components/Badge';
import { Skeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { ChevronDown, ChevronRight, Store, MapPin } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface StoreSummaryProps {
  userId: string;
  isAdminView: boolean;
  onEditAssignment?: () => void;
}

export function StoreSummary({ userId, isAdminView, onEditAssignment }: StoreSummaryProps) {
  const [expandedStates, setExpandedStates] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  const { data: resumen, isLoading } = useQuery({
    queryKey: ['usuario', userId, 'tiendas-resumen'],
    queryFn: async () =>
      (await getTiendasResumen({ path: { id: userId }, throwOnError: true }))
        .data as UsuarioResumenTiendas[],
  });

  const toggleState = (estado: string) => {
    const next = new Set(expandedStates);
    if (next.has(estado)) {
      next.delete(estado);
    } else {
      next.add(estado);
    }
    setExpandedStates(next);
  };

  if (isLoading) {
    return (
      <div className="bg-surface-card rounded-xl border border-border p-6 md:p-8">
        <Skeleton count={4} className="h-16 mb-2" />
      </div>
    );
  }

  const totalTiendas = resumen?.reduce((acc, r) => acc + r.total_tiendas, 0) || 0;
  const totalEstados = resumen?.length || 0;

  return (
    <div className="bg-surface-card rounded-xl border border-border p-6 md:p-8" id="tiendas">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Store className="w-5 h-5 text-text-primary" />
          <h2 className="text-xl font-bold text-text-primary">Tiendas asignadas</h2>
        </div>
        {isAdminView && onEditAssignment && (
          <button
            onClick={onEditAssignment}
            className="px-4 py-2 text-sm font-medium text-accent bg-accent/5 hover:bg-accent/10 rounded-lg transition-colors border border-accent/20"
          >
            Editar asignación
          </button>
        )}
      </div>

      {totalTiendas === 0 ? (
        <EmptyState
          title="Sin tiendas asignadas"
          description={
            isAdminView
              ? 'Este operador aún no tiene tiendas asignadas. Selecciona "Editar asignación" para comenzar.'
              : 'No tienes tiendas asignadas actualmente.'
          }
        />
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-text-secondary font-medium mb-4">
            {totalTiendas} tiendas asignadas en {totalEstados}{' '}
            {totalEstados === 1 ? 'estado' : 'estados'}.
          </p>

          <div className="space-y-3">
            {resumen?.map((estadoResumen) => {
              const isExpanded = expandedStates.has(estadoResumen.estado);
              return (
                <div
                  key={estadoResumen.estado}
                  className="border border-border rounded-lg overflow-hidden bg-surface"
                >
                  <button
                    onClick={() => toggleState(estadoResumen.estado)}
                    className="w-full flex items-center justify-between p-4 hover:bg-neutral-light transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-text-muted" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-text-muted" />
                      )}
                      <div>
                        <h3 className="font-semibold text-text-primary flex items-center gap-2">
                          {estadoResumen.estado}
                          <span className="text-xs font-normal text-text-secondary bg-surface-card px-2 py-0.5 rounded-full border border-border">
                            {estadoResumen.total_tiendas} tiendas
                          </span>
                        </h3>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      {estadoResumen.criticas > 0 && (
                        <Badge variant="critico" size="sm">
                          {estadoResumen.criticas}
                        </Badge>
                      )}
                      {estadoResumen.por_vencer > 0 && (
                        <Badge variant="por_vencer" size="sm">
                          {estadoResumen.por_vencer}
                        </Badge>
                      )}
                      {estadoResumen.vigentes > 0 && (
                        <Badge variant="vigente" size="sm">
                          {estadoResumen.vigentes}
                        </Badge>
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-border p-4 bg-surface-card grid grid-cols-1 md:grid-cols-2 gap-3">
                      {estadoResumen.tiendas.map((tienda) => (
                        <div
                          key={tienda.id}
                          onClick={() => navigate(`/tiendas/${tienda.id}`)}
                          className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-border-strong hover:shadow-sm transition-all cursor-pointer bg-surface"
                        >
                          <div>
                            <p className="font-medium text-sm text-text-primary">{tienda.nombre}</p>
                            <p className="text-xs text-text-secondary flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3" />
                              {tienda.municipio}
                            </p>
                          </div>
                          <Badge variant={tienda.estado_cumplimiento as BadgeVariant} size="sm" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
