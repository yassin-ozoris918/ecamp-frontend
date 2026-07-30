import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Plus,
  BookOpen,
  FileQuestion,
  Trash2,
  Sparkles,
  Upload,
  Check,
  ChevronDown,
  ChevronRight,
  Users,
  GraduationCap,
  Pencil,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/authContext';
import { Link } from '../lib/router';
import type { Course, BuilderChapter, BuilderLecture, BuilderItem, CourseInstructor, UserListItem, ExamQuestion, ExamAnswer, GeneratedQuestion } from '../lib/types';
import { Badge, EmptyState, Skeleton } from './ui';
import { Modal } from './Modal';
import { AIQuizModal } from './InstructorDashboard';
import { QuizBuilderModal } from './QuizBuilderModal';
import { AttachmentsModal } from './AttachmentsModal';
import { LectureSequenceBuilder } from './LectureSequenceBuilder';
import { LectureFilesSection } from './LectureFilesSection';
import { AIQuestionReviewStudio } from './AIQuestionReviewStudio';

export function CourseSettingsPanel({ courseId }: { courseId: string }) {
  const queryClient = useQueryClient();
  const [selectedInstructorId, setSelectedInstructorId] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const { data: globalInstructors = [] } = useQuery({
    queryKey: ['global', 'instructors'],
    queryFn: async () => {
      const res = await api.get('/admin/users?role=INSTRUCTOR');
      return res.data.items || res.data;
    }
  });

  const { data: courseDetails } = useQuery({
    queryKey: ['course', courseId],
    queryFn: async () => {
      const res = await api.get(`/courses/${courseId}`);
      return res.data;
    }
  });

  const assignMutation = useMutation({
    mutationFn: async (instructorId: string) => {
      return api.post(`/courses/${courseId}/instructors`, { instructorId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course', courseId] });
      setSelectedInstructorId('');
      setFeedback('Instructor successfully added to the database team!');
    },
    onError: (err: unknown) => {
      setFeedback((err as any)?.response?.data?.message || 'Failed to assign instructor.');
    }
  });

  const removeMutation = useMutation({
    mutationFn: async (targetInstructorId: string) => {
      return api.delete(`/courses/${courseId}/instructors/${targetInstructorId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course', courseId] });
      setFeedback('Instructor successfully removed.');
    },
    onError: (err: unknown) => {
      setFeedback((err as any)?.response?.data?.message || 'Failed to remove instructor.');
    }
  });

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 text-theme-text space-y-6">
      <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-cyan-400" />
          <div>
            <h3 className="text-md font-bold">Target Academic Audience</h3>
            <p className="text-xs text-theme-muted">Determines catalog visibility for high school vs university students.</p>
          </div>
        </div>
        <span className="rounded-full bg-cyan-500/10 border border-cyan-400/20 px-3 py-1 text-xs font-bold text-cyan-400 uppercase tracking-wider">
          {courseDetails?.audienceType === 'HIGH_SCHOOL' ? '🏫 High School Tier' : '🎓 University Tier'}
        </span>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-cyan-400" />
          <h3 className="text-md font-bold">Assigned Teaching Team</h3>
        </div>

        {feedback && (
          <div className="rounded-xl bg-cyan-500/10 border border-cyan-500/20 p-3 text-xs text-cyan-300">{feedback}</div>
        )}

        <div className="space-y-2">
          {courseDetails?.instructors?.map((item: CourseInstructor) => (
            <div key={item.instructor.id} className="flex items-center justify-between rounded-xl bg-neutral-950 p-3 text-xs border border-neutral-800">
              <div className="flex flex-col">
                <span className="font-semibold text-theme-muted">{item.instructor.email}</span>
                <span className="text-[10px] text-theme-muted font-mono">ID: {item.instructor.id.slice(0,8)}...</span>
              </div>
              <button 
                onClick={() => removeMutation.mutate(item.instructor.id)}
                disabled={removeMutation.isPending}
                className="p-1 rounded text-theme-muted hover:text-error-400 hover:bg-error-500/10 transition-colors disabled:opacity-50"
                title="Remove Instructor"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); if(selectedInstructorId) assignMutation.mutate(selectedInstructorId); }} className="flex gap-2 pt-2 border-t border-neutral-800/60">
          <select value={selectedInstructorId} onChange={(e) => setSelectedInstructorId(e.target.value)} className="flex-1 rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-xs outline-none text-theme-muted focus:border-cyan-500">
            <option value="">Select Instructor to Add...</option>
            {globalInstructors.map((ins: UserListItem) => (
              <option key={ins.id} value={ins.id}>{ins.fullName} ({ins.email})</option>
            ))}
          </select>
          <button type="submit" disabled={!selectedInstructorId || assignMutation.isPending} className="rounded-xl bg-cyan-500 px-4 py-3 text-xs font-bold text-black hover:bg-cyan-400 transition disabled:opacity-40">
            Add Teacher
          </button>
        </form>
      </div>
    </div>
  );
}

export interface Exam {
  id: string;
  title: string;
  description: string;
  timeLimit: number | null;
  maxAttempts: number;
  passGrade: number;
  isPublished: boolean;
  chapterId?: string;
  _count?: { attempts: number };
  questions?: ExamQuestion[];
}

export function CourseBuilder({ courseId }: { courseId: string }) {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [chapters, setChapters] = useState<BuilderChapter[]>([]);
  const [unassignedLectures, setUnassignedLectures] = useState<BuilderLecture[]>([]);
  const [items, setItems] = useState<Record<string, BuilderItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [expandedLecs, setExpandedLecs] = useState<Set<string>>(new Set());
  const [createChapOpen, setCreateChapOpen] = useState(false);
  const [createLecOpen, setCreateLecOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);

  const [exams, setExams] = useState<Exam[]>([]);
  const [createExamOpen, setCreateExamOpen] = useState(false);
  const [createChapterExamId, setCreateChapterExamId] = useState<string | null>(null);
  const [addQuestionTargetId, setAddQuestionTargetId] = useState<string | null>(null);
  const [addQuestionTargetType, setAddQuestionTargetType] = useState<'EXAM' | 'QUIZ' | null>(null);
  const [aiStudioExamId, setAiStudioExamId] = useState<string | null>(null);
  const [aiStudioQuestions, setAiStudioQuestions] = useState<GeneratedQuestion[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeAiExamId, setActiveAiExamId] = useState<string | null>(null);
  const [isAiExtracting, setIsAiExtracting] = useState(false);
  
  // Attachments state
  const [attachmentsModalOpen, setAttachmentsModalOpen] = useState(false);
  const [attachmentsTargetId, setAttachmentsTargetId] = useState<string>('');
  const [attachmentsTargetType, setAttachmentsTargetType] = useState<'COURSE' | 'CHAPTER'>('COURSE');
  const [attachmentsTitle, setAttachmentsTitle] = useState<string>('');
  
  const [issueCertOpen, setIssueCertOpen] = useState(false);

  const [aiModalLecInfo, setAiModalLecInfo] = useState<{
    lectureId: string;
    title?: string;
    description?: string;
    passGrade?: number;
    timeLimit?: number;
  } | null>(null);

  const examsByChapter = useMemo(() => {
    const map: Record<string, Exam[]> = {};
    for (const exam of exams) {
      if (exam.chapterId) {
        (map[exam.chapterId] ??= []).push(exam);
      }
    }
    return map;
  }, [exams]);

  const finalExams = useMemo(() => exams.filter(e => !e.chapterId), [exams]);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);

    try {
      const [builderRes, examsRes] = await Promise.all([
        api.get(`/courses/${courseId}/builder`),
        api.get(`/exams/course/${courseId}`)
      ]);

      setCourse(builderRes.data.course);
      setChapters(builderRes.data.chapters || []);
      setUnassignedLectures(builderRes.data.unassignedLectures || []);

      const itemsMap: Record<string, BuilderItem[]> = {};
      const allLectures: BuilderLecture[] = [
        ...(builderRes.data.unassignedLectures || []),
        ...(builderRes.data.chapters || []).flatMap((c: BuilderChapter) => c.lectures || []),
      ];
      allLectures.forEach((lec: BuilderLecture) => {
        itemsMap[lec.id] = lec.items;
      });
      setItems(itemsMap);

      setExams(examsRes.data);
    } catch (e) {
      console.error(e);
    }

    setLoading(false);
  }, [profile, courseId]);

  useEffect(() => { load(); }, [load]);

  const handleAiFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeAiExamId) return;

    const formData = new FormData();
    formData.append('file', file);

    setIsAiExtracting(true);
    try {
      const { data } = await api.post(`/admin/exams/${activeAiExamId}/extract`, formData);
      setAiStudioQuestions(data.questions);
      setAiStudioExamId(activeAiExamId);
    } catch (err: unknown) {
      alert((err as any)?.response?.data?.message || 'Extraction failed. Ensure you uploaded a valid PDF or Word document.');
    } finally {
      setIsAiExtracting(false);
      setActiveAiExamId(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };



  function toggleLec(id: string) {
    setExpandedLecs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <Link to="/instructor" className="inline-flex items-center gap-1.5 text-sm text-theme-muted hover:text-theme-text">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      {loading ? (
        <Skeleton className="h-32" />
      ) : !course ? (
        <EmptyState title="Course not found" description="You may not have access to this course." />
      ) : (
        <>
          {/* Course header */}
          <div className="glass rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1">
                <Badge variant={course.status === 'PUBLISHED' ? 'success' : 'warning'}>{course.status}</Badge>
                {isEditingTitle ? (
                  <div className="mt-2 space-y-2">
                    <input className="input text-xl font-display font-bold bg-theme-card border-theme-border text-theme-text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                    <textarea className="input text-sm text-theme-muted min-h-[80px]" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
                    <div className="flex gap-2">
                      <button onClick={async () => {
                        try {
                          await api.put(`/courses/${course.id}`, { title: editTitle, description: editDesc, audienceType: course.audienceType });
                          setCourse({ ...course, title: editTitle, description: editDesc });
                          setIsEditingTitle(false);
                        } catch(e) { console.error(e); alert('Failed to update course'); }
                      }} className="btn-primary py-1 px-3 text-xs">Save Changes</button>
                      <button onClick={() => setIsEditingTitle(false)} className="btn-ghost py-1 px-3 text-xs">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="group relative">
                    <h1 className="text-2xl sm:text-3xl font-display font-bold text-theme-text mt-2 flex items-center gap-2">
                      {course.title}
                      <button onClick={() => { setEditTitle(course.title); setEditDesc(course.description || ''); setIsEditingTitle(true); }} className="opacity-0 group-hover:opacity-100 p-1 text-theme-muted hover:text-white transition">
                        <Pencil className="w-4 h-4" />
                      </button>
                    </h1>
                    <p className="text-sm text-theme-muted mt-2">{course.description}</p>
                  </div>
                )}
                {course.validity_days && (
                  <p className="text-xs text-theme-muted mt-2">{course.validity_days}-day access window per student</p>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                {course.status === 'PUBLISHED' ? (
                  <button
                    onClick={async () => {
                      try {
                        await api.patch(`/courses/${course.id}/unpublish`);
                        setCourse({ ...course, status: 'DRAFT' });
                        alert('Course is now unpublished and returned to Draft status.');
                      } catch(e) {
                        console.error(e);
                      }
                    }}
                    className="btn-ghost border border-theme-border"
                  >
                    Unpublish to Draft
                  </button>
                ) : (
                  <button
                    onClick={async () => {
                      try {
                        await api.patch(`/courses/${course.id}/publish`);
                        setCourse({ ...course, status: 'PUBLISHED' });
                        alert('Course is active and published!');
                      } catch(e) {
                        console.error(e);
                      }
                    }}
                    className="btn-secondary"
                  >
                    Publish Course
                  </button>
                )}
              </div>
            </div>
          </div>

          <CourseSettingsPanel courseId={course.id} />

          {/* Global Course Settings */}
          <div className="glass rounded-2xl p-6">
            <h2 className="text-xl font-display font-bold text-theme-text mb-4">Global Content</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="label">Introductory Video URL</label>
                <div className="flex gap-2">
                  <input className="input" placeholder="e.g. https://youtube.com/..." defaultValue={course.introductoryVideoUrl || ''} id="introVideoUrl" />
                  <button onClick={async () => {
                    const val = (document.getElementById('introVideoUrl') as HTMLInputElement).value;
                    await api.post(`/courses/${course.id}/intro`, { url: val });
                    alert('Saved');
                  }} className="btn-secondary whitespace-nowrap">Save URL</button>
                </div>
              </div>
              <div>
                <label className="label">Course Attachments</label>
                <button 
                  onClick={() => {
                    setAttachmentsTargetType('COURSE');
                    setAttachmentsTargetId(course.id);
                    setAttachmentsTitle('Course Attachments');
                    setAttachmentsModalOpen(true);
                  }} 
                  className="btn-secondary w-full"
                >
                  <Upload className="w-4 h-4" /> Manage Attachments
                </button>
              </div>
              <div>
                <label className="label">Course Thumbnail</label>
                <div className="flex gap-2">
                  <input type="file" accept="image/*" id="thumbnailFile" className="input text-sm p-1.5" />
                  <button onClick={async () => {
                    const input = document.getElementById('thumbnailFile') as HTMLInputElement;
                    if (!input.files?.[0]) return alert('Please select an image file first');
                    const formData = new FormData();
                    formData.append('file', input.files[0]);
                    try {
                      const res = await api.post(`/courses/${course.id}/thumbnail`, formData);
                      setCourse({ ...course, thumbnailUrl: res.data.url });
                      alert('Thumbnail uploaded successfully');
                    } catch(e) { console.error(e); alert('Failed to upload thumbnail'); }
                  }} className="btn-secondary whitespace-nowrap">Upload</button>
                </div>
                {course.thumbnailUrl && <a href={course.thumbnailUrl} target="_blank" rel="noreferrer" className="text-xs text-accent-400 hover:underline mt-2 inline-block">View Current Thumbnail</a>}
              </div>
            </div>
          </div>

          {/* Chapters & Lectures */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display font-bold text-theme-text">Course Curriculum</h2>
            <div className="flex items-center gap-2">
              <button onClick={() => setCreateChapOpen(true)} className="btn-primary">
                <Plus className="w-4 h-4" /> Add Chapter
              </button>
            </div>
          </div>

          {(chapters.length === 0 && unassignedLectures.length === 0) ? (
            <EmptyState
              icon={<BookOpen className="w-8 h-8" />}
              title="Curriculum is empty"
              description="Start by adding chapters and lectures to your course."
              action={
                <div className="flex items-center gap-2">
                  <button onClick={() => setCreateChapOpen(true)} className="btn-primary"><Plus className="w-4 h-4" /> Add Chapter</button>
                </div>
              }
            />
          ) : (
            <div className="space-y-4">
              {/* Render Chapters */}
              {chapters.map((chapter: BuilderChapter, cIdx: number) => {
                const expandedChap = expandedChapters.has(chapter.id);
                return (
                  <div key={chapter.id} className="border border-white/[0.04] bg-white/[0.01] rounded-2xl overflow-hidden">
                    <button
                      onClick={() => {
                        setExpandedChapters((prev) => {
                          const next = new Set(prev);
                          if (next.has(chapter.id)) next.delete(chapter.id);
                          else next.add(chapter.id);
                          return next;
                        });
                      }}
                      className="w-full p-4 flex items-center gap-3 hover:bg-theme-card transition-colors"
                    >
                      {expandedChap ? <ChevronDown className="w-4 h-4 text-theme-muted" /> : <ChevronRight className="w-4 h-4 text-theme-muted" />}
                      <div className="font-display font-bold text-accent-400 text-lg">
                        Chapter {cIdx + 1}
                      </div>
                      <div className="flex-1 text-start min-w-0">
                        <p className="font-bold text-theme-text truncate">{chapter.title}</p>
                        <p className="text-xs text-theme-muted">{chapter.lectures.length} lectures</p>
                      </div>
                      <span
                        role="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!confirm('Delete this chapter and all its content?')) return;
                          try {
                            await api.delete(`/chapters/${chapter.id}`);
                            queryClient.invalidateQueries({ queryKey: ['courseBuilder', courseId] });
                            load();
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                        className="p-2 rounded-lg text-theme-muted hover:text-rose-700 dark:text-rose-300 hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </span>
                    </button>

                    {expandedChap && (
                      <div className="p-4 pt-0 space-y-3 bg-white/[0.01] border-t border-white/[0.04]">
                        {chapter.lectures.length === 0 ? (
                          <p className="text-sm text-theme-muted text-center py-4">No lectures in this chapter yet.</p>
                        ) : (
                            <LectureList lectures={chapter.lectures} items={items} expandedLecs={expandedLecs} toggleLec={toggleLec} load={load} setAiModalLecInfo={setAiModalLecInfo} onAddQuestion={(id: string, type: 'EXAM'|'QUIZ') => { setAddQuestionTargetId(id); setAddQuestionTargetType(type); }} />
                        )}
                        
                        {/* Chapter Exams */}
                        {(examsByChapter[chapter.id]?.length ?? 0) > 0 && (
                          <div className="pt-2 border-t border-white/[0.04] mt-4">
                            <h4 className="text-xs font-bold text-theme-muted uppercase tracking-wider mb-3 pl-2">Chapter Milestone Exams</h4>
                            <div className="space-y-3">
                              {examsByChapter[chapter.id]?.map((exam) => (
                                <div key={exam.id} className="glass rounded-xl p-4 hover:border-white/[0.12] transition-colors border border-white/[0.04]">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                                        <FileQuestion className="w-4 h-4" />
                                      </div>
                                      <div className="flex flex-col">
                                          <h4 className="font-semibold text-theme-text">{exam.title}</h4>
                                        <p className="text-xs text-theme-muted">{exam.description || 'No description provided.'}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                       <button 
                                         onClick={async () => {
                                           if (!confirm('Are you sure you want to delete this exam?')) return;
                                           await api.delete(`/exams/${exam.id}`);
                                           load();
                                         }}
                                         className="p-2 hover:bg-error-500/10 rounded-md transition-colors group" title="Delete Exam"
                                       >
                                         <Trash2 className="w-4 h-4 text-theme-muted group-hover:text-error-400" />
                                       </button>
                                    </div>
                                  </div>
                                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-theme-muted border-t border-white/[0.04] pt-3">
                                    <div><span className="text-theme-muted">Pass:</span> {exam.passGrade}%</div>
                                    <div><span className="text-theme-muted">Time:</span> {exam.timeLimit ? `${exam.timeLimit}m` : 'None'}</div>
                                    <div><span className="text-theme-muted">Attempts:</span> {exam.maxAttempts}</div>
                                    <div><span className="text-theme-muted">Qs:</span> {exam.questions?.length || 0}</div>
                                    
                                    <div className="flex-1 text-end space-x-2">
                                      <button 
                                        onClick={() => { setActiveAiExamId(exam.id); fileInputRef.current?.click(); }}
                                        disabled={isAiExtracting && activeAiExamId === exam.id}
                                        className="btn-ghost text-[10px] py-1 px-2 text-emerald-400 hover:text-emerald-300"
                                        title="Extract questions from PDF or Word document"
                                      >
                                        <Sparkles className="w-3 h-3 inline mr-1" />
                                        {isAiExtracting && activeAiExamId === exam.id ? 'Extracting...' : 'AI Extract PDF'}
                                      </button>
                                      <button 
                                        onClick={() => { setAddQuestionTargetId(exam.id); setAddQuestionTargetType('EXAM'); }}
                                        className="btn-ghost text-[10px] py-1 px-2"
                                      >
                                        <Plus className="w-3 h-3 inline mr-0.5" /> Add Q
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <button onClick={() => { setActiveChapterId(chapter.id); setCreateLecOpen(true); }} className="btn-secondary text-xs flex-1 py-2">
                            <Plus className="w-3.5 h-3.5" /> Add Lecture
                          </button>
                          <button 
                            onClick={() => {
                              setCreateChapterExamId(chapter.id);
                              setCreateExamOpen(true);
                            }} 
                            className="btn-secondary text-xs flex-1 py-2"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add Exam
                          </button>
                          <button 
                            onClick={() => {
                              setAttachmentsTargetType('CHAPTER');
                              setAttachmentsTargetId(chapter.id);
                              setAttachmentsTitle(`Chapter ${cIdx + 1} Files`);
                              setAttachmentsModalOpen(true);
                            }} 
                            className="btn-secondary text-xs flex-1 py-2"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add Files
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Render Unassigned Lectures */}
              {unassignedLectures.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-theme-muted tracking-wider uppercase pl-2 pt-4">Unassigned Lectures</h3>
                  <LectureList lectures={unassignedLectures} items={items} expandedLecs={expandedLecs} toggleLec={toggleLec} load={load} setAiModalLecInfo={setAiModalLecInfo} onAddQuestion={(id: string, type: 'EXAM'|'QUIZ') => { setAddQuestionTargetId(id); setAddQuestionTargetType(type); }} />
                </div>
              )}
            </div>
          )}

          {/* Final Exams */}
          <div className="flex items-center justify-between pt-4 pb-2">
            <div>
              <h2 className="text-xl font-display font-bold text-theme-text">Final Exams</h2>
              <p className="text-sm text-theme-muted mt-1">Add comprehensive exams separate from regular lecture quizzes.</p>
            </div>
            <button onClick={() => setCreateExamOpen(true)} className="btn-primary">
              <Plus className="w-4 h-4" /> Add Exam
            </button>
          </div>

          {finalExams.length === 0 ? (
            <div className="glass rounded-2xl p-6 text-center text-sm text-theme-muted">
              No final exams created yet.
            </div>
          ) : (
            <div className="space-y-3">
              {finalExams.map((exam) => (
                <div key={exam.id} className="glass rounded-2xl p-5 hover:border-white/[0.12] transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-accent-500/10 flex items-center justify-center text-accent-700 dark:text-accent-300">
                        <FileQuestion className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-theme-text text-lg">{exam.title}</h3>
                        <p className="text-sm text-theme-muted">{exam.description || 'No description provided.'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                       <button 
                         onClick={async () => {
                           if (!confirm('Are you sure you want to delete this exam?')) return;
                           await api.delete(`/exams/${exam.id}`);
                           load();
                         }}
                         className="p-2 rounded-lg text-theme-muted hover:text-rose-700 dark:text-rose-300 hover:bg-rose-500/10 transition-colors"
                       >
                         <Trash2 className="w-4 h-4" />
                       </button>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-theme-muted border-t border-white/[0.04] pt-4">
                    <div><span className="text-theme-muted">Passing Score:</span> {exam.passGrade}%</div>
                    <div><span className="text-theme-muted">Time Limit:</span> {exam.timeLimit ? `${exam.timeLimit} mins` : 'None'}</div>
                    <div><span className="text-theme-muted">Attempts allowed:</span> {exam.maxAttempts}</div>
                    <div><span className="text-theme-muted">Questions:</span> {exam.questions?.length || 0}</div>
                    
                    <div className="flex-1 text-end space-x-2">
                      <button 
                        onClick={() => { setActiveAiExamId(exam.id); fileInputRef.current?.click(); }}
                        disabled={isAiExtracting && activeAiExamId === exam.id}
                        className="btn-ghost text-xs text-emerald-400 hover:text-emerald-300"
                        title="Extract questions from PDF or Word document"
                      >
                        <Sparkles className="w-3.5 h-3.5 inline mr-1" />
                        {isAiExtracting && activeAiExamId === exam.id ? 'Extracting...' : 'AI Extract PDF'}
                      </button>
                      <button 
                        onClick={() => { setAddQuestionTargetId(exam.id); setAddQuestionTargetType('EXAM'); }}
                        className="btn-ghost text-xs"
                      >
                        <Plus className="w-3.5 h-3.5 inline mr-0.5" /> Add Question
                      </button>
                    </div>
                  </div>
                  {exam.questions && exam.questions.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/[0.04] space-y-2">
                      <p className="text-xs font-bold text-theme-muted uppercase tracking-wider mb-2">Questions ({exam.questions.length})</p>
                      {(exam.questions as ExamQuestion[])?.map((q: ExamQuestion, i: number) => (
                        <div key={q.id} className="text-sm bg-white/[0.02] p-3 rounded-lg flex items-start gap-3 text-theme-muted">
                          <span className="text-accent-700 dark:text-accent-300 font-bold mt-0.5">Q{i+1}.</span>
                          <div className="flex-1">
                            <p>{q.text}</p>
                            {q.type === 'MCQ' || q.type === 'TRUE_FALSE' ? (
                              <div className="mt-2 space-y-1">
                                {(q.answers as ExamAnswer[])?.map((a: ExamAnswer) => (
                                  <div key={a.id} className={`text-xs flex items-center gap-2 ${a.isCorrect ? 'text-success-300' : 'text-theme-muted'}`}>
                                    {a.isCorrect ? <Check className="w-3 h-3" /> : <span className="w-3 h-3" />}
                                    {a.text}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="mt-1 text-xs text-theme-muted italic">[{q.type === 'ESSAY' ? 'Essay' : 'Short Answer'}]</p>
                            )}
                          </div>
                          <Badge variant="default">{q.points} pts</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Certificates section hidden — feature deferred for future release */}
        </>
      )}

      <CreateChapterModal
        open={createChapOpen}
        courseId={courseId}
        sortOrder={chapters.length}
        onClose={() => setCreateChapOpen(false)}
        onCreated={() => { setCreateChapOpen(false); load(); }}
      />

      <CreateLectureModal
        open={createLecOpen}
        courseId={courseId}
        chapterId={activeChapterId}
        sortOrder={unassignedLectures.length}
        onClose={() => { setCreateLecOpen(false); setActiveChapterId(null); }}
        onCreated={() => { setCreateLecOpen(false); setActiveChapterId(null); load(); }}
      />

      <CreateExamModal
        open={createExamOpen}
        courseId={courseId}
        chapterId={createChapterExamId || undefined}
        onClose={() => { setCreateExamOpen(false); setCreateChapterExamId(null); }}
        onCreated={() => { setCreateExamOpen(false); setCreateChapterExamId(null); load(); }}
        onAIGenerate={(examId) => {
          setCreateExamOpen(false);
          setCreateChapterExamId(null);
          setActiveAiExamId(examId);
          fileInputRef.current?.click();
        }}
      />

      {addQuestionTargetId && (
        <QuizBuilderModal
          isOpen={true}
          onClose={() => { setAddQuestionTargetId(null); setAddQuestionTargetType(null); }}
          targetId={addQuestionTargetId as string}
          type={addQuestionTargetType || 'EXAM'}
          onCreated={() => { setAddQuestionTargetId(null); setAddQuestionTargetType(null); load(); }}
        />
      )}

      <IssueCertificateModal
        open={issueCertOpen}
        courseId={courseId}
        onClose={() => setIssueCertOpen(false)}
        onIssued={() => { setIssueCertOpen(false); load(); }}
      />

      {aiModalLecInfo && (
        <AIQuizModal
          open={!!aiModalLecInfo}
          onClose={() => setAiModalLecInfo(null)}
          onGenerate={async (questions) => {
            await saveGeneratedQuiz(aiModalLecInfo.lectureId, questions as any, aiModalLecInfo);
            setAiModalLecInfo(null);
            load();
          }}
        />
      )}

      {/* Attachments Modal */}
      <AttachmentsModal
        isOpen={attachmentsModalOpen}
        onClose={() => setAttachmentsModalOpen(false)}
        targetId={attachmentsTargetId}
        targetType={attachmentsTargetType}
        title={attachmentsTitle}
      />
      
      <input 
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={handleAiFileChange}
      />
      
      {aiStudioExamId && (
        <AIQuestionReviewStudio
          examId={aiStudioExamId}
          initialQuestions={aiStudioQuestions}
          onSaved={() => {
            setAiStudioExamId(null);
            setAiStudioQuestions([]);
            load();
          }}
          onCancel={() => {
            setAiStudioExamId(null);
            setAiStudioQuestions([]);
          }}
        />
      )}
    </div>
  );
}

function LectureActions({ lecture, onUpdated }: { lecture: BuilderLecture; onUpdated: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={async (e) => {
          e.stopPropagation();
          if (!confirm('Delete this lecture and all its content?')) return;
          try {
            await api.delete(`/lectures/${lecture.id}`);
            onUpdated();
          } catch (err) {
            console.error(err);
          }
        }}
        className="p-2 rounded-lg text-theme-muted hover:text-rose-700 dark:text-rose-300 hover:bg-rose-500/10 transition-colors"
        aria-label="Delete lecture"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}




function AddItemButton({
  lectureId,
  type,
  onAdded,
  onAIGenerate,
}: {
  lectureId: string;
  type: 'SESSION' | 'QUIZ';
  onAdded: () => void;
  onAIGenerate?: (info: { title: string; description?: string; passGrade?: number; timeLimit?: number }) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-secondary text-xs"
      >
        <Plus className="w-3.5 h-3.5" />
        {type === 'SESSION' ? 'Session' : 'Quiz'}
      </button>
      {open && (
        <AddItemModal
          open={open}
          lectureId={lectureId}
          type={type}
          sortOrder={100}
          onClose={() => setOpen(false)}
          onAdded={() => { setOpen(false); onAdded(); }}
          onAIGenerate={onAIGenerate}
        />
      )}
    </>
  );
}
function AddItemModal({
  open,
  lectureId,
  type,
  sortOrder,
  onClose,
  onAdded,
  onAIGenerate,
}: {
  open: boolean;
  lectureId: string;
  type: 'SESSION' | 'QUIZ' | 'HOMEWORK';
  sortOrder: number;
  onClose: () => void;
  onAdded: () => void;
  onAIGenerate?: (info: { title: string; description?: string; passGrade?: number; timeLimit?: number }) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [passingScore, setPassingScore] = useState('70');
  const [timeLimit, setTimeLimit] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Only MP4, MOV, MKV, and WebM are allowed.');
      return;
    }
    if (file.size > 500 * 1024 * 1024) {
      setError('File too large. Max 500MB.');
      return;
    }
    setError(null);
    setVideoFile(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (type === 'SESSION' && !videoFile) {
      setError('Please select a video file.');
      return;
    }
    setBusy(true);
    setError(null);

    try {
      const endpoint = type === 'SESSION' ? '/sessions' : type === 'QUIZ' ? '/quizzes' : '/homeworks';
      const { data } = await api.post(endpoint, {
        lectureId,
        title: title.trim(),
        description: description.trim() || null,
        timeLimit: type === 'QUIZ' && timeLimit ? Number(timeLimit) : undefined,
        passGrade: type === 'QUIZ' && passingScore ? Number(passingScore) : undefined,
        sortOrder,
      });

      if (type === 'SESSION' && videoFile) {
        setUploading(true);
        const formData = new FormData();
        formData.append('video', videoFile);
        await api.post(`/sessions/${data.id}/upload-video`, formData);
      }

      setTitle('');
      setDescription('');
      setVideoFile(null);
      setPassingScore('70');
      setTimeLimit('');
      onAdded();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setBusy(false);
      setUploading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Add ${type.charAt(0) + type.slice(1).toLowerCase()}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Title</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus />
        </div>
        {type === 'SESSION' && (
          <div>
            <label className="label">Video</label>
            {videoFile ? (
              <div className="rounded-xl bg-secondary-500/10 border border-secondary-500/20 p-3 flex items-center gap-2">
                <Check className="w-4 h-4 text-secondary-300" />
                <span className="text-sm text-secondary-200 flex-1">{videoFile.name} (ready to upload)</span>
                <button type="button" onClick={() => setVideoFile(null)} disabled={uploading} className="btn-ghost text-xs">Remove</button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/[0.08] p-6 cursor-pointer hover:border-accent-500/40 transition-colors">
                <Upload className="w-6 h-6 text-neutral-400" />
                <span className="text-sm text-neutral-400">
                  Click to select video
                </span>
                <span className="text-xs text-neutral-500">MP4, MOV, MKV, WebM (max 500MB)</span>
                <input type="file" accept="video/mp4,video/webm,video/quicktime,video/x-matroska" className="hidden" onChange={handleUpload} />
              </label>
            )}
          </div>
        )}
        {type === 'QUIZ' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Passing Score (%)</label>
              <input type="number" min={0} max={100} className="input" value={passingScore} onChange={(e) => setPassingScore(e.target.value)} />
            </div>
            <div>
              <label className="label">Time Limit (min)</label>
              <input type="number" min={1} className="input" value={timeLimit} onChange={(e) => setTimeLimit(e.target.value)} placeholder="Optional" />
            </div>
          </div>
        )}
        <div>
          <label className="label">Description (optional)</label>
          <textarea className="input min-h-[80px]" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        {error && <p className="text-sm text-error-300 bg-error-500/10 p-3 rounded-lg">{error}</p>}
        <div className="flex justify-end gap-2">
          {type === 'QUIZ' && onAIGenerate && (
            <button type="button" onClick={() => onAIGenerate({ title: title || 'Generated Quiz' })} className="btn-ghost">
              <Sparkles className="w-4 h-4" /> Generate with AI
            </button>
          )}
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="submit" disabled={busy || uploading} className="btn-primary">
            {busy ? 'Saving…' : 'Add'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function CreateLectureModal({
  open,
  courseId,
  chapterId,
  sortOrder,
  onClose,
  onCreated,
}: {
  open: boolean;
  courseId: string;
  chapterId?: string | null;
  sortOrder: number;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationDays, setDurationDays] = useState(0);
  const [durationHours, setDurationHours] = useState(0);
  const [durationMinutes, setDurationMinutes] = useState(0);
  const [warningHours, setWarningHours] = useState(0);
  const [warningMinutes, setWarningMinutes] = useState(0);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = {
        courseId,
        chapterId: chapterId || undefined,
        sortOrder,
        title: title.trim(),
        description: description ? description.trim() : "",
        durationDays: parseInt(String(durationDays), 10) || 0,
        durationHours: parseInt(String(durationHours), 10) || 0,
        durationMinutes: parseInt(String(durationMinutes), 10) || 0,
        warningHours: parseInt(String(warningHours), 10) || 0,
        warningMinutes: parseInt(String(warningMinutes), 10) || 0,
      };
      await api.post('/lectures', payload);
      setTitle('');
      setDescription('');
      onCreated();
    } catch(err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Lecture">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Lecture Title</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus />
        </div>
        <div>
          <label className="label">Description (optional)</label>
          <textarea className="input min-h-[80px]" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">Days</label>
            <input type="number" min="0" className="input" value={durationDays} onChange={(e) => setDurationDays(parseInt(e.target.value) || 0)} />
          </div>
          <div>
            <label className="label">Hours</label>
            <input type="number" min="0" className="input" value={durationHours} onChange={(e) => setDurationHours(parseInt(e.target.value) || 0)} />
          </div>
          <div>
            <label className="label">Minutes</label>
            <input type="number" min="0" className="input" value={durationMinutes} onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 0)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Warning Hours</label>
            <input type="number" min="0" className="input" value={warningHours} onChange={(e) => setWarningHours(parseInt(e.target.value) || 0)} />
          </div>
          <div>
            <label className="label">Warning Minutes</label>
            <input type="number" min="0" className="input" value={warningMinutes} onChange={(e) => setWarningMinutes(parseInt(e.target.value) || 0)} />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="submit" disabled={busy} className="btn-primary">{busy ? 'Adding…' : 'Add Lecture'}</button>
        </div>
      </form>
    </Modal>
  );
}

function CreateExamModal({
  open,
  courseId,
  chapterId,
  onClose,
  onCreated,
  onAIGenerate,
}: {
  open: boolean;
  courseId?: string;
  chapterId?: string;
  onClose: () => void;
  onCreated: () => void;
  onAIGenerate?: (examId: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [timeLimit, setTimeLimit] = useState('');
  const [passingScore, setPassingScore] = useState('70');
  const [maxAttempts, setMaxAttempts] = useState('1');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/exams', {
        courseId,
        chapterId,
        title: title.trim(),
        description: description.trim() || null,
        timeLimit: timeLimit ? Number(timeLimit) : null,
        passingScore: Number(passingScore),
        maxAttempts: Number(maxAttempts)
      });
      setTitle('');
      setDescription('');
      setTimeLimit('');
      setPassingScore('70');
      setMaxAttempts('1');
      onCreated();
    } catch(err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={chapterId ? "Add Chapter Exam" : "Add Final Exam"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Exam Title</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input min-h-[80px]" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Passing Score (%)</label>
            <input type="number" min={0} max={100} className="input" value={passingScore} onChange={(e) => setPassingScore(e.target.value)} required />
          </div>
          <div>
            <label className="label">Time Limit (mins)</label>
            <input type="number" min={1} className="input" value={timeLimit} onChange={(e) => setTimeLimit(e.target.value)} placeholder="Optional" />
          </div>
        </div>
        <div>
          <label className="label">Max Attempts Allowed</label>
          <input type="number" min={1} className="input" value={maxAttempts} onChange={(e) => setMaxAttempts(e.target.value)} required />
        </div>
        <div className="flex justify-end gap-2">
          {onAIGenerate && (
            <button
              type="button"
              onClick={async () => {
                if (!title.trim()) { alert('Please enter an Exam title first.'); return; }
                setBusy(true);
                try {
                  const res = await api.post('/exams', {
                    courseId,
                    chapterId,
                    title: title.trim(),
                    description: description.trim() || null,
                    timeLimit: timeLimit ? Number(timeLimit) : null,
                    passingScore: Number(passingScore),
                    maxAttempts: Number(maxAttempts)
                  });
                  onCreated();
                  onAIGenerate(res.data.id);
                } catch (e: any) {
                  alert('Failed to create exam: ' + (e?.response?.data?.message || e.message));
                } finally {
                  setBusy(false);
                }
              }}
              className="btn-ghost"
            >
              <Sparkles className="w-4 h-4" /> Generate with AI
            </button>
          )}
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="submit" disabled={busy} className="btn-primary">{busy ? 'Adding…' : 'Add Exam'}</button>
        </div>
      </form>
    </Modal>
  );
}



function IssueCertificateModal({
  open,
  courseId,
  onClose,
  onIssued,
}: {
  open: boolean;
  courseId: string;
  onClose: () => void;
  onIssued: () => void;
}) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post(`/certificates/issue`, {
        courseId,
        studentEmail: email.trim()
      });
      setEmail('');
      onIssued();
    } catch(err: unknown) {
      setError((err as any)?.response?.data?.message || 'Failed to issue certificate.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Issue Certificate">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Student Email</label>
          <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus placeholder="student@example.com" />
          <p className="text-xs text-theme-muted mt-2">Enter the email of the student who successfully completed the course.</p>
        </div>
        
        {error && <p className="text-sm text-error-300 bg-error-500/10 p-3 rounded-lg">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="submit" disabled={busy || !email.trim()} className="btn-primary">{busy ? 'Issuing…' : 'Issue Certificate'}</button>
        </div>
      </form>
    </Modal>
  );
}



  async function saveGeneratedQuiz(
    lectureId: string,
    questions: GeneratedQuestion[],
    quizMeta?: { title?: string; description?: string; passGrade?: number; timeLimit?: number }
  ) {
    try {
      const { data: quiz } = await api.post('/quizzes', {
        lectureId,
        title: quizMeta?.title?.trim() || 'Quiz',
        description: quizMeta?.description?.trim() || undefined,
        passGrade: quizMeta?.passGrade ? Number(quizMeta.passGrade) : 60,
        timeLimit: quizMeta?.timeLimit ? Number(quizMeta.timeLimit) : undefined,
        sortOrder: 100,
      });
    
    for (let qi = 0; qi < questions.length; qi++) {
      const q = questions[qi];
      const options = q.answers?.map(a => a.text) ?? q.options ?? [];
      let correctOptionIndex = q.answers?.findIndex(a => a.isCorrect) ?? -1;
      if (correctOptionIndex === -1) correctOptionIndex = q.correctOptionIndex ?? 0;

      await api.post(`/quizzes/questions`, {
        quizId: quiz.id,
        text: q.text ?? (q as any).question,
        options,
        correctOptionIndex,
        points: q.points ?? 1
      });
    }
  } catch (e) {
    console.error(e);
  }
}

export function LectureList({ lectures, items, expandedLecs, toggleLec, load, setAiModalLecInfo, onAddQuestion }: {
  lectures: BuilderLecture[];
  items: Record<string, BuilderItem[]>;
  expandedLecs: Set<string>;
  toggleLec: (id: string) => void;
  load: () => Promise<void>;
  setAiModalLecInfo: (info: { lectureId: string; title?: string; description?: string; passGrade?: number; timeLimit?: number } | null) => void;
  onAddQuestion: (id: string, type: 'EXAM' | 'QUIZ') => void;
}) {
  return (
    <div className="space-y-3">
      {lectures.map((lec: BuilderLecture, idx: number) => {
        const lecItems = items[lec.id] ?? [];
        const expanded = expandedLecs.has(lec.id);
        return (
          <div key={lec.id} className="glass rounded-2xl overflow-hidden">
            <button
              onClick={() => toggleLec(lec.id)}
              className="w-full p-4 flex items-center gap-3 hover:bg-white/[0.02] transition-colors"
            >
              {expanded ? <ChevronDown className="w-4 h-4 text-theme-muted" /> : <ChevronRight className="w-4 h-4 text-theme-muted" />}
              <div className="w-8 h-8 rounded-lg bg-accent-500/10 flex items-center justify-center text-accent-700 dark:text-accent-300 text-sm font-bold">
                {idx + 1}
              </div>
              <div className="flex-1 text-start min-w-0">
                <p className="font-semibold text-theme-text truncate">{lec.title}</p>
                <p className="text-xs text-theme-muted">{lecItems.length} items</p>
              </div>
              <LectureActions lecture={lec} onUpdated={load} />
            </button>

            {expanded && (
              <div className="p-4 pt-0 space-y-3 border-t border-white/[0.04] mt-1">
                {lecItems.length === 0 ? (
                  <p className="text-sm text-theme-muted text-center py-4">No items yet.</p>
                ) : (
                  <LectureSequenceBuilder 
                    lectureId={lec.id} 
                    initialItems={lecItems} 
                    onReordered={load}
                    onAddQuestion={onAddQuestion} 
                  />
                )}
                <div className="flex flex-wrap gap-2 pt-2">
                  <AddItemButton lectureId={lec.id} type="SESSION" onAdded={load} />
                  <AddItemButton 
                    lectureId={lec.id} 
                    type="QUIZ" 
                    onAdded={load} 
                    onAIGenerate={(info) => setAiModalLecInfo({ lectureId: lec.id, ...info })} 
                  />
                </div>
                <LectureFilesSection lectureId={lec.id} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function CreateChapterModal({ open, courseId, sortOrder, onClose, onCreated }: {
  open: boolean;
  courseId: string;
  sortOrder: number;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/chapters', {
        courseId,
        title: title.trim(),
        description: description.trim() || null,
        orderIndex: sortOrder,
      });
      setTitle('');
      setDescription('');
      onCreated();
    } catch(err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Chapter">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Chapter Title</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus />
        </div>
        <div>
          <label className="label">Description (optional)</label>
          <textarea className="input min-h-[80px]" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="submit" disabled={busy} className="btn-primary">{busy ? 'Adding…' : 'Add Chapter'}</button>
        </div>
      </form>
    </Modal>
  );
}
