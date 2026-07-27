import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Trash2, Paperclip, UploadCloud } from 'lucide-react';

interface LectureFilesSectionProps {
  lectureId: string;
}

export function LectureFilesSection({ lectureId }: LectureFilesSectionProps) {
  const queryClient = useQueryClient();
  const [fileTitle, setFileTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { data: files = [], isLoading } = useQuery({
    queryKey: ['attachments', lectureId],
    queryFn: async () => {
      const res = await api.get(`/attachments/lecture/${lectureId}`);
      return res.data;
    }
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return api.post('/attachments', formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachments', lectureId] });
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
      return api.delete(`/attachments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachments', lectureId] });
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
    formData.append('lectureId', lectureId);

    uploadMutation.mutate(formData);
  };

  return (
    <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-950 p-4 text-white">
      <div className="flex items-center gap-2 border-b border-neutral-800 pb-2 mb-3">
        <Paperclip className="h-4 w-4 text-cyan-400" />
        <h4 className="text-sm font-bold uppercase tracking-wider text-neutral-300">Lecture Files & Homework Vault</h4>
      </div>

      {isLoading ? (
        <p className="text-xs text-neutral-500">Loading attachments...</p>
      ) : (
        <div className="space-y-2">
          {files.length === 0 ? (
            <p className="text-xs text-neutral-500 italic">No resource or homework files attached to this lecture yet.</p>
          ) : (
            files.map((file: any) => (
              <div key={file.id} className="flex items-center justify-between rounded-lg bg-neutral-900 p-2 text-xs border border-neutral-800/50">
                <span className="font-medium text-neutral-200 truncate max-w-xs">{file.title}</span>
                <button type="button" onClick={() => deleteMutation.mutate(file.id)} className="text-neutral-500 hover:text-red-400 transition">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      <form onSubmit={handleUploadSubmit} className="mt-4 flex flex-col md:flex-row gap-2 border-t border-neutral-900 pt-3">
        <input type="text" placeholder="Custom File Title (e.g., Homework PDF)" value={fileTitle} onChange={(e) => setFileTitle(e.target.value)} className="flex-1 rounded-lg border border-neutral-800 bg-neutral-900 p-2 text-xs outline-none focus:border-cyan-500" />
        <div className="relative flex items-center justify-center rounded-lg border border-dashed border-neutral-800 bg-neutral-900 p-2 hover:bg-neutral-800 transition cursor-pointer">
          <input type="file" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
          <UploadCloud className="h-4 w-4 mr-1 text-neutral-400" />
          <span className="text-xs text-neutral-300 truncate max-w-[120px]">{selectedFile ? selectedFile.name : 'Choose File'}</span>
        </div>
        <button type="submit" disabled={!selectedFile || isUploading} className="rounded-lg bg-cyan-500 px-4 py-2 text-xs font-bold text-black hover:bg-cyan-400 disabled:opacity-30 transition">
          {isUploading ? 'Uploading...' : 'Attach File'}
        </button>
      </form>
    </div>
  );
}
