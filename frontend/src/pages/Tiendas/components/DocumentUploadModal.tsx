import React, { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { uploadDocumentoForTienda } from '@/client/sdk.gen';
import { Modal } from '@/components/Modal';
import { ProgressBar } from '@/components/ProgressBar';
import { Upload, FileText, X, AlertCircle } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { clsx } from 'clsx';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  tiendaId: string;
  tramiteId?: string;
}

interface UploadFile {
  id: string;
  file: File;
  name: string;
}

export function DocumentUploadModal({
  isOpen,
  onClose,
  tiendaId,
  tramiteId,
}: DocumentUploadModalProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const addToast = useUIStore((s) => s.addToast);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isOpen) {
      setFiles([]);
      setError(null);
      setUploadProgress(0);
      setIsUploading(false);
    }
  }, [isOpen]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFilesSelect(droppedFiles);
  };

  const handleFilesSelect = (selectedFiles: File[]) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    const validFiles = selectedFiles.filter((f) => f.type === 'application/pdf');
    if (validFiles.length !== selectedFiles.length) {
      setError('Algunos archivos no se agregaron porque solo se permiten archivos PDF');
    } else {
      setError(null);
    }

    const newFiles = validFiles.map((f) => ({
      id: Math.random().toString(36).substring(7),
      file: f,
      name: f.name.replace(/\.[^/.]+$/, ''),
    }));

    setFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const updateFileName = (id: string, newName: string) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, name: newName } : f)));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setError('Selecciona al menos un archivo para cargar');
      return;
    }

    if (files.some((f) => !f.name.trim())) {
      setError('Todos los documentos deben tener un nombre');
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    const total = files.length;
    let successCount = 0;

    for (let i = 0; i < total; i++) {
      const f = files[i];
      try {
        await uploadDocumentoForTienda({
          path: { id: tiendaId },
          body: {
            file: f.file,
            file_name: f.name,
            tramite_ids: tramiteId ? [tramiteId] : [],
          },
          throwOnError: true,
        });
        successCount++;
      } catch (err) {
        console.error('Error uploading file', f.name, err);
      }
      setUploadProgress(Math.round(((i + 1) / total) * 100));
    }

    if (successCount === total) {
      addToast({
        type: 'success',
        message: 'Documentos cargados correctamente',
      });
    } else if (successCount > 0) {
      addToast({
        type: 'warning',
        message: `Se cargaron ${successCount} de ${total} documentos. Algunos fallaron.`,
      });
    } else {
      addToast({
        type: 'error',
        message: 'Error al cargar los documentos',
      });
    }

    queryClient.invalidateQueries({ queryKey: ['tienda', tiendaId, 'documentos'] });
    queryClient.invalidateQueries({ queryKey: ['tienda', tiendaId, 'historial'] });
    queryClient.invalidateQueries({ queryKey: ['documentos'] });
    if (tramiteId) {
      queryClient.invalidateQueries({ queryKey: ['tramite', tramiteId] });
    }
    
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isUploading && onClose()}
      title="Cargar documentos"
      size="lg"
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
            disabled={files.length === 0 || isUploading}
            className="px-4 py-2 text-sm font-medium bg-text-primary text-white rounded-md hover:bg-text-secondary transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isUploading ? (
              <>Cargando...</>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Continuar ({files.length})
              </>
            )}
          </button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-danger bg-danger-light/20 p-3 rounded-md">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Drop Zone */}
        {!isUploading && (
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={clsx(
              'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
              'border-border hover:bg-neutral-light hover:border-text-secondary'
            )}
          >
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".pdf,application/pdf"
              multiple
              onChange={(e) => {
                if (e.target.files) {
                  handleFilesSelect(Array.from(e.target.files));
                }
              }}
            />
            <div className="mx-auto w-12 h-12 bg-surface-card border border-border rounded-full flex items-center justify-center mb-4">
              <Upload className="w-6 h-6 text-text-muted" />
            </div>
            <h3 className="text-sm font-medium text-text-primary mb-1">
              Haz clic o arrastra PDFs aquí
            </h3>
            <p className="text-xs text-text-muted">Sube uno o varios archivos PDF</p>
          </div>
        )}

        {/* Upload Progress */}
        {isUploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-text-secondary">
              <span>Cargando documentos...</span>
              <span>{uploadProgress}%</span>
            </div>
            <ProgressBar value={uploadProgress} />
          </div>
        )}

        {/* Files List */}
        {files.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-text-primary border-b border-border pb-2">
              Archivos listos para cargar
            </h4>
            <div className="max-h-64 overflow-y-auto pr-2 space-y-3">
              {files.map((f) => (
                <div key={f.id} className="bg-surface-card border border-border rounded-lg p-3 flex items-start gap-4">
                  <div className="w-10 h-10 bg-neutral-light rounded flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-text-secondary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={f.name}
                      onChange={(e) => updateFileName(f.id, e.target.value)}
                      disabled={isUploading}
                      className="w-full px-2 py-1 text-sm border border-transparent hover:border-border rounded focus:outline-none focus:border-text-primary focus:ring-1 focus:ring-text-primary bg-transparent focus:bg-surface disabled:opacity-50 transition-colors"
                      placeholder="Nombre del documento"
                    />
                    <p className="text-xs text-text-muted mt-0.5 truncate px-2">{f.file.name}</p>
                  </div>
                  {!isUploading && (
                    <button
                      onClick={() => removeFile(f.id)}
                      className="p-1.5 text-text-muted hover:text-danger hover:bg-danger-light/20 rounded transition-colors"
                      title="Quitar archivo"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
