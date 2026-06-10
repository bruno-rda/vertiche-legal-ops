import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listDocumentos, uploadDocumentoForTienda } from '@/client/sdk.gen';
import type { Documento } from '@/client/types.gen';
import type { PaginatedResponseDocumento } from '@/client/types.gen';
import { Badge } from '@/components/Badge';
import { Skeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { formatDate } from '@/lib/utils';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { FileText, UploadCloud, Link } from 'lucide-react';
import { AsociarDocumentoModal } from './AsociarDocumentoModal';
import { Modal } from '@/components/Modal';
import { DocumentPDFViewer } from '@/components/DocumentPDFViewer';
import { OCRReviewModal } from '@/components/OCRReviewModal';
import { ConfirmModal } from '@/components/ConfirmModal';
import { deleteDocumento } from '@/client/sdk.gen';
import { Edit2, Trash2, FileSearch } from 'lucide-react';

interface DocumentosSectionProps {
  tramiteId: string;
  tiendaId: string;
}

export function DocumentosSection({ tramiteId, tiendaId }: DocumentosSectionProps) {
  const queryClient = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  const user = useAuthStore((s) => s.user);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isAsociarModalOpen, setIsAsociarModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [documentToReview, setDocumentToReview] = useState<Documento | null>(null);
  const [documentToView, setDocumentToView] = useState<Documento | null>(null);
  const [documentToEdit, setDocumentToEdit] = useState<Documento | null>(null);
  const [documentToDelete, setDocumentToDelete] = useState<Documento | null>(null);

  const deleteDocMutation = useMutation({
    mutationFn: async (docId: string) => {
      return (await deleteDocumento({ path: { id: docId }, throwOnError: true })).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentos', { tramite_id: tramiteId }] });
      addToast({ type: 'success', message: 'Documento eliminado' });
      setDocumentToDelete(null);
    },
    onError: () => {
      addToast({ type: 'error', message: 'Error al eliminar el documento' });
    },
  });

  // Poll every 5s if there's any document processing
  const { data, isLoading } = useQuery({
    queryKey: ['documentos', { tramite_id: tramiteId }],
    queryFn: async () =>
      (
        await listDocumentos({
          query: { tramite_id: tramiteId, page_size: 50 },
          throwOnError: true,
        })
      ).data as unknown as PaginatedResponseDocumento,
    refetchInterval: (query) => {
      const hasProcessing = query.state.data?.data.some((d) => d.estado_ocr === 'procesando');
      return hasProcessing ? 5000 : false;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      return (
        await uploadDocumentoForTienda({
          path: { id: tiendaId },
          body: { file: file, tramite_ids: [tramiteId] },
          throwOnError: true,
        })
      ).data;
    },
    onSuccess: () => {
      addToast({ type: 'success', message: 'Documento cargado correctamente.' });
      queryClient.invalidateQueries({ queryKey: ['documentos'] });
      queryClient.invalidateQueries({ queryKey: ['tramite', tramiteId] });
    },
    onError: () => {
      addToast({ type: 'error', message: 'Error al cargar el documento.' });
    },
    onSettled: () => {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      uploadMutation.mutate(file);
    }
  };

  const documentos = data?.data || [];
  const canModify = user?.rol === 'ADMIN' || user?.rol === 'OPERATOR';

  return (
    <div className="bg-surface-card rounded-xl border border-border p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
          <FileText className="w-5 h-5 text-text-muted" /> Documentos Asociados
        </h2>
        {canModify && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAsociarModalOpen(true)}
              className="px-3 py-1.5 text-sm font-medium text-text-primary border border-border bg-surface hover:bg-neutral-light rounded-lg transition-colors flex items-center gap-2"
            >
              <Link className="w-4 h-4" /> Asociar existente
            </button>
            <label
              className={`px-3 py-1.5 text-sm font-medium text-white bg-accent hover:bg-accent-hover rounded-lg transition-colors flex items-center gap-2 cursor-pointer ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <UploadCloud className="w-4 h-4" />
              {isUploading ? 'Cargando...' : 'Cargar nuevo'}
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="application/pdf"
                onChange={handleFileChange}
              />
            </label>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" count={2} />
        </div>
      ) : documentos.length === 0 ? (
        <EmptyState
          variant="no-data"
          title="Sin documentos"
          description="No hay documentos asociados a este trámite."
        />
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-surface border-b border-border text-text-secondary">
              <tr>
                <th className="px-4 py-3 font-medium">Nombre de archivo</th>
                <th className="px-4 py-3 font-medium">Estado OCR</th>
                <th className="px-4 py-3 font-medium">Cargado por</th>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {documentos.map((doc) => (
                <tr key={doc.id} onClick={() => setDocumentToView(doc)} className="hover:bg-neutral-light/50 transition-colors cursor-pointer">
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-text-primary max-w-[250px] truncate block">
                      {doc.nombre_archivo}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        doc.estado_ocr === 'completado'
                          ? 'vigente'
                          : doc.estado_ocr === 'procesando'
                            ? 'en_revision'
                            : doc.estado_ocr === 'error'
                              ? 'vencido'
                              : 'warning'
                      }
                    >
                      {doc.estado_ocr === 'baja_confianza' ? 'Revisión manual' : doc.estado_ocr}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{doc.cargado_por_nombre}</td>
                  <td className="px-4 py-3 text-text-secondary">{formatDate(doc.cargado_en)}</td>
                  <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-2">
                      {doc.requiere_revision_manual && user?.rol === 'ADMIN' ? (
                        <button
                          onClick={() => setDocumentToReview(doc)}
                          className="p-1.5 bg-warning-light hover:bg-warning/20 text-warning-dark rounded-md transition-colors"
                          title="Revisar"
                        >
                          <FileSearch className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => setDocumentToEdit(doc)}
                          className="p-1.5 hover:bg-neutral-light rounded-md transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4 text-text-secondary" />
                        </button>
                      )}
                      <button
                        onClick={() => setDocumentToDelete(doc)}
                        className="p-1.5 hover:bg-danger-light text-danger rounded-md transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isAsociarModalOpen && (
        <AsociarDocumentoModal
          isOpen={isAsociarModalOpen}
          onClose={() => setIsAsociarModalOpen(false)}
          tramiteId={tramiteId}
          tiendaId={tiendaId}
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
    </div>
  );
}
