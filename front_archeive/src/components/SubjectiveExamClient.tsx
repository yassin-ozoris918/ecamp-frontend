import React, { useState } from 'react';
import { api } from '../lib/api';
import { Loader2, Send } from 'lucide-react';

interface ExamQuestion {
  id: string;
  text: string;
  type: 'MCQ' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'ESSAY' | 'READ_ONLY_TEXT';
  points: number;
  options?: string[];
}

interface SubjectiveExamClientProps {
  attemptId: string;
  questions: ExamQuestion[];
  onComplete: () => void;
}

export function SubjectiveExamClient({ attemptId, questions, onComplete }: SubjectiveExamClientProps) {
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // 1. Submit text responses to backend
      for (const [qId, text] of Object.entries(responses)) {
        await api.post(`/exams/submit`, {
          attemptId,
          questionId: qId,
          textResponse: text
        });
      }

      // 2. Trigger AI Evaluation Orchestrator
      await api.post(`/admin/exams/attempts/${attemptId}/evaluate-ai`);
      
      onComplete();
    } catch (err) {
      console.error('Submission failed', err);
      alert('Failed to submit exam.');
      setIsSubmitting(false);
    }
  };

  if (isSubmitting) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-6">
        <Loader2 className="w-12 h-12 animate-spin text-emerald-400" />
        <h2 className="text-2xl font-bold text-white font-display">Submitting Exam...</h2>
        <p className="text-neutral-400">AI is reviewing your submission, parsing linguistic properties...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-8">
      {questions.map((q, idx) => (
        <div key={q.id} className="glass p-6 rounded-2xl">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Question {idx + 1}</h3>
            {q.type !== 'READ_ONLY_TEXT' && (
               <span className="text-sm font-bold text-neutral-400">{q.points} points</span>
            )}
          </div>
          
          <div className="prose prose-invert max-w-none mb-6">
            <p className="text-neutral-200 text-lg leading-relaxed whitespace-pre-wrap">{q.text}</p>
          </div>

          {q.type === 'READ_ONLY_TEXT' && (
            <div className="bg-sky-500/10 border border-sky-500/20 text-sky-300 p-4 rounded-xl text-sm italic">
              Please read the passage above. No response is required for this block.
            </div>
          )}

          {['SHORT_ANSWER', 'ESSAY'].includes(q.type) && (
            <div>
              <textarea
                className="input-field min-h-[150px] text-lg p-4"
                placeholder="Type your answer here..."
                value={responses[q.id] || ''}
                onChange={(e) => setResponses({ ...responses, [q.id]: e.target.value })}
              />
            </div>
          )}
        </div>
      ))}

      <div className="flex justify-end pt-6">
        <button onClick={handleSubmit} className="btn-primary py-3 px-8 text-lg">
          <Send className="w-5 h-5" /> Submit Exam
        </button>
      </div>
    </div>
  );
}
