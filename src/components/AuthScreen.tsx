import { useState } from 'react';
import { GraduationCap, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/authContext';
import { generateDeviceFingerprint } from '../lib/device';
import { ThemeToggle } from './common/ThemeToggle';
import { LanguageToggle } from './common/LanguageToggle';
import { useTranslation } from 'react-i18next';

export function AuthScreen() {
  const { signIn, signUp, error, setError } = useAuth();
  const { t } = useTranslation();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [registrationPending, setRegistrationPending] = useState(false);

  // login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // register fields
  const [fullName, setFullName] = useState('');
  const [educationLevel, setEducationLevel] = useState<'HIGH_SCHOOL' | 'UNIVERSITY'>('HIGH_SCHOOL');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [parentPhoneNumber, setParentPhoneNumber] = useState('');
  const [profilePictureUrl, setProfilePictureUrl] = useState<string>('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);


  const errMsg = localError ?? error?.message ?? null;

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setLocalError('Image size must be less than 5MB');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setLocalError('Only JPG, PNG, and WEBP images are allowed');
      return;
    }

    setUploadingAvatar(true);
    setLocalError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      // Public endpoint for pre-registration uploads
      const { data } = await api.post('/auth/upload-avatar', formData);
      setProfilePictureUrl(data.url);
    } catch (err: any) {
      setLocalError(err.response?.data?.message || 'Failed to upload profile picture');
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    setLocalError(null);
    setError(null);
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === 'login') {
        const deviceId = generateDeviceFingerprint();
        const { error } = await signIn(email, password, deviceId);
        if (error) setLocalError(error.message);
      } else {
        if (password.length < 8) {
          setLocalError('Password must be at least 8 characters.');
          return;
        }
        if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
          setLocalError('Password must contain both letters and numbers.');
          return;
        }
        const egyptPhoneRegex = /^01[0125][0-9]{8}$/;
        if (!egyptPhoneRegex.test(phoneNumber.trim())) {
          setLocalError('Invalid Egyptian phone number format (e.g. 01012345678).');
          return;
        }
        
        if (educationLevel === 'HIGH_SCHOOL' && !parentPhoneNumber.trim()) {
          setLocalError('Parent phone number is required for High School students.');
          return;
        }

        if (educationLevel === 'HIGH_SCHOOL' && !egyptPhoneRegex.test(parentPhoneNumber.trim())) {
          setLocalError('Invalid Egyptian parent phone number format.');
          return;
        }

        if (phoneNumber.trim() && parentPhoneNumber.trim() && phoneNumber.trim() === parentPhoneNumber.trim()) {
          setLocalError(t('auth.duplicatePhoneError', 'Student and Guardian phone numbers cannot be the same.'));
          return;
        }

        const deviceId = generateDeviceFingerprint();
        const { error, status } = await signUp({
          fullName: fullName.trim(),
          email: email.trim(),
          password,
          educationLevel,
          phoneNumber: phoneNumber.trim(),
          parentPhoneNumber: educationLevel === 'HIGH_SCHOOL' ? (parentPhoneNumber.trim() || undefined) : undefined,
          profilePictureUrl: profilePictureUrl || undefined,
          deviceId,
        });
        if (error) {
          setLocalError(error.message);
        } else if (status === 'PENDING_APPROVAL') {
          setRegistrationPending(true);
        }
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row relative">
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
        <LanguageToggle />
        <ThemeToggle />
      </div>
      
      {/* Left visual panel */}
      <div className="lg:w-1/2 min-h-[30vh] lg:min-h-screen relative overflow-hidden flex flex-col justify-center items-center p-8 lg:p-12 lg:border-r border-theme-border">
        
        {/* Theme-responsive Background with Glowing Orbs */}
        <div className="absolute inset-0 bg-theme-bg" />
        <div className="absolute top-0 right-0 w-[40rem] h-[40rem] rounded-full bg-accent-500/10 blur-[120px] transform translate-x-1/3 -translate-y-1/3 animate-pulse-slow" />
        <div className="absolute bottom-0 left-0 w-[40rem] h-[40rem] rounded-full bg-accent-600/10 blur-[120px] transform -translate-x-1/3 translate-y-1/3" />
        
        <div className="relative z-10 w-full max-w-[44rem] flex flex-col items-center">
          
          {/* Glassmorphism Image Frame */}
          <div className="w-full relative group">
            {/* Ambient glow behind the image frame */}
            <div className="absolute -inset-1 bg-gradient-to-r from-accent-400 to-accent-600 rounded-[2.5rem] blur opacity-20 group-hover:opacity-40 transition duration-700" />
            
            <div className="relative rounded-[2rem] overflow-hidden p-2 bg-theme-card backdrop-blur-2xl border border-theme-border shadow-2xl">
              <div className="relative rounded-[1.5rem] overflow-hidden bg-theme-secondary ring-1 ring-theme-border">
                <img 
                  src="/ecamp-banner.png" 
                  alt="E.Camp" 
                  className="w-full h-auto object-cover transform hover:scale-[1.02] transition-transform duration-700 ease-out"
                />
              </div>
            </div>
          </div>

          {/* Premium Typography underneath */}
          <div className="mt-12 text-center max-w-lg animate-fade-up" style={{ animationDelay: '200ms' }}>
             <h2 className="text-3xl lg:text-4xl font-display font-extrabold text-theme-text mb-4 tracking-tight">
               {t('auth.heroTitle')}
             </h2>
             <p className="text-theme-muted text-lg leading-relaxed">
               {t('auth.heroDesc')}
             </p>
          </div>

        </div>
      </div>

      {/* Right form panel */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md animate-fade-up">
          {registrationPending ? (
            <div className="text-center">
              <div className="w-24 h-24 bg-accent-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <GraduationCap className="w-12 h-12 text-accent-500" />
              </div>
              <h3 className="text-2xl font-display font-bold text-theme-text mb-4">
                {t('auth.registrationPendingTitle', 'Registration Successful!')}
              </h3>
              <p className="text-theme-muted mb-8 leading-relaxed">
                {t('auth.registrationPendingMessage', 'Your account is currently under review by our administration team. You will be granted access once your details have been verified.')}
              </p>
              <button
                onClick={() => { setRegistrationPending(false); setMode('login'); }}
                className="btn-primary w-full"
              >
                {t('auth.backToLogin', 'Back to Login')}
              </button>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <div className="flex gap-1 p-1 rounded-xl bg-theme-card border border-theme-border">
              <button
                type="button"
                onClick={() => { setMode('login'); setLocalError(null); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  mode === 'login'
                    ? 'bg-white/[0.08] text-theme-text shadow-sm'
                    : 'text-theme-muted hover:text-theme-text'
                }`}
              >
                {t('auth.signIn')}
              </button>
              <button
                type="button"
                onClick={() => { setMode('register'); setLocalError(null); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  mode === 'register'
                    ? 'bg-white/[0.08] text-theme-text shadow-sm'
                    : 'text-theme-muted hover:text-theme-text'
                }`}
              >
                {t('auth.createAccount')}
              </button>
            </div>
          </div>

          <h2 className="text-2xl font-display font-bold text-theme-text mb-1">
            {mode === 'login' ? t('auth.welcomeBack') : t('auth.joinEcamp')}
          </h2>
          <p className="text-sm text-theme-muted mb-6">
            {mode === 'login'
              ? t('auth.welcomeBackDesc')
              : t('auth.joinEcampDesc')}
          </p>

          {errMsg?.includes('Unrecognized Device') ? (
            <div className="mb-5 rounded-xl border border-warning-500/30 bg-warning-500/10 p-5 text-center">
              <AlertCircle className="w-8 h-8 mx-auto text-warning-400 mb-2" />
              <h3 className="text-lg font-bold text-theme-text mb-1">{t('auth.unrecognizedDevice')}</h3>
              <p className="text-sm text-theme-muted">{t('auth.unrecognizedDeviceDesc')}</p>
            </div>
          ) : errMsg && (
            <div className="mb-5 flex items-start gap-2 rounded-xl border border-error-500/30 bg-error-500/10 p-3 text-sm text-error-200">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{errMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {mode === 'register' && (
              <>
                <div className="flex justify-center mb-6">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-full bg-theme-secondary border-2 border-dashed border-theme-border flex items-center justify-center overflow-hidden">
                      {profilePictureUrl ? (
                        <img src={profilePictureUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs text-theme-muted uppercase font-semibold">{t('auth.avatar')}</span>
                      )}
                    </div>
                    <label className="absolute bottom-0 right-0 p-1.5 bg-accent-500 rounded-full text-white cursor-pointer hover:bg-accent-600 transition-colors shadow-lg">
                      <input 
                        type="file" 
                        accept="image/jpeg,image/png,image/webp" 
                        className="hidden" 
                        onChange={handleAvatarUpload}
                        disabled={uploadingAvatar}
                      />
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="label">{t('auth.fullName')}</label>
                  <input
                    type="text"
                    required
                    className="input"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={busy}
                    autoComplete="name"
                  />
                </div>

                <div>
                  <label className="label">{t('auth.educationLevel')}</label>
                  <select
                    className="input"
                    value={educationLevel}
                    onChange={(e) => setEducationLevel(e.target.value as 'HIGH_SCHOOL' | 'UNIVERSITY')}
                    disabled={busy}
                  >
                    <option value="HIGH_SCHOOL">{t('auth.highSchool')}</option>
                    <option value="UNIVERSITY">{t('auth.university')}</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">{t('auth.phoneNumber')}</label>
                    <input
                      className="input"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      required
                      type="tel"
                      autoComplete="tel"
                    />
                  </div>
                  {educationLevel === 'HIGH_SCHOOL' && (
                    <div>
                      <label className="label">{t('auth.parentPhoneNumber')}</label>
                      <input
                        className="input"
                        value={parentPhoneNumber}
                        onChange={(e) => setParentPhoneNumber(e.target.value)}
                        placeholder="01xxxxxxxxx"
                        disabled={busy}
                        type="tel"
                        autoComplete="tel-national"
                      />
                    </div>
                  )}
                </div>
              </>
            )}

            <div>
              <label className="label">{t('auth.email')}</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={busy}
                autoComplete="email"
              />
            </div>
            <div>
              <label className="label">{t('auth.password')}</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className="input pe-12"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={busy}
                  autoComplete={mode === 'login' ? "current-password" : "new-password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-1/2 -translate-y-1/2 end-3 p-1.5 text-theme-muted hover:text-theme-text transition-colors rounded-lg hover:bg-theme-card"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {mode === 'register' && (
                <p className="text-xs text-theme-muted mt-1.5">
                  {t('auth.passwordHint')}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={busy}
              className="btn-primary w-full mt-6 text-sm py-3"
            >
              {busy ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
              ) : mode === 'login' ? (
                t('auth.signIn')
              ) : (
                t('auth.createAccount')
              )}
            </button>
          </form>

          {mode === 'register' && (
            <p className="mt-5 text-xs text-theme-muted leading-relaxed text-center">
              {t('auth.deviceBinding')}
            </p>
          )}
          </>
          )}

          <div className="mt-8 pt-4 border-t border-theme-border/40 text-center">
            <p className="text-xs font-semibold text-accent-700 dark:text-accent-300">
              ⚡ {t('common.developedBy')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
