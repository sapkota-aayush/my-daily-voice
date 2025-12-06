import { cn } from '@/lib/utils';

interface ProgressCardProps {
  completionRate: number;
  mood: string;
  reflectionSummary: string;
  completedTasks: number;
  totalTasks: number;
}

export function ProgressCard({ 
  completionRate, 
  mood, 
  reflectionSummary,
  completedTasks,
  totalTasks 
}: ProgressCardProps) {
  const getProgressColor = (rate: number) => {
    if (rate >= 80) return 'bg-success';
    if (rate >= 50) return 'bg-accent';
    return 'bg-muted-foreground';
  };

  return (
    <div className="bg-card rounded-2xl shadow-soft p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg">Today's Progress</h3>
        {mood && (
          <span className="px-3 py-1 bg-secondary rounded-full text-sm capitalize">
            {mood}
          </span>
        )}
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            {completedTasks} of {totalTasks} tasks
          </span>
          <span className="font-medium">{completionRate}%</span>
        </div>
        <div className="h-3 bg-secondary rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full rounded-full transition-all duration-500 ease-out",
              getProgressColor(completionRate)
            )}
            style={{ width: `${completionRate}%` }}
          />
        </div>
      </div>

      {/* Reflection Summary */}
      {reflectionSummary ? (
        <p className="text-sm text-muted-foreground leading-relaxed italic">
          "{reflectionSummary}"
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Complete your evening check-in to see your reflection.
        </p>
      )}
    </div>
  );
}
