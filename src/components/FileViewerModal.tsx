import { useState } from 'react';
import { Modal } from './Modal';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { useAuth } from '../lib/authContext';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface FileViewerModalProps {
  open: boolean;
  onClose: () => void;
  title: string | undefined;
  url: string | undefined;
}

export function FileViewerModal({ open, onClose, title, url }: FileViewerModalProps) {
  const [numPages, setNumPages] = useState<number>();
  const { profile } = useAuth();

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  // High school students are allowed to download natively, so we don't force the secure viewer for them.
  const isHighSchool = profile?.educationLevel === 'HIGH_SCHOOL';
  const isPdf = url?.includes('.pdf?');
  const useSecureViewer = isPdf && !isHighSchool;

  return (
    <Modal open={open} onClose={onClose} title={title} size="xl">
      {url && (
        <div 
          className="w-full h-[80vh] bg-[#222] rounded-xl overflow-y-auto relative custom-scrollbar flex flex-col items-center py-4 select-none" 
          onContextMenu={(e) => useSecureViewer && e.preventDefault()}
        >
          {useSecureViewer ? (
            <Document
              file={url}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={<div className="text-white animate-pulse">Loading secure document...</div>}
              error={<div className="text-red-500">Failed to load secure document.</div>}
            >
              {Array.from(new Array(numPages || 0), (_el, index) => (
                <div key={`page_${index + 1}`} className="mb-4 shadow-2xl relative">
                  <div className="absolute inset-0 z-10" />
                  <Page
                    pageNumber={index + 1}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    width={800}
                  />
                </div>
              ))}
            </Document>
          ) : (
            <iframe
              src={url}
              className="w-full h-full border-0 absolute inset-0"
              title={title}
            />
          )}
        </div>
      )}
    </Modal>
  );
}
