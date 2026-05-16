import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import type { Alerta } from '@/types';
import { Badge } from '@/components/Badge';
import { EmptyState } from '@/components/EmptyState';
import { Skeleton } from '@/components/Skeleton';
import { Modal } from '@/components/Modal';
import { useUIStore } from '@/stores/uiStore';
import { timeAgo } from '@/lib/utils';
import { AlertTriangle, XCircle, Info, ChevronDown, ExternalLink, VolumeX } from 'lucide-react';

type Tab = 'activas' | 'silenciadas';

export function AlertasPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const addToast = useUIStore(s => s.addToast);
  const [tab, setTab] = useState<Tab>('activas');
  const [sevFilter, setSevFilter] = useState('');
  const [silenciarId, setSilenciarId] = useState<string | null>(null);
  const [duracion, setDuracion] = useState(7);

  const { data: alertas, isLoading } = useQuery({
    queryKey: ['alertas', tab, sevFilter],
    queryFn: () => api.get<Alerta[]>('/api/alertas', {
      silenciada: tab === 'silenciadas' ? 'true' : 'false',
      severidad: sevFilter || undefined,
    }),
  });

  const silenciar = useMutation({
    mutationFn: (id: string) => api.post(`/api/alertas/${id}/silenciar`, { duracion_dias: duracion }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertas'] });
      queryClient.invalidateQueries({ queryKey: ['alertas', 'count'] });
      setSilenciarId(null);
      addToast({ type: 'success', message: 'Alerta silenciada correctamente.' });
    },
  });

  const sevIcon = (s: string) => {
    if (s === 'critical') return <XCircle className="w-4 h-4 text-danger" />;
    if (s === 'warning') return <AlertTriangle className="w-4 h-4 text-warning" />;
    return <Info className="w-4 h-4 text-info" />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-text-primary">Alertas</h1>
        <p className="text-sm text-text-secondary mt-1">Centro de alertas del sistema</p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-0 border-b border-border">
          {(['activas', 'silenciadas'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${
                tab === t ? 'border-accent text-text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}>{t}</button>
          ))}
        </div>
        {tab === 'activas' && (
          <div className="relative">
            <select value={sevFilter} onChange={e => setSevFilter(e.target.value)} className="appearance-none pl-3 pr-8 py-2 text-sm bg-surface-card border border-border rounded-lg cursor-pointer">
              <option value="">Todas las severidades</option>
              <option value="critical">Crítico</option>
              <option value="warning">Advertencia</option>
              <option value="info">Información</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          </div>
        )}
      </div>

      {isLoading ? <Skeleton count={6} className="h-16" /> : !alertas || alertas.length === 0 ? (
        <EmptyState variant="no-data" title={tab === 'activas' ? 'Sin alertas activas' : 'Sin alertas silenciadas'} description="No hay alertas para mostrar." />
      ) : (
        <div className="space-y-2">
          {alertas.map(a => (
            <div key={a.id} className={`bg-surface-card border rounded-xl px-5 py-4 flex items-start gap-4 transition-colors ${
              a.severidad === 'critical' ? 'border-l-4 border-l-danger border-y-border border-r-border' : 'border-border'
            }`}>
              {sevIcon(a.severidad)}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-primary">{a.mensaje}</p>
                <div className="flex flex-wrap items-center gap-3 mt-1.5">
                  <button onClick={() => navigate(`/tiendas/${a.tienda_id}`)} className="text-xs text-text-secondary hover:text-text-primary flex items-center gap-1 transition-colors">
                    {a.tienda_nombre}<ExternalLink className="w-3 h-3" />
                  </button>
                  <span className="text-xs text-text-muted">{timeAgo(a.fecha_generacion)}</span>
                  <Badge variant={a.severidad} size="sm" />
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {a.tramite_id && (
                  <button onClick={() => navigate(`/tiendas/${a.tienda_id}/tramites/${a.tramite_id}`)}
                    className="px-3 py-1.5 text-xs font-medium bg-accent text-white rounded-md hover:bg-accent-hover transition-colors">
                    Ir al trámite
                  </button>
                )}
                {tab === 'activas' && (
                  <button onClick={() => setSilenciarId(a.id)}
                    className="p-1.5 text-text-muted hover:text-text-primary hover:bg-neutral-light rounded-md transition-colors" title="Silenciar">
                    <VolumeX className="w-4 h-4" />
                  </button>
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
