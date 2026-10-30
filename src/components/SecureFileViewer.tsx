import { useEffect, useMemo, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { api } from '../lib/api';
import { Modal } from './Modal';
import { Spinner } from './ui';
import { ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker';

const CDN_WORKER_SRC = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// Always ensure workerSrc points to a valid module URL rather than react-pdf's relative 'pdf.worker.mjs'
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = CDN_WORKER_SRC;
}

interface SecureFileViewerProps {
  open: boolean;
  onClose: () => void;
  title: string | undefined;
  /** Attachment id; fetched through authenticated /attachments/:id/stream */
  attachmentId: string | undefined;
}

export function SecureFileViewer({ open, onClose, title, attachmentId }: SecureFileViewerProps) {
  const [fileData, setFileData] = useState<Uint8Array | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [baseWidth, setBaseWidth] = useState<number>(800);
  const [scale, setScale] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [docKey, setDocKey] = useState<number>(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const workerRef = useRef<Worker | null>(null);

  // Manage a fresh bundled PDF worker per viewer session with automatic CDN fallback on error
  useEffect(() => {
    if (!open || !fileData) return;

    if (typeof window !== 'undefined' && 'Worker' in window) {
      try {
        const worker = new PdfWorker();
        workerRef.current = worker;
        worker.onerror = (evt) => {
          evt.preventDefault();
          console.warn('Bundled PDF worker failed to load, switching to CDN fallback.');
          if (pdfjs.GlobalWorkerOptions.workerPort === worker) {
            pdfjs.GlobalWorkerOptions.workerPort = null as any;
          }
          pdfjs.GlobalWorkerOptions.workerSrc = CDN_WORKER_SRC;
          worker.terminate();
          workerRef.current = null;
          setDocKey((prev) => prev + 1);
        };
        pdfjs.GlobalWorkerOptions.workerPort = worker;
      } catch (e) {
        console.warn('Failed to start bundled PDF worker, using CDN fallback:', e);
        pdfjs.GlobalWorkerOptions.workerPort = null as any;
        pdfjs.GlobalWorkerOptions.workerSrc = CDN_WORKER_SRC;
      }
    }

    return () => {
      if (workerRef.current) {
        if (pdfjs.GlobalWorkerOptions.workerPort === workerRef.current) {
          pdfjs.GlobalWorkerOptions.workerPort = null as any;
        }
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [open, fileData]);

  useEffect(() => {
    if (!open || !attachmentId) return;

    let cancelled = false;
    setFileData(null);
    setImageUrl(null);
    setError(null);
    setNumPages(0);
    setScale(1);
    setLoading(true);

    api
      .get(`/attachments/${attachmentId}/stream`, { responseType: 'arraybuffer' })
      .then((res) => {
        if (cancelled) return;
        const uint8 = new Uint8Array(res.data as ArrayBuffer);

        if (uint8.length === 0) {
          setError('The requested file is empty.');
          setLoading(false);
          return;
        }

        // Check if image by extension
        const isImage = title?.match(/\.(png|jpe?g|webp|gif|svg)$/i);
        if (isImage) {
          const blob = new Blob([uint8]);
          const url = URL.createObjectURL(blob);
          setImageUrl(url);
        } else {
          setFileData(uint8);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Failed to load attachment stream:', err);
          const msg = err.response?.data?.message || 'Failed to load this file.';
          setError(typeof msg === 'string' ? msg : 'Failed to load this file.');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, attachmentId, title]);

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  // Adjust page width to container
  useEffect(() => {
    if (!open) return;
    const updateWidth = () => {
      if (containerRef.current) {
        setBaseWidth(Math.max(300, containerRef.current.clientWidth - 48));
      }
    };
    const t = setTimeout(updateWidth, 100);
    window.addEventListener('resize', updateWidth);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', updateWidth);
    };
  }, [open, fileData]);

  const documentFile = useMemo(() => {
    return fileData ? { data: fileData } : null;
  }, [fileData]);

  const computedWidth = useMemo(() => {
    return Math.round(baseWidth * scale);
  }, [baseWidth, scale]);

  const handleZoomIn = () => setScale((prev) => Math.min(2.5, +(prev + 0.15).toFixed(2)));
  const handleZoomOut = () => setScale((prev) => Math.max(0.6, +(prev - 0.15).toFixed(2)));
  const handleResetZoom = () => setScale(1);

  return (
    <Modal open={open} onClose={onClose} title={title} size="xl">
      <style>{'@media print { .secure-viewer { display: none !important; } }'}</style>

      {/* Control bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-theme-secondary/80 border-b border-theme-border text-xs rounded-t-xl select-none">
        <div className="flex items-center gap-2 text-theme-muted">
          {numPages > 0 && (
            <span className="px-2 py-0.5 rounded bg-theme-card border border-theme-border font-medium">
              {numPages} {numPages === 1 ? 'page' : 'pages'}
            </span>
          )}
          <span className="text-[11px] text-amber-400/90 font-medium">Protected View</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={scale <= 0.6}
            className="p-1.5 rounded-lg bg-theme-card border border-theme-border hover:border-cyan-500/40 text-theme-text disabled:opacity-40 transition"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="w-12 text-center font-mono text-[11px] text-theme-muted">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={scale >= 2.5}
            className="p-1.5 rounded-lg bg-theme-card border border-theme-border hover:border-cyan-500/40 text-theme-text disabled:opacity-40 transition"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleResetZoom}
            className="p-1.5 rounded-lg bg-theme-card border border-theme-border hover:border-cyan-500/40 text-theme-text transition ml-1"
            title="Reset Zoom"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main View Area */}
      <div
        ref={containerRef}
        className="secure-viewer w-full h-[76vh] bg-[#1a1a1a] rounded-b-xl overflow-auto select-none relative"
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-20 text-theme-muted">
            <Spinner className="w-8 h-8 text-cyan-400" />
            <p className="text-xs">Loading document...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 py-20 px-4 text-center">
            <p className="text-red-400 text-sm font-semibold">{error}</p>
            <p className="text-xs text-theme-muted max-w-sm">
              Please contact the course instructor if you believe you should have access to this document.
            </p>
          </div>
        ) : imageUrl ? (
          <div className="flex justify-center p-6">
            <img
              src={imageUrl}
              alt={title || 'Document preview'}
              draggable={false}
              style={{ width: computedWidth }}
              className="max-w-none h-auto rounded shadow-2xl transition-all"
            />
          </div>
        ) : documentFile ? (
          <Document
            key={docKey}
            file={documentFile}
            onLoadSuccess={({ numPages: n }) => setNumPages(n)}
            onLoadError={(err: any) => {
              console.error('PDF display error:', err);
              // Fallback to unpkg CDN worker if bundled worker had any issue
              if (pdfjs.GlobalWorkerOptions.workerPort) {
                pdfjs.GlobalWorkerOptions.workerPort = null as any;
                pdfjs.GlobalWorkerOptions.workerSrc = CDN_WORKER_SRC;
                setDocKey((prev) => prev + 1);
                return;
              }
              setError(err?.message || 'This file could not be displayed.');
            }}
            loading={
              <div className="flex flex-col items-center justify-center py-20 gap-2 text-theme-muted">
                <Spinner className="w-8 h-8 text-cyan-400" />
                <p className="text-xs">Rendering PDF pages...</p>
              </div>
            }
            className="flex flex-col items-center gap-4 p-4"
          >
            {Array.from({ length: numPages }, (_, i) => (
              <div
                key={i + 1}
                className="bg-white rounded shadow-2xl overflow-hidden transition-all duration-150"
                style={{ width: computedWidth }}
              >
                <Page
                  pageNumber={i + 1}
                  width={computedWidth}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  loading={
                    <div
                      className="bg-neutral-800 animate-pulse flex items-center justify-center text-xs text-neutral-500"
                      style={{ height: Math.round(computedWidth * 1.4) }}
                    >
                      Loading page {i + 1}...
                    </div>
                  }
                />
              </div>
            ))}
          </Document>
        ) : null}
      </div>
    </Modal>
  );
}
