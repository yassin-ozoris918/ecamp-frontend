import { useState, useEffect } from 'react';
import { HelpCircle, Plus, Edit2, Trash2, Video, Eye, EyeOff } from 'lucide-react';
import { api } from '../lib/api';
import { Badge, Modal, ProgressBar, Skeleton } from './ui';
import { HelpVideoTargetingModal } from './HelpVideoTargetingModal';

// Using simpler DTOs for frontend state
interface Category {
  id: string;
  titleAr: string;
  titleEn: string;
  sortOrder: number;
  isActive: boolean;
}

interface VideoData {
  id: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  sourceType: 'CLOUDFLARE' | 'EXTERNAL';
  cloudflareId: string;
  externalUrl: string;
  thumbnailUrl: string;
  categoryId: string;
  sortOrder: number;
  isActive: boolean;
  isPublic: boolean;
  targetGroups: any[];
}

export function AdminHelpCenterManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Category Modal
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | null>(null);

  // Video Modal
  const [vidModalOpen, setVidModalOpen] = useState(false);
  const [editVideo, setEditVideo] = useState<Partial<VideoData> | null>(null);
  
  // Video File Upload
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  // Targeting Modal
  const [targetModalOpen, setTargetModalOpen] = useState(false);
  const [targetVideoId, setTargetVideoId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [catRes, vidRes] = await Promise.all([
        api.get('/tutorials/categories/all'),
        api.get('/tutorials/all')
      ]);
      setCategories(catRes.data);
      setVideos(vidRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const handleSaveCategory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = {
      titleAr: fd.get('titleAr') as string,
      titleEn: fd.get('titleEn') as string,
      sortOrder: Number(fd.get('sortOrder')),
      isActive: fd.get('isActive') === 'on'
    };
    try {
      if (editCategory?.id) {
        await api.patch(`/tutorials/categories/${editCategory.id}`, data);
      } else {
        await api.post('/tutorials/categories', data);
      }
      setCatModalOpen(false);
      loadData();
    } catch (err) {
      alert('Error saving category');
    }
  };

  const handleSaveVideo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = {
      titleAr: fd.get('titleAr') as string,
      titleEn: fd.get('titleEn') as string,
      descriptionAr: fd.get('descriptionAr') as string,
      descriptionEn: fd.get('descriptionEn') as string,
      categoryId: fd.get('categoryId') as string,
      sourceType: fd.get('sourceType') as string,
      externalUrl: fd.get('externalUrl') as string,
      sortOrder: Number(fd.get('sortOrder')),
      isActive: fd.get('isActive') === 'on',
      isPublic: fd.get('isPublic') === 'on'
    };
    
    try {
      setUploading(true);
      let vidId = editVideo?.id;
      if (vidId) {
        await api.patch(`/tutorials/${vidId}`, data);
      } else {
        const res = await api.post('/tutorials', data);
        vidId = res.data.id;
      }

      // If there's a file, upload it to R2
      if (videoFile && vidId && data.sourceType === 'CLOUDFLARE') {
        const initRes = await api.post(`/tutorials/${vidId}/video/upload/init`, {
          filename: videoFile.name,
          mimetype: videoFile.type || 'video/mp4',
          fileSize: videoFile.size,
        });
        const { uploadUrl, objectKey, assetUrl } = initRes.data;

        await fetch(uploadUrl, {
          method: 'PUT',
          body: videoFile,
          headers: { 'Content-Type': videoFile.type || 'video/mp4' }
        });

        await api.post(`/tutorials/${vidId}/video/upload/complete`, { objectKey, assetUrl });
      }

      setVidModalOpen(false);
      setVideoFile(null);
      loadData();
    } catch (err) {
      alert('Error saving video');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteVideo = async (id: string) => {
    if (!confirm('Are you sure you want to delete this video?')) return;
    try {
      await api.delete(`/tutorials/${id}`);
      loadData();
    } catch (err) {
      alert('Failed to delete video');
    }
  };

  if (loading) {
    return <div className="p-8"><Skeleton className="h-64 w-full" /></div>;
  }

  return (
    <div className="space-y-8 p-6 max-w-6xl mx-auto animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <HelpCircle className="w-8 h-8 text-blue-500" />
            Help Center Manager
          </h1>
          <p className="text-theme-muted mt-1">Manage categories, upload tutorials, and configure targeting.</p>
        </div>
        <div className="flex gap-3">
          <button className="btn-secondary" onClick={() => { setEditCategory(null); setCatModalOpen(true); }}>
            <Plus className="w-4 h-4" /> Add Category
          </button>
          <button className="btn-primary" onClick={() => { setEditVideo(null); setVidModalOpen(true); }}>
            <Video className="w-4 h-4" /> Add Video
          </button>
        </div>
      </div>

      {categories.map(cat => (
        <div key={cat.id} className="glass p-6 rounded-xl border border-theme-border">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              {cat.titleEn} / {cat.titleAr}
              {!cat.isActive && <Badge variant="warning">Draft</Badge>}
            </h2>
            <button className="text-theme-muted hover:text-theme-text" onClick={() => { setEditCategory(cat); setCatModalOpen(true); }}>
              <Edit2 className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            {videos.filter(v => v.categoryId === cat.id).map(vid => (
              <div key={vid.id} className="flex justify-between items-center p-3 bg-theme-bg/50 rounded-lg border border-theme-border/50">
                <div>
                  <h4 className="font-semibold text-theme-text">{vid.titleEn} / {vid.titleAr}</h4>
                  <div className="flex gap-2 text-xs text-theme-muted mt-1">
                    <Badge variant="outline">{vid.sourceType}</Badge>
                    {vid.isPublic ? <Badge variant="success">Public</Badge> : <Badge variant="warning">Targeted</Badge>}
                    {!vid.isActive && <Badge variant="outline">Inactive</Badge>}
                  </div>
                </div>
                <div className="flex gap-2">
                  {!vid.isPublic && (
                    <button 
                      className="btn-secondary px-3 py-1 text-xs"
                      onClick={() => { setTargetVideoId(vid.id); setTargetModalOpen(true); }}
                    >
                      Targets ({vid.targetGroups?.length || 0})
                    </button>
                  )}
                  <button className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-md" onClick={() => { setEditVideo(vid); setVidModalOpen(true); }}>
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-red-500 hover:bg-red-500/10 rounded-md" onClick={() => handleDeleteVideo(vid.id)}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {videos.filter(v => v.categoryId === cat.id).length === 0 && (
              <p className="text-sm text-theme-muted italic">No videos in this category.</p>
            )}
          </div>
        </div>
      ))}

      <Modal open={catModalOpen} onClose={() => setCatModalOpen(false)} title={editCategory ? "Edit Category" : "New Category"}>
        <form onSubmit={handleSaveCategory} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Title (En)</label><input name="titleEn" defaultValue={editCategory?.titleEn} required className="input" /></div>
            <div><label className="label">Title (Ar)</label><input name="titleAr" defaultValue={editCategory?.titleAr} required className="input" /></div>
          </div>
          <div><label className="label">Sort Order</label><input name="sortOrder" type="number" defaultValue={editCategory?.sortOrder ?? 0} className="input" /></div>
          <label className="flex items-center gap-2"><input name="isActive" type="checkbox" defaultChecked={editCategory?.isActive ?? true} /> Active / Published</label>
          <div className="flex justify-end pt-4"><button className="btn-primary" type="submit">Save</button></div>
        </form>
      </Modal>

      <Modal open={vidModalOpen} onClose={() => setVidModalOpen(false)} title={editVideo ? "Edit Video" : "New Video"}>
        <form onSubmit={handleSaveVideo} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Title (En)</label><input name="titleEn" defaultValue={editVideo?.titleEn} required className="input" /></div>
            <div><label className="label">Title (Ar)</label><input name="titleAr" defaultValue={editVideo?.titleAr} required className="input" /></div>
          </div>
          <div><label className="label">Category</label><select name="categoryId" defaultValue={editVideo?.categoryId} required className="input">
            {categories.map(c => <option key={c.id} value={c.id}>{c.titleEn}</option>)}
          </select></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Source Type</label><select name="sourceType" defaultValue={editVideo?.sourceType || 'CLOUDFLARE'} className="input" onChange={e => {
              if (e.target.value === 'EXTERNAL') setVideoFile(null);
            }}>
              <option value="CLOUDFLARE">Direct Upload (Cloudflare R2)</option>
              <option value="EXTERNAL">External Link (Facebook, YouTube, etc)</option>
            </select></div>
            <div><label className="label">Sort Order</label><input name="sortOrder" type="number" defaultValue={editVideo?.sortOrder ?? 0} className="input" /></div>
          </div>
          <div>
            <label className="label">Video File or URL</label>
            {!editVideo || editVideo.sourceType === 'EXTERNAL' ? (
              <input name="externalUrl" placeholder="https://facebook.com/..." defaultValue={editVideo?.externalUrl} className="input" />
            ) : (
              <input type="file" accept="video/*" onChange={e => setVideoFile(e.target.files?.[0] || null)} className="input p-1" />
            )}
            {editVideo?.cloudflareId && <p className="text-xs text-green-500 mt-1">File already uploaded. Select new file to replace.</p>}
          </div>
          <div><label className="label">Description (En) - Use mm:ss for timestamps</label><textarea name="descriptionEn" defaultValue={editVideo?.descriptionEn} className="input h-24" /></div>
          <div><label className="label">Description (Ar) - Use mm:ss for timestamps</label><textarea name="descriptionAr" defaultValue={editVideo?.descriptionAr} className="input h-24" /></div>
          
          <div className="flex gap-4 p-4 bg-theme-bg rounded-lg">
            <label className="flex items-center gap-2"><input name="isActive" type="checkbox" defaultChecked={editVideo?.isActive ?? true} /> Active</label>
            <label className="flex items-center gap-2"><input name="isPublic" type="checkbox" defaultChecked={editVideo?.isPublic ?? true} /> Is Public (No target groups)</label>
          </div>

          {uploading && <ProgressBar progress={uploadProgress} label="Uploading..." color="bg-accent-500" />}
          
          <div className="flex justify-end pt-4"><button disabled={uploading} className="btn-primary" type="submit">{uploading ? 'Saving...' : 'Save Video'}</button></div>
        </form>
      </Modal>

      {targetModalOpen && targetVideoId && (
        <HelpVideoTargetingModal
          isOpen={true}
          onClose={() => { setTargetModalOpen(false); loadData(); }}
          video={videos.find(v => v.id === targetVideoId) as any}
        />
      )}
    </div>
  );
}
