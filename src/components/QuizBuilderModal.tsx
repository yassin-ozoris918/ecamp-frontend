import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Plus, Trash2, GripVertical, Save, X, AlignLeft, CheckSquare, FileText, ListOrdered, GitMerge } from 'lucide-react';
import type { ExamQuestion, ExamAnswer, QuestionType } from '../lib/types';
import { Spinner } from './ui';
import { useTranslation } from 'react-i18next';

interface QuizBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetId: string;
  type: 'QUIZ' | 'EXAM';
  onCreated?: () => void;
}

interface LocalQuestion {
  id: string;
  text: string;
  points: number;
  options: string[];
  correctOptionIndex: number;
  type: QuestionType;
  version: 'A' | 'B';
  referenceAnswer?: string;
  matchOptions?: { left: string; right: string }[];
  correctOrder?: string[];
}

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

const QUESTION_TYPES: { value: QuestionType; label: string; icon: React.ReactNode }[] = [
  { value: 'MCQ', label: 'Multiple Choice (Single)', icon: <CheckSquare className="w-4 h-4" /> },
  { value: 'TRUE_FALSE', label: 'True / False', icon: <CheckSquare className="w-4 h-4" /> },
  { value: 'ESSAY', label: 'Essay (Long Answer)', icon: <FileText className="w-4 h-4" /> },
  { value: 'SHORT_ANSWER', label: 'Short Answer', icon: <AlignLeft className="w-4 h-4" /> },
  { value: 'MATCHING', label: 'Matching Pairs', icon: <GitMerge className="w-4 h-4" /> },
  { value: 'ORDERING', label: 'Ordering / Sequence', icon: <ListOrdered className="w-4 h-4" /> },
  { value: 'READ_ONLY_TEXT', label: 'Read-Only Text', icon: <AlignLeft className="w-4 h-4" /> },
];

export function QuizBuilderModal({ isOpen, onClose, targetId, type }: QuizBuilderModalProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [questions, setQuestions] = useState<LocalQuestion[]>([]);
  const [quizTitle, setQuizTitle] = useState('');
  const [activeVersion, setActiveVersion] = useState<'A' | 'B'>('A');

  const { data: existingData, isLoading } = useQuery({
    queryKey: ['questions', type, targetId],
    queryFn: async () => {
      const endpoint = type === 'QUIZ' ? `/admin/quizzes/${targetId}` : `/exams/admin/${targetId}`;
      const res = await api.get(endpoint);
      return res.data;
    },
    enabled: isOpen,
  });

  useEffect(() => {
    if (existingData) {
      if (existingData.title) setQuizTitle(existingData.title);
      if (existingData.questions) {
        const mapped = existingData.questions.map((q: ExamQuestion) => {
          let opts = q.options || [];
          let correctIdx = q.correctOptionIndex || 0;

          if (q.answers && q.answers.length > 0) {
            opts = q.answers.map((a: ExamAnswer) => a.text);
            correctIdx = Math.max(0, q.answers.findIndex((a: ExamAnswer) => a.isCorrect));
          }

          const version: 'A' | 'B' = (q as any).version === 'B' ? 'B' : 'A';

          return {
            id: q.id || generateId(),
            text: q.text || '',
            points: q.points || 1,
            options: opts.length > 0 ? opts : ['', ''],
            correctOptionIndex: correctIdx,
            type: q.type || 'MCQ',
            version,
            referenceAnswer: q.referenceAnswer || '',
            matchOptions: q.matchOptions && q.matchOptions.length > 0 ? q.matchOptions : [{ left: '', right: '' }, { left: '', right: '' }],
            correctOrder: q.correctOrder && q.correctOrder.length > 0 ? q.correctOrder : ['', ''],
          };
        });
        setQuestions(mapped);
      } else {
        setQuestions([]);
      }
    } else {
      setQuestions([]);
      setQuizTitle('');
    }
  }, [existingData, isOpen]);

  const saveMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      if (quizTitle.trim()) {
        const updateEndpoint = type === 'QUIZ' ? `/admin/quizzes/${targetId}` : `/exams/${targetId}`;
        await api.put(updateEndpoint, { title: quizTitle.trim() });
      }
      const endpoint = type === 'QUIZ'
        ? `/admin/quizzes/${targetId}/questions/batch`
        : `/exams/${targetId}/questions/batch`;
      return api.put(endpoint, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courseBuilder'] });
      queryClient.invalidateQueries({ queryKey: ['questions', type, targetId] });
      toast.success(`${type === 'QUIZ' ? 'Quiz' : 'Exam'} updated successfully!`);
      onClose();
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { data?: { message?: string } }; message?: string };
      console.error(err);
      toast.error('Failed to save: ' + (axiosErr.response?.data?.message || axiosErr.message));
    },
  });

  if (!isOpen) return null;

  const visibleQuestions = type === 'QUIZ' ? questions.filter(q => q.version === activeVersion) : questions;

  const handleAddQuestion = () => {
    setQuestions([...questions, {
      id: generateId(),
      text: '',
      points: 1,
      options: ['', ''],
      correctOptionIndex: 0,
      type: 'MCQ',
      version: type === 'QUIZ' ? activeVersion : 'A',
      referenceAnswer: '',
      matchOptions: [{ left: '', right: '' }, { left: '', right: '' }],
      correctOrder: ['', ''],
    }]);
  };

  const handleRemoveQuestion = (id: string) => setQuestions(questions.filter(q => q.id !== id));
  const updateQuestion = (id: string, updates: Partial<LocalQuestion>) => setQuestions(questions.map(q => q.id === id ? { ...q, ...updates } : q));

  const updateOption = (qId: string, optIdx: number, val: string) => {
    setQuestions(questions.map(q => {
      if (q.id !== qId) return q;
      const newOpts = [...q.options];
      newOpts[optIdx] = val;
      return { ...q, options: newOpts };
    }));
  };

  const addOption = (qId: string) => {
    setQuestions(questions.map(q => q.id === qId ? { ...q, options: [...q.options, ''] } : q));
  };

  const removeOption = (qId: string, optIdx: number) => {
    setQuestions(questions.map(q => {
      if (q.id === qId && q.options.length > 2) {
        const nextOpts = q.options.filter((_, i) => i !== optIdx);
        let nextCorrect = q.correctOptionIndex;
        if (nextCorrect >= nextOpts.length) nextCorrect = 0;
        return { ...q, options: nextOpts, correctOptionIndex: nextCorrect };
      }
      return q;
    }));
  };

  // Matching specific helpers
  const updateMatchOption = (qId: string, idx: number, side: 'left' | 'right', val: string) => {
    setQuestions(questions.map(q => {
      if (q.id !== qId) return q;
      const newMatch = [...(q.matchOptions || [])];
      newMatch[idx] = { ...newMatch[idx], [side]: val };
      return { ...q, matchOptions: newMatch };
    }));
  };
  const addMatchOption = (qId: string) => {
    setQuestions(questions.map(q => q.id === qId ? { ...q, matchOptions: [...(q.matchOptions || []), { left: '', right: '' }] } : q));
  };
  const removeMatchOption = (qId: string, idx: number) => {
    setQuestions(questions.map(q => {
      if (q.id === qId && (q.matchOptions?.length || 0) > 2) {
        return { ...q, matchOptions: q.matchOptions!.filter((_, i) => i !== idx) };
      }
      return q;
    }));
  };

  // Ordering specific helpers
  const updateOrderOption = (qId: string, idx: number, val: string) => {
    setQuestions(questions.map(q => {
      if (q.id !== qId) return q;
      const newOrder = [...(q.correctOrder || [])];
      newOrder[idx] = val;
      return { ...q, correctOrder: newOrder };
    }));
  };
  const addOrderOption = (qId: string) => {
    setQuestions(questions.map(q => q.id === qId ? { ...q, correctOrder: [...(q.correctOrder || []), ''] } : q));
  };
  const removeOrderOption = (qId: string, idx: number) => {
    setQuestions(questions.map(q => {
      if (q.id === qId && (q.correctOrder?.length || 0) > 2) {
        return { ...q, correctOrder: q.correctOrder!.filter((_, i) => i !== idx) };
      }
      return q;
    }));
  };

  const handleSave = () => {
    for (const q of questions) {
      if (!q.text.trim()) { toast.error('All questions must have text.'); return; }
      if (['MCQ', 'TRUE_FALSE', 'MULTIPLE_CHOICE'].includes(q.type)) {
        if (q.options.some(opt => !opt.trim())) { toast.error('All options must be filled.'); return; }
      } else if (['ESSAY', 'SHORT_ANSWER'].includes(q.type)) {
        if (!q.referenceAnswer?.trim()) { toast.error('Reference answer required for subjective questions.'); return; }
      } else if (q.type === 'MATCHING') {
        if (q.matchOptions?.some(m => !m.left.trim() || !m.right.trim())) { toast.error('All matching pairs must be filled.'); return; }
      } else if (q.type === 'ORDERING') {
        if (q.correctOrder?.some(o => !o.trim())) { toast.error('All ordering items must be filled.'); return; }
      }
    }

    const payload = {
      questions: questions.map(q => ({
        text: q.text,
        type: q.type,
        points: q.points,
        version: q.version,
        ...(type === 'QUIZ' 
           ? { options: q.options, correctOptionIndex: q.correctOptionIndex }
           : { answers: q.options.map((opt, i) => ({ text: opt, isCorrect: i === q.correctOptionIndex })) }
        ),
        referenceAnswer: q.referenceAnswer,
        matchOptions: q.matchOptions,
        correctOrder: q.correctOrder,
      })),
    };

    saveMutation.mutate(payload);
  };

  const versionACount = questions.filter(q => q.version === 'A').length;
  const versionBCount = questions.filter(q => q.version === 'B').length;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-8">
      <div className="w-full max-w-4xl h-full max-h-[90vh] flex flex-col rounded-2xl border border-neutral-800 bg-neutral-950 text-theme-text shadow-2xl overflow-hidden">
        <div className="shrink-0 flex items-center justify-between border-b border-neutral-800 p-6 bg-neutral-900">
          <div>
            <h3 className="text-xl font-bold font-display text-theme-text">{t('quizBuilder.editTitle')} ({type})</h3>
            <p className="text-xs text-theme-muted mt-1">{t('quizBuilder.buildEngaging')}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-theme-muted hover:text-white hover:bg-neutral-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="rounded-2xl border border-accent-500/20 bg-accent-500/5 p-4 space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-accent-400">
              {type === 'QUIZ' ? t('quizBuilder.quizTitleLabel') : t('quizBuilder.examTitleLabel')}
            </label>
            <input
              className="input font-bold text-base w-full bg-neutral-900"
              value={quizTitle}
              onChange={(e) => setQuizTitle(e.target.value)}
              placeholder={t('quizBuilder.enterTitlePlaceholder')}
            />
          </div>

          {type === 'QUIZ' && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1 p-1 rounded-xl bg-neutral-900 border border-neutral-800 w-fit">
                <button
                  onClick={() => setActiveVersion('A')}
                  className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                    activeVersion === 'A' ? 'bg-accent-500/20 text-accent-300 border border-accent-500/40' : 'text-theme-muted hover:text-white hover:bg-neutral-800'
                  }`}
                >
                  {t('quizBuilder.versionA')} <span className="ml-2 text-xs font-mono opacity-70">({versionACount})</span>
                </button>
                <button
                  onClick={() => setActiveVersion('B')}
                  className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                    activeVersion === 'B' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-theme-muted hover:text-white hover:bg-neutral-800'
                  }`}
                >
                  {t('quizBuilder.versionB')} <span className="ml-2 text-xs font-mono opacity-70">({versionBCount})</span>
                </button>
              </div>
              {activeVersion === 'B' && (
                <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3 text-xs text-cyan-300">
                  <strong>{t('quizBuilder.versionB')}</strong> — {t('quizBuilder.versionBDesc')}
                </div>
              )}
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-theme-muted"><Spinner className="w-8 h-8 mb-4 text-cyan-500" /><p>Loading your questions...</p></div>
          ) : (
            <div className="space-y-6">
              {visibleQuestions.map((q, qIndex) => (
                <div key={q.id} className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900 relative group">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-xs font-bold text-theme-muted uppercase tracking-wider">
                          <GripVertical className="w-3.5 h-3.5" /> Question {qIndex + 1}
                          {type === 'QUIZ' && (
                            <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold ${q.version === 'B' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-accent-500/20 text-accent-300'}`}>v{q.version}</span>
                          )}
                        </label>
                        <select
                          value={q.type}
                          onChange={(e) => updateQuestion(q.id, { type: e.target.value as QuestionType })}
                          className="bg-neutral-950 border border-neutral-800 rounded-lg text-sm px-3 py-1.5 outline-none focus:border-cyan-500"
                        >
                          {QUESTION_TYPES.map(typeOpt => (
                            <option key={typeOpt.value} value={typeOpt.value}>{t(`quiz.questionTypes.${typeOpt.value}`)}</option>
                          ))}
                        </select>
                      </div>
                      <textarea
                        value={q.text}
                        onChange={(e) => updateQuestion(q.id, { text: e.target.value })}
                        className="w-full rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-sm text-theme-text outline-none focus:border-cyan-500 transition-colors resize-none h-20"
                        placeholder={t('quizBuilder.typeQuestionPrompt')}
                      />
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <button onClick={() => handleRemoveQuestion(q.id)} className="p-2 text-theme-muted hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors" title="Delete Question">
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="flex flex-col gap-1 items-end">
                        <span className="text-[10px] font-bold text-theme-muted uppercase tracking-wider">Points</span>
                        <input
                          type="number" min="1" value={q.points}
                          onChange={(e) => updateQuestion(q.id, { points: parseInt(e.target.value, 10) || 1 })}
                          className="w-16 rounded-lg border border-neutral-800 bg-neutral-950 p-1.5 text-center text-sm outline-none focus:border-cyan-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Render based on Type */}
                  <div className="space-y-2 pl-6 border-l-2 border-neutral-800 pt-2 mt-2">
                    {['MCQ', 'TRUE_FALSE', 'MULTIPLE_CHOICE'].includes(q.type) && (
                      <>
                        {q.options.map((opt, optIdx) => (
                          <div key={optIdx} className="flex items-center gap-3">
                            <input
                              type="radio" name={`correct-${q.id}`}
                              checked={q.correctOptionIndex === optIdx}
                              onChange={() => updateQuestion(q.id, { correctOptionIndex: optIdx })}
                              className="w-4 h-4 accent-cyan-500 cursor-pointer"
                            />
                            <input
                              type="text" value={opt} onChange={(e) => updateOption(q.id, optIdx, e.target.value)}
                              className={`flex-1 rounded-lg border ${q.correctOptionIndex === optIdx ? 'border-cyan-500/50 bg-cyan-500/5' : 'border-neutral-800 bg-neutral-950'} p-2 text-sm outline-none focus:border-cyan-500`}
                              placeholder={`${t('quizBuilder.option')} ${optIdx + 1}`}
                            />
                            {q.options.length > 2 && (
                              <button onClick={() => removeOption(q.id, optIdx)} className="p-1.5 text-theme-muted hover:text-rose-400 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                            )}
                          </div>
                        ))}
                        <button onClick={() => addOption(q.id)} className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 mt-2 font-medium">
                          <Plus className="w-3.5 h-3.5" /> {t('quizBuilder.addAnswerOption')}
                        </button>
                      </>
                    )}

                    {['ESSAY', 'SHORT_ANSWER'].includes(q.type) && (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-cyan-400 uppercase tracking-wider">{t('quizBuilder.aiReferenceAnswer')}</label>
                        <textarea
                          value={q.referenceAnswer || ''}
                          onChange={(e) => updateQuestion(q.id, { referenceAnswer: e.target.value })}
                          className="w-full rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-3 text-sm text-theme-text outline-none focus:border-cyan-500 transition-colors resize-none h-24"
                          placeholder={t('quizBuilder.referencePlaceholder')}
                        />
                        <p className="text-xs text-theme-muted">{t('quizBuilder.referenceHelp')}</p>
                      </div>
                    )}

                    {q.type === 'MATCHING' && (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-accent-400 uppercase tracking-wider">{t('quizBuilder.matchingPairs')}</label>
                        {(q.matchOptions || []).map((match, idx) => (
                          <div key={idx} className="flex items-center gap-3">
                            <input type="text" value={match.left} onChange={(e) => updateMatchOption(q.id, idx, 'left', e.target.value)} className="flex-1 rounded-lg border border-neutral-800 bg-neutral-950 p-2 text-sm outline-none focus:border-cyan-500" placeholder={t('quizBuilder.matchLeft')} />
                            <span className="text-theme-muted font-bold">→</span>
                            <input type="text" value={match.right} onChange={(e) => updateMatchOption(q.id, idx, 'right', e.target.value)} className="flex-1 rounded-lg border border-neutral-800 bg-neutral-950 p-2 text-sm outline-none focus:border-cyan-500" placeholder={t('quizBuilder.matchRight')} />
                            {(q.matchOptions?.length || 0) > 2 && (
                              <button onClick={() => removeMatchOption(q.id, idx)} className="p-1.5 text-theme-muted hover:text-rose-400 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                            )}
                          </div>
                        ))}
                        <button onClick={() => addMatchOption(q.id)} className="text-xs text-accent-400 hover:text-accent-300 flex items-center gap-1 mt-2 font-medium">
                          <Plus className="w-3.5 h-3.5" /> {t('quizBuilder.addMatchingPair')}
                        </button>
                      </div>
                    )}

                    {q.type === 'ORDERING' && (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-amber-400 uppercase tracking-wider">{t('quizBuilder.correctSequence')}</label>
                        {(q.correctOrder || []).map((ord, idx) => (
                          <div key={idx} className="flex items-center gap-3">
                            <span className="w-6 h-6 flex items-center justify-center bg-neutral-800 text-theme-muted rounded-md text-xs font-bold">{idx + 1}</span>
                            <input type="text" value={ord} onChange={(e) => updateOrderOption(q.id, idx, e.target.value)} className="flex-1 rounded-lg border border-neutral-800 bg-neutral-950 p-2 text-sm outline-none focus:border-cyan-500" placeholder={`${t('quizBuilder.sequenceItem')} ${idx + 1}`} />
                            {(q.correctOrder?.length || 0) > 2 && (
                              <button onClick={() => removeOrderOption(q.id, idx)} className="p-1.5 text-theme-muted hover:text-rose-400 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                            )}
                          </div>
                        ))}
                        <button onClick={() => addOrderOption(q.id)} className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 mt-2 font-medium">
                          <Plus className="w-3.5 h-3.5" /> {t('quizBuilder.addSequenceItem')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <button onClick={handleAddQuestion} className="w-full py-4 rounded-2xl border border-dashed border-neutral-700 text-theme-muted hover:text-white hover:border-neutral-500 hover:bg-neutral-800/50 transition-colors flex items-center justify-center gap-2 font-medium">
                <Plus className="w-5 h-5" /> {t('quizBuilder.addAnotherQuestion')}
              </button>
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-neutral-800 p-4 bg-neutral-900 flex items-center justify-between">
          <div className="text-sm text-theme-muted font-medium">
            {type === 'QUIZ' ? (
              <span>Questions: <span className="text-theme-text font-mono font-bold">{versionACount}A</span> + <span className="text-cyan-400 font-mono font-bold">{versionBCount}B</span></span>
            ) : (
              <span>Questions: <span className="text-theme-text font-mono font-bold">{questions.length}</span></span>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold text-theme-muted hover:text-white transition-colors">{t('common.cancel')}</button>
            <button onClick={handleSave} disabled={saveMutation.isPending || isLoading} className="btn-primary px-6 flex items-center gap-2">
              {saveMutation.isPending ? <Spinner className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saveMutation.isPending ? t('common.loading') : t('quizBuilder.saveSync')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
