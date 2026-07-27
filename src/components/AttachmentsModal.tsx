import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { X, Upload, Trash2, Paperclip, FileText, Loader2 } from 'lucide-react';

interface Attachment {
  id: string;
  title: string;
  fileUrl: string;
  type?: string;
  createdAt: string;
}

interface AttachmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetId: string;
  targetType: 'COURSE' | 'CHAPTER';
  title: string;
}

export function AttachmentsModal({ isOpen, onClose, targetId, targetType, title }: AttachmentsModalProps) {
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileTitle, setFileTitle] = useState('');
  const [fileType, setFileType] = useState('OTHER');
  const [isUploading, setIsUploading] = useState(false);

  // Determine API endpoints
  const fetchUrl = targetType === 'COURSE' ? `/course-attachments/course/${targetId}` : `/chapter-attachments/chapter/${targetId}`;
  const uploadUrl = targetType === 'COURSE' ? `/course-attachments` : `/chapter-attachments`;
  const idKey = targetType === 'COURSE' ? 'courseId' : 'chapterId';
  const queryKey = ['attachments', targetType, targetId];

  const { data: attachments = [], isLoading } = useQuery<Attachment[]>({
    queryKey,
    queryFn: async () => {
      const { data } = await api.get(fetchUrl);
      return data;
    },
    enabled: isOpen,
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return api.post(uploadUrl, formData); // Let Axios handle the boundary automatically
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setFileTitle('');
      setSelectedFile(null);
      setIsUploading(false);
    },
    onError: (err: any) => {
      setIsUploading(false);
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Unknown error';
      alert(`Upload failed: ${msg}`);
      console.error('Upload Error:', err.response?.data || err);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`${uploadUrl}/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!fileTitle) setFileTitle(file.name);
    }
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;
    setIsUploading(true);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('title', fileTitle.trim());
    formData.append('type', fileType);
    formData.append(idKey, targetId);

    uploadMutation.mutate(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-[#0B0C10] border border-theme-border rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-theme-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30">
              <Paperclip className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-theme-text">Manage Attachments</h2>
              <p className="text-sm text-theme-muted">{title}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-theme-muted hover:text-white rounded-lg hover:bg-white/5 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {/* Upload Form */}
          <form onSubmit={handleUploadSubmit} className="bg-neutral-900/50 p-4 rounded-xl border border-neutral-800 space-y-4">
            <div>
              <label className="block text-xs font-medium text-theme-muted mb-2">Select File</label>
              <input
                type="file"
                onChange={handleFileChange}
                className="block w-full text-sm text-theme-muted
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-medium
                  file:bg-cyan-500/10 file:text-cyan-400
                  hover:file:bg-cyan-500/20 file:cursor-pointer cursor-pointer"
                required
              />
            </div>
            
            {selectedFile && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                <label className="block text-xs font-medium text-theme-muted mb-2">Details</label>
                <div className="flex gap-2">
                  <select
                    value={fileType}
                    onChange={(e) => setFileType(e.target.value)}
                    className="input bg-neutral-950 max-w-[150px]"
                  >
                    <option value="HOMEWORK">HOMEWORK</option>
                    <option value="PDF">PDF</option>
                    <option value="SHEET">SHEET</option>
                    <option value="REFERENCE">REFERENCE</option>
                    <option value="ASSIGNMENT">ASSIGNMENT</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                  <input
                    type="text"
                    value={fileTitle}
                    onChange={(e) => setFileTitle(e.target.value)}
                    placeholder="Enter file display title..."
                    className="input flex-1 bg-neutral-950"
                    required
                  />
                  <button
                    type="submit"
                    disabled={isUploading}
                    className="btn-primary min-w-[120px]"
                  >
                    {isUploading ? (
                      <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                    ) : (
                      <><Upload className="w-4 h-4" /> Upload</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>

          {/* Attachments List */}
          <div>
            <h3 className="text-sm font-semibold text-theme-muted mb-4">Uploaded Files</h3>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
              </div>
            ) : attachments.length === 0 ? (
              <div className="text-center py-8 bg-neutral-900/30 rounded-xl border border-neutral-800/50 border-dashed">
                <FileText className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
                <p className="text-sm text-theme-muted">No attachments uploaded yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {attachments.map((att) => (
                  <div key={att.id} className="flex items-center justify-between p-3 bg-neutral-900/50 rounded-xl border border-neutral-800 hover:border-neutral-700 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex flex-col items-center justify-center">
                        <FileText className="w-4 h-4 text-cyan-400" />
                      </div>
                      <div className="flex flex-col">
                        <a href={att.fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-theme-text hover:text-cyan-400 transition-colors">
                          {att.title}
                        </a>
                        <span className="text-[10px] font-bold text-cyan-500">{att.type || 'OTHER'}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteMutation.mutate(att.id)}
                      disabled={deleteMutation.isPending}
                      className="p-2 text-theme-muted hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                      title="Delete attachment"
                    >
                      {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
