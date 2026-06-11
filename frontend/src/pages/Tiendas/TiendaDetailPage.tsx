import { useQuery } from '@tanstack/react-query';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  getTienda,
  getExpediente,
  getAlertasForTienda,
  getDocumentosForTienda,
  getHistorialForTienda,
} from '@/client/sdk.gen';
import type { Documento } from '@/client/types.gen';
import { Badge } from '@/components/Badge';
import { ProgressBar } from '@/components/ProgressBar';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Skeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { formatDate } from '@/lib/utils';
import {
  MapPin,
  FolderOpen,
  FileText,
  Bell,
  History,
  Tag,
  Upload,
  FileSearch,
} from 'lucide-react';
import { ExpedienteTab } from './components/ExpedienteTab';
import { TiendaAlertasTab } from './components/TiendaAlertasTab';
import { TramitesLinks } from '@/components/TramitesLinks';
import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DocumentUploadModal } from './components/DocumentUploadModal';
import { OCRReviewModal } from '@/components/OCRReviewModal';
import { Modal } from '@/components/Modal';
import { DocumentPDFViewer } from '@/components/DocumentPDFViewer';
import { Edit2, Trash2 } from 'lucide-react';
import { TiendaEditModal } from './components/TiendaEditModal';
import { ConfirmModal } from '@/components/ConfirmModal';
import { deleteDocumento } from '@/client/sdk.gen';
import { useUIStore } from '@/stores/uiStore';

type Tab = 'expediente' | 'documentos' | 'alertas' | 'historial';

export function TiendaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [sp, setSp] = useSearchParams();
  const activeTab = (sp.get('tab') as Tab) || 'expediente';
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [documentToReview, setDocumentToReview] = useState<Documento | null>(null);
  const [documentToView, setDocumentToView] = useState<Documento | null>(null);
  const [documentToEdit, setDocumentToEdit] = useState<Documento | null>(null);
  const [documentToDelete, setDocumentToDelete] = useState<Documento | null>(null);

  const addToast = useUIStore((s) => s.addToast);

  const isAdmin = user?.rol === 'ADMIN';

  const deleteDocMutation = useMutation({
    mutationFn: async (docId: string) => {
      return (await deleteDocumento({ path: { id: docId }, throwOnError: true })).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tienda', id, 'documentos'] });
      queryClient.invalidateQueries({ queryKey: ['tienda', id, 'historial'] });
      addToast({ type: 'success', message: 'Documento eliminado' });
      setDocumentToDelete(null);
    },
    onError: () => {
      addToast({ type: 'error', message: 'Error al eliminar el documento' });
    },
  });

  const setActiveTab = (tab: Tab) => {
    setSp((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      return next;
    });
  };

  const { data: tienda, isLoading } = useQuery({
    queryKey: ['tienda', id],
    queryFn: async () => (await getTienda({ path: { id: id! }, throwOnError: true })).data,
  });

  const { data: expediente } = useQuery({
    queryKey: ['tienda', id, 'expediente'],
    queryFn: async () => (await getExpediente({ path: { id: id! }, throwOnError: true })).data,
  });

  const { data: alertas } = useQuery({
    queryKey: ['tienda', id, 'alertas'],
    queryFn: async () =>
      (await getAlertasForTienda({ path: { id: id! }, throwOnError: true })).data,
    enabled: activeTab === 'alertas',
  });

  const { data: documentos } = useQuery({
    queryKey: ['tienda', id, 'documentos'],
    queryFn: async () =>
      (await getDocumentosForTienda({ path: { id: id! }, throwOnError: true })).data,
    enabled: activeTab === 'documentos',
  });

  const { data: historial } = useQuery({
    queryKey: ['tienda', id, 'historial'],
    queryFn: async () =>
      (await getHistorialForTienda({ path: { id: id! }, throwOnError: true })).data,
    enabled: activeTab === 'historial',
  });

  if (isLoading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
        <Skeleton variant="card" count={3} />
      </div>
    );
  if (!tienda) return <EmptyState variant="error" title="Tienda no encontrada" />;

  const tabs: { key: Tab; label: string; icon: React.ElementType; count?: number }[] = [
    {
      key: 'expediente',
      label: 'Expediente',
      icon: FolderOpen,
      count: expediente?.tramites.length,
    },
    { key: 'documentos', label: 'Documentos', icon: FileText },
    {
      key: 'alertas',
      label: 'Alertas',
      icon: Bell,
      count: alertas?.filter((a) => !a.silenciada && !a.resuelta).length,
    },
    { key: 'historial', label: 'Historial', icon: History },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Tiendas', href: '/tiendas' }, { label: tienda.nombre }]} />
      {/* Header */}
      <div
        className={`bg-surface-card rounded-xl border border-border p-6 relative ${isAdmin ? 'hover:border-accent/30 cursor-pointer group transition-colors' : ''}`}
        onClick={() => isAdmin && setIsEditModalOpen(true)}
      >
        {isAdmin && (
          <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <button className="p-2 text-text-muted hover:text-text-primary rounded-lg hover:bg-neutral-light">
              <Edit2 className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="font-display text-2xl text-text-primary pr-8">{tienda.nombre}</h1>
              <Badge variant={tienda.estado_cumplimiento} dot />
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-text-secondary">
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {tienda.estado}, {tienda.municipio}
              </span>
              <span className="flex items-center gap-1">
                <Tag className="w-4 h-4" />
                {tienda.marcas.join(', ')}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-text-secondary">Cumplimiento</p>
              <p className="font-display text-2xl text-text-primary">{tienda.cumplimiento}%</p>
            </div>
            <div className="w-24">
              <ProgressBar value={tienda.cumplimiento} />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border flex gap-0 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? 'border-accent text-text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="ml-1 bg-neutral-light text-text-secondary text-xs px-1.5 py-0.5 rounded-full">
                {tab.count}
              </span>
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
            {(user?.rol === 'ADMIN' || user?.rol === 'OPERATOR') && (
              <button
                onClick={() => setIsUploadOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover transition-colors"
              >
                <Upload className="w-4 h-4" />
                Cargar documentos
              </button>
            )}
          </div>
          {!documentos || documentos.data.length === 0 ? (
            <EmptyState
              variant="no-data"
              title="Sin documentos"
              description="No hay documentos cargados para esta tienda."
            />
          ) : (
            documentos.data.map((d) => (
              <div
                key={d.id}
                onClick={() => setDocumentToView(d)}
                className="bg-surface-card border border-border rounded-lg px-5 py-4 flex items-center gap-4 hover:border-border-strong hover:shadow-sm transition-all cursor-pointer"
              >
                <FileText className="w-5 h-5 text-text-muted shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text-primary truncate">
                      {d.nombre_archivo}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">
                    {d.cargado_por_nombre} · {formatDate(d.cargado_en)}
                  </p>
                  <div className="mt-1">
                    <TramitesLinks
                      tiendaId={id}
                      tramiteIds={d.tramite_ids ?? undefined}
                      tramiteNombres={d.tramite_nombres ?? undefined}
                    />
                  </div>
                </div>
                <Badge variant={d.estado_ocr} size="sm" />
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  {d.requiere_revision_manual && user?.rol === 'ADMIN' ? (
                    <button
                      onClick={() => setDocumentToReview(d)}
                      className="p-1.5 bg-warning-light hover:bg-warning/20 text-warning-dark rounded-md transition-colors mr-1"
                      title="Revisar"
                    >
                      <FileSearch className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => setDocumentToEdit(d)}
                      className="p-1.5 hover:bg-neutral-light rounded-md transition-colors mr-1"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4 text-text-secondary" />
                    </button>
                  )}
                  <button
                    onClick={() => setDocumentToDelete(d)}
                    className="p-1.5 hover:bg-danger-light text-danger rounded-md transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'alertas' && alertas && <TiendaAlertasTab alertas={alertas} tiendaId={id!} />}

      {activeTab === 'historial' && (
        <div className="space-y-0 min-h-[400px]">
          {!historial || historial.length === 0 ? (
            <EmptyState
              variant="no-data"
              title="Sin historial"
              description="No hay registros de actividad."
            />
          ) : (
            <div className="relative pl-6 border-l-2 border-border space-y-6">
              {historial.map((h) => (
                <div key={h.id} className="relative">
                  <div className="absolute -left-[25px] w-3 h-3 rounded-full bg-surface-card border-2 border-border" />
                  <p className="text-sm text-text-primary">{h.detalle || h.accion}</p>
                  <p className="text-xs text-text-muted mt-0.5">
                    <span className="font-medium">{h.usuario_nombre}</span> · {formatDate(h.fecha)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {id && (
        <DocumentUploadModal
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          tiendaId={id}
        />
      )}

      {documentToReview && (
        <OCRReviewModal
          isOpen={!!documentToReview}
          onClose={() => setDocumentToReview(null)}
          documento={documentToReview}
          mode="review"
        />
      )}

      {documentToEdit && (
        <OCRReviewModal
          isOpen={!!documentToEdit}
          onClose={() => setDocumentToEdit(null)}
          documento={documentToEdit}
          mode="edit"
        />
      )}

      <ConfirmModal
        isOpen={!!documentToDelete}
        onClose={() => setDocumentToDelete(null)}
        onConfirm={() => documentToDelete && deleteDocMutation.mutate(documentToDelete.id)}
        title="Eliminar documento"
        message={
          <>
            Vas a eliminar permanentemente el documento{' '}
            <span className="font-medium text-text-primary">{documentToDelete?.nombre_archivo}</span>
            . Esta acción no se puede deshacer.
          </>
        }
        confirmText="Eliminar permanentemente"
        isPending={deleteDocMutation.isPending}
      />

      <Modal
        isOpen={!!documentToView}
        onClose={() => setDocumentToView(null)}
        title="Ver Documento"
        size="xl"
      >
        <div className="h-full">
          {documentToView && (
            <DocumentPDFViewer
              documentoId={documentToView.id}
              title={documentToView.nombre_archivo}
            />
          )}
        </div>
      </Modal>

      {isEditModalOpen && tienda && (
        <TiendaEditModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          tienda={tienda}
        />
      )}
    </div>
  );
}
