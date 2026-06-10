import { useState, useEffect } from 'react';
import { getDocumentoUrl } from '@/client/sdk.gen';
import { PDFViewer } from './PDFViewer';
import { Skeleton } from './Skeleton';
import { AlertCircle } from 'lucide-react';

interface DocumentPDFViewerProps {
  documentoId: string;
  title: string;
  onClose?: () => void;
}

export function DocumentPDFViewer({ documentoId, title, onClose }: DocumentPDFViewerProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    const fetchUrl = async () => {
      try {
        const res = await getDocumentoUrl({ path: { id: documentoId }, query: { download: false } });
        if (mounted) {
          setUrl(res.data?.url || '');
        }
      } catch (err) {
        if (mounted) setError(true);
      }
    };
    fetchUrl();
    return () => {
      mounted = false;
    };
  }, [documentoId]);

  if (error) {
    return (
      <div className="flex-1 overflow-auto bg-neutral-light flex items-center justify-center p-4">
        <div className="text-center py-12 px-4">
          <AlertCircle size={48} className="mx-auto text-danger-light mb-4" />
          <h3 className="text-lg font-display text-text-primary mb-2">Error de conexión</h3>
          <p className="text-text-secondary mb-6">No se pudo obtener la URL del documento.</p>
        </div>
      </div>
    );
  }

  if (!url) {
    return (
      <div className="flex-1 overflow-auto bg-neutral-light flex items-center justify-center p-4">
        <Skeleton className="w-[600px] h-[800px] rounded-lg shadow-md" />
      </div>
    );
  }

  const handleDownload = async () => {
    try {
      const res = await getDocumentoUrl({ path: { id: documentoId }, query: { download: true } });
      if (res.data?.url) {
        const link = document.createElement('a');
        link.href = res.data.url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error("Failed to download document:", err);
    }
  };

  return <PDFViewer url={url} title={title} onClose={onClose} onDownload={handleDownload} />;
}
