import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import type { Alerta } from '@/types';
import { Badge } from '@/components/Badge';
import { EmptyState } from '@/components/EmptyState';
import { Skeleton } from '@/components/Skeleton';
import { Modal } from '@/components/Modal';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { timeAgo, formatDate } from '@/lib/utils';
import { AlertTriangle, XCircle, Info, ChevronDown, ExternalLink, VolumeX, CheckCircle2, Mail, MessageCircle, RefreshCw, Send, CheckSquare, Square, Search } from 'lucide-react';

type Tab = 'activas' | 'silenciadas' | 'resueltas';

export function AlertasPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const addToast = useUIStore(s => s.addToast);
  const user = useAuthStore(s => s.user);
  const [tab, setTab] = useState<Tab>('activas');
  const [sevFilter, setSevFilter] = useState('');
  const [silenciarId, setSilenciarId] = useState<string | null>(null);
  const [duracion, setDuracion] = useState(7);
  const [selectedAlerts, setSelectedAlerts] = useState<Set<string>>(new Set());
  const [showActions, setShowActions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(inputValue), 300);
    return () => clearTimeout(timer);
  }, [inputValue]);

  const { data: alertas, isLoading } = useQuery({
    queryKey: ['alertas', tab, sevFilter, searchQuery],
    queryFn: () => api.get<Alerta[]>('/api/alertas', {
      silenciada: tab === 'silenciadas' ? 'true' : tab === 'activas' ? 'false' : undefined,
      resuelta: tab === 'resueltas' ? 'true' : 'false',
      severidad: sevFilter || undefined,
      search: searchQuery || undefined,
    }),
    placeholderData: keepPreviousData,
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

  const resolver = useMutation({
    mutationFn: (id: string) => api.post(`/api/alertas/${id}/resolver`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertas'] });
      queryClient.invalidateQueries({ queryKey: ['alertas', 'count'] });
      addToast({ type: 'success', message: 'Alerta marcada como resuelta.' });
    },
  });

  const reactivar = useMutation({
    mutationFn: (id: string) => api.post(`/api/alertas/${id}/reactivar`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertas'] });
      queryClient.invalidateQueries({ queryKey: ['alertas', 'count'] });
      addToast({ type: 'success', message: 'Alerta reactivada correctamente.' });
    },
  });

  // @ts-expect-error unused currently but kept for single notification support
  const notificar = useMutation({
    mutationFn: ({ id, canal }: { id: string; canal: 'email' | 'whatsapp' }) =>
      api.post(`/api/alertas/${id}/notificar/${canal}`, {}),
    onMutate: async ({ id, canal }) => {
      await queryClient.cancelQueries({ queryKey: ['alertas', tab, sevFilter] });
      const previousAlertas = queryClient.getQueryData<Alerta[]>(['alertas', tab, sevFilter]);

      if (previousAlertas) {
        queryClient.setQueryData<Alerta[]>(['alertas', tab, sevFilter],
          previousAlertas.map(a =>
            a.id === id ? {
              ...a,
              notificaciones_enviadas: { ...a.notificaciones_enviadas, [canal]: true } as any
            } : a
          )
        );
      }
      return { previousAlertas };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousAlertas) {
        queryClient.setQueryData(['alertas', tab, sevFilter], context.previousAlertas);
      }
      addToast({ type: 'error', message: 'Error al enviar la notificación.' });
    },
    onSuccess: () => {
      addToast({ type: 'success', message: 'Notificación enviada correctamente.' });
    },
  });

  const bulkNotificar = useMutation({
    mutationFn: async ({ ids, canal }: { ids: string[]; canal: 'email' | 'whatsapp' | 'ambos' }) => {
      const promises = [];
      for (const id of ids) {
        if (canal === 'email' || canal === 'ambos') promises.push(api.post(`/api/alertas/${id}/notificar/email`, {}));
        if (canal === 'whatsapp' || canal === 'ambos') promises.push(api.post(`/api/alertas/${id}/notificar/whatsapp`, {}));
      }
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertas'] });
      setSelectedAlerts(new Set());
      setShowActions(false);
      addToast({ type: 'success', message: 'Notificaciones enviadas correctamente.' });
    },
    onError: () => {
      addToast({ type: 'error', message: 'Error al enviar algunas notificaciones.' });
    }
  });

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedAlerts);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedAlerts(newSet);
  };

  const sevIcon = (s: string) => {
    if (s === 'critical') return <XCircle className="w-4 h-4 text-danger" />;
    if (s === 'warning') return <AlertTriangle className="w-4 h-4 text-warning" />;
    return <Info className="w-4 h-4 text-info" />;
  };

  const isUnassignedOperator = user?.rol === 'OPERATOR' && (!user.tiendas_asignadas || user.tiendas_asignadas.length === 0);

  if (isUnassignedOperator) {
    return (
      <div className="pt-20">
        <EmptyState 
          variant="no-data" 
          title="Sin tiendas asignadas" 
          description="No tienes tiendas asignadas, por lo que no hay alertas que mostrar." 
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-text-primary">Alertas</h1>
        <p className="text-sm text-text-secondary mt-1">Centro de alertas del sistema</p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-0 border-b border-border">
          {(['activas', 'silenciadas', 'resueltas'] as Tab[]).map(t => (
            <button key={t} onClick={() => { setTab(t); setSelectedAlerts(new Set()); setShowActions(false); }}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${tab === t ? 'border-accent text-text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}>{t}</button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center border transition-all duration-300 ease-in-out rounded-lg overflow-hidden ${isSearchExpanded ? 'w-64 border-border bg-surface-card shadow-sm' : 'w-10 border-transparent hover:border-border bg-transparent cursor-pointer'}`}>
            <button
              onClick={() => {
                setIsSearchExpanded(true);
                setTimeout(() => searchInputRef.current?.focus(), 50);
              }}
              className="p-2 text-text-muted hover:text-text-primary transition-colors focus:outline-none shrink-0"
              title="Buscar"
            >
              <Search className="w-5 h-5" />
            </button>
            <input
              ref={searchInputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Buscar tienda o mensaje..."
              className={`bg-transparent text-sm text-text-primary outline-none transition-all duration-300 ${isSearchExpanded ? 'w-full pr-3 opacity-100' : 'w-0 px-0 opacity-0'}`}
              onBlur={() => {
                if (!inputValue) setIsSearchExpanded(false);
              }}
            />
          </div>

          {tab === 'activas' && (
            <div className="flex items-center gap-3">
              {selectedAlerts.size > 0 && (
                <div className="relative">
                  <button onClick={() => setShowActions(!showActions)} className="px-4 py-2 text-sm font-medium bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors flex items-center gap-2">
                    Acciones ({selectedAlerts.size})
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  {showActions && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowActions(false)} />
                      <div className="absolute right-0 top-full mt-1 w-56 bg-surface-card border border-border rounded-lg shadow-modal z-20 py-1">
                        <button onClick={() => bulkNotificar.mutate({ ids: Array.from(selectedAlerts), canal: 'whatsapp' })} className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-neutral-light flex items-center gap-2">
                          <MessageCircle className="w-4 h-4" /> Enviar por WhatsApp
                        </button>
                        <button onClick={() => bulkNotificar.mutate({ ids: Array.from(selectedAlerts), canal: 'email' })} className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-neutral-light flex items-center gap-2">
                          <Mail className="w-4 h-4" /> Enviar por Email
                        </button>
                        <button onClick={() => bulkNotificar.mutate({ ids: Array.from(selectedAlerts), canal: 'ambos' })} className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-neutral-light flex items-center gap-2">
                          <Send className="w-4 h-4" /> Enviar por Ambos
                        </button>
                        <div className="h-px bg-border my-1" />
                        <button onClick={() => { setSelectedAlerts(new Set()); setShowActions(false); }} className="w-full text-left px-4 py-2 text-sm text-danger hover:bg-danger-light flex items-center gap-2">
                          <XCircle className="w-4 h-4" /> Cancelar selección
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
              <div className="relative">
                <select value={sevFilter} onChange={e => setSevFilter(e.target.value)} className="appearance-none pl-3 pr-8 py-2 text-sm bg-surface-card border border-border rounded-lg cursor-pointer">
                  <option value="">Todas las severidades</option>
                  <option value="critical">Crítico</option>
                  <option value="warning">Advertencia</option>
                  <option value="info">Información</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
              </div>
            </div>
          )}
        </div>
      </div>

      {isLoading ? <Skeleton count={6} className="h-16" /> : !alertas || alertas.length === 0 ? (
        <EmptyState variant="no-data" title={tab === 'activas' ? 'Sin alertas activas' : tab === 'silenciadas' ? 'Sin alertas silenciadas' : 'Sin alertas resueltas'} description="No hay alertas para mostrar." />
      ) : (
        <div className="space-y-2">
          {alertas.map(a => (
            <div key={a.id} className={`bg-surface-card border rounded-xl px-5 py-4 flex items-start gap-4 transition-colors ${a.severidad === 'critical' ? 'border-l-4 border-l-danger border-y-border border-r-border' : 'border-border'
              }`}>
              {sevIcon(a.severidad)}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-primary">{a.mensaje}</p>
                <div className="flex flex-wrap items-center gap-3 mt-1.5">
                  <button onClick={() => navigate(`/tiendas/${a.tienda_id}?tab=alertas`)} className="text-xs text-text-secondary hover:text-text-primary flex items-center gap-1 transition-colors">
                    {a.tienda_nombre}<ExternalLink className="w-3 h-3" />
                  </button>
                  <span className="text-xs text-text-muted">{timeAgo(a.fecha_generacion)}</span>
                  <Badge variant={a.severidad} size="sm" />

                  {tab === 'activas' && (
                    <div className="flex items-center gap-1.5 ml-2 border-l border-border pl-3">
                      <span title={a.notificaciones_enviadas?.email ? 'Email enviado' : 'Email no enviado'}>
                        <Mail className={`w-3.5 h-3.5 ${a.notificaciones_enviadas?.email ? 'text-blue' : 'text-text-muted/50'}`} />
                      </span>
                      <span title={a.notificaciones_enviadas?.whatsapp ? 'WhatsApp enviado' : 'WhatsApp no enviado'}>
                        <MessageCircle className={`w-3.5 h-3.5 ${a.notificaciones_enviadas?.whatsapp ? 'text-success' : 'text-text-muted/50'}`} />
                      </span>
                    </div>
                  )}

                  {tab === 'resueltas' && a.fecha_resolucion && (
                    <span className="text-xs text-text-muted ml-2 border-l border-border pl-3">
                      Resuelta el {formatDate(a.fecha_resolucion)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {a.tramite_id && (
                  <button onClick={() => navigate(`/tiendas/${a.tienda_id}/tramites/${a.tramite_id}`)}
                    className="px-3 py-1.5 text-xs font-medium bg-surface text-text-primary border border-border rounded-md hover:bg-neutral-light transition-colors">
                    Ver trámite
                  </button>
                )}
                {tab === 'activas' && (
                  <>
                    <button onClick={() => toggleSelection(a.id)}
                      className={`p-1.5 rounded-md transition-colors ${selectedAlerts.has(a.id) ? 'text-accent bg-accent/10' : 'text-text-muted hover:text-text-primary hover:bg-neutral-light'}`} title="Seleccionar">
                      {selectedAlerts.has(a.id) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </button>
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
