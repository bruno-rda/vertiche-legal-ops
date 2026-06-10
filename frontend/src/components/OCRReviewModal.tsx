import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { acceptOcrReview, renameDocumento } from '@/client/sdk.gen';
import { Modal } from './Modal';
import { PDFViewer } from './PDFViewer';
import type { Documento } from '@/client/types.gen';
import { useUIStore } from '@/stores/uiStore';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { clsx } from 'clsx';

interface OCRReviewModalProps {
  documento: Documento;
  isOpen: boolean;
  onClose: () => void;
  mode?: 'edit' | 'review';
}

export function OCRReviewModal({ documento, isOpen, onClose, mode = 'review' }: OCRReviewModalProps) {
  const queryClient = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);

  // Local state for the editable fields
  const [nombreArchivo, setNombreArchivo] = useState(documento.nombre_archivo);
  const [fields, setFields] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    if (documento.datos_extraidos) {
      Object.entries(documento.datos_extraidos).forEach(([key, data]) => {
        initial[key] = data?.value || '';
      });
    }
    return initial;
  });

  const [isConfirmingDate, setIsConfirmingDate] = useState(false);

  const mutation = useMutation({
    mutationFn: async (updatedFields: Record<string, string>) => {
      if (nombreArchivo !== documento.nombre_archivo) {
        await renameDocumento({
          path: { id: documento.id },
          body: { nombre_archivo: nombreArchivo },
          throwOnError: true,
        });
      }

      // Check if any extracted data actually changed or if we are in review mode
      const hasDataChanges = Object.entries(documento.datos_extraidos || {}).some(
        ([key, data]) => updatedFields[key] !== (data?.value || '')
      );

      if (hasDataChanges || mode === 'review') {
        return (
          await acceptOcrReview({
            path: { id: documento.id },
            body: { datos_extraidos: updatedFields },
            throwOnError: true,
          })
        ).data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentos'] });
      queryClient.invalidateQueries({ queryKey: ['tienda', documento.tienda_id] });
      queryClient.invalidateQueries({ queryKey: ['tramites'] });
      addToast({
        type: 'success',
        message: mode === 'review' ? 'Revisión de OCR completada correctamente' : 'Documento actualizado correctamente',
      });
      onClose();
    },
    onError: () => {
      addToast({
        type: 'error',
        message: mode === 'review' ? 'Error al guardar la revisión de OCR' : 'Error al actualizar el documento',
      });
    },
  });

  const handleFieldChange = (key: string, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    // Check if fecha_vigencia changed
    const originalDate = documento.datos_extraidos?.['fecha_vigencia']?.value;
    const newDate = fields['fecha_vigencia'];

    if (originalDate !== newDate) {
      setIsConfirmingDate(true);
    } else {
      mutation.mutate(fields);
    }
  };

  const handleConfirmDate = () => {
    setIsConfirmingDate(false);
    mutation.mutate(fields);
  };

  const formatLabel = (key: string) => {
    return key
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (!isOpen) return null;

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={mode === 'review' ? "Revisión Manual de OCR" : "Editar Documento"} size="xl">
        <div className="flex h-full gap-6">
          {/* Left panel: PDF Viewer */}
          <div className="flex-1 border border-border rounded-lg overflow-hidden flex flex-col bg-neutral-light">
            <PDFViewer url={documento.url} title={documento.nombre_archivo} />
          </div>

          {/* Right panel: Form */}
          <div className="w-[400px] flex flex-col shrink-0 min-h-0">
            {mode === 'review' && (
              <div className="bg-warning-light border border-warning/20 p-3 rounded-lg flex gap-3 mb-6">
                <AlertCircle className="w-5 h-5 text-warning shrink-0" />
                <div className="text-sm text-warning-dark">
                  <p className="font-semibold mb-1">Revisión requerida</p>
                  <p>
                    Algunos campos extraídos tienen un nivel de confianza bajo. Por favor, verifica y
                    corrige la información contra el documento original.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-4 flex-1 overflow-y-auto pr-2">
              <div className="flex flex-col gap-1.5 mb-2">
                <label className="text-sm font-medium text-text-primary">
                  Nombre de archivo
                </label>
                <input
                  type="text"
                  value={nombreArchivo}
                  onChange={(e) => setNombreArchivo(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-text-primary/20 focus:border-text-primary bg-surface"
                />
              </div>

              {documento.datos_extraidos && Object.keys(documento.datos_extraidos).length > 0 && (
                <>
                  <div className="border-t border-border my-2" />
                  <h3 className="text-sm font-semibold text-text-primary mb-2">Datos Extraídos</h3>
                </>
              )}
              {documento.datos_extraidos &&
                Object.entries(documento.datos_extraidos).map(([key, data]) => {
                  const confidence = data?.confidence || 0;
                  const isLowConfidence = confidence < 80;

                  return (
                    <div key={key} className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-medium text-text-primary">
                          {formatLabel(key)}
                        </label>
                        {mode === 'review' && (
                          <div className="flex items-center gap-1.5">
                            {isLowConfidence ? (
                              <AlertCircle className="w-3.5 h-3.5 text-warning" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                            )}
                            <span
                              className={clsx(
                                'text-xs font-medium',
                                isLowConfidence ? 'text-warning' : 'text-success',
                              )}
                            >
                              {confidence}% conf.
                            </span>
                          </div>
                        )}
                      </div>
                      <input
                        type={key.includes('fecha') ? 'date' : 'text'}
                        value={fields[key] || ''}
                        onChange={(e) => handleFieldChange(key, e.target.value)}
                        className={clsx(
                          'w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2',
                          mode === 'review' && isLowConfidence
                            ? 'border-warning bg-warning-light/10 focus:ring-warning/50'
                            : 'border-border bg-surface focus:ring-text-primary/20 focus:border-text-primary',
                        )}
                      />
                    </div>
                  );
                })}
            </div>

            <div className="pt-6 mt-4 border-t border-border flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-neutral-light rounded-md transition-colors"
                disabled={mutation.isPending}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={mutation.isPending}
                className="px-4 py-2 text-sm font-medium bg-text-primary text-white rounded-md hover:bg-text-secondary transition-colors disabled:opacity-50"
              >
                {mutation.isPending ? 'Guardando...' : (mode === 'review' ? 'Guardar correcciones' : 'Guardar cambios')}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isConfirmingDate}
        onClose={() => setIsConfirmingDate(false)}
        title="Confirmar modificación de fecha"
        size="sm"
        footer={
          <>
            <button
              onClick={() => setIsConfirmingDate(false)}
              className="px-4 py-2 text-sm font-medium text-text-secondary hover:bg-neutral-light rounded-md transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmDate}
              className="px-4 py-2 text-sm font-medium bg-text-primary text-white rounded-md hover:bg-text-secondary transition-colors"
            >
              Confirmar
            </button>
          </>
        }
      >
        <p className="text-text-secondary">
          Estás modificando una fecha de vigencia. Esta acción afectará el cálculo de cumplimiento y
          quedará registrada en el historial. ¿Estás seguro de continuar?
        </p>
      </Modal>
    </>
  );
}
