import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon, BarChart3 } from 'lucide-react';
import { Calendar } from '@/components/Calendar';
import { useJournalData } from '@/hooks/useJournalData';

const Index = () => {
  const navigate = useNavigate();
  const { reflections, isLoading } = useJournalData();

  // Collect all dates that have actual entries (with content)
  const datesWithEntries = useMemo(() => {
    const dates = new Set<string>();
    // Only add dates that have actual journal content
    reflections.forEach(r => {
      if (r.reflection_summary && r.reflection_summary.trim().length > 0) {
        dates.add(r.date);
      }
    });
    return dates;
  }, [reflections]);

  // Navigate to day view when a date is tapped
  const handleDateSelect = (date: Date, dateString: string) => {
    navigate(`/day/${dateString}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen gradient-warm flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-warm flex flex-col">
      {/* Calendar takes center stage */}
      <div className="flex-1 flex flex-col justify-center px-4 pt-8 pb-4">
        <Calendar
          datesWithEntries={datesWithEntries}
          onDateSelect={handleDateSelect}
        />
      </div>

      {/* Review buttons */}
      <div className="px-5 pb-4">
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/weekly')}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-card/60 hover:bg-card rounded-xl transition-colors"
          >
            <CalendarIcon className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-foreground">Weekly</span>
          </button>
          <button
            onClick={() => navigate('/monthly')}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-card/60 hover:bg-card rounded-xl transition-colors"
          >
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-foreground">Monthly</span>
          </button>
        </div>
      </div>

      {/* Subtle footer hint */}
      <div className="pb-6 text-center">
        <p className="text-xs text-muted-foreground/60">
          Tap a date to view or create an entry
        </p>
      </div>
    </div>
  );
};

export default Index;
