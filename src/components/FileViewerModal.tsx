import { Modal } from './Modal';

interface FileViewerModalProps {
  open: boolean;
  onClose: () => void;
  title: string | undefined;
  url: string | undefined;
}

export function FileViewerModal({ open, onClose, title, url }: FileViewerModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="xl">
      {url && (
        <div className="w-full h-[80vh] bg-[#333] rounded-xl overflow-hidden relative" onContextMenu={(e) => e.preventDefault()}>
          <iframe
            src={url}
            className="w-full h-full border-0 absolute inset-0"
            title={title}
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      )}
    </Modal>
  );
}
