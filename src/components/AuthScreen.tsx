import { useState, useEffect, useRef } from 'react';
import { GraduationCap, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/authContext';
import { generateDeviceFingerprint, isInAppBrowser } from '../lib/device';
import { ThemeToggle } from './common/ThemeToggle';
import { LanguageToggle } from './common/LanguageToggle';
import { useTranslation } from 'react-i18next';
import { MaintenanceNotice } from './common/MaintenanceNotice';
import { AcademicDropdowns } from './AcademicDropdowns';
import {
  HighSchoolSystem,
  StudyMode,
  StudyLanguage,
  HighSchoolGrade,
  TraditionalBranch,
  BaccalaureatePath
} from '../lib/types';
import { EcampCharacter } from './common/EcampCharacter';
import { useCharacterState } from '../hooks/useCharacterState';

// ── Intro Phase State Machine ─────────────────────────────────────────────────
// hidden → entering → placing → packet-dropped → packet-opening → form-ready
type IntroPhase =
  | 'hidden'
  | 'entering'
  | 'placing'
  | 'packet-dropped'
  | 'packet-opening'
  | 'form-ready';

// ── Packet SVG — eCamp delivery box ──────────────────────────────────────────
function PacketSVG({ lidOpen }: { lidOpen: boolean }) {
  return (
    <svg
      viewBox="0 0 120 110"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-auto overflow-visible"
      style={{ filter: 'drop-shadow(0 8px 24px rgba(34,211,238,0.25))' }}
    >
      <defs>
        <linearGradient id="box-body" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0e7490" />
          <stop offset="100%" stopColor="#164e63" />
        </linearGradient>
        <linearGradient id="box-front" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#0891b2" stopOpacity="0.08" />
        </linearGradient>
        <linearGradient id="box-lid" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0ea5e9" />
        </linearGradient>
        <linearGradient id="ribbon" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>

      {/* ── Box body ── */}
      <rect x="8" y="42" width="104" height="64" rx="6" fill="url(#box-body)" />
      {/* Front face shine */}
      <rect x="8" y="42" width="104" height="64" rx="6" fill="url(#box-front)" />
      {/* Side shadow panel */}
      <rect x="88" y="42" width="24" height="64" rx="0" fill="rgba(0,0,0,0.15)" />
      {/* Bottom edge */}
      <rect x="8" y="98" width="104" height="8" rx="4" fill="rgba(0,0,0,0.2)" />

      {/* Vertical ribbon on body */}
      <rect x="52" y="42" width="16" height="64" fill="url(#ribbon)" opacity="0.75" />

      {/* E.CAMP label on box */}
      <rect x="22" y="68" width="52" height="22" rx="5" fill="rgba(255,255,255,0.08)"
            stroke="rgba(255,255,255,0.18)" strokeWidth="0.8" />
      <text x="48" y="82" textAnchor="middle" fontSize="9" fontWeight="900"
            fontFamily="Outfit, system-ui, sans-serif" fill="rgba(255,255,255,0.85)" letterSpacing="1">
        E.CAMP
      </text>

      {/* ── Lid ── */}
      <g
        style={{
          transformOrigin: '60px 42px',
          transform: lidOpen ? 'rotateX(-140deg)' : 'rotateX(0deg)',
          transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <rect x="4" y="28" width="112" height="18" rx="5" fill="url(#box-lid)" />
        {/* Lid shine */}
        <rect x="4" y="28" width="112" height="7" rx="5" fill="rgba(255,255,255,0.2)" />
        {/* Horizontal ribbon on lid */}
        <rect x="4" y="34" width="112" height="6" fill="url(#ribbon)" opacity="0.7" />
        {/* Bow top-left half */}
        <ellipse cx="46" cy="28" rx="10" ry="8" fill="#fbbf24" opacity="0.85" />
        {/* Bow top-right half */}
        <ellipse cx="74" cy="28" rx="10" ry="8" fill="#f59e0b" opacity="0.85" />
        {/* Bow knot center */}
        <ellipse cx="60" cy="28" rx="6" ry="5" fill="#fde68a" />
      </g>

      {/* Stars / shine on box */}
      <circle cx="28" cy="56" r="2" fill="rgba(255,255,255,0.25)" />
      <circle cx="34" cy="50" r="1.2" fill="rgba(255,255,255,0.15)" />
    </svg>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export function AuthScreen() {
  const { signIn, signUp, error, setError } = useAuth();
  const { t } = useTranslation();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [registrationPending, setRegistrationPending] = useState(false);
  const [maintenanceInterrupted, setMaintenanceInterrupted] = useState(() =>
    sessionStorage.getItem('maintenance_interruption') === 'true'
  );

  // ── Intro Sequence ────────────────────────────────────────────────────────
  const [introPhase, setIntroPhase] = useState<IntroPhase>('hidden');
  const [lidOpen, setLidOpen] = useState(false);
  const introTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  function clearIntroTimers() {
    introTimersRef.current.forEach(clearTimeout);
    introTimersRef.current = [];
  }

  function scheduleIntro() {
    clearIntroTimers();
    setLidOpen(false);
    setIntroPhase('entering');

    // Phase 1 → Phase 2: character places packet (after walk-in completes)
    introTimersRef.current.push(
      setTimeout(() => {
        setIntroPhase('placing');
      }, 1100)
    );

    // Phase 2 → Phase 3: packet drops in (character places it)
    introTimersRef.current.push(
      setTimeout(() => {
        setIntroPhase('packet-dropped');
      }, 1900)
    );
  }

  function handlePacketClick() {
    if (introPhase !== 'packet-dropped') return;
    setIntroPhase('packet-opening');
    setLidOpen(true);

    // Phase 4 → Phase 5: form reveals after lid opens
    introTimersRef.current.push(
      setTimeout(() => {
        setIntroPhase('form-ready');
      }, 600)
    );
  }

  // ── Character animation system (Yassin) ─────────────────────────────────
  const char = useCharacterState('waving');

  function handleRegisterTabClick() {
    setMode('register');
    setLocalError(null);
    if (introPhase === 'hidden') {
      scheduleIntro();
    }
  }

  function handleLoginTabClick() {
    setMode('login');
    setLocalError(null);
    clearIntroTimers();
    setIntroPhase('hidden');
    setLidOpen(false);
    char.setState('waving');
  }

  // Cleanup on unmount
  useEffect(() => () => clearIntroTimers(), []);

  // ── Char state driven by intro phase ────────────────────────────────────
  useEffect(() => {
    if (introPhase === 'entering') char.setState('waving');
    else if (introPhase === 'placing') char.setState('pulling');
    else if (introPhase === 'packet-dropped') char.setState('happy');
    else if (introPhase === 'packet-opening') char.setState('celebrating');
    else if (introPhase === 'form-ready') char.setState('idle');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [introPhase]);

  const isMaintenanceActive = maintenanceInterrupted || error?.code === 'MAINTENANCE_MODE';

  const clearMaintenance = () => {
    sessionStorage.removeItem('maintenance_interruption');
    setMaintenanceInterrupted(false);
    setError(null);
    setLocalError(null);
  };

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

  // Segmentation fields
  const [highSchoolSystem, setHighSchoolSystem] = useState<HighSchoolSystem | ''>('');
  const [studyMode, setStudyMode] = useState<StudyMode | ''>('');
  const [studyLanguage, setStudyLanguage] = useState<StudyLanguage | ''>('');
  const [highSchoolGrade, setHighSchoolGrade] = useState<HighSchoolGrade | ''>('');
  const [traditionalBranch, setTraditionalBranch] = useState<TraditionalBranch | ''>('');
  const [baccalaureatePath, setBaccalaureatePath] = useState<BaccalaureatePath | ''>('');
  const [universityId, setUniversityId] = useState<string | null>(null);
  const [facultyId, setFacultyId] = useState<string | null>(null);
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [programId, setProgramId] = useState<string | null>(null);
  
  const [otherUniversityName, setOtherUniversityName] = useState<string | null>(null);
  const [otherFacultyName, setOtherFacultyName] = useState<string | null>(null);
  const [otherDepartmentName, setOtherDepartmentName] = useState<string | null>(null);
  const [otherProgramName, setOtherProgramName] = useState<string | null>(null);
  const [hasDepartments, setHasDepartments] = useState(false);
  const [hasPrograms, setHasPrograms] = useState(false);

  const handleAcademicChange = (data: any) => {
    setUniversityId(data.universityId || null);
    setFacultyId(data.facultyId || null);
    setDepartmentId(data.departmentId || null);
    setProgramId(data.programId || null);
    setOtherUniversityName(data.otherUniversityName || null);
    setOtherFacultyName(data.otherFacultyName || null);
    setOtherDepartmentName(data.otherDepartmentName || null);
    setOtherProgramName(data.otherProgramName || null);
  };

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
    if (mode === 'register') char.onLoading();
    try {
      if (isInAppBrowser()) {
        setLocalError(t('auth.errors.inAppBrowserError'));
        setBusy(false);
        if (mode === 'register') char.onError();
        return;
      }
      
      if (mode === 'login') {
        const deviceId = generateDeviceFingerprint();
        const { error } = await signIn(email, password, deviceId);
        if (error) {
          if (error.code === 'MAINTENANCE_MODE') {
            setError(error);
          } else {
            setLocalError(error.message);
          }
        }
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
          setLocalError(t('auth.errors.invalidEmail'));
          char.onError();
          return;
        }
        
        if (fullName.trim().length < 3) {
          setLocalError(t('auth.errors.nameTooShort'));
          char.onError();
          return;
        }
        if (fullName.trim().length > 50) {
          setLocalError(t('auth.errors.nameTooLong'));
          char.onError();
          return;
        }

        if (password.length < 8) {
          setLocalError(t('auth.errors.passwordTooShort'));
          char.onError();
          return;
        }
        if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
          setLocalError(t('auth.errors.passwordCriteria'));
          char.onError();
          return;
        }
        const egyptPhoneRegex = /^01[0125][0-9]{8}$/;
        if (!egyptPhoneRegex.test(phoneNumber.trim())) {
          setLocalError(t('auth.errors.invalidPhone'));
          char.onError();
          return;
        }
        
        if (educationLevel === 'HIGH_SCHOOL') {
          if (!highSchoolSystem) { setLocalError(t('auth.errors.missingSystem')); char.onError(); return; }
          if (!studyMode) { setLocalError(t('auth.errors.missingMode')); char.onError(); return; }
          if (!studyLanguage) { setLocalError(t('auth.errors.missingLanguage')); char.onError(); return; }
          if (!highSchoolGrade) { setLocalError(t('auth.errors.missingGrade')); char.onError(); return; }
          if (highSchoolSystem === 'TRADITIONAL' && (highSchoolGrade === 'GRADE_2' || highSchoolGrade === 'GRADE_3') && !traditionalBranch) {
            setLocalError(t('auth.errors.missingBranch')); char.onError(); return;
          }
          if (highSchoolSystem === 'BACCALAUREATE' && (highSchoolGrade === 'GRADE_2' || highSchoolGrade === 'GRADE_3') && !baccalaureatePath) {
            setLocalError(t('auth.errors.missingPath')); char.onError(); return;
          }
          if (!parentPhoneNumber.trim()) {
            setLocalError(t('auth.errors.parentPhoneRequired')); char.onError(); return;
          }
          if (!egyptPhoneRegex.test(parentPhoneNumber.trim())) {
            setLocalError(t('auth.errors.invalidParentPhone')); char.onError(); return;
          }
        } else if (educationLevel === 'UNIVERSITY') {
          if (!universityId) { setLocalError(t('auth.errors.missingUniversity')); char.onError(); return; }
          if (universityId === 'other' && (!otherUniversityName || !otherUniversityName.trim())) { setLocalError(t('auth.errors.missingOtherUniversity')); char.onError(); return; }
          if (!facultyId) { setLocalError(t('auth.errors.missingFaculty')); char.onError(); return; }
          if (facultyId === 'other' && (!otherFacultyName || !otherFacultyName.trim())) { setLocalError(t('auth.errors.missingOtherFaculty')); char.onError(); return; }
          if (hasDepartments && !departmentId) { setLocalError(t('auth.errors.missingDepartment')); char.onError(); return; }
          if (hasPrograms && !programId) { setLocalError(t('auth.errors.missingProgram')); char.onError(); return; }
        }

        if (phoneNumber.trim() && parentPhoneNumber.trim() && phoneNumber.trim() === parentPhoneNumber.trim()) {
          setLocalError(t('auth.errors.duplicatePhoneError'));
          char.onError();
          return;
        }

        const deviceId = generateDeviceFingerprint();
        const { error, status } = await signUp({
          fullName: fullName.trim(),
          email: email.trim(),
          password,
          educationLevel,
          highSchoolSystem: educationLevel === 'HIGH_SCHOOL' ? (highSchoolSystem || undefined) : undefined,
          studyMode: educationLevel === 'HIGH_SCHOOL' ? (studyMode || undefined) : undefined,
          studyLanguage: educationLevel === 'HIGH_SCHOOL' ? (studyLanguage || undefined) : undefined,
          highSchoolGrade: educationLevel === 'HIGH_SCHOOL' ? (highSchoolGrade || undefined) : undefined,
          traditionalBranch: educationLevel === 'HIGH_SCHOOL' ? (highSchoolSystem === 'TRADITIONAL' ? (traditionalBranch || undefined) : undefined) : undefined,
          baccalaureatePath: educationLevel === 'HIGH_SCHOOL' ? (highSchoolSystem === 'BACCALAUREATE' ? (baccalaureatePath || undefined) : undefined) : undefined,
          universityId: educationLevel === 'UNIVERSITY' ? (universityId || undefined) : undefined,
          facultyId: educationLevel === 'UNIVERSITY' ? (facultyId || undefined) : undefined,
          departmentId: educationLevel === 'UNIVERSITY' ? (departmentId || undefined) : undefined,
          programId: educationLevel === 'UNIVERSITY' ? (programId || undefined) : undefined,
          otherUniversityName: educationLevel === 'UNIVERSITY' ? (otherUniversityName?.trim() || undefined) : undefined,
          otherFacultyName: educationLevel === 'UNIVERSITY' ? (otherFacultyName?.trim() || undefined) : undefined,
          otherDepartmentName: educationLevel === 'UNIVERSITY' ? (otherDepartmentName?.trim() || undefined) : undefined,
          otherProgramName: educationLevel === 'UNIVERSITY' ? (otherProgramName?.trim() || undefined) : undefined,
          phoneNumber: phoneNumber.trim(),
          parentPhoneNumber: educationLevel === 'HIGH_SCHOOL' ? (parentPhoneNumber.trim() || undefined) : undefined,
          profilePictureUrl: profilePictureUrl || undefined,
          deviceId,
        });
        if (error) {
          if (error.code === 'MAINTENANCE_MODE') {
            setError(error);
          } else {
            setLocalError(error.message);
            char.onError();
          }
        } else if (status === 'PENDING_APPROVAL') {
          setRegistrationPending(true);
          char.onSuccess();
        }
      }
    } finally {
      setBusy(false);
    }
  }

  // ── Derived booleans ──────────────────────────────────────────────────────
  const showIntroOverlay =
    mode === 'register' &&
    !isMaintenanceActive &&
    !registrationPending &&
    (introPhase === 'entering' || introPhase === 'placing' || introPhase === 'packet-dropped' || introPhase === 'packet-opening');
  
  const showForm =
    mode === 'register' &&
    !isMaintenanceActive &&
    !registrationPending &&
    introPhase === 'form-ready';

  // ── Char animation class for intro phases ────────────────────────────────
  const charExtraClass =
    introPhase === 'entering'   ? 'ecamp-char-enter'      :
    introPhase === 'placing'    ? 'ecamp-char-placing'     :
    introPhase === 'form-ready' ? 'ecamp-char-slide-left'  : '';

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
      <div className="lg:w-1/2 flex items-center justify-center p-4 lg:p-8 overflow-hidden relative">

        {/* ── Maintenance / pending screens ── */}
        {isMaintenanceActive ? (
          <div className="w-full max-w-md animate-fade-up">
            <MaintenanceNotice onCheckStatus={clearMaintenance} />
          </div>
        ) : registrationPending ? (
          <div className="w-full max-w-md animate-fade-up text-center">
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

        ) : mode === 'login' ? (
          /* ── LOGIN MODE — centered form ── */
          <div className="w-full max-w-md animate-fade-up">
            {/* Tab switcher */}
            <div className="mb-6">
              <div className="flex gap-1 p-1 rounded-xl bg-theme-card border border-theme-border">
                <button
                  type="button"
                  onClick={handleLoginTabClick}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all bg-white/[0.08] text-theme-text shadow-sm"
                >
                  {t('auth.signIn')}
                </button>
                <button
                  type="button"
                  onClick={handleRegisterTabClick}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all text-theme-muted hover:text-theme-text"
                >
                  {t('auth.createAccount')}
                </button>
              </div>
            </div>

            <h2 className="text-2xl font-display font-bold text-theme-text mb-1">{t('auth.welcomeBack')}</h2>
            <p className="text-sm text-theme-muted mb-6">{t('auth.welcomeBackDesc')}</p>

            {errMsg === 'auth.errors.unrecognizedDevice' || errMsg?.includes('Unrecognized Device') ? (
              <div className="mb-5 rounded-xl border border-warning-500/30 bg-warning-500/10 p-5 text-center">
                <AlertCircle className="w-8 h-8 mx-auto text-warning-400 mb-2" />
                <h3 className="text-lg font-bold text-theme-text mb-1">{t('auth.unrecognizedDevice')}</h3>
                <p className="text-sm text-theme-muted">{t('auth.errors.unrecognizedDevice')}</p>
              </div>
            ) : errMsg && (
              <div className="mb-5 flex items-start gap-2 rounded-xl border border-error-500/30 bg-error-500/10 p-3 text-sm text-error-200">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{errMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label className="label">{t('auth.email')}</label>
                <input dir="auto"
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
                  <input dir="auto"
                    type={showPassword ? "text" : "password"}
                    className="input pe-12"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={busy}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute top-1/2 -translate-y-1/2 end-3 p-1.5 text-theme-muted hover:text-theme-text transition-colors rounded-lg hover:bg-theme-card"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="btn-primary w-full mt-6 text-sm py-3"
              >
                {busy ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                ) : t('auth.signIn')}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-theme-border/40 text-center">
              <p className="text-xs font-semibold text-accent-700 dark:text-accent-300">
                ⚡ {t('common.developedBy')}
              </p>
            </div>
          </div>

        ) : (
          /* ── REGISTER MODE ── */
          <div className="w-full h-full flex items-center justify-center relative">

            {/* ══ INTRO OVERLAY: character enters + packet drops ══ */}
            {showIntroOverlay && (
              <div className="w-full max-w-2xl flex flex-col items-center justify-center min-h-[400px] relative">

                {/* Tab switcher always visible */}
                <div className="w-full max-w-md mb-8">
                  <div className="flex gap-1 p-1 rounded-xl bg-theme-card border border-theme-border">
                    <button type="button" onClick={handleLoginTabClick}
                      className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all text-theme-muted hover:text-theme-text">
                      {t('auth.signIn')}
                    </button>
                    <button type="button" onClick={handleRegisterTabClick}
                      className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all bg-white/[0.08] text-theme-text shadow-sm">
                      {t('auth.createAccount')}
                    </button>
                  </div>
                </div>

                {/* Stage: character + packet */}
                <div className="relative flex flex-col items-center gap-4">

                  {/* Character — big, centred during intro */}
                  <div
                    className={charExtraClass}
                    style={{ display: 'inline-block' }}
                  >
                    <EcampCharacter
                      state={char.charState}
                      size="2xl"
                      showName
                      className="drop-shadow-2xl"
                    />
                  </div>

                  {/* Packet — shown after entering phase */}
                  {(introPhase === 'packet-dropped' || introPhase === 'packet-opening') && (
                    <div
                      className={`w-36 cursor-pointer select-none ${
                        introPhase === 'packet-dropped'
                          ? 'ecamp-packet-drop ecamp-packet-glow'
                          : 'ecamp-packet-shrink'
                      }`}
                      onClick={handlePacketClick}
                      role="button"
                      aria-label="Open the registration packet"
                      title="Click to open!"
                    >
                      <PacketSVG lidOpen={lidOpen} />
                    </div>
                  )}

                  {/* Tap hint */}
                  {introPhase === 'packet-dropped' && (
                    <p className="text-xs text-accent-400 font-semibold animate-pulse tracking-widest uppercase">
                      {t('auth.tapToOpen', 'Tap the box to open ✨')}
                    </p>
                  )}

                  {/* During entering/placing — hint text */}
                  {(introPhase === 'entering' || introPhase === 'placing') && (
                    <p className="text-sm text-theme-muted animate-pulse">
                      {introPhase === 'entering'
                        ? t('auth.characterArriving', 'Yassin is arriving...')
                        : t('auth.characterPlacing', 'Yassin is setting things up...')}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ══ FORM READY: character on left, form on right ══ */}
            {showForm && (
              <div className="w-full max-w-3xl flex items-start gap-5">

                {/* Character column — fixed on left */}
                <div className="flex-shrink-0 flex flex-col items-center self-end pb-2 ecamp-char-slide-left">
                  <EcampCharacter
                    state={char.charState}
                    size="xl"
                    showName
                    className="drop-shadow-lg"
                  />
                </div>

                {/* Form column */}
                <div className="flex-1 min-w-0 ecamp-form-burst">
                  <>
                  {/* Tab switcher */}
                  <div className="mb-5">
                    <div className="flex gap-1 p-1 rounded-xl bg-theme-card border border-theme-border">
                      <button
                        type="button"
                        onClick={handleLoginTabClick}
                        className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all text-theme-muted hover:text-theme-text"
                      >
                        {t('auth.signIn')}
                      </button>
                      <button
                        type="button"
                        onClick={handleRegisterTabClick}
                        className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all bg-white/[0.08] text-theme-text shadow-sm"
                      >
                        {t('auth.createAccount')}
                      </button>
                    </div>
                  </div>

                  <h2 className="text-2xl font-display font-bold text-theme-text mb-1">{t('auth.joinEcamp')}</h2>
                  <p className="text-sm text-theme-muted mb-5">{t('auth.joinEcampDesc')}</p>

                  {errMsg === 'auth.errors.unrecognizedDevice' || errMsg?.includes('Unrecognized Device') ? (
                    <div className="mb-5 rounded-xl border border-warning-500/30 bg-warning-500/10 p-5 text-center">
                      <AlertCircle className="w-8 h-8 mx-auto text-warning-400 mb-2" />
                      <h3 className="text-lg font-bold text-theme-text mb-1">{t('auth.unrecognizedDevice')}</h3>
                      <p className="text-sm text-theme-muted">{t('auth.errors.unrecognizedDevice')}</p>
                    </div>
                  ) : errMsg && (
                    <div className="mb-5 flex items-start gap-2 rounded-xl border border-error-500/30 bg-error-500/10 p-3 text-sm text-error-200">
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>{errMsg}</span>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4" noValidate>

                    {/* Avatar upload */}
                    <div className="flex justify-center mb-5">
                      <div className="relative group">
                        <div className="w-20 h-20 rounded-full bg-theme-secondary border-2 border-dashed border-theme-border flex items-center justify-center overflow-hidden">
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
                      <input dir="auto"
                        type="text"
                        required
                        className="input"
                        value={fullName}
                        onChange={(e) => { setFullName(e.target.value); char.onTyping(); }}
                        onFocus={char.onFocus}
                        onBlur={char.onBlur}
                        disabled={busy}
                        autoComplete="name"
                      />
                    </div>

                    <div>
                      <label className="label">{t('auth.educationLevel')}</label>
                      <select
                        className="input"
                        value={educationLevel}
                        onChange={(e) => { setEducationLevel(e.target.value as 'HIGH_SCHOOL' | 'UNIVERSITY'); char.onTyping(); }}
                        onFocus={char.onFocus}
                        onBlur={char.onBlur}
                        disabled={busy}
                      >
                        <option value="HIGH_SCHOOL">{t('auth.highSchool')}</option>
                        <option value="UNIVERSITY">{t('auth.university')}</option>
                      </select>
                    </div>

                    {educationLevel === 'HIGH_SCHOOL' && (
                      <div className="space-y-4 p-4 border border-theme-border rounded-xl bg-theme-bg/50">
                        <h3 className="font-semibold text-theme-text">{t('auth.academicDetails', 'Academic Details')}</h3>
                        
                        <div>
                          <label className="label">{t('auth.highSchoolSystem', 'Educational System')}</label>
                          <select className="input" value={highSchoolSystem}
                            onChange={(e) => { setHighSchoolSystem(e.target.value as HighSchoolSystem); char.onTyping(); }}
                            onFocus={char.onFocus} onBlur={char.onBlur} disabled={busy}>
                            <option value="">{t('auth.selectSystem', 'Select System')}</option>
                            <option value="TRADITIONAL">{t('auth.systemTraditional', 'Traditional Secondary')}</option>
                            <option value="BACCALAUREATE">{t('auth.systemBaccalaureate', 'Egyptian Baccalaureate')}</option>
                          </select>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="label">{t('auth.studyMode', 'Study Mode')}</label>
                            <select className="input" value={studyMode}
                              onChange={(e) => { setStudyMode(e.target.value as StudyMode); char.onTyping(); }}
                              onFocus={char.onFocus} onBlur={char.onBlur} disabled={busy}>
                              <option value="">{t('auth.selectMode', 'Select Mode')}</option>
                              <option value="ONLINE">{t('auth.modeOnline', 'Online')}</option>
                              <option value="CENTER">{t('auth.modeCenter', 'Center')}</option>
                            </select>
                          </div>
                          <div>
                            <label className="label">{t('auth.studyLanguage', 'Study Language')}</label>
                            <select className="input" value={studyLanguage}
                              onChange={(e) => { setStudyLanguage(e.target.value as StudyLanguage); char.onTyping(); }}
                              onFocus={char.onFocus} onBlur={char.onBlur} disabled={busy}>
                              <option value="">{t('auth.selectLanguage', 'Select Language')}</option>
                              <option value="ARABIC">{t('auth.langArabic', 'Arabic')}</option>
                              <option value="ENGLISH">{t('auth.langEnglish', 'English')}</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="label">{t('auth.grade', 'Grade')}</label>
                          <select className="input" value={highSchoolGrade}
                            onChange={(e) => { setHighSchoolGrade(e.target.value as HighSchoolGrade); char.onTyping(); }}
                            onFocus={char.onFocus} onBlur={char.onBlur} disabled={busy}>
                            <option value="">{t('auth.selectGrade', 'Select Grade')}</option>
                            <option value="GRADE_1">{t('auth.grade1', 'Grade 1')}</option>
                            <option value="GRADE_2">{t('auth.grade2', 'Grade 2')}</option>
                            <option value="GRADE_3">{t('auth.grade3', 'Grade 3')}</option>
                          </select>
                        </div>

                        {highSchoolSystem === 'TRADITIONAL' && (highSchoolGrade === 'GRADE_2' || highSchoolGrade === 'GRADE_3') && (
                          <div>
                            <label className="label">{t('auth.branch', 'Branch')}</label>
                            <select className="input" value={traditionalBranch}
                              onChange={(e) => { setTraditionalBranch(e.target.value as TraditionalBranch); char.onTyping(); }}
                              onFocus={char.onFocus} onBlur={char.onBlur} disabled={busy}>
                              <option value="">{t('auth.selectBranch', 'Select Branch')}</option>
                              {highSchoolGrade === 'GRADE_2' && (
                                <>
                                  <option value="SCIENCE">{t('auth.branchScience', 'Science')}</option>
                                  <option value="LITERARY">{t('auth.branchLiterary', 'Literary')}</option>
                                </>
                              )}
                              {highSchoolGrade === 'GRADE_3' && (
                                <>
                                  <option value="SCIENCE_BIOLOGY">{t('auth.branchScienceBiology', 'Science Biology (علمي علوم)')}</option>
                                  <option value="SCIENCE_MATH">{t('auth.branchScienceMath', 'Science Math (علمي رياضة)')}</option>
                                  <option value="LITERARY">{t('auth.branchLiterary', 'Literary')}</option>
                                </>
                              )}
                            </select>
                          </div>
                        )}

                        {highSchoolSystem === 'BACCALAUREATE' && (highSchoolGrade === 'GRADE_2' || highSchoolGrade === 'GRADE_3') && (
                          <div>
                            <label className="label">{t('auth.path', 'Path')}</label>
                            <select className="input" value={baccalaureatePath}
                              onChange={(e) => { setBaccalaureatePath(e.target.value as BaccalaureatePath); char.onTyping(); }}
                              onFocus={char.onFocus} onBlur={char.onBlur} disabled={busy}>
                              <option value="">{t('auth.selectPath', 'Select Path')}</option>
                              <option value="MEDICINE_AND_LIFE_SCIENCES">{t('auth.pathMedicine', 'Medicine & Life Sciences')}</option>
                              <option value="ENGINEERING_AND_COMPUTER_SCIENCE">{t('auth.pathEngineering', 'Engineering & Computer Science')}</option>
                              <option value="BUSINESS">{t('auth.pathBusiness', 'Business')}</option>
                              <option value="ARTS_AND_HUMANITIES">{t('auth.pathArts', 'Arts & Humanities')}</option>
                            </select>
                          </div>
                        )}
                      </div>
                    )}

                    {educationLevel === 'UNIVERSITY' && (
                      <div className="space-y-4 p-4 border border-theme-border rounded-xl bg-theme-bg/50">
                        <h3 className="font-semibold text-theme-text">{t('auth.academicDetails', 'Academic Details')}</h3>
                        <AcademicDropdowns
                          universityId={universityId}
                          facultyId={facultyId}
                          departmentId={departmentId}
                          programId={programId}
                          otherUniversityName={otherUniversityName}
                          otherFacultyName={otherFacultyName}
                          otherDepartmentName={otherDepartmentName}
                          otherProgramName={otherProgramName}
                          onChange={handleAcademicChange}
                          onAvailabilityChange={(hd, hp) => {
                            setHasDepartments(hd);
                            setHasPrograms(hp);
                          }}
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="label">{t('auth.phoneNumber')}</label>
                        <input dir="auto"
                          className="input"
                          value={phoneNumber}
                          onChange={(e) => { setPhoneNumber(e.target.value); char.onTyping(); }}
                          onFocus={char.onFocus}
                          onBlur={char.onBlur}
                          required
                          type="tel"
                          autoComplete="tel"
                          disabled={busy}
                        />
                      </div>
                      {educationLevel === 'HIGH_SCHOOL' && (
                        <div>
                          <label className="label">{t('auth.parentPhoneNumber')}</label>
                          <input dir="auto"
                            className="input"
                            value={parentPhoneNumber}
                            onChange={(e) => { setParentPhoneNumber(e.target.value); char.onTyping(); }}
                            onFocus={char.onFocus}
                            onBlur={char.onBlur}
                            placeholder="01xxxxxxxxx"
                            disabled={busy}
                            type="tel"
                            autoComplete="tel-national"
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="label">{t('auth.email')}</label>
                      <input dir="auto"
                        type="email"
                        className="input"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); char.onTyping(); }}
                        onFocus={char.onFocus}
                        onBlur={char.onBlur}
                        required
                        disabled={busy}
                        autoComplete="email"
                      />
                    </div>
                    <div>
                      <label className="label">{t('auth.password')}</label>
                      <div className="relative">
                        <input dir="auto"
                          type={showPassword ? "text" : "password"}
                          className="input pe-12"
                          value={password}
                          onChange={(e) => { setPassword(e.target.value); char.onTyping(); }}
                          onFocus={char.onFocus}
                          onBlur={char.onBlur}
                          required
                          disabled={busy}
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute top-1/2 -translate-y-1/2 end-3 p-1.5 text-theme-muted hover:text-theme-text transition-colors rounded-lg hover:bg-theme-card"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-xs text-theme-muted mt-1.5">
                        {t('auth.passwordHint')}
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={busy}
                      className="btn-primary w-full mt-5 text-sm py-3"
                    >
                      {busy ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                      ) : t('auth.createAccount')}
                    </button>
                  </form>

                  <p className="mt-4 text-xs text-theme-muted leading-relaxed text-center">
                    {t('auth.deviceBinding')}
                  </p>

                  <div className="mt-5 pt-4 border-t border-theme-border/40 text-center">
                    <p className="text-xs font-semibold text-accent-700 dark:text-accent-300">
                      ⚡ {t('common.developedBy')}
                    </p>
                  </div>
                  </>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
