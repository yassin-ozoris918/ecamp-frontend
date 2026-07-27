import { useState } from 'react';
import { useAuth } from '../lib/authContext';
import { api } from '../lib/api';
import { User, Lock, Camera } from 'lucide-react';
import { Spinner, Badge } from './ui';

export function ProfileScreen() {
  const { profile, refetchProfile } = useAuth();
  
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
  const [infoLoading, setInfoLoading] = useState(false);
  const [infoError, setInfoError] = useState<string | null>(null);
  const [infoSuccess, setInfoSuccess] = useState(false);

  // Avatar State
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
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
      setPasswordError(err.response?.data?.message || 'Failed to update password');
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
      setAvatarError(err.response?.data?.message || 'Failed to upload avatar');
    }
    setAvatarLoading(false);
  }

  async function handleInfoSubmit(e: React.FormEvent) {
    e.preventDefault();
    setInfoLoading(true);
    setInfoError(null);
    setInfoSuccess(false);

    try {
      const { data } = await api.post('/users/profile', {
        fullName: fullName.trim() || undefined,
        phoneNumber: phoneNumber.trim() || undefined,
        parentPhoneNumber: parentPhoneNumber.trim() || undefined,
      });
      localStorage.setItem('user', JSON.stringify(data));
      await refetchProfile();
      setInfoSuccess(true);
    } catch (err: any) {
      setInfoError(err.response?.data?.message || 'Failed to update profile info');
    }
    setInfoLoading(false);
  }

  if (!profile) return null;

  return (
    <div className="max-w-4xl mx-auto py-8 animate-fade-up">
      <h1 className="text-3xl font-display font-bold text-white mb-8">My Profile</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left Col: Avatar & Info */}
        <div className="md:col-span-1 space-y-6">
          <div className="glass rounded-3xl p-8 text-center relative overflow-hidden group">
            <div className="relative w-32 h-32 mx-auto mb-6">
              <div className="w-full h-full rounded-full overflow-hidden border-4 border-white/[0.05] bg-base-900">
                {(profile as any).profilePictureUrl || (profile as any).profile_picture_url ? (
                  <img src={(profile as any).profilePictureUrl || (profile as any).profile_picture_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-500">
                    <User className="w-12 h-12" />
                  </div>
                )}
              </div>
              
              {/* Avatar Upload Overlay */}
              <label className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer">
                {avatarLoading ? (
                  <Spinner className="w-6 h-6 text-white" />
                ) : (
                  <Camera className="w-8 h-8 text-white" />
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

            <h2 className="text-xl font-bold text-white truncate">{(profile as any).fullName || profile.full_name}</h2>
            <p className="text-sm text-neutral-400 mb-4 truncate">{profile.email}</p>
            <Badge variant="accent" className="uppercase">{profile.role}</Badge>
          </div>
        </div>

        {/* Right Col: Forms */}
        <div className="md:col-span-2 space-y-8">
          
          {/* Update Profile Info Form */}
          <div className="glass rounded-3xl p-8">
            <div className="flex items-center gap-3 mb-6 border-b border-white/[0.06] pb-6">
              <div className="w-10 h-10 rounded-xl bg-secondary-500/10 flex items-center justify-center text-secondary-400">
                <User className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-display font-bold text-white">Profile Information</h2>
            </div>

            <form onSubmit={handleInfoSubmit} className="space-y-5">
              {infoError && (
                <div className="p-4 rounded-xl bg-error-500/10 border border-error-500/20 text-error-400 text-sm">
                  {infoError}
                </div>
              )}
              {infoSuccess && (
                <div className="p-4 rounded-xl bg-success-500/10 border border-success-500/20 text-success-400 text-sm">
                  Profile updated successfully.
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="input w-full"
                  placeholder="Your full name"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1.5">Phone Number</label>
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={e => setPhoneNumber(e.target.value)}
                    className="input w-full"
                    placeholder="Your phone number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1.5">Parent Phone Number</label>
                  <input
                    type="text"
                    value={parentPhoneNumber}
                    onChange={e => setParentPhoneNumber(e.target.value)}
                    className="input w-full"
                    placeholder="Parent's phone number"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button 
                  type="submit" 
                  disabled={infoLoading}
                  className="btn-secondary"
                >
                  {infoLoading ? <Spinner className="w-4 h-4 mr-2" /> : null}
                  Update Information
                </button>
              </div>
            </form>
          </div>

          {/* Change Password Form */}
          <div className="glass rounded-3xl p-8">
            <div className="flex items-center gap-3 mb-6 border-b border-white/[0.06] pb-6">
              <div className="w-10 h-10 rounded-xl bg-accent-500/10 flex items-center justify-center text-accent-400">
                <Lock className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-display font-bold text-white">Change Password</h2>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-5">
              {passwordError && (
                <div className="p-4 rounded-xl bg-error-500/10 border border-error-500/20 text-error-400 text-sm">
                  {passwordError}
                </div>
              )}
              {passwordSuccess && (
                <div className="p-4 rounded-xl bg-success-500/10 border border-success-500/20 text-success-400 text-sm">
                  Password updated successfully.
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">Current Password</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  className="input w-full"
                  placeholder="Enter current password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="input w-full"
                  placeholder="Minimum 6 characters"
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="input w-full"
                  placeholder="Confirm new password"
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
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
