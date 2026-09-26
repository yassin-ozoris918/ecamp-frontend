import { useState } from 'react';
import { GraduationCap, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/authContext';
import { generateDeviceFingerprint } from '../lib/device';
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

export function AuthScreen() {
  const { signIn, signUp, error, setError } = useAuth();
  const { t } = useTranslation();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [registrationPending, setRegistrationPending] = useState(false);
  const [maintenanceInterrupted, setMaintenanceInterrupted] = useState(() => sessionStorage.getItem('maintenance_interruption') === 'true');

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
          return;
        }
        
        if (fullName.trim().length < 3) {
          setLocalError(t('auth.errors.nameTooShort'));
          return;
        }
        if (fullName.trim().length > 50) {
          setLocalError(t('auth.errors.nameTooLong'));
          return;
        }

        if (password.length < 8) {
          setLocalError(t('auth.errors.passwordTooShort'));
          return;
        }
        if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
          setLocalError(t('auth.errors.passwordCriteria'));
          return;
        }
        const egyptPhoneRegex = /^01[0125][0-9]{8}$/;
        if (!egyptPhoneRegex.test(phoneNumber.trim())) {
          setLocalError(t('auth.errors.invalidPhone'));
          return;
        }
        
        if (educationLevel === 'HIGH_SCHOOL') {
          if (!highSchoolSystem) { setLocalError(t('auth.errors.missingSystem')); return; }
          if (!studyMode) { setLocalError(t('auth.errors.missingMode')); return; }
          if (!studyLanguage) { setLocalError(t('auth.errors.missingLanguage')); return; }
          if (!highSchoolGrade) { setLocalError(t('auth.errors.missingGrade')); return; }
          if (highSchoolSystem === 'TRADITIONAL' && (highSchoolGrade === 'GRADE_2' || highSchoolGrade === 'GRADE_3') && !traditionalBranch) {
            setLocalError(t('auth.errors.missingBranch')); return;
          }
          if (highSchoolSystem === 'BACCALAUREATE' && (highSchoolGrade === 'GRADE_2' || highSchoolGrade === 'GRADE_3') && !baccalaureatePath) {
            setLocalError(t('auth.errors.missingPath')); return;
          }
          if (!parentPhoneNumber.trim()) {
            setLocalError(t('auth.errors.parentPhoneRequired')); return;
          }
          if (!egyptPhoneRegex.test(parentPhoneNumber.trim())) {
            setLocalError(t('auth.errors.invalidParentPhone')); return;
          }
        } else if (educationLevel === 'UNIVERSITY') {
          if (!universityId) { setLocalError(t('auth.errors.missingUniversity')); return; }
          if (universityId === 'other' && (!otherUniversityName || !otherUniversityName.trim())) { setLocalError(t('auth.errors.missingOtherUniversity')); return; }
          if (!facultyId) { setLocalError(t('auth.errors.missingFaculty')); return; }
          if (facultyId === 'other' && (!otherFacultyName || !otherFacultyName.trim())) { setLocalError(t('auth.errors.missingOtherFaculty')); return; }
        }

        if (phoneNumber.trim() && parentPhoneNumber.trim() && phoneNumber.trim() === parentPhoneNumber.trim()) {
          setLocalError(t('auth.errors.duplicatePhoneError'));
          return;
        }

        const deviceId = generateDeviceFingerprint();
        const { error, status } = await signUp({
          fullName: fullName.trim(),
          email: email.trim(),
          password,
          educationLevel,
          highSchoolSystem: highSchoolSystem || undefined,
          studyMode: studyMode || undefined,
          studyLanguage: studyLanguage || undefined,
          highSchoolGrade: highSchoolGrade || undefined,
          traditionalBranch: traditionalBranch || undefined,
          baccalaureatePath: baccalaureatePath || undefined,
          universityId: universityId || undefined,
          facultyId: facultyId || undefined,
          departmentId: departmentId || undefined,
          programId: programId || undefined,
          otherUniversityName: otherUniversityName?.trim() || undefined,
          otherFacultyName: otherFacultyName?.trim() || undefined,
          otherDepartmentName: otherDepartmentName?.trim() || undefined,
          otherProgramName: otherProgramName?.trim() || undefined,
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
          }
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
          {isMaintenanceActive ? (
            <MaintenanceNotice onCheckStatus={clearMaintenance} />
          ) : registrationPending ? (
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

          {/* [ON HOLD: Registration Tutorial Video]
          mode === 'register' && (
            <div className="mb-6">
              <button
                type="button"
                onClick={() => setShowTutorial(true)}
                className="w-full flex items-center justify-between p-4 rounded-xl border border-accent-500/30 bg-gradient-to-r from-accent-500/5 to-accent-600/10 hover:from-accent-500/10 hover:to-accent-600/20 transition-all duration-300 group shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-accent-500/20 rounded-lg text-accent-600 dark:text-accent-400 group-hover:scale-110 transition-transform">
                    <PlayCircle className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <h4 className="text-sm font-bold text-theme-text">{t('auth.needHelpRegistering')}</h4>
                    <p className="text-xs text-theme-muted">{t('auth.watchTutorial')}</p>
                  </div>
                </div>
              </button>
            </div>
          )
          */}

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

                {educationLevel === 'HIGH_SCHOOL' && (
                  <div className="space-y-4 p-4 border border-theme-border rounded-xl bg-theme-bg/50">
                    <h3 className="font-semibold text-theme-text">{t('auth.academicDetails', 'Academic Details')}</h3>
                    
                    <div>
                      <label className="label">{t('auth.highSchoolSystem', 'Educational System')}</label>
                      <select className="input" value={highSchoolSystem} onChange={(e) => setHighSchoolSystem(e.target.value as HighSchoolSystem)} disabled={busy}>
                        <option value="">{t('auth.selectSystem', 'Select System')}</option>
                        <option value="TRADITIONAL">{t('auth.systemTraditional', 'Traditional Secondary')}</option>
                        <option value="BACCALAUREATE">{t('auth.systemBaccalaureate', 'Egyptian Baccalaureate')}</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="label">{t('auth.studyMode', 'Study Mode')}</label>
                        <select className="input" value={studyMode} onChange={(e) => setStudyMode(e.target.value as StudyMode)} disabled={busy}>
                          <option value="">{t('auth.selectMode', 'Select Mode')}</option>
                          <option value="ONLINE">{t('auth.modeOnline', 'Online')}</option>
                          <option value="CENTER">{t('auth.modeCenter', 'Center')}</option>
                        </select>
                      </div>
                      <div>
                        <label className="label">{t('auth.studyLanguage', 'Study Language')}</label>
                        <select className="input" value={studyLanguage} onChange={(e) => setStudyLanguage(e.target.value as StudyLanguage)} disabled={busy}>
                          <option value="">{t('auth.selectLanguage', 'Select Language')}</option>
                          <option value="ARABIC">{t('auth.langArabic', 'Arabic')}</option>
                          <option value="ENGLISH">{t('auth.langEnglish', 'English')}</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="label">{t('auth.grade', 'Grade')}</label>
                      <select className="input" value={highSchoolGrade} onChange={(e) => setHighSchoolGrade(e.target.value as HighSchoolGrade)} disabled={busy}>
                        <option value="">{t('auth.selectGrade', 'Select Grade')}</option>
                        <option value="GRADE_1">{t('auth.grade1', 'Grade 1')}</option>
                        <option value="GRADE_2">{t('auth.grade2', 'Grade 2')}</option>
                        <option value="GRADE_3">{t('auth.grade3', 'Grade 3')}</option>
                      </select>
                    </div>

                    {highSchoolSystem === 'TRADITIONAL' && (highSchoolGrade === 'GRADE_2' || highSchoolGrade === 'GRADE_3') && (
                      <div>
                        <label className="label">{t('auth.branch', 'Branch')}</label>
                        <select className="input" value={traditionalBranch} onChange={(e) => setTraditionalBranch(e.target.value as TraditionalBranch)} disabled={busy}>
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
                        <select className="input" value={baccalaureatePath} onChange={(e) => setBaccalaureatePath(e.target.value as BaccalaureatePath)} disabled={busy}>
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
                    />
                  </div>
                )}

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

      {/* [ON HOLD: Full-Screen Video Modal]
      showTutorial && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
            onClick={() => setShowTutorial(false)}
          />
          
          <div className="relative w-full max-w-5xl bg-theme-bg rounded-2xl shadow-2xl overflow-hidden ring-1 ring-white/20 animate-in zoom-in-95 duration-300 flex flex-col">
            
            <div className="flex items-center justify-between p-4 border-b border-theme-border bg-theme-card/80 backdrop-blur-sm z-10">
              <h3 className="font-bold text-theme-text flex items-center gap-2">
                <PlayCircle className="w-5 h-5 text-accent-500" />
                {t('auth.needHelpRegistering')}
              </h3>
              <button 
                onClick={() => setShowTutorial(false)}
                className="p-2 hover:bg-error-500/20 hover:text-error-500 rounded-full transition-colors text-theme-muted"
                aria-label="Close modal"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="relative w-full h-[70vh] md:h-auto md:aspect-video bg-black">
              <iframe
                src="https://drive.google.com/file/d/1L8bkQhYetrjlQWz3Ft98FUdrrO3F7D89/preview"
                title="Registration Tutorial"
                className="absolute inset-0 w-full h-full border-0"
                allow="autoplay"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        </div>
      )
      */}
    </div>
  );
}
