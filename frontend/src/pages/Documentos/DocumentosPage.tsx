import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { listDocumentos } from '@/client/sdk.gen';
import type { Documento } from '@/client/types.gen';
import type { PaginatedResponseDocumento } from '@/client/types.gen';
import { Badge } from '@/components/Badge';
import { Pagination } from '@/components/Pagination';
import { EmptyState } from '@/components/EmptyState';
import { TableSkeleton } from '@/components/Skeleton';
import { formatDate } from '@/lib/utils';
import { ChevronDown, FileSearch, Edit2 } from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { Modal } from '@/components/Modal';
import { DocumentPDFViewer } from '@/components/DocumentPDFViewer';
import { OCRReviewModal } from '@/components/OCRReviewModal';

export function DocumentosPage() {
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();
  const page = parseInt(sp.get('page') || '1');
  const estadoOcr = sp.get('estado_ocr') || '';
  const revision = sp.get('requiere_revision') || '';
  const { user } = useAuthStore();

  const [documentToReview, setDocumentToReview] = useState<Documento | null>(null);
  const [documentToView, setDocumentToView] = useState<Documento | null>(null);
  const [documentToEdit, setDocumentToEdit] = useState<Documento | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['documentos', page, estadoOcr, revision],
    queryFn: async () =>
      (
        await listDocumentos({
          query: {
            page,
            page_size: 25,
            estado_ocr: estadoOcr || undefined,
            requiere_revision: revision === 'true' ? true : undefined,
          },
          throwOnError: true,
        })
      ).data as unknown as PaginatedResponseDocumento, // Cast necessary as generated client types might differ from paginated wrapper
  });

  const up = (k: string, v: string) => {
    const p = new URLSearchParams(sp);
    v ? p.set(k, v) : p.delete(k);
    if (k !== 'page') p.set('page', '1');
    setSp(p);
  };
  const clear = () => setSp({});
  const hasFilters = estadoOcr || revision;

  const isUnassignedOperator =
    user?.rol === 'OPERATOR' && (!user.tiendas_asignadas || user.tiendas_asignadas.length === 0);

  if (isUnassignedOperator) {
    return (
      <div className="pt-20">
        <EmptyState
          variant="no-data"
          title="Sin tiendas asignadas"
          description="No tienes tiendas asignadas, por lo que no hay documentos que mostrar."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-text-primary">Documentos</h1>
        <p className="text-sm text-text-secondary mt-1">Vista global de documentos del sistema</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <select
            value={estadoOcr}
            onChange={(e) => up('estado_ocr', e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 text-sm bg-surface-card border border-border rounded-lg cursor-pointer"
          >
            <option value="">Todos los estados OCR</option>
            <option value="procesando">Procesando</option>
            <option value="completado">Completado</option>
            <option value="baja_confianza">Baja confianza</option>
            <option value="error">Error</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
        </div>
        <div className="relative">
          <select
            value={revision}
            onChange={(e) => up('requiere_revision', e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 text-sm bg-surface-card border border-border rounded-lg cursor-pointer"
          >
            <option value="">Todos</option>
            <option value="true">Requiere revisión</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
        </div>
        {hasFilters && (
          <button
            onClick={clear}
            className="text-sm text-text-secondary hover:text-text-primary underline"
          >
            Limpiar filtros
          </button>
        )}
      </div>
      <div className="bg-surface-card rounded-xl border border-border overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={8} cols={6} />
        ) : isError ? (
          <EmptyState
            variant="error"
            action={{ label: 'Reintentar', onClick: () => window.location.reload() }}
          />
        ) : data && data.data.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {[
                      { label: 'Archivo', className: 'w-48' },
                      { label: 'Tienda', className: '' },
                      { label: 'Estado OCR', className: '' },
                      { label: 'Cargado por', className: '' },
                      { label: 'Fecha', className: '' },
                      { label: 'Acciones', className: 'text-center' },
                    ].map((h) => (
                      <th
                        key={h.label}
                        className={`text-left text-xs font-semibold text-text-secondary uppercase tracking-wider px-4 py-3 ${h.className}`}
                      >
                        {h.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((d) => (
                    <tr
                      key={d.id}
                      onClick={() => setDocumentToView(d)}
                      className="border-b border-border last:border-b-0 hover:bg-surface/60 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3.5 w-48">
                        <span className="text-sm font-medium text-text-primary block truncate max-w-[200px]">
                          {d.nombre_archivo}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3.5 text-sm text-text-secondary hover:underline hover:text-text-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/tiendas/${d.tienda_id}?tab=documentos`);
                        }}
                      >
                        {d.tienda_nombre}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant={d.estado_ocr} size="sm" />
                      </td>
                      <td className="px-4 py-3.5 text-sm text-text-secondary">
                        {d.cargado_por_nombre}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-text-muted">
                        {formatDate(d.cargado_en)}
                      </td>
                      <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-2">
                          {d.requiere_revision_manual && user?.rol === 'ADMIN' ? (
                            <button
                              onClick={() => setDocumentToReview(d)}
                              className="p-1.5 bg-warning-light hover:bg-warning/20 text-warning-dark rounded-md transition-colors"
                              title="Revisar"
                            >
                              <FileSearch className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => setDocumentToEdit(d)}
                              className="p-1.5 hover:bg-neutral-light rounded-md transition-colors"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4 text-text-secondary" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 border-t border-border">
              <Pagination
                page={data.page}
                totalPages={data.total_pages}
                onPageChange={(p) => up('page', String(p))}
              />
            </div>
          </>
        ) : (
          <EmptyState
            variant="no-results"
            action={hasFilters ? { label: 'Limpiar filtros', onClick: clear } : undefined}
          />
        )}
      </div>

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
