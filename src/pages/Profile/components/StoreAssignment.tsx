import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { Badge } from '@/components/Badge';
import { Skeleton } from '@/components/Skeleton';
import { useUIStore } from '@/stores/uiStore';
import { ChevronDown, ChevronRight, Store, Save, X } from 'lucide-react';
import type { Tienda, User, PaginatedResponse } from '@/types';

interface StoreAssignmentProps {
  user: User;
  onCancel: () => void;
}

export function StoreAssignment({ user, onCancel }: StoreAssignmentProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(user.tiendas_asignadas || []));
  const [expandedStates, setExpandedStates] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();
  const { addToast, sidebarCollapsed } = useUIStore();

  const { data: todasLasTiendas, isLoading } = useQuery({
    queryKey: ['tiendas', 'all-for-assignment'],
    queryFn: () => api.get<PaginatedResponse<Tienda>>('/api/tiendas?page_size=5000'),
  });

  const groupedTiendas = useMemo(() => {
    if (!todasLasTiendas?.data) return {};
    return todasLasTiendas.data.reduce((acc, tienda) => {
      if (!acc[tienda.estado]) acc[tienda.estado] = [];
      acc[tienda.estado].push(tienda);
      return acc;
    }, {} as Record<string, Tienda[]>);
  }, [todasLasTiendas?.data]);

  const changesSummary = useMemo(() => {
    const originalSet = new Set(user.tiendas_asignadas || []);
    let added = 0;
    let removed = 0;
    for (const id of selectedIds) {
      if (!originalSet.has(id)) added++;
    }
    for (const id of originalSet) {
      if (!selectedIds.has(id)) removed++;
    }
    return { 
      added, 
      removed, 
      hasChanges: added > 0 || removed > 0 
    };
  }, [user.tiendas_asignadas, selectedIds]);

  const mutation = useMutation({
    mutationFn: (newIds: string[]) =>
      api.put<User>(`/api/usuarios/${user.id}/tiendas`, { tiendas_asignadas: newIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuario', user.id] });
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      addToast({ type: 'success', message: 'Asignación actualizada exitosamente' });
      onCancel(); // Close assignment mode
    },
    onError: () => {
      addToast({ type: 'error', message: 'Error al guardar asignación' });
    },
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

  const toggleTienda = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleStateSelectAll = (tiendas: Tienda[], isSelected: boolean) => {
    const next = new Set(selectedIds);
    tiendas.forEach((t) => {
      if (isSelected) {
        next.add(t.id);
      } else {
        next.delete(t.id);
      }
    });
    setSelectedIds(next);
  };

  if (isLoading) {
    return (
      <div className="bg-surface-card rounded-xl border border-border p-6 md:p-8">
        <Skeleton count={4} className="h-16 mb-2" />
      </div>
    );
  }

  const stateNames = Object.keys(groupedTiendas).sort();

  return (
    <div className="bg-surface-card rounded-xl border border-border p-6 md:p-8 pb-24 relative" id="tiendas-assignment">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Store className="w-5 h-5 text-text-primary" />
          <h2 className="text-xl font-bold text-text-primary">Editar Asignación de Tiendas</h2>
        </div>
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-text-secondary hover:bg-neutral-light rounded-lg transition-colors border border-border"
        >
          Volver al resumen
        </button>
      </div>

      <div className="space-y-4">
        <p className="text-sm text-text-secondary">
          Selecciona las tiendas que este operador debe gestionar. Los cambios solo se aplicarán al guardar.
        </p>
        
        <div className="space-y-3">
          {stateNames.map((estado) => {
            const tiendas = groupedTiendas[estado];
            const isExpanded = expandedStates.has(estado);
            const assignedCount = tiendas.filter((t) => selectedIds.has(t.id)).length;
            const isAllAssigned = assignedCount === tiendas.length && tiendas.length > 0;
            const isPartiallyAssigned = assignedCount > 0 && assignedCount < tiendas.length;

            return (
              <div key={estado} className="border border-border rounded-lg overflow-hidden bg-surface">
                <div className="flex items-center hover:bg-neutral-light transition-colors pr-4">
                  <button
                    onClick={() => toggleState(estado)}
                    className="flex-1 flex items-center gap-3 p-4 text-left"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-text-muted" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-text-muted" />
                    )}
                    <div>
                      <h3 className="font-semibold text-text-primary flex items-center gap-2">
                        {estado}
                      </h3>
                    </div>
                  </button>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-text-secondary">
                      {assignedCount} / {tiendas.length} asignadas
                    </span>
                    <input
                      type="checkbox"
                      checked={isAllAssigned}
                      ref={(el) => {
                        if (el) el.indeterminate = isPartiallyAssigned;
                      }}
                      onChange={(e) => handleStateSelectAll(tiendas, e.target.checked)}
                      className="w-4 h-4 rounded border-border text-accent focus:ring-accent/20 cursor-pointer"
                    />
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-border bg-surface-card">
                    <div className="p-2 border-b border-border bg-neutral-light/50 flex justify-end px-4">
                      <label className="flex items-center gap-2 text-xs font-medium text-text-secondary cursor-pointer hover:text-text-primary">
                        <input
                          type="checkbox"
                          checked={isAllAssigned}
                          ref={(el) => {
                            if (el) el.indeterminate = isPartiallyAssigned;
                          }}
                          onChange={(e) => handleStateSelectAll(tiendas, e.target.checked)}
                          className="w-3.5 h-3.5 rounded border-border text-accent focus:ring-accent/20"
                        />
                        Seleccionar todo el estado
                      </label>
                    </div>
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                      {tiendas.map((tienda) => {
                        const isSelected = selectedIds.has(tienda.id);
                        return (
                          <label
                            key={tienda.id}
                            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                              isSelected
                                ? 'border-accent bg-accent/5'
                                : 'border-border hover:border-border-strong bg-surface'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleTienda(tienda.id)}
                              className="w-4 h-4 mt-0.5 rounded border-border text-accent focus:ring-accent/20"
                            />
                            <div className="flex-1">
                              <p className="font-medium text-sm text-text-primary">{tienda.nombre}</p>
                              <p className="text-xs text-text-secondary mt-0.5">{tienda.municipio}</p>
                            </div>
                            <Badge variant={tienda.estado_cumplimiento} size="sm" />
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Sticky Action Bar */}
      {changesSummary.hasChanges && (
        <div className={`fixed bottom-0 left-0 right-0 ${sidebarCollapsed ? 'lg:left-16' : 'lg:left-[220px]'} bg-surface-card border-t border-border py-3 px-4 sm:px-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40 flex items-center justify-between transition-all duration-200 ease-in-out`}>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-text-primary">Cambios sin guardar</span>
            <div className="flex gap-2">
              {changesSummary.added > 0 && (
                <span className="text-xs bg-success-light text-success px-2 py-1 rounded-full font-medium">
                  +{changesSummary.added} agregando
                </span>
              )}
              {changesSummary.removed > 0 && (
                <span className="text-xs bg-danger-light text-danger px-2 py-1 rounded-full font-medium">
                  -{changesSummary.removed} eliminando
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setSelectedIds(new Set(user.tiendas_asignadas || []));
              }}
              className="px-4 py-2 text-sm font-medium text-text-secondary hover:bg-neutral-light rounded-lg transition-colors flex items-center gap-1.5"
            >
              <X className="w-4 h-4" /> Descartar
            </button>
            <button
              onClick={() => mutation.mutate(Array.from(selectedIds))}
              disabled={mutation.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-accent hover:bg-accent-hover rounded-lg shadow-sm transition-all flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              {mutation.isPending ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
