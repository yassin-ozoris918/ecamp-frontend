import { useState, useEffect } from 'react';
import { useAuth } from '../lib/authContext';
import { api } from '../lib/api';
import { User, Lock, Camera, ShieldAlert, Edit2 } from 'lucide-react';
import { Spinner, Badge } from './ui';
import { Modal } from './Modal';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

export function ProfileScreen() {
  const { profile, refetchProfile } = useAuth();
  const { t } = useTranslation();
  
  // Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Profile Info State
  const [fullName, setFullName] = useState((profile as any).fullName || profile?.full_name || '');
  const [phoneNumber, setPhoneNumber] = useState((profile as any).phoneNumber || profile?.phone_number || '');
  const [parentPhoneNumber, setParentPhoneNumber] = useState((profile as any).parentPhoneNumber || profile?.parent_phone_number || '');
  useEffect(() => {
    if (profile) {
      setFullName((profile as any).fullName || profile.full_name || '');
      setPhoneNumber((profile as any).phoneNumber || profile.phone_number || '');
      setParentPhoneNumber((profile as any).parentPhoneNumber || profile.parent_phone_number || '');
    }
  }, [profile]);

  // Request Update Modal State
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [reqFullName, setReqFullName] = useState('');
  const [reqPhoneNumber, setReqPhoneNumber] = useState('');
  const [reqParentPhone, setReqParentPhone] = useState('');
  const [reqLoading, setReqLoading] = useState(false);
  const [reqError, setReqError] = useState<string | null>(null);

  const { data: pendingRequest, refetch: refetchRequest } = useQuery({
    queryKey: ['profileUpdateRequest'],
    queryFn: async () => {
      const { data } = await api.get('/profile-update-requests/me');
      return data;
    }
  });

  // Avatar State
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordError(t('profile.newPasswordsNoMatch'));
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError(t('profile.newPasswordLength'));
      return;
    }
    
    setPasswordLoading(true);
    setPasswordError(null);
    setPasswordSuccess(false);

    try {
      await api.post('/users/password', { currentPassword, newPassword });
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.response?.data?.message || t('profile.passwordUpdateFailed'));
    }
    setPasswordLoading(false);
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarLoading(true);
    setAvatarError(null);

    try {
      const fd = new FormData();
      fd.append('file', file);
      await api.post('/users/avatar', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await refetchProfile();
    } catch (err: any) {
      setAvatarError(err.response?.data?.message || t('profile.avatarUploadFailed'));
    }
    setAvatarLoading(false);
  }

  async function handleRequestSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reqFullName.trim() && !reqPhoneNumber.trim() && !reqParentPhone.trim()) {
      setReqError(t('profile.reqProvideOneField'));
      return;
    }

    setReqLoading(true);
    setReqError(null);

    try {
      await api.post('/profile-update-requests/me', {
        requestedFullName: reqFullName.trim() || undefined,
        requestedPhoneNumber: reqPhoneNumber.trim() || undefined,
        requestedParentPhone: reqParentPhone.trim() || undefined,
      });
      await refetchRequest();
      setUpdateModalOpen(false);
      setReqFullName('');
      setReqPhoneNumber('');
      setReqParentPhone('');
    } catch (err: any) {
      setReqError(err.response?.data?.message || t('profile.reqSubmitFailed'));
    }
    setReqLoading(false);
  }

  function openRequestModal() {
    setReqFullName(fullName);
    setReqPhoneNumber(phoneNumber);
    setReqParentPhone(parentPhoneNumber);
    setReqError(null);
    setUpdateModalOpen(true);
  }

  if (!profile) return null;

  return (
    <div className="max-w-4xl mx-auto py-8 animate-fade-up">
      <h1 className="text-3xl font-display font-bold text-theme-text mb-8">{t('profile.title')}</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left Col: Avatar & Info */}
        <div className="md:col-span-1 space-y-6">
          <div className="glass rounded-3xl p-8 text-center relative overflow-hidden group">
            <div className="relative w-32 h-32 mx-auto mb-6">
              <div className="w-full h-full rounded-full overflow-hidden border-4 border-white/[0.05] bg-theme-secondary">
                {(profile as any).profilePictureUrl || (profile as any).profile_picture_url ? (
                  <img src={(profile as any).profilePictureUrl || (profile as any).profile_picture_url} alt="Avatar" loading="lazy" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-theme-muted">
                    <User className="w-12 h-12" />
                  </div>
                )}
              </div>
              
              {/* Avatar Upload Overlay */}
              <label className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer">
                {avatarLoading ? (
                  <Spinner className="w-6 h-6 text-theme-text" />
                ) : (
                  <Camera className="w-8 h-8 text-theme-text" />
                )}
                <input 
                  type="file" 
                  accept="image/png, image/jpeg, image/webp" 
                  className="hidden" 
                  onChange={handleAvatarUpload}
                  disabled={avatarLoading}
                />
              </label>
            </div>

            {avatarError && <p className="text-sm text-error-400 mt-2 mb-4">{avatarError}</p>}

            <h2 className="text-xl font-bold text-theme-text truncate">{(profile as any).fullName || profile.full_name}</h2>
            <p className="text-sm text-theme-muted mb-4 truncate">{profile.email}</p>
            <Badge variant="accent" className="uppercase">{profile.role}</Badge>
          </div>
        </div>

        {/* Right Col: Forms */}
        <div className="md:col-span-2 space-y-8">
          
          {/* Update Profile Info Form */}
          <div className="glass rounded-3xl p-8">
            <div className="flex items-center gap-3 mb-6 border-b border-theme-border pb-6">
              <div className="w-10 h-10 rounded-xl bg-secondary-500/10 flex items-center justify-center text-secondary-400">
                <User className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-display font-bold text-theme-text">{t('profile.infoTitle')}</h2>
            </div>

            <div className="space-y-5">
              {pendingRequest && (
                <div className="p-4 rounded-xl bg-warning-500/10 border border-warning-500/20 text-warning-400 text-sm flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 shrink-0" />
                  {t('profile.reqPendingApproval')}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-theme-muted mb-1.5 flex items-center gap-2">
                  {t('profile.fullName')}
                  <Lock className="w-3 h-3 text-theme-muted" />
                </label>
                <input
                  type="text"
                  value={fullName}
                  placeholder={t('profile.notProvided')}
                  disabled
                  className="input w-full opacity-60 cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-theme-muted mb-1.5 flex items-center gap-2">
                    {t('profile.phoneNumber')}
                    <Lock className="w-3 h-3 text-theme-muted" />
                  </label>
                  <input
                    type="text"
                    value={phoneNumber}
                    placeholder={t('profile.notProvided')}
                    disabled
                    className="input w-full opacity-60 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-theme-muted mb-1.5 flex items-center gap-2">
                    {t('profile.parentPhoneNumber')}
                    <Lock className="w-3 h-3 text-theme-muted" />
                  </label>
                  <input
                    type="text"
                    value={parentPhoneNumber}
                    placeholder={t('profile.notProvided')}
                    disabled
                    className="input w-full opacity-60 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button 
                  onClick={openRequestModal} 
                  disabled={!!pendingRequest}
                  className="btn-secondary"
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  {pendingRequest ? t('profile.changeRequested') : t('profile.requestChange')}
                </button>
              </div>
            </div>
          </div>

          {/* Change Password Form */}
          <div className="glass rounded-3xl p-8">
            <div className="flex items-center gap-3 mb-6 border-b border-theme-border pb-6">
              <div className="w-10 h-10 rounded-xl bg-accent-500/10 flex items-center justify-center text-accent-400">
                <Lock className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-display font-bold text-theme-text">{t('profile.changePasswordTitle')}</h2>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-5">
              {passwordError && (
                <div className="p-4 rounded-xl bg-error-500/10 border border-error-500/20 text-error-400 text-sm">
                  {passwordError}
                </div>
              )}
              {passwordSuccess && (
                <div className="p-4 rounded-xl bg-success-500/10 border border-success-500/20 text-success-400 text-sm">
                  {t('profile.passwordUpdatedSuccess')}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-theme-muted mb-1.5">{t('profile.currentPassword')}</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  className="input w-full"
                  placeholder={t('profile.enterCurrentPassword')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-theme-muted mb-1.5">{t('profile.newPassword')}</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="input w-full"
                  placeholder={t('profile.min6Chars')}
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-theme-muted mb-1.5">{t('profile.confirmNewPassword')}</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="input w-full"
                  placeholder={t('profile.confirmNewPassword')}
                  minLength={6}
                />
              </div>

              <div className="pt-4 flex justify-end">
                <button 
                  type="submit" 
                  disabled={passwordLoading}
                  className="btn-primary"
                >
                  {passwordLoading ? <Spinner className="w-4 h-4 mr-2" /> : null}
                  {t('profile.updatePasswordBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>

      </div>

      {/* Request Update Modal */}
      <Modal open={updateModalOpen} onClose={() => setUpdateModalOpen(false)} title={t('profile.reqModalTitle')}>
        <form onSubmit={handleRequestSubmit} className="space-y-4">
          <p className="text-sm text-theme-muted mb-4">
            {t('profile.reqModalDesc')}
          </p>

          {reqError && (
            <div className="p-4 rounded-xl bg-error-500/10 border border-error-500/20 text-error-400 text-sm">
              {reqError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-theme-muted mb-1.5">{t('profile.reqFullName')}</label>
            <input
              type="text"
              value={reqFullName}
              onChange={e => setReqFullName(e.target.value)}
              className="input w-full"
              placeholder={t('profile.reqFullNamePlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-muted mb-1.5">{t('profile.reqPhoneNumber')}</label>
            <input
              type="text"
              value={reqPhoneNumber}
              onChange={e => setReqPhoneNumber(e.target.value)}
              className="input w-full"
              placeholder={t('profile.reqPhoneNumberPlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-muted mb-1.5">{t('profile.reqParentPhone')}</label>
            <input
              type="text"
              value={reqParentPhone}
              onChange={e => setReqParentPhone(e.target.value)}
              className="input w-full"
              placeholder={t('profile.reqParentPhonePlaceholder')}
            />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={() => setUpdateModalOpen(false)} className="btn-secondary">
              {t('profile.cancelBtn')}
            </button>
            <button type="submit" disabled={reqLoading} className="btn-primary">
              {reqLoading ? <Spinner className="w-4 h-4 mr-2" /> : null}
              {t('profile.reqSubmitBtn')}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
