import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from './Modal';
import { AcademicDropdowns } from './AcademicDropdowns';
import { api } from '../lib/api';
import type { Course } from '../lib/types';
import {
  HighSchoolSystem,
  StudyMode,
  StudyLanguage,
  HighSchoolGrade,
  TraditionalBranch,
  BaccalaureatePath,
  EducationLevel
} from '../lib/types';

export function CourseTargetingModal({ 
  isOpen, 
  onClose, 
  course 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  course: Course; 
}) {
  const queryClient = useQueryClient();
  
  const [audienceType, setAudienceType] = useState<EducationLevel>(course.audienceType);
  const [targetHighSchoolSystem, setTargetHighSchoolSystem] = useState<HighSchoolSystem | ''>('');
  const [targetStudyMode, setTargetStudyMode] = useState<StudyMode | ''>('');
  const [targetStudyLanguage, setTargetStudyLanguage] = useState<StudyLanguage | ''>('');
  const [targetHighSchoolGrade, setTargetHighSchoolGrade] = useState<HighSchoolGrade | ''>('');
  const [targetTraditionalBranch, setTargetTraditionalBranch] = useState<TraditionalBranch | ''>('');
  const [targetBaccalaureatePath, setTargetBaccalaureatePath] = useState<BaccalaureatePath | ''>('');
  const [targetUniversityId, setTargetUniversityId] = useState<string | null>(null);
  const [targetFacultyId, setTargetFacultyId] = useState<string | null>(null);
  const [targetDepartmentId, setTargetDepartmentId] = useState<string | null>(null);
  const [targetProgramId, setTargetProgramId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTargetHighSchoolSystem(course.targetHighSchoolSystem || '');
      setTargetStudyMode(course.targetStudyMode || '');
      setTargetStudyLanguage(course.targetStudyLanguage || '');
      setTargetHighSchoolGrade(course.targetHighSchoolGrade || '');
      setTargetTraditionalBranch(course.targetTraditionalBranch || '');
      setTargetBaccalaureatePath(course.targetBaccalaureatePath || '');
      setTargetUniversityId(course.targetUniversityId || null);
      setTargetFacultyId(course.targetFacultyId || null);
      setTargetDepartmentId(course.targetDepartmentId || null);
      setTargetProgramId(course.targetProgramId || null);
      setAudienceType(course.audienceType);
    }
  }, [isOpen, course]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      // Cleanup stale data
      let branch = targetTraditionalBranch;
      let path = targetBaccalaureatePath;
      if (targetHighSchoolSystem === 'TRADITIONAL') {
        path = '';
        if (targetHighSchoolGrade === 'GRADE_1') branch = '';
      } else if (targetHighSchoolSystem === 'BACCALAUREATE') {
        branch = '';
        if (targetHighSchoolGrade === 'GRADE_1') path = '';
      }

      const isHighSchool = audienceType === 'HIGH_SCHOOL';

      return api.put(`/courses/${course.id}`, {
        title: course.title,
        description: course.description,
        audienceType: audienceType,
        targetHighSchoolSystem: isHighSchool ? (targetHighSchoolSystem || null) : null,
        targetStudyMode: isHighSchool ? (targetStudyMode || null) : null,
        targetStudyLanguage: isHighSchool ? (targetStudyLanguage || null) : null,
        targetHighSchoolGrade: isHighSchool ? (targetHighSchoolGrade || null) : null,
        targetTraditionalBranch: isHighSchool ? (branch || null) : null,
        targetBaccalaureatePath: isHighSchool ? (path || null) : null,
        targetUniversityId: !isHighSchool ? (targetUniversityId || null) : null,
        targetFacultyId: !isHighSchool ? (targetFacultyId || null) : null,
        targetDepartmentId: !isHighSchool ? (targetDepartmentId || null) : null,
        targetProgramId: !isHighSchool ? (targetProgramId || null) : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course', course.id] });
      onClose();
    }
  });

  return (
    <Modal open={isOpen} onClose={onClose} title="Edit Course Targeting & Segmentation">
      <div className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
        <p className="text-sm text-theme-muted mb-4">
          Configure the exact student segment that should see this course. Leave a field blank to target all students within that dimension.
        </p>

        <div>
          <label className="label">Education Level</label>
          <select 
            className="input" 
            value={audienceType} 
            onChange={(e) => {
              const newType = e.target.value as EducationLevel;
              setAudienceType(newType);
              if (newType === 'HIGH_SCHOOL') {
                setTargetUniversityId(null);
                setTargetFacultyId(null);
                setTargetDepartmentId(null);
                setTargetProgramId(null);
              } else {
                setTargetHighSchoolSystem('');
                setTargetStudyMode('');
                setTargetStudyLanguage('');
                setTargetHighSchoolGrade('');
                setTargetTraditionalBranch('');
                setTargetBaccalaureatePath('');
              }
            }}
          >
            <option value="HIGH_SCHOOL">High School</option>
            <option value="UNIVERSITY">University</option>
          </select>
        </div>

        {audienceType === 'HIGH_SCHOOL' ? (
          <>
            <div>
              <label className="label">School System</label>
              <select className="input" value={targetHighSchoolSystem} onChange={(e) => setTargetHighSchoolSystem(e.target.value as HighSchoolSystem)}>
                <option value="">Any System</option>
                <option value="TRADITIONAL">Traditional Secondary</option>
                <option value="BACCALAUREATE">Egyptian Baccalaureate</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Study Mode</label>
                <select className="input" value={targetStudyMode} onChange={(e) => setTargetStudyMode(e.target.value as StudyMode)}>
                  <option value="">Any Mode</option>
                  <option value="ONLINE">Online</option>
                  <option value="CENTER">Center</option>
                </select>
              </div>
              <div>
                <label className="label">Study Language</label>
                <select className="input" value={targetStudyLanguage} onChange={(e) => setTargetStudyLanguage(e.target.value as StudyLanguage)}>
                  <option value="">Any Language</option>
                  <option value="ARABIC">Arabic</option>
                  <option value="ENGLISH">English</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label">Grade</label>
              <select className="input" value={targetHighSchoolGrade} onChange={(e) => setTargetHighSchoolGrade(e.target.value as HighSchoolGrade)}>
                <option value="">Any Grade</option>
                <option value="GRADE_1">Grade 1</option>
                <option value="GRADE_2">Grade 2</option>
                <option value="GRADE_3">Grade 3</option>
              </select>
            </div>

            {targetHighSchoolSystem === 'TRADITIONAL' && (targetHighSchoolGrade === 'GRADE_2' || targetHighSchoolGrade === 'GRADE_3') && (
              <div>
                <label className="label">Branch</label>
                <select className="input" value={targetTraditionalBranch} onChange={(e) => setTargetTraditionalBranch(e.target.value as TraditionalBranch)}>
                  <option value="">Any Branch</option>
                  {targetHighSchoolGrade === 'GRADE_2' && (
                    <>
                      <option value="SCIENCE">Science</option>
                      <option value="LITERARY">Literary</option>
                    </>
                  )}
                  {targetHighSchoolGrade === 'GRADE_3' && (
                    <>
                      <option value="SCIENCE_BIOLOGY">Science Biology</option>
                      <option value="SCIENCE_MATH">Science Math</option>
                      <option value="LITERARY">Literary</option>
                    </>
                  )}
                </select>
              </div>
            )}

            {targetHighSchoolSystem === 'BACCALAUREATE' && (targetHighSchoolGrade === 'GRADE_2' || targetHighSchoolGrade === 'GRADE_3') && (
              <div>
                <label className="label">Path</label>
                <select className="input" value={targetBaccalaureatePath} onChange={(e) => setTargetBaccalaureatePath(e.target.value as BaccalaureatePath)}>
                  <option value="">Any Path</option>
                  <option value="MEDICINE_AND_LIFE_SCIENCES">Medicine & Life Sciences</option>
                  <option value="ENGINEERING_AND_COMPUTER_SCIENCE">Engineering & Computer Science</option>
                  <option value="BUSINESS">Business</option>
                  <option value="ARTS_AND_HUMANITIES">Arts & Humanities</option>
                </select>
              </div>
            )}
          </>
        ) : (
          <div className="bg-theme-bg/50 p-4 rounded-xl border border-theme-border">
            <AcademicDropdowns
              excludeOther={true}
              forceShowAll={true}
              universityId={targetUniversityId}
              facultyId={targetFacultyId}
              departmentId={targetDepartmentId}
              programId={targetProgramId}
              onChange={(data) => {
                setTargetUniversityId(data.universityId);
                setTargetFacultyId(data.facultyId);
                setTargetDepartmentId(data.departmentId);
                setTargetProgramId(data.programId);
              }}
            />
          </div>
        )}
      </div>
      
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-theme-border">
        <button className="btn-ghost" onClick={onClose} disabled={updateMutation.isPending}>Cancel</button>
        <button 
          className="btn-primary"
          onClick={() => updateMutation.mutate()}
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? 'Saving...' : 'Save Targeting Rules'}
        </button>
      </div>
    </Modal>
  );
}
