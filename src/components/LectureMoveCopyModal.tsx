import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, Copy, Loader2, MoveRight } from 'lucide-react';
import { Modal } from './Modal';
import { api } from '../lib/api';
import { apiErrorMessage, useContentTree } from '../lib/contentOrganizer';

/**
 * Move a lecture to another chapter / course, or copy it into a course.
 * Nothing is re-uploaded: videos and files are moved or shared.
 */
export function LectureMoveCopyModal({
  open,
  lecture,
  onClose,
  onDone,
}: {
  open: boolean;
  lecture: { id: string; title: string; courseId: string; chapterId: string | null } | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [mode, setMode] = useState<'move' | 'copy'>('move');
  const [courseId, setCourseId] = useState('');
  const [chapterId, setChapterId] = useState<string>(''); // '' = no chapter
  const [busy, setBusy] = useState(false);
  const tree = useContentTree(open);

  useEffect(() => {
    if (open && lecture) {
      setMode('move');
      setCourseId(lecture.courseId);
      setChapterId(lecture.chapterId ?? '');
    }
  }, [open, lecture]);

  const course = useMemo(() => tree.data?.find((c) => c.id === courseId), [tree.data, courseId]);
  const crossCourse = !!lecture && courseId !== lecture.courseId;
  const noChange = !!lecture && mode === 'move' && !crossCourse && (lecture.chapterId ?? '') === chapterId;

  const submit = async () => {
    if (!lecture || !courseId || noChange) return;
    setBusy(true);
    try {
      const body = { courseId, chapterId: chapterId || null };
      if (mode === 'move') {
        const { data } = await api.post(`/content/lectures/${lecture.id}/move`, body);
        toast.success(
          data?.movedToAnotherCourse
            ? `Lecture moved. ${data.studentAccessRemoved ?? 0} student access record(s) were reset.`
            : 'Lecture moved.',
        );
      } else {
        const { data } = await api.post(`/content/lectures/${lecture.id}/copy`, body);
        const c = data?.copied;
        toast.success(c ? `Lecture copied (${c.sessions} sessions, ${c.files} files, ${c.quizzes} quizzes).` : 'Lecture copied.');
      }
      onDone();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err, mode === 'move' ? 'Could not move the lecture.' : 'Could not copy the lecture.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={() => !busy && onClose()} title={`Move or copy “${lecture?.title ?? ''}”`}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Action">
          {(['move', 'copy'] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              onClick={() => setMode(m)}
              className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                mode === m ? 'border-accent-500 bg-accent-500/10 text-accent-700 dark:text-accent-200' : 'border-theme-border text-theme-muted hover:bg-theme-card'
              }`}
            >
              {m === 'move' ? <MoveRight className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {m === 'move' ? 'Move (cut)' : 'Copy'}
            </button>
          ))}
        </div>

        {tree.isLoading ? (
          <div className="flex justify-center py-6 text-theme-muted"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : tree.isError ? (
          <p className="text-sm text-rose-500">Could not load courses.</p>
        ) : (
          <>
            <div>
              <label className="label">Course</label>
              <select
                className="input"
                value={courseId}
                onChange={(e) => {
                  setCourseId(e.target.value);
                  setChapterId('');
                }}
              >
                {tree.data?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                    {c.id === lecture?.courseId ? ' (this course)' : ''}
                    {c.type === 'MATERIALS_ONLY' ? ' — materials only' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Chapter</label>
              <select className="input" value={chapterId} onChange={(e) => setChapterId(e.target.value)}>
                <option value="">No chapter (unassigned lectures)</option>
                {course?.chapters.map((ch, i) => (
                  <option key={ch.id} value={ch.id}>
                    Chapter {i + 1}: {ch.title}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {mode === 'move' && crossCourse && (
          <div className="flex gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              Moving to another course resets <strong>every student's individual access</strong> to this lecture (including
              students who unlocked it with a lecture code). Students of the new course get it through that course. Its
              notifications are re-sent to the new course's students.
            </p>
          </div>
        )}
        {mode === 'copy' && (
          <p className="text-xs text-theme-muted">
            Copies the sessions, files and quizzes. Videos and files are shared — nothing is uploaded again — and deleting
            one copy never removes the other copy's videos or files. Student progress is not copied.
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className="btn-primary" onClick={submit} disabled={busy || !courseId || noChange || tree.isLoading}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === 'move' ? <MoveRight className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {mode === 'move' ? 'Move lecture' : 'Copy lecture'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
