import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useTranslation } from 'react-i18next';

interface AcademicDropdownsProps {
  universityId: string | null;
  facultyId: string | null;
  departmentId: string | null;
  programId: string | null;
  otherUniversityName?: string | null;
  otherFacultyName?: string | null;
  otherDepartmentName?: string | null;
  otherProgramName?: string | null;
  onChange: (data: {
    universityId: string | null;
    facultyId: string | null;
    departmentId: string | null;
    programId: string | null;
    otherUniversityName?: string | null;
    otherFacultyName?: string | null;
    otherDepartmentName?: string | null;
    otherProgramName?: string | null;
  }) => void;
}

export function AcademicDropdowns({

  universityId,
  facultyId,
  departmentId,
  programId,
  otherUniversityName,
  otherFacultyName,
  otherDepartmentName,
  otherProgramName,
  onChange,
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
    }).finally(() => {
      if (!ignore) setLoadingUniversities(false);
    });
    return () => { ignore = true; };
  }, []);

  useEffect(() => {
    let ignore = false;
    if (universityId) {
      const uni = universities.find(u => u.id === universityId);
      if (uni && !uni.isOther) {
        setLoadingFaculties(true);
        api.get(`/academic-data/universities/${universityId}/faculties`).then((res) => {
          if (!ignore) setFaculties(res.data);
        }).finally(() => {
          if (!ignore) setLoadingFaculties(false);
        });
      } else {
        if (!ignore) setFaculties([]);
      }
    } else {
      if (!ignore) setFaculties([]);
    }
    return () => { ignore = true; };
  }, [universityId, universities]);

  useEffect(() => {
    let ignore = false;
    if (facultyId) {
      const fac = faculties.find(f => f.id === facultyId);
      if (fac && !fac.isOther) {
        setLoadingDepartments(true);
        api.get(`/academic-data/faculties/${facultyId}/departments`).then((res) => {
          if (ignore) return;
          setDepartments(res.data);
          // If no departments, fetch programs directly
          if (res.data.length === 0) {
            setLoadingPrograms(true);
            api.get(`/academic-data/faculties/${facultyId}/programs`).then((pres) => {
              if (!ignore) setPrograms(pres.data);
            }).finally(() => {
              if (!ignore) setLoadingPrograms(false);
            });
          }
        }).finally(() => {
          if (!ignore) setLoadingDepartments(false);
        });
      } else {
        if (!ignore) {
          setDepartments([]);
          setPrograms([]);
        }
      }
    } else {
      if (!ignore) {
        setDepartments([]);
        setPrograms([]);
      }
    }
    return () => { ignore = true; };
  }, [facultyId, faculties]);

  useEffect(() => {
    let ignore = false;
    if (departmentId) {
      const dep = departments.find(d => d.id === departmentId);
      if (dep && !dep.isOther) {
        setLoadingPrograms(true);
        api.get(`/academic-data/departments/${departmentId}/programs`).then((res) => {
          if (!ignore) setPrograms(res.data);
        }).finally(() => {
          if (!ignore) setLoadingPrograms(false);
        });
      } else {
        if (!ignore) setPrograms([]);
      }
    } else {
      // User requested changing department must reset program but here we just clear options if it's null. 
      // The onChange in the dropdown handles resetting programId state in parent.
      if (!ignore) setPrograms([]);
    }
    return () => { ignore = true; };
  }, [departmentId, departments]);

  const selectedUni = universities.find(u => u.id === universityId);
  const selectedFac = faculties.find(f => f.id === facultyId);
  const selectedDep = departments.find(d => d.id === departmentId);
  const selectedProg = programs.find(p => p.id === programId);

  return (
    <div className="space-y-4">
      {/* University */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">{t('auth.university', 'University')}</label>
        <select
          className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
          value={universityId || ''}
          onChange={(e) => {
            onChange({
              universityId: e.target.value || null,
              facultyId: null,
              departmentId: null,
              programId: null,
              otherUniversityName: '',
              otherFacultyName: '',
              otherDepartmentName: '',
              otherProgramName: ''
            });
          }}
          disabled={loadingUniversities}
        >
          <option value="">{t('auth.selectUniversity', 'Select University...')}</option>
          {universities.map(u => (
            <option key={u.id} value={u.id}>{lang === 'en' ? u.nameEn : u.nameAr}</option>
          ))}
        </select>
        {selectedUni?.isOther && (
          <input
            type="text"
            className="mt-2 w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
            placeholder={t('auth.enterUniversityName', 'Enter University Name')}
            value={otherUniversityName || ''}
            onChange={(e) => onChange({
              universityId, facultyId, departmentId, programId,
              otherUniversityName: e.target.value,
              otherFacultyName, otherDepartmentName, otherProgramName
            })}
          />
        )}
      </div>

      {/* Faculty */}
      {faculties.length > 0 && !selectedUni?.isOther && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('auth.faculty', 'Faculty')}</label>
          <select
            className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
            value={facultyId || ''}
            onChange={(e) => {
              onChange({
                universityId,
                facultyId: e.target.value || null,
                departmentId: null,
                programId: null,
                otherUniversityName,
                otherFacultyName: '',
                otherDepartmentName: '',
                otherProgramName: ''
              });
            }}
            disabled={loadingFaculties}
          >
            <option value="">{t('auth.selectFaculty', 'Select Faculty...')}</option>
            {faculties.map(f => (
              <option key={f.id} value={f.id}>{lang === 'en' ? f.nameEn : f.nameAr}</option>
            ))}
          </select>
          {selectedFac?.isOther && (
            <input
              type="text"
              className="mt-2 w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
              placeholder={t('auth.enterFacultyName', 'Enter Faculty Name')}
              value={otherFacultyName || ''}
              onChange={(e) => onChange({
                universityId, facultyId, departmentId, programId,
                otherUniversityName,
                otherFacultyName: e.target.value,
                otherDepartmentName, otherProgramName
              })}
            />
          )}
        </div>
      )}

      {/* Faculty is Other means they must type out department/program, so we don't show the DB dropdowns below */}

      {/* Department */}
      {departments.length > 0 && !selectedFac?.isOther && !selectedUni?.isOther && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('auth.department', 'Department')}</label>
          <select
            className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
            value={departmentId || ''}
            onChange={(e) => {
              onChange({
                universityId,
                facultyId,
                departmentId: e.target.value || null,
                programId: null,
                otherUniversityName,
                otherFacultyName,
                otherDepartmentName: '',
                otherProgramName: ''
              });
            }}
            disabled={loadingDepartments}
          >
            <option value="">{t('auth.selectDepartment', 'Select Department...')}</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{lang === 'en' ? d.nameEn : d.nameAr}</option>
            ))}
          </select>
          {selectedDep?.isOther && (
            <input
              type="text"
              className="mt-2 w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
              placeholder={t('auth.enterDepartmentName', 'Enter Department Name')}
              value={otherDepartmentName || ''}
              onChange={(e) => onChange({
                universityId, facultyId, departmentId, programId,
                otherUniversityName, otherFacultyName,
                otherDepartmentName: e.target.value,
                otherProgramName
              })}
            />
          )}
        </div>
      )}

      {/* Program */}
      {programs.length > 0 && !selectedDep?.isOther && !selectedFac?.isOther && !selectedUni?.isOther && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('auth.program', 'Program')}</label>
          <select
            className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
            value={programId || ''}
            onChange={(e) => {
              onChange({
                universityId,
                facultyId,
                departmentId,
                programId: e.target.value || null,
                otherUniversityName,
                otherFacultyName,
                otherDepartmentName,
                otherProgramName: ''
              });
            }}
            disabled={loadingPrograms}
          >
            <option value="">{t('auth.selectProgram', 'Select Program...')}</option>
            {programs.map(p => (
              <option key={p.id} value={p.id}>{lang === 'en' ? p.nameEn : p.nameAr}</option>
            ))}
          </select>
          {selectedProg?.isOther && (
            <input
              type="text"
              className="mt-2 w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
              placeholder={t('auth.enterProgramName', 'Enter Program Name')}
              value={otherProgramName || ''}
              onChange={(e) => onChange({
                universityId, facultyId, departmentId, programId,
                otherUniversityName, otherFacultyName, otherDepartmentName,
                otherProgramName: e.target.value
              })}
            />
          )}
        </div>
      )}

      {/* Free Text cascade for "Other" university/faculty/etc. */}
      {selectedUni?.isOther && (
        <>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('auth.facultyName', 'Faculty Name')}</label>
            <input
              type="text"
              className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
              placeholder={t('auth.optionalFacultyName', 'Enter Faculty Name (Optional)')}
              value={otherFacultyName || ''}
              onChange={(e) => onChange({
                universityId, facultyId, departmentId, programId,
                otherUniversityName,
                otherFacultyName: e.target.value,
                otherDepartmentName, otherProgramName
              })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('auth.departmentName', 'Department Name')}</label>
            <input
              type="text"
              className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
              placeholder={t('auth.optionalDepartmentName', 'Enter Department Name (Optional)')}
              value={otherDepartmentName || ''}
              onChange={(e) => onChange({
                universityId, facultyId, departmentId, programId,
                otherUniversityName, otherFacultyName,
                otherDepartmentName: e.target.value,
                otherProgramName
              })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('auth.programName', 'Program Name')}</label>
            <input
              type="text"
              className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
              placeholder={t('auth.optionalProgramName', 'Enter Program Name (Optional)')}
              value={otherProgramName || ''}
              onChange={(e) => onChange({
                universityId, facultyId, departmentId, programId,
                otherUniversityName, otherFacultyName, otherDepartmentName,
                otherProgramName: e.target.value
              })}
            />
          </div>
        </>
      )}
      
      {/* Free Text cascade for "Other" faculty under normal university */}
      {!selectedUni?.isOther && selectedFac?.isOther && (
        <>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('auth.departmentName', 'Department Name')}</label>
            <input
              type="text"
              className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
              placeholder={t('auth.optionalDepartmentName', 'Enter Department Name (Optional)')}
              value={otherDepartmentName || ''}
              onChange={(e) => onChange({
                universityId, facultyId, departmentId, programId,
                otherUniversityName, otherFacultyName,
                otherDepartmentName: e.target.value,
                otherProgramName
              })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('auth.programName', 'Program Name')}</label>
            <input
              type="text"
              className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
              placeholder={t('auth.optionalProgramName', 'Enter Program Name (Optional)')}
              value={otherProgramName || ''}
              onChange={(e) => onChange({
                universityId, facultyId, departmentId, programId,
                otherUniversityName, otherFacultyName, otherDepartmentName,
                otherProgramName: e.target.value
              })}
            />
          </div>
        </>
      )}
      
      {/* Free Text cascade for "Other" department under normal faculty */}
      {!selectedUni?.isOther && !selectedFac?.isOther && selectedDep?.isOther && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('auth.programName', 'Program Name')}</label>
          <input
            type="text"
            className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
            placeholder={t('auth.optionalProgramName', 'Enter Program Name (Optional)')}
            value={otherProgramName || ''}
            onChange={(e) => onChange({
              universityId, facultyId, departmentId, programId,
              otherUniversityName, otherFacultyName, otherDepartmentName,
              otherProgramName: e.target.value
            })}
          />
        </div>
      )}
    </div>
  );
}
