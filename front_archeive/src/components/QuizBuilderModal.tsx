import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Plus, Trash2, GripVertical, Check, Save, X } from 'lucide-react';
import { Spinner } from './ui';

interface QuizBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetId: string;
  type: 'QUIZ' | 'EXAM';
}

interface LocalQuestion {
  id: string; // temporary for UI tracking
  text: string;
  points: number;
  options: string[];
  correctOptionIndex: number;
  type: 'MCQ';
}

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

export function QuizBuilderModal({ isOpen, onClose, targetId, type }: QuizBuilderModalProps) {
  const queryClient = useQueryClient();
  const [questions, setQuestions] = useState<LocalQuestion[]>([]);

  // Fetch existing questions when opened
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
    if (existingData && existingData.questions) {
      const mapped = existingData.questions.map((q: any) => {
        let opts = q.options || [];
        let correctIdx = q.correctOptionIndex || 0;
        
        // Handle Exam format where options are objects
        if (q.answers && q.answers.length > 0) {
          opts = q.answers.map((a: any) => a.text);
          correctIdx = Math.max(0, q.answers.findIndex((a: any) => a.isCorrect));
        }

        return {
          id: q.id || generateId(),
          text: q.text || '',
          points: q.points || 1,
          options: opts.length > 0 ? opts : ['', ''],
          correctOptionIndex: correctIdx,
          type: q.type || 'MCQ'
        };
      });
      setQuestions(mapped);
    } else {
      setQuestions([]);
    }
  }, [existingData, isOpen]);

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const endpoint = type === 'QUIZ' ? `/admin/quizzes/${targetId}/questions/batch` : `/exams/${targetId}/questions/batch`;
      return api.put(endpoint, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courseBuilder'] });
      queryClient.invalidateQueries({ queryKey: ['questions', type, targetId] });
      alert('Quiz synchronized successfully!');
      onClose();
    },
    onError: (err: any) => {
      console.error(err);
      alert('Failed to save quiz: ' + (err.response?.data?.message || err.message));
    }
  });

  if (!isOpen) return null;

  const handleAddQuestion = () => {
    setQuestions([...questions, {
      id: generateId(),
      text: '',
      points: 1,
      options: ['', ''],
      correctOptionIndex: 0,
      type: 'MCQ'
    }]);
  };

  const handleRemoveQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const updateQuestion = (id: string, updates: Partial<LocalQuestion>) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, ...updates } : q));
  };

  const updateOption = (qId: string, optIdx: number, val: string) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        const nextOpts = [...q.options];
        nextOpts[optIdx] = val;
        return { ...q, options: nextOpts };
      }
      return q;
    }));
  };

  const addOption = (qId: string) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        return { ...q, options: [...q.options, ''] };
      }
      return q;
    }));
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

  const handleSave = () => {
    // Validate
    for (const q of questions) {
      if (!q.text.trim()) {
        alert('All questions must have text.');
        return;
      }
      if (q.options.some(opt => !opt.trim())) {
        alert('All answer options must be filled out.');
        return;
      }
    }

    const payload = type === 'QUIZ' 
      ? { questions: questions.map(q => ({ text: q.text, options: q.options, correctOptionIndex: q.correctOptionIndex, points: q.points })) }
      : { questions: questions.map(q => ({ text: q.text, answers: q.options.map((opt, i) => ({ text: opt, isCorrect: i === q.correctOptionIndex })), type: 'MCQ', points: q.points })) };

    saveMutation.mutate(payload);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-8">
      <div className="w-full max-w-4xl h-full max-h-[90vh] flex flex-col rounded-2xl border border-neutral-800 bg-neutral-950 text-white shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between border-b border-neutral-800 p-6 bg-neutral-900">
          <div>
            <h3 className="text-xl font-bold font-display text-white">Full-Screen {type} Builder</h3>
            <p className="text-xs text-neutral-400 mt-1">Add, arrange, and manage all your questions at once. Save when you're done.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-neutral-500">
              <Spinner className="w-8 h-8 mb-4 text-cyan-500" />
              <p>Loading your questions...</p>
            </div>
          ) : (
            <>
              {questions.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-neutral-800 rounded-2xl">
                  <p className="text-neutral-500 mb-4">No questions added yet.</p>
                  <button onClick={handleAddQuestion} className="btn-secondary">
                    <Plus className="w-4 h-4" /> Add First Question
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {questions.map((q, qIndex) => (
                    <div key={q.id} className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900 relative group">
                      
                      {/* Question Header */}
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex-1">
                          <label className="flex items-center gap-2 text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                            <GripVertical className="w-3.5 h-3.5" /> Question {qIndex + 1}
                          </label>
                          <textarea
                            value={q.text}
                            onChange={(e) => updateQuestion(q.id, { text: e.target.value })}
                            className="w-full rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-sm text-white outline-none focus:border-cyan-500 transition-colors resize-none h-20"
                            placeholder="Type your question prompt here..."
                          />
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <button onClick={() => handleRemoveQuestion(q.id)} className="p-2 text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors" title="Delete Question">
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <div className="flex flex-col gap-1 items-end">
                            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Points</span>
                            <input
                              type="number"
                              min="1"
                              value={q.points}
                              onChange={(e) => updateQuestion(q.id, { points: parseInt(e.target.value, 10) || 1 })}
                              className="w-16 rounded-lg border border-neutral-800 bg-neutral-950 p-1.5 text-center text-sm outline-none focus:border-cyan-500"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Options */}
                      <div className="space-y-2 pl-6 border-l-2 border-neutral-800">
                        {q.options.map((opt, optIdx) => (
                          <div key={optIdx} className="flex items-center gap-3">
                            <div className="relative flex items-center justify-center">
                              <input
                                type="radio"
                                name={`correct-${q.id}`}
                                checked={q.correctOptionIndex === optIdx}
                                onChange={() => updateQuestion(q.id, { correctOptionIndex: optIdx })}
                                className="w-4 h-4 accent-cyan-500 cursor-pointer"
                              />
                            </div>
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => updateOption(q.id, optIdx, e.target.value)}
                              className={`flex-1 rounded-lg border ${q.correctOptionIndex === optIdx ? 'border-cyan-500/50 bg-cyan-500/5' : 'border-neutral-800 bg-neutral-950'} p-2 text-sm outline-none focus:border-cyan-500 transition-colors`}
                              placeholder={`Option ${optIdx + 1}`}
                            />
                            {q.options.length > 2 && (
                              <button onClick={() => removeOption(q.id, optIdx)} className="p-1.5 text-neutral-500 hover:text-rose-400 rounded-lg transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button onClick={() => addOption(q.id)} className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 mt-2 font-medium">
                          <Plus className="w-3.5 h-3.5" /> Add Answer Option
                        </button>
                      </div>

                    </div>
                  ))}
                  <button onClick={handleAddQuestion} className="w-full py-4 rounded-2xl border border-dashed border-neutral-700 text-neutral-400 hover:text-white hover:border-neutral-500 hover:bg-neutral-800/50 transition-colors flex items-center justify-center gap-2 font-medium">
                    <Plus className="w-5 h-5" /> Add Another Question
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-neutral-800 p-4 bg-neutral-900 flex items-center justify-between">
          <div className="text-sm text-neutral-400 font-medium">
            Total Questions: <span className="text-white">{questions.length}</span>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold text-neutral-400 hover:text-white transition-colors">
              Cancel
            </button>
            <button 
              onClick={handleSave} 
              disabled={saveMutation.isPending || isLoading}
              className="btn-primary px-6 flex items-center gap-2"
            >
              {saveMutation.isPending ? <Spinner className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saveMutation.isPending ? 'Syncing...' : 'Save & Sync Quiz'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
