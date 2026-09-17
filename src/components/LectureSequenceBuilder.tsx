import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import { ArrowUp, ArrowDown, FileQuestion, PlayCircle, Paperclip, Trash2, Edit3, Settings } from 'lucide-react';
import { Badge, Spinner } from './ui';
import { useConfirm, ConfirmDialog } from '../hooks/useConfirm';

function ItemIcon({ type, className }: { type: string; className?: string }) {
  if (type === 'QUIZ') return <FileQuestion className={className} />;

  if (type === 'ATTACHMENT') return <Paperclip className={className} />;
  return <PlayCircle className={className} />;
}

function DeleteItemButton({ itemId, type, onDeleted }: { itemId: string; type: 'SESSION' | 'QUIZ' | 'ATTACHMENT'; onDeleted: () => void }) {
  const { confirm, state: confirmState, handleConfirm, handleCancel } = useConfirm();

  return (
    <>
      <button
        onClick={async (e) => {
          e.stopPropagation();
          const ok = await confirm('Delete Item', 'Are you sure you want to delete this item?');
          if (!ok) return;
          try {
            const endpoint = type === 'SESSION' ? 'sessions' : type === 'QUIZ' ? 'quizzes' : 'attachments';
            await api.delete(`/${endpoint}/${itemId}`);
            onDeleted();
          } catch(err) {
            console.error(err);
          }
        }}
        className="p-1.5 rounded-lg text-theme-muted hover:text-rose-700 dark:text-rose-300 hover:bg-rose-500/10 transition-colors"
        title="Delete Item"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>

      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </>
  );
}

export function LectureSequenceBuilder({ 
  lectureId, 
  initialItems, 
  onReordered,
  onAddQuestion,
  onEditQuizSettings
}: { 
  lectureId: string; 
  initialItems: any[];
  onReordered: () => void;
  onAddQuestion?: (id: string, type: 'EXAM'|'QUIZ') => void;
  onEditQuizSettings?: (quiz: any) => void;
}) {
  const [items, setItems] = useState(() => {
    // Ensure items are sorted initially
    return [...initialItems].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
  });

  const reorderMutation = useMutation({
    mutationFn: async (newItems: any[]) => {
      const payload = newItems.map((item, index) => ({
        id: item.id,
        type: item.type,
        orderIndex: index,
      }));
      await api.put(`/lectures/${lectureId}/reorder`, { items: payload });
    },
    onSuccess: () => {
      onReordered();
    }
  });

  function moveItem(index: number, direction: 'up' | 'down') {
    const newItems = [...items];
    if (direction === 'up' && index > 0) {
      const temp = newItems[index];
      newItems[index] = newItems[index - 1];
      newItems[index - 1] = temp;
    } else if (direction === 'down' && index < newItems.length - 1) {
      const temp = newItems[index];
      newItems[index] = newItems[index + 1];
      newItems[index + 1] = temp;
    } else {
      return;
    }
    setItems(newItems);
    reorderMutation.mutate(newItems);
  }

  if (items.length === 0) {
    return <p className="text-sm text-theme-muted text-center py-4">No items yet.</p>;
  }

  return (
    <div className="space-y-2 relative">
      {reorderMutation.isPending && (
        <div className="absolute inset-0 bg-theme-bg/50 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-xl">
          <Spinner className="w-6 h-6 text-accent-400" />
        </div>
      )}
      {items.map((item, index) => (
        <div 
          key={item.id} 
          onClick={() => {
            if (item.type === 'QUIZ' && onAddQuestion) {
              onAddQuestion(item.id, 'QUIZ');
            }
          }}
          className={`flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] transition-colors ${item.type === 'QUIZ' ? 'cursor-pointer hover:border-cyan-500/50 hover:bg-cyan-500/5' : 'hover:border-white/[0.1]'}`}
        >
          <div className="flex flex-col gap-1">
            <button 
              onClick={(e) => { e.stopPropagation(); moveItem(index, 'up'); }}
              disabled={index === 0}
              className="text-theme-muted hover:text-accent-700 dark:text-accent-300 disabled:opacity-30 disabled:hover:text-theme-muted transition-colors"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); moveItem(index, 'down'); }}
              disabled={index === items.length - 1}
              className="text-theme-muted hover:text-accent-700 dark:text-accent-300 disabled:opacity-30 disabled:hover:text-theme-muted transition-colors"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
          </div>
          
          <ItemIcon type={item.type} className="w-5 h-5 text-theme-muted" />
          
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium text-theme-muted block truncate">{item.title}</span>
            <span className="text-[10px] text-theme-muted uppercase tracking-wider">{item.type}</span>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            {item.type === 'QUIZ' && onEditQuizSettings && (
              <button 
                onClick={(e) => { e.stopPropagation(); onEditQuizSettings(item); }} 
                className="p-1.5 rounded-lg text-theme-muted hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors" 
                title="Edit Quiz Settings"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            )}
            {item.type === 'QUIZ' && onAddQuestion && (
              <button 
                onClick={(e) => { e.stopPropagation(); onAddQuestion(item.id, 'QUIZ'); }} 
                className="p-1.5 rounded-lg text-theme-muted hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors" 
                title="Open Quiz Builder"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}
            <DeleteItemButton itemId={item.id} type={item.type} onDeleted={onReordered} />
            <Badge variant="default" className="text-[10px] bg-black/40">
              idx: {index}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}
