import { useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { api } from '../lib/api';
import { Modal } from './Modal';
import { Spinner } from './ui';

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

interface SecureFileViewerProps {
  open: boolean;
  onClose: () => void;
  title: string | undefined;
  /** Attachment id; the file is fetched through the authenticated /attachments/:id/stream endpoint. */
  attachmentId: string | undefined;
}

/**
 * Renders view-only files on <canvas>/<img> instead of the browser's built-in viewer,
 * so no native Download / Print / Save controls exist. The file bytes are loaded as a blob
 * through the API (no direct or signed storage URL is ever exposed).
 */
export function SecureFileViewer({ open, onClose, title, attachmentId }: SecureFileViewerProps) {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [width, setWidth] = useState(800);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !attachmentId) return;
    let cancelled = false;
    setBlob(null);
    setError(null);
    setNumPages(0);
    api
      .get(`/attachments/${attachmentId}/stream`, { responseType: 'blob' })
      .then((res) => {
        if (!cancelled) setBlob(res.data as Blob);
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load this file.');
      });
    return () => {
      cancelled = true;
    };
  }, [open, attachmentId]);

  useEffect(() => {
    if (!blob || !blob.type.startsWith('image/')) {
      setImageUrl(null);
      return;
    }
    const url = URL.createObjectURL(blob);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [blob]);

  useEffect(() => {
    if (!open) return;
    const measure = () => {
      if (containerRef.current) setWidth(Math.max(280, containerRef.current.clientWidth - 32));
    };
    const t = setTimeout(measure, 50);
    window.addEventListener('resize', measure);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', measure);
    };
  }, [open, blob]);

  const isPdf = !!blob && (blob.type === 'application/pdf' || blob.type === 'application/octet-stream');
  const isImage = !!blob && blob.type.startsWith('image/');

  return (
    <Modal open={open} onClose={onClose} title={title} size="xl">
      <style>{'@media print { .secure-viewer { display: none !important; } }'}</style>
      <div
        ref={containerRef}
        className="secure-viewer w-full h-[80vh] bg-[#222] rounded-xl overflow-auto select-none"
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
      >
        {error ? (
          <p className="text-center text-red-400 py-20">{error}</p>
        ) : !blob ? (
          <div className="flex justify-center py-20">
            <Spinner className="w-8 h-8 text-accent-400" />
          </div>
        ) : isPdf ? (
          <Document
            file={blob}
            onLoadSuccess={({ numPages: n }) => setNumPages(n)}
            onLoadError={() => setError('This file could not be displayed.')}
            loading={<div className="flex justify-center py-20"><Spinner className="w-8 h-8 text-accent-400" /></div>}
            className="flex flex-col items-center gap-3 p-4"
          >
            {Array.from({ length: numPages }, (_, i) => (
              <Page
                key={i + 1}
                pageNumber={i + 1}
                width={width}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            ))}
          </Document>
        ) : isImage && imageUrl ? (
          <div className="flex justify-center p-4">
            <img src={imageUrl} alt={title} draggable={false} className="max-w-full h-auto" />
          </div>
        ) : (
          <p className="text-center text-theme-muted py-20 px-6">
            This file type can't be previewed online, and downloading is disabled for it.
          </p>
        )}
      </div>
    </Modal>
  );
}
