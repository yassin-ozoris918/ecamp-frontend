import toast from 'react-hot-toast';
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useTranslation } from 'react-i18next';

interface AddQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetId: string;
  type: 'QUIZ' | 'EXAM';
}

export function AddQuestionModal({ isOpen, onClose, targetId, type }: AddQuestionModalProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [points, setPoints] = useState(1);
  const [pointsRaw, setPointsRaw] = useState('1');
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
      setPointsRaw('1');
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
      toast.error(t('quizBuilder.validationFillAll'));
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
        <h3 className="text-lg font-bold border-b border-neutral-800 pb-2">{t('quizBuilder.addManualQuestion')} ({type})</h3>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs text-theme-muted mb-1">{t('quizBuilder.questionText')}</label>
            <input type="text" value={text} onChange={(e) => setText(e.target.value)} className="w-full rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-sm outline-none focus:border-cyan-500" placeholder={t('quizBuilder.typeQuestionHere')} />
          </div>

          <div className="space-y-2">
            <label className="block text-xs text-theme-muted">{t('quizBuilder.answerOptions')}</label>
            {options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input type="radio" checked={correctIndex === idx} onChange={() => setCorrectIndex(idx)} className="accent-cyan-500" />
                <input type="text" value={opt} onChange={(e) => handleOptionChange(idx, e.target.value)} className="flex-1 rounded-lg border border-neutral-800 bg-neutral-950 p-2 text-xs outline-none" placeholder={`${t('quizBuilder.option')} ${idx + 1}`} />
                {options.length > 2 && (
                  <button type="button" onClick={() => removeOptionRow(idx)} className="text-xs text-theme-muted hover:text-red-400">&times;</button>
                )}
              </div>
            ))}
            <button type="button" onClick={addOptionRow} className="text-xs text-cyan-400 hover:underline">+ {t('quizBuilder.addAlternativeChoice')}</button>
          </div>

          <div>
            <label className="block text-xs text-theme-muted mb-1">{t('quizBuilder.pointsAllocated')}</label>
            <input
              type="number" min="0.5" step="0.5"
              value={pointsRaw}
              onChange={(e) => setPointsRaw(e.target.value)}
              onBlur={(e) => {
                const val = parseFloat(e.target.value);
                const safe = isNaN(val) || val < 0.5 ? 0.5 : val;
                setPoints(safe);
                setPointsRaw(String(safe));
              }}
              className="w-40 rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-sm outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-neutral-800 pt-3">
            <button type="button" onClick={onClose} className="px-3 py-2 text-xs text-theme-muted">{t('common.cancel')}</button>
            <button type="submit" className="rounded-lg bg-cyan-500 px-4 py-2 text-xs font-bold text-black hover:bg-cyan-400">{t('quizBuilder.saveQuestion')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
