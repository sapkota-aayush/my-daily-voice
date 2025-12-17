import { useState, useMemo, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mic, Square } from 'lucide-react';
import { useJournalData } from '@/hooks/useJournalData';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const DayView = () => {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getReflectionForDate, refetch } = useJournalData();

  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [contentLength, setContentLength] = useState(0);

  const contentRef = useRef<string>('');
  const editorRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  const dateObj = useMemo(() => {
    if (!date) return new Date();
    const [y, m, d] = date.split('-').map(Number);
    return new Date(y, m - 1, d);
  }, [date]);

  const dateString = date || '';
  const reflection = getReflectionForDate(dateString);

  const getTodayString = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };
  const isToday = dateString === getTodayString();

  const formattedDate = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Load existing data
  useEffect(() => {
    if (reflection?.reflection_summary && editorRef.current) {
      const htmlContent = reflection.reflection_summary.replace(/\n/g, '<br>');
      contentRef.current = htmlContent;
      editorRef.current.innerHTML = htmlContent;
      setContentLength(reflection.reflection_summary.trim().length);
    }
  }, [reflection, dateString]);

  const saveContent = async (text: string) => {
    if (!text.trim()) return;
    setIsSaving(true);
    try {
      await supabase.from('daily_reflections').upsert({
        date: dateString,
        reflection_summary: text.trim(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'date' });
      setLastSaved(new Date());
      await refetch();
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditorInput = () => {
    if (editorRef.current) {
      contentRef.current = editorRef.current.innerHTML;
      setContentLength(editorRef.current.innerText?.trim().length || 0);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => saveContent(editorRef.current?.innerText || ''), 1500);
    }
  };

  return (
    <div className="min-h-screen gradient-warm flex flex-col relative">
      {/* Header */}
      <header className="px-5 pt-6 pb-4 flex items-center gap-3">
        <button onClick={() => navigate('/')} className="w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary/50 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="font-display text-xl text-foreground">{formattedDate}</h1>
          <p className="text-xs text-muted-foreground/50 mt-0.5">
            {isSaving ? 'Saving...' : lastSaved ? 'Saved' : ''}
          </p>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 pb-32">
        <div
          ref={editorRef}
          contentEditable={isToday}
          onInput={handleEditorInput}
          suppressContentEditableWarning={true}
          data-placeholder={isToday ? "Start writing..." : "No entry for this day."}
          className={cn(
            "w-full min-h-[300px] bg-transparent text-foreground text-lg leading-relaxed focus:outline-none font-display editor-content",
            !isToday && "cursor-default"
          )}
        />
      </div>

      <style>{`
        .editor-content:empty:before {
          content: attr(data-placeholder);
          color: hsl(var(--muted-foreground));
          opacity: 0.4;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
};

export default DayView;
