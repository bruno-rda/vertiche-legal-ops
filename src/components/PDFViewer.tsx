import React, { useState } from 'react';
import { pdfjs, Document, Page } from 'react-pdf';
import { ChevronLeft, ChevronRight, Download, ZoomIn, ZoomOut, AlertCircle, Maximize, Minimize } from 'lucide-react';
import { Skeleton } from './Skeleton';
import { EmptyState } from './EmptyState';

// Configure PDF worker to load locally via Vite
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

interface PDFViewerProps {
  url: string;
  title: string;
  onClose?: () => void;
}

export function PDFViewer({ url, title, onClose }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [error, setError] = useState<boolean>(false);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPageNumber(1);
    setError(false);
  }

  function onDocumentLoadError(error: Error) {
    console.error('Error loading PDF:', error);
    setError(true);
  }

  const changePage = (offset: number) => {
    setPageNumber(prevPageNumber => {
      const newPageNumber = prevPageNumber + offset;
      return Math.max(1, Math.min(newPageNumber, numPages || 1));
    });
  };

  const previousPage = () => changePage(-1);
  const nextPage = () => changePage(1);

  const zoomIn = () => setScale(prevScale => Math.min(prevScale + 0.25, 3));
  const zoomOut = () => setScale(prevScale => Math.max(prevScale - 0.25, 0.5));

  const resetZoom = () => setScale(1.0);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-full w-full bg-surface-card rounded-lg overflow-hidden border border-border shadow-sm">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface shrink-0">
        <h3 className="font-semibold text-text-primary truncate max-w-[300px]" title={title}>
          {title}
        </h3>

        <div className="flex items-center gap-4">
          {/* Zoom Controls */}
          <div className="flex items-center bg-neutral-light rounded-md border border-border">
            <button
              onClick={zoomOut}
              disabled={scale <= 0.5}
              className="p-1.5 text-text-secondary hover:text-text-primary disabled:opacity-50"
              title="Alejar"
            >
              <ZoomOut size={16} />
            </button>
            <span className="text-xs font-mono px-2 text-text-secondary w-12 text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={zoomIn}
              disabled={scale >= 3}
              className="p-1.5 text-text-secondary hover:text-text-primary disabled:opacity-50"
              title="Acercar"
            >
              <ZoomIn size={16} />
            </button>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center bg-neutral-light rounded-md border border-border">
            <button
              onClick={previousPage}
              disabled={pageNumber <= 1}
              className="p-1.5 text-text-secondary hover:text-text-primary disabled:opacity-50"
              title="Página anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-mono px-2 text-text-secondary">
              {pageNumber} / {numPages || '-'}
            </span>
            <button
              onClick={nextPage}
              disabled={pageNumber >= (numPages || 1)}
              className="p-1.5 text-text-secondary hover:text-text-primary disabled:opacity-50"
              title="Página siguiente"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="h-4 w-px bg-border"></div>

          <button
            onClick={handleDownload}
            className="flex items-center gap-2 text-sm font-medium text-text-primary hover:text-text-secondary"
          >
            <Download size={16} />
            Descargar
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-neutral-light rounded-full text-text-secondary"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Viewer Container */}
      <div className="flex-1 overflow-auto bg-neutral-light flex items-center justify-center p-4">
        {error ? (
          <div className="text-center py-12 px-4">
            <AlertCircle size={48} className="mx-auto text-danger-light mb-4" />
            <h3 className="text-lg font-display text-text-primary mb-2">
              No se pudo cargar el documento
            </h3>
            <p className="text-text-secondary mb-6">
              El archivo puede estar corrupto o no ser un PDF válido.
            </p>
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-2 px-4 py-2 bg-text-primary text-white rounded-md font-medium"
            >
              <Download size={16} />
              Descargar archivo
            </button>
          </div>
        ) : (
          <Document
            file={url}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="flex flex-col items-center justify-center space-y-4">
                <Skeleton className="w-[600px] h-[800px] rounded-lg shadow-md" />
              </div>
            }
            className="flex flex-col items-center justify-center"
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              className="shadow-lg"
              renderTextLayer={true}
              renderAnnotationLayer={true}
              loading={<Skeleton className="w-[600px] h-[800px] rounded-lg shadow-md" />}
            />
          </Document>
        )}
      </div>
    </div>
  );
}
