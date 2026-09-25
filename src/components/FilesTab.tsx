import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { BookOpen, Search, Lock, Unlock, KeyRound, ExternalLink } from 'lucide-react';
import { useAuth } from '../lib/authContext';
import { Spinner, Badge, EmptyState, ErrorMessage, Button } from './ui';
import { FileViewerModal } from './FileViewerModal';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

export function FilesTab({ hideHeader = false }: { hideHeader?: boolean }) {
  const { profile } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [courseId, setCourseId] = useState('');
  const [accessFilter, setAccessFilter] = useState(''); // '' | 'UNLOCKED' | 'LOCKED'
  const [redeemCode, setRedeemCode] = useState('');
  const [redeemingTarget, setRedeemingTarget] = useState<{ id: string, type: 'FILE' | 'COURSE_FILES' } | null>(null);

  // Fetch student courses to populate the course filter dropdown
  const { data: courses } = useQuery({
    queryKey: ['student_courses'],
    queryFn: async () => {
      const res = await api.get('/courses/student');
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!profile,
  });

  const { data: files, isLoading, error } = useQuery({
    queryKey: ['student_files', search, courseId, accessFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (courseId) params.append('courseId', courseId);
      if (accessFilter) params.append('accessFilter', accessFilter);
      const res = await api.get(`/attachments/student/files?${params.toString()}`);
      return res.data;
    },
    enabled: !!profile,
  });

  const redeemMutation = useMutation({
    mutationFn: async ({ code, targetType, targetId }: { code: string, targetType: string, targetId: string }) => {
      const res = await api.post('/activation-codes/redeem', { code, targetType, targetId });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || t('files.redeemSuccess', 'Code redeemed successfully!'));
      queryClient.invalidateQueries({ queryKey: ['student_files'] });
      setRedeemCode('');
      setRedeemingTarget(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to redeem code.');
    }
  });

  const [viewingFile, setViewingFile] = useState<{ url: string, title: string, type: string } | null>(null);

  const handleOpen = async (id: string, title: string) => {
    try {
      const res = await api.get(`/attachments/${id}/view`);
      if (res.data.url) {
        setViewingFile({ url: res.data.url, title, type: 'FILE' });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to open file.');
    }
  };

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <p className="text-theme-muted">Please log in to view files.</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 animate-fade-up ${hideHeader ? '' : 'pb-20 max-w-6xl mx-auto'}`}>
      <FileViewerModal 
        open={!!viewingFile} 
        onClose={() => setViewingFile(null)} 
        title={viewingFile?.title} 
        url={viewingFile?.url} 
      />
      {!hideHeader && (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-theme-text mb-2">
              {t('files.title', 'Files')}
            </h1>
            <p className="text-theme-muted">
              Access course materials and unlock premium files.
            </p>
          </div>

          {/* Global Course Files Unlock */}
          {courseId && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder={t('files.enterCode', 'Enter Access Code')}
                value={redeemingTarget?.type === 'COURSE_FILES' ? redeemCode : ''}
                onChange={(e) => {
                  setRedeemCode(e.target.value);
                  setRedeemingTarget({ id: courseId, type: 'COURSE_FILES' });
                }}
                className="bg-base-900 border border-theme-border text-theme-text text-sm rounded-lg focus:ring-accent-500 focus:border-accent-500 block p-2.5 outline-none max-w-[200px]"
              />
              <Button
                variant="primary"
                disabled={!redeemCode || redeemingTarget?.type !== 'COURSE_FILES' || redeemMutation.isPending}
                onClick={() => redeemMutation.mutate({ code: redeemCode, targetType: 'COURSE_FILES', targetId: courseId })}
              >
                <Unlock className="w-4 h-4 mr-2" />
                {redeemMutation.isPending ? '...' : 'Unlock Course Files'}
              </Button>
            </div>
          )}
        </div>
      )}
      
      {hideHeader && courseId && (
        <div className="flex flex-col md:flex-row justify-end items-start md:items-center gap-4">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder={t('files.enterCode', 'Enter Access Code')}
              value={redeemingTarget?.type === 'COURSE_FILES' ? redeemCode : ''}
              onChange={(e) => {
                setRedeemCode(e.target.value);
                setRedeemingTarget({ id: courseId, type: 'COURSE_FILES' });
              }}
              className="bg-base-900 border border-theme-border text-theme-text text-sm rounded-lg focus:ring-accent-500 focus:border-accent-500 block p-2.5 outline-none max-w-[200px]"
            />
            <Button
              variant="primary"
              disabled={!redeemCode || redeemingTarget?.type !== 'COURSE_FILES' || redeemMutation.isPending}
              onClick={() => redeemMutation.mutate({ code: redeemCode, targetType: 'COURSE_FILES', targetId: courseId })}
            >
              <Unlock className="w-4 h-4 mr-2" />
              {redeemMutation.isPending ? '...' : 'Unlock Course Files'}
            </Button>
          </div>
        </div>
      )}

      <div className="glass p-4 rounded-2xl flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-theme-muted" />
          <input
            type="text"
            placeholder={t('files.search', 'Search files...')}
            className="bg-base-900 border border-theme-border text-theme-text text-sm rounded-lg focus:ring-accent-500 focus:border-accent-500 block p-2.5 outline-none w-full pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <select
          className="bg-base-900 border border-theme-border text-theme-text text-sm rounded-lg focus:ring-accent-500 focus:border-accent-500 block p-2.5 outline-none w-full sm:w-auto min-w-[200px]"
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
        >
          <option value="">{t('files.allCourses', 'All Courses')}</option>
          {courses?.map((c: any) => (
             <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>

        <select
          className="bg-base-900 border border-theme-border text-theme-text text-sm rounded-lg focus:ring-accent-500 focus:border-accent-500 block p-2.5 outline-none w-full sm:w-auto min-w-[150px]"
          value={accessFilter}
          onChange={(e) => setAccessFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="UNLOCKED">{t('files.unlocked', 'Unlocked')}</option>
          <option value="LOCKED">{t('files.locked', 'Locked')}</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner className="w-8 h-8 text-accent-400" />
        </div>
      ) : error ? (
        <ErrorMessage message="Failed to load files." />
      ) : files?.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="w-10 h-10" />}
          title={t('files.noFilesFound', 'No Files Found')}
          description="There are no files matching your filters."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {files.map((file: any) => (
            <div 
              key={file.id} 
              className={`group glass rounded-2xl p-6 transition-all hover:-translate-y-1 hover:shadow-2xl flex flex-col ${file.accessStatus === 'LOCKED' ? 'border-neutral-800 opacity-90' : 'border-accent-500/20 shadow-accent-500/5'}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 mr-4">
                  <Badge variant={file.accessStatus === 'UNLOCKED' ? 'success' : 'default'} className="mb-2">
                    {file.accessStatus === 'UNLOCKED' ? <Unlock className="w-3 h-3 mr-1" /> : <Lock className="w-3 h-3 mr-1" />}
                    {file.accessStatus === 'UNLOCKED' ? t('files.unlocked', 'Unlocked') : t('files.locked', 'Locked')}
                  </Badge>
                  <h3 className="font-bold text-theme-text text-lg line-clamp-2" title={file.title}>
                    {file.title}
                  </h3>
                </div>
                <div className="w-10 h-10 rounded-xl bg-theme-secondary flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5 text-accent-400" />
                </div>
              </div>

              <div className="text-sm text-theme-muted mb-6 flex-1">
                <p className="line-clamp-1"><span className="font-medium">Course:</span> {file.course?.title}</p>
                <p className="line-clamp-1"><span className="font-medium">Lecture:</span> {file.lecture?.title}</p>
                {file.accessSource && (
                  <p className="text-xs text-accent-400 mt-2">Unlocked via: {file.accessSource}</p>
                )}
              </div>

              {file.accessStatus === 'UNLOCKED' ? (
                <Button variant="primary" className="w-full" onClick={() => handleOpen(file.id, file.title)}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  {t('files.open', 'Open File')}
                </Button>
              ) : (
                <div className="flex flex-col gap-2 mt-auto">
                  {redeemingTarget?.id === file.id && redeemingTarget?.type === 'FILE' ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        autoFocus
                        placeholder={t('files.enterCode', 'Enter Code')}
                        value={redeemCode}
                        onChange={(e) => setRedeemCode(e.target.value)}
                        className="bg-base-900 border border-theme-border text-theme-text text-sm rounded-lg focus:ring-accent-500 focus:border-accent-500 block p-2.5 outline-none flex-1"
                      />
                      <Button
                        variant="primary"
                        disabled={!redeemCode || redeemMutation.isPending}
                        onClick={() => redeemMutation.mutate({ code: redeemCode, targetType: 'FILE', targetId: file.id })}
                      >
                        {redeemMutation.isPending ? '...' : t('files.unlock', 'Unlock')}
                      </Button>
                      <Button variant="ghost" onClick={() => { setRedeemingTarget(null); setRedeemCode(''); }}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button variant="secondary" className="w-full" onClick={() => { setRedeemingTarget({ id: file.id, type: 'FILE' }); setRedeemCode(''); }}>
                      <KeyRound className="w-4 h-4 mr-2" />
                      {t('files.unlock', 'Unlock File')}
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
