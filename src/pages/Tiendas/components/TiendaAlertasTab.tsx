import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { Alerta } from '@/types';
import { Badge } from '@/components/Badge';
import { EmptyState } from '@/components/EmptyState';
import { Modal } from '@/components/Modal';
import { useUIStore } from '@/stores/uiStore';
import { timeAgo, formatDate } from '@/lib/utils';
import { AlertTriangle, XCircle, Info, VolumeX, CheckCircle2, RefreshCw } from 'lucide-react';

type Tab = 'activas' | 'silenciadas' | 'resueltas';

interface TiendaAlertasTabProps {
  alertas: Alerta[];
  tiendaId: string;
}

export function TiendaAlertasTab({ alertas, tiendaId }: TiendaAlertasTabProps) {
  const [tab, setTab] = useState<Tab>('activas');
  const [silenciarId, setSilenciarId] = useState<string | null>(null);
  const [duracion, setDuracion] = useState(7);
  
  const queryClient = useQueryClient();
  const addToast = useUIStore(s => s.addToast);

  const silenciar = useMutation({
    mutationFn: (id: string) => api.post(`/api/alertas/${id}/silenciar`, { duracion_dias: duracion }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tienda', tiendaId, 'alertas'] });
      queryClient.invalidateQueries({ queryKey: ['alertas', 'count'] });
      setSilenciarId(null);
      addToast({ type: 'success', message: 'Alerta silenciada correctamente.' });
    },
  });

  const resolver = useMutation({
    mutationFn: (id: string) => api.post(`/api/alertas/${id}/resolver`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tienda', tiendaId, 'alertas'] });
      queryClient.invalidateQueries({ queryKey: ['alertas', 'count'] });
      addToast({ type: 'success', message: 'Alerta marcada como resuelta.' });
    },
  });

  const reactivar = useMutation({
    mutationFn: (id: string) => api.post(`/api/alertas/${id}/reactivar`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tienda', tiendaId, 'alertas'] });
      queryClient.invalidateQueries({ queryKey: ['alertas', 'count'] });
      addToast({ type: 'success', message: 'Alerta reactivada correctamente.' });
    },
  });

  const filteredAlertas = alertas.filter(a => {
    if (tab === 'activas') return !a.silenciada && !a.resuelta;
    if (tab === 'silenciadas') return a.silenciada && !a.resuelta;
    if (tab === 'resueltas') return !!a.resuelta;
    return false;
  });

  const sevIcon = (s: string) => {
    if (s === 'critical') return <XCircle className="w-4 h-4 text-danger mt-0.5 shrink-0" />;
    if (s === 'warning') return <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />;
    return <Info className="w-4 h-4 text-info mt-0.5 shrink-0" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-0 border-b border-border">
        {(['activas', 'silenciadas', 'resueltas'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${
              tab === t ? 'border-accent text-text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}>{t}</button>
        ))}
      </div>

      {!filteredAlertas || filteredAlertas.length === 0 ? (
        <EmptyState 
          variant="no-data" 
          title={tab === 'activas' ? 'Sin alertas activas' : tab === 'silenciadas' ? 'Sin alertas silenciadas' : 'Sin alertas resueltas'} 
          description="No hay alertas para mostrar en esta categoría." 
        />
      ) : (
        <div className="space-y-2">
          {filteredAlertas.map(a => (
            <div key={a.id} className={`bg-surface-card border rounded-lg px-5 py-4 flex items-start gap-3 transition-colors ${
              a.severidad === 'critical' ? 'border-l-4 border-l-danger border-y-border border-r-border' : 'border-border'
            }`}>
              {sevIcon(a.severidad)}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-primary">{a.mensaje}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-text-muted">{timeAgo(a.fecha_generacion)}</span>
                  <Badge variant={a.severidad} size="sm" />
                  
                  {tab === 'resueltas' && a.fecha_resolucion && (
                    <span className="text-xs text-text-muted ml-2 border-l border-border pl-3">
                      Resuelta el {formatDate(a.fecha_resolucion)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {tab === 'activas' && (
                  <>
                    <button onClick={() => setSilenciarId(a.id)}
                      className="p-1.5 text-text-muted hover:text-text-primary hover:bg-neutral-light rounded-md transition-colors" title="Silenciar">
                      <VolumeX className="w-4 h-4" />
                    </button>
                    <button onClick={() => resolver.mutate(a.id)}
                      className="p-1.5 text-text-muted hover:text-success hover:bg-success-light rounded-md transition-colors" title="Marcar como resuelta">
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  </>
                )}
                {tab === 'silenciadas' && (
                  <>
                    <button onClick={() => reactivar.mutate(a.id)}
                      className="p-1.5 text-text-muted hover:text-text-primary hover:bg-neutral-light rounded-md transition-colors" title="Reactivar">
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button onClick={() => resolver.mutate(a.id)}
                      className="p-1.5 text-text-muted hover:text-success hover:bg-success-light rounded-md transition-colors" title="Marcar como resuelta">
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Silenciar modal */}
      <Modal isOpen={!!silenciarId} onClose={() => setSilenciarId(null)} title="Silenciar alerta" size="sm"
        footer={<>
          <button onClick={() => setSilenciarId(null)} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors">Cancelar</button>
          <button onClick={() => silenciarId && silenciar.mutate(silenciarId)} className="px-4 py-2 text-sm font-medium bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors">Confirmar</button>
        </>}>
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">¿Por cuánto tiempo deseas silenciar esta alerta?</p>
          <div className="grid grid-cols-2 gap-2">
            {[7, 15, 30, 60].map(d => (
              <button key={d} onClick={() => setDuracion(d)}
                className={`px-3 py-2 text-sm rounded-lg border transition-colors ${duracion === d ? 'border-accent bg-accent/5 text-text-primary font-medium' : 'border-border text-text-secondary hover:bg-neutral-light'}`}>
                {d} días
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
