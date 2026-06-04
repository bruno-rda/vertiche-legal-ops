import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { Documento, PaginatedResponse } from '@/types';
import { Badge } from '@/components/Badge';
import { Skeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { formatDate } from '@/lib/utils';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { FileText, Eye, Download, UploadCloud, Link } from 'lucide-react';
import { AsociarDocumentoModal } from './AsociarDocumentoModal';

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

  // Poll every 5s if there's any document processing
  const { data, isLoading } = useQuery({
    queryKey: ['documentos', { tramite_id: tramiteId }],
    queryFn: () => api.get<PaginatedResponse<Documento>>(`/api/documentos?tramite_id=${tramiteId}&page_size=50`),
    refetchInterval: (query) => {
      const hasProcessing = query.state.data?.data.some((d) => d.estado_ocr === 'procesando');
      return hasProcessing ? 5000 : false;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tramite_ids', tramiteId);
      return api.post<Documento>('/api/documentos/upload', formData, {
        headers: {
          // Leave Content-Type empty so fetch sets the correct boundary for FormData
        },
      });
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
    }
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
            <label className={`px-3 py-1.5 text-sm font-medium text-white bg-accent hover:bg-accent-hover rounded-lg transition-colors flex items-center gap-2 cursor-pointer ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
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
        <div className="space-y-2"><Skeleton className="h-12 w-full" count={2} /></div>
      ) : documentos.length === 0 ? (
        <EmptyState variant="no-data" title="Sin documentos" description="No hay documentos asociados a este trámite." />
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-surface border-b border-border text-text-secondary">
              <tr>
                <th className="px-4 py-3 font-medium">Nombre de archivo</th>
                <th className="px-4 py-3 font-medium">Estado OCR</th>
                <th className="px-4 py-3 font-medium">Cargado por</th>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {documentos.map((doc) => (
                <tr key={doc.id} className="hover:bg-neutral-light/50 transition-colors">
                  <td className="px-4 py-3 text-text-primary font-medium">{doc.nombre_archivo}</td>
                  <td className="px-4 py-3">
                    <Badge variant={doc.estado_ocr === 'completado' ? 'vigente' : doc.estado_ocr === 'procesando' ? 'en_revision' : doc.estado_ocr === 'error' ? 'vencido' : 'warning'}>
                      {doc.estado_ocr === 'baja_confianza' ? 'Revisión manual' : doc.estado_ocr}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{doc.cargado_por_nombre}</td>
                  <td className="px-4 py-3 text-text-secondary">{formatDate(doc.cargado_en)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-1.5 text-text-muted hover:text-text-primary rounded-md transition-colors" title="Ver documento">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 text-text-muted hover:text-text-primary rounded-md transition-colors" title="Descargar documento">
                        <Download className="w-4 h-4" />
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
    </div>
  );
}
