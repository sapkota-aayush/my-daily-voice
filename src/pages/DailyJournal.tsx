import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Check, X, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TaskList } from '@/components/TaskList';
import { useJournalData } from '@/hooks/useJournalData';
import { cn } from '@/lib/utils';

const DailyJournal = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { getTasksForDate, getReflectionForDate, updateTaskStatus } = useJournalData();

  const dateString = selectedDate.toISOString().split('T')[0];
  const tasks = getTasksForDate(dateString);
  const reflection = getReflectionForDate(dateString);

  const completedTasks = tasks.filter(t => t.status === 'completed');
  const missedTasks = tasks.filter(t => t.status === 'missed');
  const pendingTasks = tasks.filter(t => t.status === 'pending');

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    setSelectedDate(newDate);
  };

  const isToday = dateString === new Date().toISOString().split('T')[0];

  const formatDate = (date: Date) => {
    if (isToday) return 'Today';
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="min-h-screen gradient-warm">
      <div className="max-w-lg mx-auto px-5 py-6 space-y-6">
        {/* Header */}
        <header className="flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="font-display text-2xl flex-1">Daily Journal</h1>
        </header>

        {/* Date Navigator */}
        <div className="flex items-center justify-between bg-card rounded-xl p-3 shadow-soft">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigateDate('prev')}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <span className="font-medium">{formatDate(selectedDate)}</span>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigateDate('next')}
            disabled={isToday}
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card rounded-xl p-4 text-center shadow-soft">
            <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-2">
              <Check className="w-4 h-4 text-success" />
            </div>
            <p className="text-2xl font-display">{completedTasks.length}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </div>
          <div className="bg-card rounded-xl p-4 text-center shadow-soft">
            <div className="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-2">
              <X className="w-4 h-4 text-destructive" />
            </div>
            <p className="text-2xl font-display">{missedTasks.length}</p>
            <p className="text-xs text-muted-foreground">Missed</p>
          </div>
          <div className="bg-card rounded-xl p-4 text-center shadow-soft">
            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-2">
              <Clock className="w-4 h-4 text-accent" />
            </div>
            <p className="text-2xl font-display">{pendingTasks.length}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
        </div>

        {/* Today's Plan */}
        <section className="bg-card rounded-2xl p-5 shadow-soft space-y-4">
          <h2 className="font-display text-lg">Today's Plan</h2>
          <TaskList 
            tasks={tasks}
            onStatusChange={isToday ? updateTaskStatus : undefined}
            readonly={!isToday}
          />
        </section>

        {/* Mood & Reflection */}
        {reflection && (
          <section className="bg-card rounded-2xl p-5 shadow-soft space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg">Reflection</h2>
              {reflection.mood && (
                <span className="px-3 py-1 bg-secondary rounded-full text-sm capitalize">
                  {reflection.mood}
                </span>
              )}
            </div>
            
            {reflection.reflectionSummary ? (
              <p className="text-sm text-muted-foreground leading-relaxed italic">
                "{reflection.reflectionSummary}"
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                No reflection recorded yet.
              </p>
            )}

            {/* Completion Rate */}
            <div className="pt-2 border-t border-border">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Completion Rate</span>
                <span className="font-medium">{reflection.completionRate}%</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    reflection.completionRate >= 80 ? "bg-success" :
                    reflection.completionRate >= 50 ? "bg-accent" : "bg-muted-foreground"
                  )}
                  style={{ width: `${reflection.completionRate}%` }}
                />
              </div>
            </div>
          </section>
        )}

        {!reflection && tasks.length === 0 && (
          <div className="bg-card/50 rounded-xl p-8 text-center border border-dashed border-border">
            <p className="text-muted-foreground">
              No journal entry for this day.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyJournal;
