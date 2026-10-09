import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Modal } from './Modal';
import { AcademicDropdowns } from './AcademicDropdowns';
import { api } from '../lib/api';
import {
  HighSchoolSystem,
  StudyMode,
  StudyLanguage,
  HighSchoolGrade,
  TraditionalBranch,
  BaccalaureatePath,
  EducationLevel
} from '../lib/types';

export function HelpVideoTargetingModal({ 
  isOpen, 
  onClose, 
  video 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  video: any; 
}) {
  const queryClient = useQueryClient();
  
  const [audienceType, setAudienceType] = useState<EducationLevel | undefined>(video.audienceType || 'HIGH_SCHOOL');
  const [targetHighSchoolSystem, setTargetHighSchoolSystem] = useState<HighSchoolSystem | ''>('');
  const [targetStudyMode, setTargetStudyMode] = useState<StudyMode | ''>('');
  const [targetStudyLanguage, setTargetStudyLanguage] = useState<StudyLanguage | ''>('');
  const [targetHighSchoolGrade, setTargetHighSchoolGrade] = useState<HighSchoolGrade | ''>('');
  const [targetTraditionalBranch, setTargetTraditionalBranch] = useState<TraditionalBranch | ''>('');
  const [targetBaccalaureatePath, setTargetBaccalaureatePath] = useState<BaccalaureatePath | ''>('');
  
  const [uniTargetGroups, setUniTargetGroups] = useState<{
    targetUniversityId: string | null;
    targetFacultyId: string | null;
    targetDepartmentId: string | null;
    targetProgramId: string | null;
  }[]>([]);

  useEffect(() => {
    if (isOpen) {
      if (video.targetGroups && video.targetGroups.length > 0) {
        const isHighSchool = !!video.targetGroups.find((g: any) => g.targetHighSchoolSystem || g.targetHighSchoolGrade);
        setAudienceType(isHighSchool ? 'HIGH_SCHOOL' : 'UNIVERSITY');
        
        if (isHighSchool) {
          const g = video.targetGroups[0];
          setTargetHighSchoolSystem(g.targetHighSchoolSystem || '');
          setTargetStudyMode(g.targetStudyMode || '');
          setTargetStudyLanguage(g.targetStudyLanguage || '');
          setTargetHighSchoolGrade(g.targetHighSchoolGrade || '');
          setTargetTraditionalBranch(g.targetTraditionalBranch || '');
          setTargetBaccalaureatePath(g.targetBaccalaureatePath || '');
        } else {
          setUniTargetGroups(video.targetGroups.map((g: any) => ({
            targetUniversityId: g.targetUniversityId || null,
            targetFacultyId: g.targetFacultyId || null,
            targetDepartmentId: g.targetDepartmentId || null,
            targetProgramId: g.targetProgramId || null,
          })));
        }
      } else {
        setAudienceType('HIGH_SCHOOL');
        setTargetHighSchoolSystem('');
        setTargetStudyMode('');
        setTargetStudyLanguage('');
        setTargetHighSchoolGrade('');
        setTargetTraditionalBranch('');
        setTargetBaccalaureatePath('');
        setUniTargetGroups([{
          targetUniversityId: null,
          targetFacultyId: null,
          targetDepartmentId: null,
          targetProgramId: null,
        }]);
      }
    }
  }, [isOpen, video]);

  const updateMutation = useMutation({
    mutationFn: async () => {
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

      let targetGroups: any[] = [];
      if (isHighSchool) {
        targetGroups = [{
          targetHighSchoolSystem: targetHighSchoolSystem || null,
          targetStudyMode: targetStudyMode || null,
          targetStudyLanguage: targetStudyLanguage || null,
          targetHighSchoolGrade: targetHighSchoolGrade || null,
          targetTraditionalBranch: branch || null,
          targetBaccalaureatePath: path || null,
        }];
      } else {
        targetGroups = uniTargetGroups;
      }

      return api.patch(`/tutorials/${video.id}`, {
        targetGroups
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tutorials'] });
      toast.success('Targeting updated successfully');
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update targeting');
    }
  });

  return (
    <Modal open={isOpen} onClose={onClose} title="Edit Video Targeting & Segmentation">
      <div className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
        <p className="text-sm text-theme-muted mb-4">
          Configure the exact student segment that should see this video. Leave a field blank to target all students within that dimension.
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
                setUniTargetGroups([{
                  targetUniversityId: null,
                  targetFacultyId: null,
                  targetDepartmentId: null,
                  targetProgramId: null
                }]);
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
          <div className="space-y-4">
            {uniTargetGroups.map((group, index) => (
              <div key={index} className="bg-theme-bg/50 p-4 rounded-xl border border-theme-border relative">
                {uniTargetGroups.length > 1 && (
                  <button 
                    type="button" 
                    className="absolute top-2 right-2 p-1 text-theme-muted hover:text-red-500 rounded-md hover:bg-theme-bg/50 transition-colors"
                    onClick={() => {
                      const newGroups = [...uniTargetGroups];
                      newGroups.splice(index, 1);
                      setUniTargetGroups(newGroups);
                    }}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
                <div className="mb-4 font-semibold text-sm text-theme-text flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-theme-primary/10 text-theme-primary flex items-center justify-center text-xs">
                    {index + 1}
                  </div>
                  Target Group
                </div>
                <AcademicDropdowns
                  excludeOther={true}
                  forceShowAll={true}
                  isTargetingMode={true}
                  universityId={group.targetUniversityId}
                  facultyId={group.targetFacultyId}
                  departmentId={group.targetDepartmentId}
                  programId={group.targetProgramId}
                  onChange={(data) => {
                    const newGroups = [...uniTargetGroups];
                    newGroups[index] = {
                      targetUniversityId: data.universityId || null,
                      targetFacultyId: data.facultyId || null,
                      targetDepartmentId: data.departmentId || null,
                      targetProgramId: data.programId || null,
                    };
                    setUniTargetGroups(newGroups);
                  }}
                />
              </div>
            ))}
            <button 
              type="button"
              className="btn-secondary w-full"
              onClick={() => {
                setUniTargetGroups([...uniTargetGroups, {
                  targetUniversityId: null,
                  targetFacultyId: null,
                  targetDepartmentId: null,
                  targetProgramId: null
                }]);
              }}
            >
              + Add Another Target Group
            </button>
          </div>
        )}

        <div className="pt-4 border-t border-theme-border flex justify-end gap-3">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button 
            className="btn-primary" 
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Targets'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
