import React, { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadDocumentoForTienda } from '@/client/sdk.gen';
import { Modal } from '@/components/Modal';
import { ProgressBar } from '@/components/ProgressBar';
import { Upload, FileText, X, AlertCircle } from 'lucide-react';
import type { TramiteResumen } from '@/client/types.gen';
import { useUIStore } from '@/stores/uiStore';
import { clsx } from 'clsx';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  tiendaId: string;
  tramites: TramiteResumen[];
}

export function DocumentUploadModal({
  isOpen,
  onClose,
  tiendaId,
  tramites,
}: DocumentUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [selectedTramites, setSelectedTramites] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const addToast = useUIStore((s) => s.addToast);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setFileName('');
      setSelectedTramites([]);
      setError(null);
      setUploadProgress(0);
      setIsUploading(false);
    }
  }, [isOpen]);

  const mutation = useMutation({
    mutationFn: async (data: { file: File; fileName: string; tramiteIds: string[] }) => {
      // Simulate real upload progress since MSW doesn't support it natively for FormData easily without fetch tricks
      return new Promise((resolve, reject) => {
        let progress = 0;
        const interval = setInterval(() => {
          progress += 10;
          setUploadProgress(progress);
          if (progress >= 100) {
            clearInterval(interval);
            // After progress hits 100, make the actual API call
            uploadDocumentoForTienda({
              path: { id: tiendaId },
              body: {
                file: data.file,
                file_name: data.fileName,
                tramite_ids: data.tramiteIds,
              },
              throwOnError: true,
            })
              .then(resolve)
              .catch(reject);
          }
        }, 150);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tienda', tiendaId, 'documentos'] });
      queryClient.invalidateQueries({ queryKey: ['tienda', tiendaId, 'historial'] });
      queryClient.invalidateQueries({ queryKey: ['documentos'] });
      addToast({
        type: 'success',
        message: 'Documento cargado correctamente',
      });
      onClose();
    },
    onError: () => {
      setError('Error al cargar el documento');
      setIsUploading(false);
      setUploadProgress(0);
      addToast({
        type: 'error',
        message: 'Error al cargar el documento',
      });
    },
  });

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFile = e.dataTransfer.files[0];
    handleFileSelect(droppedFile);
  };

  const handleFileSelect = (selectedFile: File | undefined) => {
    if (!selectedFile) return;

    if (selectedFile.type !== 'application/pdf') {
      setError('Solo se permiten archivos PDF');
      return;
    }

    setError(null);
    setFile(selectedFile);
    // Remove extension for the descriptive name
    setFileName(selectedFile.name.replace(/\.[^/.]+$/, ''));
  };

  const handleToggleTramite = (tramiteId: string) => {
    setSelectedTramites((prev) =>
      prev.includes(tramiteId) ? prev.filter((id) => id !== tramiteId) : [...prev, tramiteId],
    );
  };

  const handleUpload = () => {
    if (!file) {
      setError('Selecciona un archivo para cargar');
      return;
    }
    if (selectedTramites.length === 0) {
      setError('Debes seleccionar al menos un trámite');
      return;
    }
    if (!fileName.trim()) {
      setError('El nombre del documento no puede estar vacío');
      return;
    }

    setIsUploading(true);
    setError(null);

    mutation.mutate({ file, fileName, tramiteIds: selectedTramites });
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isUploading && onClose()}
      title="Cargar documento"
      size="md"
      footer={
        <>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="px-4 py-2 text-sm font-medium text-text-secondary hover:bg-neutral-light rounded-md transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || selectedTramites.length === 0 || isUploading}
            className="px-4 py-2 text-sm font-medium bg-text-primary text-white rounded-md hover:bg-text-secondary transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isUploading ? (
              <>Cargando...</>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Cargar
              </>
            )}
          </button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Drop Zone */}
        {!file ? (
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={clsx(
              'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
              error
                ? 'border-danger bg-danger-light/10'
                : 'border-border hover:bg-neutral-light hover:border-text-secondary',
            )}
          >
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".pdf,application/pdf"
              onChange={(e) => handleFileSelect(e.target.files?.[0])}
            />
            <div className="mx-auto w-12 h-12 bg-surface-card border border-border rounded-full flex items-center justify-center mb-4">
              <Upload className="w-6 h-6 text-text-muted" />
            </div>
            <h3 className="text-sm font-medium text-text-primary mb-1">
              Haz clic o arrastra un PDF aquí
            </h3>
            <p className="text-xs text-text-muted">Solo archivos PDF (max. 10MB)</p>
          </div>
        ) : (
          <div className="bg-neutral-light border border-border rounded-lg p-4 flex items-start gap-4">
            <div className="w-10 h-10 bg-surface rounded flex items-center justify-center shrink-0 border border-border">
              <FileText className="w-5 h-5 text-text-secondary" />
            </div>
            <div className="flex-1 min-w-0">
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Nombre descriptivo del documento
              </label>
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                disabled={isUploading}
                className="w-full px-2 py-1.5 text-sm border border-border rounded focus:outline-none focus:border-text-primary focus:ring-1 focus:ring-text-primary bg-surface disabled:opacity-50"
              />
              <p className="text-xs text-text-muted mt-1 truncate">Archivo original: {file.name}</p>
            </div>
            {!isUploading && (
              <button
                onClick={() => setFile(null)}
                className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface rounded transition-colors"
                title="Quitar archivo"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-danger bg-danger-light/20 p-3 rounded-md">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Upload Progress */}
        {isUploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-text-secondary">
              <span>Cargando documento...</span>
              <span>{uploadProgress}%</span>
            </div>
            <ProgressBar value={uploadProgress} />
          </div>
        )}

        {/* Trámites Selection */}
        {file && !isUploading && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-text-primary">
              Vincular a trámites <span className="text-text-muted font-normal">(requerido)</span>
            </label>
            <div className="border border-border rounded-lg max-h-48 overflow-y-auto bg-surface-card">
              {tramites.length === 0 ? (
                <div className="p-4 text-center text-sm text-text-muted">
                  Esta tienda no tiene trámites en su expediente.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {tramites.map((tramite) => (
                    <label
                      key={tramite.id}
                      className="flex items-center gap-3 p-3 hover:bg-neutral-light cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTramites.includes(tramite.id)}
                        onChange={() => handleToggleTramite(tramite.id)}
                        className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">
                          {tramite.nombre}
                        </p>
                        <p className="text-xs text-text-muted capitalize">{tramite.tipo}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
