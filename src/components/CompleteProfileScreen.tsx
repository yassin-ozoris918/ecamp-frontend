import { useState, useEffect } from 'react';
import { useAuth } from '../lib/authContext';
import { api } from '../lib/api';
import { useTranslation } from 'react-i18next';
import { 
  HighSchoolSystem, 
  StudyMode, 
  StudyLanguage, 
  HighSchoolGrade, 
  TraditionalBranch, 
  BaccalaureatePath 
} from '../lib/types';
import { AlertCircle, Save } from 'lucide-react';

export function CompleteProfileScreen() {
  const { profile, updateProfile } = useAuth();
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [highSchoolSystem, setHighSchoolSystem] = useState<HighSchoolSystem | ''>('');
  const [studyMode, setStudyMode] = useState<StudyMode | ''>('');
  const [studyLanguage, setStudyLanguage] = useState<StudyLanguage | ''>('');
  const [highSchoolGrade, setHighSchoolGrade] = useState<HighSchoolGrade | ''>('');
  const [traditionalBranch, setTraditionalBranch] = useState<TraditionalBranch | ''>('');
  const [baccalaureatePath, setBaccalaureatePath] = useState<BaccalaureatePath | ''>('');
  
  const [university, setUniversity] = useState('');
  const [faculty, setFaculty] = useState('');
  const [department, setDepartment] = useState('');
  const [academicYear, setAcademicYear] = useState('');

  const educationLevel = profile?.educationLevel || profile?.education_level;

  useEffect(() => {
    if (profile) {
      setHighSchoolSystem(profile.highSchoolSystem || '');
      setStudyMode(profile.studyMode || '');
      setStudyLanguage(profile.studyLanguage || '');
      setHighSchoolGrade(profile.highSchoolGrade || '');
      setTraditionalBranch(profile.traditionalBranch || '');
      setBaccalaureatePath(profile.baccalaureatePath || '');
      setUniversity(profile.university || '');
      setFaculty(profile.faculty || '');
      setDepartment(profile.department || '');
      setAcademicYear(profile.academicYear || '');
    }
  }, [profile]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Basic Validation
    if (educationLevel === 'HIGH_SCHOOL') {
      if (!highSchoolSystem || !studyMode || !studyLanguage || !highSchoolGrade) {
        setError(t('auth.errors.missingFields', 'Please fill in all required fields.'));
        return;
      }
      if (highSchoolSystem === 'TRADITIONAL' && (highSchoolGrade === 'GRADE_2' || highSchoolGrade === 'GRADE_3') && !traditionalBranch) {
        setError(t('auth.errors.missingBranch', 'Please select a branch.'));
        return;
      }
      if (highSchoolSystem === 'BACCALAUREATE' && (highSchoolGrade === 'GRADE_2' || highSchoolGrade === 'GRADE_3') && !baccalaureatePath) {
        setError(t('auth.errors.missingPath', 'Please select a path.'));
        return;
      }
    }

    setBusy(true);
    try {
      const payload = {
        highSchoolSystem: highSchoolSystem || null,
        studyMode: studyMode || null,
        studyLanguage: studyLanguage || null,
        highSchoolGrade: highSchoolGrade || null,
        traditionalBranch: traditionalBranch || null,
        baccalaureatePath: baccalaureatePath || null,
        university: university || null,
        faculty: faculty || null,
        department: department || null,
        academicYear: academicYear || null,
      };

      const { data } = await api.patch('/users/profile', payload);
      
      // Update local context
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const cached = JSON.parse(userStr);
        const updated = {
          ...cached,
          highSchoolSystem: data.highSchoolSystem,
          studyMode: data.studyMode,
          studyLanguage: data.studyLanguage,
          highSchoolGrade: data.highSchoolGrade,
          traditionalBranch: data.traditionalBranch,
          baccalaureatePath: data.baccalaureatePath,
          university: data.university,
          faculty: data.faculty,
          department: data.department,
          academicYear: data.academicYear,
          isProfileComplete: true
        };
        localStorage.setItem('user', JSON.stringify(updated));
      }
      window.location.href = '/#/dashboard';
      window.location.reload();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to update profile');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto p-6 mt-12 bg-theme-card border border-theme-border rounded-2xl shadow-xl">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-display font-bold text-theme-text">{t('profile.completeProfileTitle', 'Complete Your Profile')}</h2>
        <p className="text-theme-muted mt-2">{t('profile.completeProfileDesc', 'Please provide the missing academic details to continue using the platform.')}</p>
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-2 rounded-xl border border-error-500/30 bg-error-500/10 p-4 text-sm text-error-200">
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {educationLevel === 'HIGH_SCHOOL' && (
          <div className="space-y-5 p-5 border border-theme-border rounded-xl bg-theme-bg/50">
            <div>
              <label className="label font-medium">{t('auth.highSchoolSystem', 'Educational System')} <span className="text-error-500">*</span></label>
              <select className="input" value={highSchoolSystem} onChange={(e) => setHighSchoolSystem(e.target.value as HighSchoolSystem)} disabled={busy} required>
                <option value="">{t('auth.selectSystem', 'Select System')}</option>
                <option value="TRADITIONAL">{t('auth.systemTraditional', 'Traditional Secondary')}</option>
                <option value="BACCALAUREATE">{t('auth.systemBaccalaureate', 'Egyptian Baccalaureate')}</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label font-medium">{t('auth.studyMode', 'Study Mode')} <span className="text-error-500">*</span></label>
                <select className="input" value={studyMode} onChange={(e) => setStudyMode(e.target.value as StudyMode)} disabled={busy} required>
                  <option value="">{t('auth.selectMode', 'Select Mode')}</option>
                  <option value="ONLINE">{t('auth.modeOnline', 'Online')}</option>
                  <option value="CENTER">{t('auth.modeCenter', 'Center')}</option>
                </select>
              </div>
              <div>
                <label className="label font-medium">{t('auth.studyLanguage', 'Study Language')} <span className="text-error-500">*</span></label>
                <select className="input" value={studyLanguage} onChange={(e) => setStudyLanguage(e.target.value as StudyLanguage)} disabled={busy} required>
                  <option value="">{t('auth.selectLanguage', 'Select Language')}</option>
                  <option value="ARABIC">{t('auth.langArabic', 'Arabic')}</option>
                  <option value="ENGLISH">{t('auth.langEnglish', 'English')}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label font-medium">{t('auth.grade', 'Grade')} <span className="text-error-500">*</span></label>
              <select className="input" value={highSchoolGrade} onChange={(e) => setHighSchoolGrade(e.target.value as HighSchoolGrade)} disabled={busy} required>
                <option value="">{t('auth.selectGrade', 'Select Grade')}</option>
                <option value="GRADE_1">{t('auth.grade1', 'Grade 1')}</option>
                <option value="GRADE_2">{t('auth.grade2', 'Grade 2')}</option>
                <option value="GRADE_3">{t('auth.grade3', 'Grade 3')}</option>
              </select>
            </div>

            {highSchoolSystem === 'TRADITIONAL' && (highSchoolGrade === 'GRADE_2' || highSchoolGrade === 'GRADE_3') && (
              <div>
                <label className="label font-medium">{t('auth.branch', 'Branch')} <span className="text-error-500">*</span></label>
                <select className="input" value={traditionalBranch} onChange={(e) => setTraditionalBranch(e.target.value as TraditionalBranch)} disabled={busy} required>
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
                <label className="label font-medium">{t('auth.path', 'Path')} <span className="text-error-500">*</span></label>
                <select className="input" value={baccalaureatePath} onChange={(e) => setBaccalaureatePath(e.target.value as BaccalaureatePath)} disabled={busy} required>
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
          <div className="space-y-5 p-5 border border-theme-border rounded-xl bg-theme-bg/50">
            <div>
              <label className="label font-medium">{t('auth.universityName', 'University Name')}</label>
              <input type="text" className="input" value={university} onChange={(e) => setUniversity(e.target.value)} disabled={busy} placeholder={t('auth.universityPlaceholder', 'e.g. Cairo University')} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label font-medium">{t('auth.faculty', 'Faculty')}</label>
                <input type="text" className="input" value={faculty} onChange={(e) => setFaculty(e.target.value)} disabled={busy} placeholder={t('auth.facultyPlaceholder', 'e.g. Engineering')} />
              </div>
              <div>
                <label className="label font-medium">{t('auth.department', 'Department')}</label>
                <input type="text" className="input" value={department} onChange={(e) => setDepartment(e.target.value)} disabled={busy} placeholder={t('auth.departmentPlaceholder', 'e.g. Computer')} />
              </div>
            </div>

            <div>
              <label className="label font-medium">{t('auth.academicYear', 'Academic Year')}</label>
              <input type="text" className="input" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} disabled={busy} placeholder={t('auth.academicYearPlaceholder', 'e.g. 2026/2027')} />
            </div>
          </div>
        )}

        <button type="submit" disabled={busy} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
          {busy ? (
            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          {t('profile.saveChanges', 'Save & Continue')}
        </button>
      </form>
    </div>
  );
}
