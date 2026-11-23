import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { EyeOff, Loader2, MoveRight } from 'lucide-react';
import { Modal } from './Modal';
import { api } from '../lib/api';
import { apiErrorMessage, useContentTree, type MaterialKind } from '../lib/contentOrganizer';

/** Destination value encoded as "<kind>:<id>". */
type Dest = `${MaterialKind}:${string}`;

/**
 * Move a handout to another lecture, a chapter's files or the course files — in this or any course.
 */
export function MaterialMoveModal({
  open,
  material,
  courseId,
  onClose,
  onDone,
}: {
  open: boolean;
  material: { kind: MaterialKind; id: string; title: string; parentId: string } | null;
  /** The course the file currently belongs to (pre-selected). */
  courseId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const tree = useContentTree(open);
  const [targetCourseId, setTargetCourseId] = useState(courseId);
  const [dest, setDest] = useState<Dest | ''>('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setTargetCourseId(courseId);
      setDest('');
    }
  }, [open, courseId]);

  const course = useMemo(() => tree.data?.find((c) => c.id === targetCourseId), [tree.data, targetCourseId]);
  const current: Dest | '' = material ? (`${material.kind}:${material.parentId}` as Dest) : '';
  const staffOnly = dest.startsWith('chapter:') || dest.startsWith('course:');

  const submit = async () => {
    if (!material || !dest || dest === current) return;
    const [targetKind, targetId] = dest.split(':') as [MaterialKind, string];
    setBusy(true);
    try {
      await api.post(`/content/materials/${material.kind}/${material.id}/move`, { targetKind, targetId });
      toast.success('File moved.');
      onDone();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not move the file.'));
    } finally {
      setBusy(false);
    }
  };

  const chapterTitle = (id: string | null) => course?.chapters.find((c) => c.id === id)?.title;

  return (
    <Modal open={open} onClose={() => !busy && onClose()} title={`Move “${material?.title ?? ''}”`}>
      <div className="space-y-4">
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
                value={targetCourseId}
                onChange={(e) => {
                  setTargetCourseId(e.target.value);
                  setDest('');
                }}
              >
                {tree.data?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                    {c.id === courseId ? ' (this course)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Put it in</label>
              <select className="input" value={dest} onChange={(e) => setDest(e.target.value as Dest)}>
                <option value="" disabled>Choose where…</option>
                <optgroup label="Lectures (visible to students)">
                  {course?.lectures.map((l) => (
                    <option key={l.id} value={`lecture:${l.id}`} disabled={`lecture:${l.id}` === current}>
                      {chapterTitle(l.chapterId) ? `${chapterTitle(l.chapterId)} › ` : ''}
                      {l.title}
                      {`lecture:${l.id}` === current ? ' (current)' : ''}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Staff-only files">
                  {course?.chapters.map((ch, i) => (
                    <option key={ch.id} value={`chapter:${ch.id}`} disabled={`chapter:${ch.id}` === current}>
                      Chapter {i + 1} files: {ch.title}
                      {`chapter:${ch.id}` === current ? ' (current)' : ''}
                    </option>
                  ))}
                  {course && (
                    <option value={`course:${course.id}`} disabled={`course:${course.id}` === current}>
                      Course files{`course:${course.id}` === current ? ' (current)' : ''}
                    </option>
                  )}
                </optgroup>
              </select>
            </div>
          </>
        )}

        {staffOnly && (
          <div className="flex gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
            <EyeOff className="w-4 h-4 shrink-0 mt-0.5" />
            <p>Chapter and course files are only visible to staff. Students will no longer see this file.</p>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className="btn-primary" onClick={submit} disabled={busy || !dest || dest === current}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <MoveRight className="w-4 h-4" />}
            Move file
          </button>
        </div>
      </div>
    </Modal>
  );
}
