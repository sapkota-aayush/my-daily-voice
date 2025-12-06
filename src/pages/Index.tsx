import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sun, Moon, Calendar, BarChart3, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { ProgressCard } from '@/components/ProgressCard';
import { useJournalData } from '@/hooks/useJournalData';
import { extractTasksFromText, extractMoodFromText } from '@/lib/mockAI';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const [recordingType, setRecordingType] = useState<'morning' | 'evening' | null>(null);
  const { addTasks, recordEveningCheckIn, getTasksForDate, getTodayProgress } = useJournalData();
  const { toast } = useToast();

  const today = new Date().toISOString().split('T')[0];
  const progress = getTodayProgress();
  const todayTasks = getTasksForDate(today);

  const handleTranscriptionComplete = (text: string) => {
    if (recordingType === 'morning') {
      const tasks = extractTasksFromText(text);
      addTasks(tasks, today);
      toast({
        title: "Morning plan recorded",
        description: `Added ${tasks.length} tasks for today`,
      });
    } else if (recordingType === 'evening') {
      // For demo, mark some tasks as completed/missed randomly
      const pending = todayTasks.filter(t => t.status === 'pending');
      const completed = pending.slice(0, Math.ceil(pending.length * 0.7)).map(t => t.id);
      const missed = pending.slice(Math.ceil(pending.length * 0.7)).map(t => t.id);
      const mood = extractMoodFromText(text);
      
      recordEveningCheckIn(today, completed, missed, mood);
      toast({
        title: "Evening check-in complete",
        description: "Your day has been reflected upon",
      });
    }
    setRecordingType(null);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className="min-h-screen gradient-warm">
      <div className="max-w-lg mx-auto px-5 py-8 space-y-8">
        {/* Header */}
        <header className="text-center space-y-2">
          <p className="text-muted-foreground text-sm">{formatDate(new Date())}</p>
          <h1 className="font-display text-3xl text-foreground">Voice Journal</h1>
        </header>

        {/* Recording Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <Button 
            variant="action" 
            size="lg" 
            className="flex-col h-auto py-6 gap-3"
            onClick={() => setRecordingType('morning')}
            disabled={progress.hasMorningPlan}
          >
            <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
              <Sun className="w-6 h-6 text-accent" />
            </div>
            <div className="space-y-1">
              <span className="block font-medium">Morning Plan</span>
              <span className="block text-xs text-muted-foreground">
                {progress.hasMorningPlan ? 'Recorded ✓' : 'Set your intentions'}
              </span>
            </div>
          </Button>

          <Button 
            variant="action" 
            size="lg" 
            className="flex-col h-auto py-6 gap-3"
            onClick={() => setRecordingType('evening')}
            disabled={progress.hasEveningCheckIn || !progress.hasMorningPlan}
          >
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <Moon className="w-6 h-6 text-primary" />
            </div>
            <div className="space-y-1">
              <span className="block font-medium">Evening Check-In</span>
              <span className="block text-xs text-muted-foreground">
                {progress.hasEveningCheckIn ? 'Completed ✓' : 'Reflect on today'}
              </span>
            </div>
          </Button>
        </div>

        {/* Today's Progress */}
        <ProgressCard 
          completionRate={progress.completionRate}
          mood={progress.mood}
          reflectionSummary={progress.reflectionSummary}
          completedTasks={progress.completedTasks}
          totalTasks={progress.totalTasks}
        />

        {/* Navigation */}
        <div className="grid grid-cols-2 gap-4">
          <Link to="/daily">
            <Button variant="secondary" size="lg" className="w-full gap-2">
              <Calendar className="w-5 h-5" />
              Daily Journal
            </Button>
          </Link>
          <Link to="/weekly">
            <Button variant="secondary" size="lg" className="w-full gap-2">
              <BarChart3 className="w-5 h-5" />
              Weekly Summary
            </Button>
          </Link>
        </div>

        {/* Quick Tip */}
        <div className="bg-card/50 rounded-xl p-4 border border-border/50">
          <p className="text-sm text-muted-foreground text-center">
            <Mic className="w-4 h-4 inline-block mr-1 -mt-0.5" />
            Tip: Speak naturally. Say "Today I want to..." for your morning plan.
          </p>
        </div>
      </div>

      {/* Voice Recorder Modal */}
      <VoiceRecorder
        isOpen={recordingType !== null}
        type={recordingType || 'morning'}
        onClose={() => setRecordingType(null)}
        onTranscriptionComplete={handleTranscriptionComplete}
      />
    </div>
  );
};

export default Index;
