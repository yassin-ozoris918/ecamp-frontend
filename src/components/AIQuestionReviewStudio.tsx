import toast from 'react-hot-toast';
import { useState } from 'react';
import { api } from '../lib/api';
import { Loader2, Save, Trash2, Sparkles } from 'lucide-react';
import { QuestionType } from '../lib/types';

interface AIQuestion {
  text: string;
  type: QuestionType;
  points: number;
  options?: string[];
  correctOptionIndex?: number;
  referenceAnswer?: string;
}

interface AIQuestionReviewStudioProps {
  examId: string;
  initialQuestions: AIQuestion[];
  onSaved: () => void;
  onCancel: () => void;
}

export function AIQuestionReviewStudio({ examId, initialQuestions, onSaved, onCancel }: AIQuestionReviewStudioProps) {
  const [questions, setQuestions] = useState<AIQuestion[]>(initialQuestions);
  const [isSaving, setIsSaving] = useState(false);

  const updateQuestion = (index: number, updates: Partial<AIQuestion>) => {
    const newQs = [...questions];
    newQs[index] = { ...newQs[index], ...updates };
    setQuestions(newQs);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const saveToDatabase = async () => {
    setIsSaving(true);
    try {
      await api.put(`/exams/${examId}/questions/batch`, { questions });
      onSaved();
    } catch (error) {
      console.error('Failed to save questions', error);
      toast.error('Failed to save questions.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-neutral-900 border border-theme-border w-full max-w-6xl max-h-full rounded-3xl shadow-2xl flex flex-col">
        <div className="p-6 border-b border-theme-border flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-2xl font-display font-bold text-theme-text flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-emerald-400" />
              AI Extraction Studio
            </h2>
            <p className="text-theme-muted mt-1">Review, tweak, and finalize AI-generated questions before committing them to the exam.</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onCancel} className="btn-ghost">Discard</button>
            <button onClick={saveToDatabase} disabled={isSaving || questions.length === 0} className="btn-primary">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save All to Exam
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {questions.map((q, idx) => (
            <div key={idx} className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-5 relative group">
              <button 
                onClick={() => removeQuestion(idx)}
                className="absolute top-4 right-4 p-2 bg-rose-500/10 text-rose-400 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              
              <div className="grid grid-cols-12 gap-6">
                <div className="col-span-8 space-y-4">
                  <div>
                    <label className="text-xs font-bold text-theme-muted uppercase tracking-wider mb-2 block">Content Text / Prompt</label>
                    <textarea 
                      className="input-field min-h-[100px]"
                      value={q.text}
                      onChange={(e) => updateQuestion(idx, { text: e.target.value })}
                    />
                  </div>
                  
                  {['MCQ', 'TRUE_FALSE'].includes(q.type) && (
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-theme-muted uppercase tracking-wider block">Options & Correct Answer</label>
                      {q.options?.map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-3">
                          <input 
                            type="radio" 
                            name={`correct-${idx}`} 
                            checked={q.correctOptionIndex === optIdx}
                            onChange={() => updateQuestion(idx, { correctOptionIndex: optIdx })}
                            className="w-4 h-4 accent-accent-500"
                          />
                          <input 
                            type="text" 
                            className="input-field flex-1 py-2 text-sm"
                            value={opt}
                            onChange={(e) => {
                              const newOpts = [...(q.options || [])];
                              newOpts[optIdx] = e.target.value;
                              updateQuestion(idx, { options: newOpts });
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {['ESSAY', 'SHORT_ANSWER'].includes(q.type) && (
                    <div>
                      <label className="text-xs font-bold text-theme-muted uppercase tracking-wider mb-2 block">Reference Rubric (AI grading baseline)</label>
                      <textarea 
                        className="input-field min-h-[80px]"
                        value={q.referenceAnswer || ''}
                        onChange={(e) => updateQuestion(idx, { referenceAnswer: e.target.value })}
                        placeholder="What should the AI look for when grading?"
                      />
                    </div>
                  )}
                  
                  {q.type === 'READ_ONLY_TEXT' && (
                    <p className="text-xs text-sky-400 italic">This block will render as read-only informational context for the student.</p>
                  )}
                </div>

                <div className="col-span-4 space-y-4 border-l border-white/[0.04] pl-6">
                  <div>
                    <label className="text-xs font-bold text-theme-muted uppercase tracking-wider mb-2 block">Type</label>
                    <select 
                      className="input-field"
                      value={q.type}
                      onChange={(e) => updateQuestion(idx, { type: e.target.value as any })}
                    >
                      <option value="MCQ">Multiple Choice</option>
                      <option value="TRUE_FALSE">True / False</option>
                      <option value="SHORT_ANSWER">Short Answer</option>
                      <option value="ESSAY">Essay</option>
                      <option value="READ_ONLY_TEXT">Read-Only Text (Passage)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-theme-muted uppercase tracking-wider mb-2 block">Points Weight</label>
                    <input 
                      type="number"
                      className="input-field"
                      value={q.points}
                      onChange={(e) => updateQuestion(idx, { points: Number(e.target.value) })}
                      min="0"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
          {questions.length === 0 && (
             <div className="text-center text-theme-muted py-12">No questions extracted. Please try another file.</div>
          )}
        </div>
      </div>
    </div>
  );
}
