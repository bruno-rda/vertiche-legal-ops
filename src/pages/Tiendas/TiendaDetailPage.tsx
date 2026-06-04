import { useQuery } from '@tanstack/react-query';
import { useParams, useSearchParams } from 'react-router-dom';
import { api } from '@/api/client';
import type { Tienda, Expediente, Alerta, Documento, HistorialItem } from '@/types';
import { Badge } from '@/components/Badge';
import { ProgressBar } from '@/components/ProgressBar';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Skeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { formatDate, timeAgo } from '@/lib/utils';
import {
  MapPin, Tag, Download, FileText, AlertTriangle,
  Upload, History, Bell, FolderOpen,
} from 'lucide-react';
import { ExpedienteTab } from './components/ExpedienteTab';
import { TramitesLinks } from '@/components/TramitesLinks';

type Tab = 'expediente' | 'documentos' | 'alertas' | 'historial';

export function TiendaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [sp, setSp] = useSearchParams();
  const activeTab = (sp.get('tab') as Tab) || 'expediente';

  const setActiveTab = (tab: Tab) => {
    setSp(prev => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      return next;
    });
  };

  const { data: tienda, isLoading } = useQuery({
    queryKey: ['tienda', id],
    queryFn: () => api.get<Tienda>(`/api/tiendas/${id}`),
  });

  const { data: expediente } = useQuery({
    queryKey: ['tienda', id, 'expediente'],
    queryFn: () => api.get<Expediente>(`/api/tiendas/${id}/expediente`),
  });

  const { data: alertas } = useQuery({
    queryKey: ['tienda', id, 'alertas'],
    queryFn: () => api.get<Alerta[]>(`/api/tiendas/${id}/alertas`),
    enabled: activeTab === 'alertas',
  });

  const { data: documentos } = useQuery({
    queryKey: ['tienda', id, 'documentos'],
    queryFn: () => api.get<Documento[]>(`/api/tiendas/${id}/documentos`),
    enabled: activeTab === 'documentos',
  });

  const { data: historial } = useQuery({
    queryKey: ['tienda', id, 'historial'],
    queryFn: () => api.get<HistorialItem[]>(`/api/tiendas/${id}/historial`),
    enabled: activeTab === 'historial',
  });

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-4 w-48" /><Skeleton variant="card" count={3} /></div>;
  if (!tienda) return <EmptyState variant="error" title="Tienda no encontrada" />;

  const tabs: { key: Tab; label: string; icon: React.ElementType; count?: number }[] = [
    { key: 'expediente', label: 'Expediente', icon: FolderOpen, count: expediente?.tramites.length },
    { key: 'documentos', label: 'Documentos', icon: FileText },
    { key: 'alertas', label: 'Alertas', icon: Bell, count: alertas?.filter(a => !a.silenciada).length },
    { key: 'historial', label: 'Historial', icon: History },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Tiendas', href: '/tiendas' }, { label: tienda.nombre }]} />
      {/* Header */}
      <div className="bg-surface-card rounded-xl border border-border p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="font-display text-2xl text-text-primary">{tienda.nombre}</h1>
              <Badge variant={tienda.estado_cumplimiento} dot />
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-text-secondary">
              <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{tienda.estado}, {tienda.municipio}</span>
              <span className="flex items-center gap-1"><Tag className="w-4 h-4" />{tienda.marcas.join(', ')}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-text-secondary">Cumplimiento</p>
              <p className="font-display text-2xl text-text-primary">{tienda.cumplimiento}%</p>
            </div>
            <div className="w-24"><ProgressBar value={tienda.cumplimiento} /></div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border flex gap-0 overflow-x-auto">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.key ? 'border-accent text-text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}>
            <tab.icon className="w-4 h-4" />{tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="ml-1 bg-neutral-light text-text-secondary text-xs px-1.5 py-0.5 rounded-full">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'expediente' && expediente && (
        <ExpedienteTab expediente={expediente} tiendaId={id!} />
      )}

      {activeTab === 'documentos' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button className="flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover transition-colors">
              <Upload className="w-4 h-4" />Cargar documento
            </button>
          </div>
          {!documentos || documentos.length === 0 ? <EmptyState variant="no-data" title="Sin documentos" description="No hay documentos cargados para esta tienda." /> :
            documentos.map(d => (
              <div key={d.id} className="bg-surface-card border border-border rounded-lg px-5 py-4 flex items-center gap-4">
                <FileText className="w-5 h-5 text-text-muted shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{d.nombre_archivo}</p>
                  <p className="text-xs text-text-muted mt-0.5">{d.cargado_por_nombre} · {formatDate(d.cargado_en)}</p>
                  <div className="mt-1">
                    <TramitesLinks
                      tiendaId={id}
                      tramiteIds={d.tramite_ids}
                      tramiteNombres={d.tramite_nombres}
                    />
                  </div>
                </div>
                <Badge variant={d.estado_ocr} size="sm" />
                {d.requiere_revision_manual && (
                  <span className="flex items-center gap-1 text-xs text-warning font-medium"><AlertTriangle className="w-3.5 h-3.5" />Revisar</span>
                )}
                <button className="p-1.5 hover:bg-neutral-light rounded-md transition-colors"><Download className="w-4 h-4 text-text-secondary" /></button>
              </div>
            ))}
        </div>
      )}

      {activeTab === 'alertas' && (
        <div className="space-y-2">
          {!alertas || alertas.filter(a => !a.silenciada).length === 0 ? <EmptyState variant="no-data" title="Sin alertas activas" description="No hay alertas activas para esta tienda." /> :
            alertas.filter(a => !a.silenciada).map(a => (
              <div key={a.id} className={`bg-surface-card border rounded-lg px-5 py-4 flex items-start gap-3 ${a.severidad === 'critical' ? 'border-l-4 border-l-danger border-border' : 'border-border'}`}>
                <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${a.severidad === 'critical' ? 'text-danger' : a.severidad === 'warning' ? 'text-warning' : 'text-info'}`} />
                <div className="flex-1"><p className="text-sm text-text-primary">{a.mensaje}</p><p className="text-xs text-text-muted mt-1">{timeAgo(a.fecha_generacion)}</p></div>
                <Badge variant={a.severidad} size="sm" />
              </div>
            ))}
        </div>
      )}

      {activeTab === 'historial' && (
        <div className="space-y-0">
          {!historial || historial.length === 0 ? <EmptyState variant="no-data" title="Sin historial" description="No hay registros de actividad." /> :
            <div className="relative pl-6 border-l-2 border-border space-y-6">
              {historial.map(h => (
                <div key={h.id} className="relative">
                  <div className="absolute -left-[25px] w-3 h-3 rounded-full bg-surface-card border-2 border-border" />
                  <div className="bg-surface-card border border-border rounded-lg px-4 py-3">
                    <p className="text-sm text-text-primary">{h.detalle || h.accion}</p>
                    <p className="text-xs text-text-muted mt-1"><span className="font-medium">{h.usuario_nombre}</span> · {formatDate(h.fecha)}</p>
                  </div>
                </div>
              ))}
            </div>}
        </div>
      )}
    </div>
  );
}
