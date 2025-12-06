import { Link } from 'react-router-dom';
import { ArrowLeft, Target, Check, X, TrendingUp, Smile, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useJournalData } from '@/hooks/useJournalData';
import { cn } from '@/lib/utils';

const WeeklySummary = () => {
  const { getWeeklySummary } = useJournalData();
  const summary = getWeeklySummary();

  const formatWeekRange = (startDate: string) => {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    
    const formatOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${start.toLocaleDateString('en-US', formatOptions)} - ${end.toLocaleDateString('en-US', formatOptions)}`;
  };

  const stats = [
    { 
      label: 'Total Tasks', 
      value: summary.totalTasks, 
      icon: Target,
      color: 'bg-primary/20 text-primary'
    },
    { 
      label: 'Completed', 
      value: summary.completed, 
      icon: Check,
      color: 'bg-success/20 text-success'
    },
    { 
      label: 'Missed', 
      value: summary.missed, 
      icon: X,
      color: 'bg-destructive/20 text-destructive'
    },
    { 
      label: 'Avg. Completion', 
      value: `${summary.avgCompletion}%`, 
      icon: TrendingUp,
      color: 'bg-accent/20 text-accent'
    },
  ];

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
          <div className="flex-1">
            <h1 className="font-display text-2xl">Weekly Summary</h1>
            <p className="text-sm text-muted-foreground">{formatWeekRange(summary.weekStartDate)}</p>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-card rounded-xl p-4 shadow-soft">
              <div className={cn("w-10 h-10 rounded-full flex items-center justify-center mb-3", stat.color)}>
                <stat.icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-display">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Common Mood */}
        <section className="bg-card rounded-2xl p-5 shadow-soft">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
              <Smile className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-display text-lg">Most Common Mood</h3>
              <p className="text-sm text-muted-foreground">Based on your daily reflections</p>
            </div>
          </div>
          <p className="text-xl font-medium capitalize">{summary.commonMood}</p>
        </section>

        {/* Weekly Highlight */}
        <section className="bg-card rounded-2xl p-5 shadow-soft">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-accent" />
            </div>
            <h3 className="font-display text-lg">Week Highlight</h3>
          </div>
          <p className="text-muted-foreground">{summary.weeklyHighlight}</p>
        </section>

        {/* AI Insight */}
        <section className="gradient-accent rounded-2xl p-5 text-primary-foreground">
          <h3 className="font-display text-lg mb-3">AI Insight</h3>
          <p className="text-primary-foreground/90 leading-relaxed">
            {summary.aiInsight}
          </p>
        </section>

        {/* Progress Bar */}
        <section className="bg-card rounded-2xl p-5 shadow-soft">
          <div className="flex justify-between text-sm mb-3">
            <span className="text-muted-foreground">Weekly Progress</span>
            <span className="font-medium">{summary.avgCompletion}%</span>
          </div>
          <div className="h-4 bg-secondary rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full rounded-full transition-all duration-700 ease-out",
                summary.avgCompletion >= 80 ? "bg-success" :
                summary.avgCompletion >= 50 ? "bg-accent" : "bg-muted-foreground"
              )}
              style={{ width: `${summary.avgCompletion}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            {summary.completed} completed out of {summary.totalTasks} total tasks
          </p>
        </section>
      </div>
    </div>
  );
};

export default WeeklySummary;
