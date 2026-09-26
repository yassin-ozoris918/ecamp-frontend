import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useTranslation } from 'react-i18next';

interface AcademicDropdownsProps {
  universityId: string | null;
  facultyId: string | null;
  departmentId: string | null;
  programId: string | null;
  otherUniversityName: string | null;
  otherFacultyName: string | null;
  otherDepartmentName: string | null;
  otherProgramName: string | null;
  excludeOther?: boolean; // Kept for interface compatibility but no longer functional
  forceShowAll?: boolean;
  isTargetingMode?: boolean;
  onChange: (data: {
    universityId: string | null;
    facultyId: string | null;
    departmentId: string | null;
    programId: string | null;
    otherUniversityName: string | null;
    otherFacultyName: string | null;
    otherDepartmentName: string | null;
    otherProgramName: string | null;
  }) => void;
}

export function AcademicDropdowns({
  universityId,
  facultyId,
  departmentId,
  programId,
  onChange,
  forceShowAll,
  isTargetingMode,
}: AcademicDropdownsProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || 'en';

  const [universities, setUniversities] = useState<any[]>([]);
  const [faculties, setFaculties] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  
  const [loadingUniversities, setLoadingUniversities] = useState(false);
  const [loadingFaculties, setLoadingFaculties] = useState(false);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingPrograms, setLoadingPrograms] = useState(false);

  useEffect(() => {
    let ignore = false;
    setLoadingUniversities(true);
    api.get('/academic-data/universities').then((res) => {
      if (!ignore) setUniversities(res.data);
    }).catch((err) => {
      console.error('Failed to fetch universities:', err);
    }).finally(() => {
      if (!ignore) setLoadingUniversities(false);
    });
    return () => { ignore = true; };
  }, []);

  useEffect(() => {
    let ignore = false;
    if (universityId) {
      setLoadingFaculties(true);
      api.get(`/academic-data/universities/${universityId}/faculties`).then((res) => {
        if (!ignore) setFaculties(res.data);
      }).catch((err) => {
        console.error('Failed to fetch faculties:', err);
      }).finally(() => {
        if (!ignore) setLoadingFaculties(false);
      });
    } else {
      if (!ignore) setFaculties([]);
    }
    return () => { ignore = true; };
  }, [universityId]);

  useEffect(() => {
    let ignore = false;
    if (facultyId) {
      setLoadingDepartments(true);
      api.get(`/academic-data/faculties/${facultyId}/departments`).then((res) => {
        if (ignore) return;
        setDepartments(res.data);
        if (res.data.length === 0) {
          setLoadingPrograms(true);
          api.get(`/academic-data/faculties/${facultyId}/programs`).then((pres) => {
            if (!ignore) setPrograms(pres.data);
          }).catch((err) => {
            console.error('Failed to fetch programs for faculty:', err);
          }).finally(() => {
            if (!ignore) setLoadingPrograms(false);
          });
        }
      }).catch((err) => {
        console.error('Failed to fetch departments:', err);
      }).finally(() => {
        if (!ignore) setLoadingDepartments(false);
      });
    } else {
      if (!ignore) {
        setDepartments([]);
        setPrograms([]);
      }
    }
    return () => { ignore = true; };
  }, [facultyId]);

  useEffect(() => {
    let ignore = false;
    if (departmentId) {
      setLoadingPrograms(true);
      api.get(`/academic-data/departments/${departmentId}/programs`).then((res) => {
        if (!ignore) setPrograms(res.data);
      }).catch((err) => {
        console.error('Failed to fetch programs:', err);
      }).finally(() => {
        if (!ignore) setLoadingPrograms(false);
      });
    } else {
      if (!ignore) setPrograms([]);
    }
    return () => { ignore = true; };
  }, [departmentId]);

  return (
    <div className="space-y-4">
      {/* University */}
      <div>
        <label className="label">{t('auth.university', 'University')}</label>
        <select
          className="input"
          value={universityId || ''}
          onChange={(e) => {
            onChange({
              universityId: e.target.value || null,
              facultyId: null,
              departmentId: null,
              programId: null,
              otherUniversityName: null,
              otherFacultyName: null,
              otherDepartmentName: null,
              otherProgramName: null
            });
          }}
          disabled={loadingUniversities}
        >
          <option value="">{isTargetingMode ? 'Any University' : t('auth.selectUniversity', 'Select University...')}</option>
          {universities.map(u => (
            <option key={u.id} value={u.id}>{lang === 'en' ? u.nameEn : u.nameAr}</option>
          ))}
        </select>
      </div>

      {/* Faculty */}
      {(faculties.length > 0 || forceShowAll) && (
        <div>
          <label className="label">{t('auth.faculty', 'Faculty')}</label>
          <select
            className="input"
            value={facultyId || ''}
            onChange={(e) => {
              onChange({
                universityId,
                facultyId: e.target.value || null,
                departmentId: null,
                programId: null,
                otherUniversityName: null,
                otherFacultyName: null,
                otherDepartmentName: null,
                otherProgramName: null
              });
            }}
            disabled={loadingFaculties}
          >
            <option value="">{isTargetingMode ? 'Any Faculty' : t('auth.selectFaculty', 'Select Faculty...')}</option>
            {faculties.map(f => (
              <option key={f.id} value={f.id}>{lang === 'en' ? f.nameEn : f.nameAr}</option>
            ))}
          </select>
        </div>
      )}

      {/* Department */}
      {(departments.length > 0 || forceShowAll) && (
        <div>
          <label className="label">{t('auth.department', 'Department')}</label>
          <select
            className="input"
            value={departmentId || ''}
            onChange={(e) => {
              onChange({
                universityId,
                facultyId,
                departmentId: e.target.value || null,
                programId: null,
                otherUniversityName: null,
                otherFacultyName: null,
                otherDepartmentName: null,
                otherProgramName: null
              });
            }}
            disabled={loadingDepartments}
          >
            <option value="">{isTargetingMode ? 'Any Department' : t('auth.selectDepartment', 'Select Department...')}</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{lang === 'en' ? d.nameEn : d.nameAr}</option>
            ))}
          </select>
        </div>
      )}

      {/* Program */}
      {(programs.length > 0 || forceShowAll) && (
        <div>
          <label className="label">{t('auth.program', 'Program')}</label>
          <select
            className="input"
            value={programId || ''}
            onChange={(e) => {
              onChange({
                universityId,
                facultyId,
                departmentId,
                programId: e.target.value || null,
                otherUniversityName: null,
                otherFacultyName: null,
                otherDepartmentName: null,
                otherProgramName: null
              });
            }}
            disabled={loadingPrograms}
          >
            <option value="">{isTargetingMode ? 'Any Program' : t('auth.selectProgram', 'Select Program...')}</option>
            {programs.map(p => (
              <option key={p.id} value={p.id}>{lang === 'en' ? p.nameEn : p.nameAr}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
