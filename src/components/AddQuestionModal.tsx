import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

interface AddQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetId: string;
  type: 'QUIZ' | 'EXAM';
}

export function AddQuestionModal({ isOpen, onClose, targetId, type }: AddQuestionModalProps) {
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [points, setPoints] = useState(1);
  const [options, setOptions] = useState<string[]>(['', '']);
  const [correctIndex, setCorrectIndex] = useState(0);

  const mutation = useMutation({
    mutationFn: async (payload: any) => {
      const endpoint = type === 'QUIZ' ? `admin/quizzes/questions` : `exams/${targetId}/questions`;
      return api.post(`/${endpoint}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [type.toLowerCase(), targetId] });
      setText('');
      setPoints(1);
      setOptions(['', '']);
      setCorrectIndex(0);
      onClose();
    }
  });

  if (!isOpen) return null;

  const handleOptionChange = (idx: number, val: string) => {
    const next = [...options];
    next[idx] = val;
    setOptions(next);
  };

  const addOptionRow = () => setOptions([...options, '']);
  const removeOptionRow = (idx: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== idx));
    if (correctIndex >= options.length - 1) setCorrectIndex(0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || options.some(opt => !opt.trim())) {
      alert('Please fill out the question text and all answer rows.');
      return;
    }

    const payload = type === 'QUIZ' 
      ? { quizId: targetId, text, options, correctOptionIndex: correctIndex, points }
      : { examId: targetId, text, answers: options.map((opt, i) => ({ text: opt, isCorrect: i === correctIndex })), type: 'MCQ', points };

    mutation.mutate(payload);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-900 p-6 text-theme-text shadow-2xl">
        <h3 className="text-lg font-bold border-b border-neutral-800 pb-2">Add Manual Question to {type}</h3>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs text-theme-muted mb-1">Question Text</label>
            <input type="text" value={text} onChange={(e) => setText(e.target.value)} className="w-full rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-sm outline-none focus:border-cyan-500" placeholder="Type question here..." />
          </div>

          <div className="space-y-2">
            <label className="block text-xs text-theme-muted">Answer Options (Select correct radio link)</label>
            {options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input type="radio" checked={correctIndex === idx} onChange={() => setCorrectIndex(idx)} className="accent-cyan-500" />
                <input type="text" value={opt} onChange={(e) => handleOptionChange(idx, e.target.value)} className="flex-1 rounded-lg border border-neutral-800 bg-neutral-950 p-2 text-xs outline-none" placeholder={`Option ${idx + 1}`} />
                {options.length > 2 && (
                  <button type="button" onClick={() => removeOptionRow(idx)} className="text-xs text-theme-muted hover:text-red-400">&times;</button>
                )}
              </div>
            ))}
            <button type="button" onClick={addOptionRow} className="text-xs text-cyan-400 hover:underline">+ Add Alternative Choice</button>
          </div>

          <div>
            <label className="block text-xs text-theme-muted mb-1">Points Allocated</label>
            <input type="number" min="1" value={points} onChange={(e) => setPoints(parseInt(e.target.value, 10) || 1)} className="w-40 rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-sm outline-none" />
          </div>

          <div className="flex justify-end gap-2 border-t border-neutral-800 pt-3">
            <button type="button" onClick={onClose} className="px-3 py-2 text-xs text-theme-muted">Cancel</button>
            <button type="submit" className="rounded-lg bg-cyan-500 px-4 py-2 text-xs font-bold text-black hover:bg-cyan-400">Save Question</button>
          </div>
        </form>
      </div>
    </div>
  );
}
