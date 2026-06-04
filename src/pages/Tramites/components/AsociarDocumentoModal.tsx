import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { Documento, PaginatedResponse } from '@/types';
import { Modal } from '@/components/Modal';
import { Badge } from '@/components/Badge';
import { formatDate } from '@/lib/utils';
import { useUIStore } from '@/stores/uiStore';
import { Skeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';

interface AsociarDocumentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  tramiteId: string;
  tiendaId: string;
}

export function AsociarDocumentoModal({ isOpen, onClose, tramiteId, tiendaId }: AsociarDocumentoModalProps) {
  const queryClient = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [initialDocIds, setInitialDocIds] = useState<Set<string>>(new Set());

  // Fetch all documents for this tienda
  const { data, isLoading, isError } = useQuery({
    queryKey: ['documentos', { tienda_id: tiendaId }],
    queryFn: () => api.get<PaginatedResponse<Documento>>(`/api/documentos?tienda_id=${tiendaId}&page_size=100`),
    enabled: isOpen,
  });

  const allDocs = data?.data || [];

  useEffect(() => {
    if (allDocs.length > 0) {
      const associated = allDocs.filter(doc => doc.tramite_ids.includes(tramiteId)).map(doc => doc.id);
      const initialSet = new Set(associated);
      setSelectedDocIds(initialSet);
      setInitialDocIds(new Set(associated));
    }
  }, [allDocs, tramiteId]);

  const toggleSelection = (id: string) => {
    const next = new Set(selectedDocIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedDocIds(next);
  };

  const { mutate: guardarCambios, isPending } = useMutation({
    mutationFn: async () => {
      const promises: Promise<any>[] = [];
      allDocs.forEach((doc) => {
        const wasAssociated = initialDocIds.has(doc.id);
        const isAssociated = selectedDocIds.has(doc.id);
        
        if (wasAssociated && !isAssociated) {
          // Remove association
          const newTramiteIds = doc.tramite_ids.filter(id => id !== tramiteId);
          promises.push(api.patch(`/api/documentos/${doc.id}`, { tramite_ids: newTramiteIds }));
        } else if (!wasAssociated && isAssociated) {
          // Add association
          const newTramiteIds = [...doc.tramite_ids, tramiteId];
          promises.push(api.patch(`/api/documentos/${doc.id}`, { tramite_ids: newTramiteIds }));
        }
      });
      return Promise.all(promises);
    },
    onSuccess: () => {
      addToast({ type: 'success', message: 'Documentos actualizados exitosamente.' });
      queryClient.invalidateQueries({ queryKey: ['documentos'] });
      queryClient.invalidateQueries({ queryKey: ['tramite', tramiteId] });
      onClose();
    },
    onError: () => {
      addToast({ type: 'error', message: 'Error al actualizar documentos.' });
    },
  });

  const hasChanges = Array.from(allDocs).some((doc) => {
    const wasAssociated = initialDocIds.has(doc.id);
    const isAssociated = selectedDocIds.has(doc.id);
    return wasAssociated !== isAssociated;
  });

  const handleConfirm = () => {
    if (hasChanges) {
      guardarCambios();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Asociar documentos al trámite"
      size="lg"
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-text-secondary hover:bg-neutral-light rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!hasChanges || isPending}
            className="px-4 py-2 text-sm font-medium bg-accent text-white hover:bg-accent-hover rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">
          Selecciona los documentos del expediente de la tienda que deseas asociar a este trámite. Puedes desmarcar para desvincular.
        </p>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" count={3} />
          </div>
        ) : isError ? (
          <EmptyState variant="error" title="Error al cargar documentos" description="No se pudieron cargar los documentos del expediente." />
        ) : allDocs.length === 0 ? (
          <EmptyState variant="no-data" title="Sin documentos" description="No hay documentos en la tienda para asociar." />
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
            {allDocs.map((doc) => (
              <label
                key={doc.id}
                className="flex items-center gap-4 p-3 border border-border rounded-lg hover:bg-surface-card cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedDocIds.has(doc.id)}
                  onChange={() => toggleSelection(doc.id)}
                  className="w-4 h-4 text-accent border-border rounded focus:ring-accent"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{doc.nombre_archivo}</p>
                  <p className="text-xs text-text-muted mt-0.5">
                    Subido por {doc.cargado_por_nombre} el {formatDate(doc.cargado_en)}
                  </p>
                </div>
                <Badge variant={doc.estado_ocr === 'completado' ? 'vigente' : doc.estado_ocr === 'procesando' ? 'en_revision' : doc.estado_ocr === 'error' ? 'vencido' : 'warning'}>
                  {doc.estado_ocr === 'baja_confianza' ? 'Revisión manual' : doc.estado_ocr}
                </Badge>
              </label>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
