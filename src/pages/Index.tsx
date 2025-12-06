import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sun, Moon, Calendar, BarChart3, Mic, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { ProgressCard } from '@/components/ProgressCard';
import { useJournalData } from '@/hooks/useJournalData';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const [recordingType, setRecordingType] = useState<'morning' | 'evening' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { processMorningPlan, processEveningCheckIn, getTodayProgress, isLoading } = useJournalData();
  const { toast } = useToast();

  const progress = getTodayProgress();

  const handleTranscriptionComplete = async (text: string) => {
    setIsProcessing(true);
    
    try {
      if (recordingType === 'morning') {
        const tasks = await processMorningPlan(text);
        toast({
          title: "Morning plan recorded",
          description: `AI extracted ${tasks?.length || 0} tasks for today`,
        });
      } else if (recordingType === 'evening') {
        const result = await processEveningCheckIn(text);
        toast({
          title: "Evening check-in complete",
          description: `Mood: ${result.mood} • ${result.completionRate}% completion`,
        });
      }
    } catch (error: any) {
      console.error('Error processing:', error);
      toast({
        title: "Processing failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setRecordingType(null);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen gradient-warm flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

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
            Speak naturally. AI will extract your tasks and analyze your mood.
          </p>
        </div>
      </div>

      {/* Voice Recorder Modal */}
      <VoiceRecorder
        isOpen={recordingType !== null}
        type={recordingType || 'morning'}
        onClose={() => !isProcessing && setRecordingType(null)}
        onTranscriptionComplete={handleTranscriptionComplete}
        isProcessing={isProcessing}
      />
    </div>
  );
};

export default Index;
