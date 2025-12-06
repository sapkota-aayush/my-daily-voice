import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Task {
  id: string;
  date: string;
  name: string;
  status: 'pending' | 'completed' | 'missed';
}

export interface DailyReflection {
  id: string;
  date: string;
  mood: string | null;
  reflection_summary: string | null;
  completion_rate: number;
  morning_plan_recorded: boolean;
  evening_checkin_recorded: boolean;
}

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

export function useJournalData() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reflections, setReflections] = useState<DailyReflection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Fetch all data
  const fetchData = useCallback(async () => {
    try {
      const [tasksResult, reflectionsResult] = await Promise.all([
        supabase.from('tasks').select('*').order('created_at', { ascending: true }),
        supabase.from('daily_reflections').select('*').order('date', { ascending: false })
      ]);

      if (tasksResult.error) throw tasksResult.error;
      if (reflectionsResult.error) throw reflectionsResult.error;

      setTasks(tasksResult.data as Task[]);
      setReflections(reflectionsResult.data as DailyReflection[]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: 'Error', description: 'Failed to load journal data', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const processMorningPlan = async (transcription: string, date: string = getToday()) => {
    try {
      // Call AI to extract tasks
      const { data, error } = await supabase.functions.invoke('process-journal', {
        body: { type: 'morning', transcription }
      });

      if (error) throw error;

      const extractedTasks: string[] = data.tasks || [];
      
      // Insert tasks into database
      const tasksToInsert = extractedTasks.map(name => ({
        date,
        name,
        status: 'pending' as const
      }));

      const { data: insertedTasks, error: insertError } = await supabase
        .from('tasks')
        .insert(tasksToInsert)
        .select();

      if (insertError) throw insertError;

      // Create/update reflection record
      await supabase
        .from('daily_reflections')
        .upsert({
          date,
          morning_plan_recorded: true,
          updated_at: new Date().toISOString()
        }, { onConflict: 'date' });

      await fetchData();
      return insertedTasks;
    } catch (error) {
      console.error('Error processing morning plan:', error);
      throw error;
    }
  };

  const processEveningCheckIn = async (transcription: string, date: string = getToday()) => {
    try {
      const dayTasks = tasks.filter(t => t.date === date);
      
      // Call AI to process evening check-in
      const { data, error } = await supabase.functions.invoke('process-journal', {
        body: { type: 'evening', transcription, tasks: dayTasks }
      });

      if (error) throw error;

      const { completedTasks, missedTasks, mood, reflectionSummary } = data;

      // Update task statuses based on AI analysis
      for (const task of dayTasks) {
        const isCompleted = completedTasks?.some((t: string) => 
          task.name.toLowerCase().includes(t.toLowerCase()) || 
          t.toLowerCase().includes(task.name.toLowerCase())
        );
        const isMissed = missedTasks?.some((t: string) => 
          task.name.toLowerCase().includes(t.toLowerCase()) || 
          t.toLowerCase().includes(task.name.toLowerCase())
        );

        if (isCompleted) {
          await supabase.from('tasks').update({ status: 'completed' }).eq('id', task.id);
        } else if (isMissed) {
          await supabase.from('tasks').update({ status: 'missed' }).eq('id', task.id);
        }
      }

      // Calculate completion rate
      const updatedTasks = await supabase.from('tasks').select('*').eq('date', date);
      const completed = updatedTasks.data?.filter(t => t.status === 'completed').length || 0;
      const total = updatedTasks.data?.length || 1;
      const completionRate = Math.round((completed / total) * 100);

      // Update reflection record
      await supabase
        .from('daily_reflections')
        .upsert({
          date,
          mood,
          reflection_summary: reflectionSummary,
          completion_rate: completionRate,
          evening_checkin_recorded: true,
          updated_at: new Date().toISOString()
        }, { onConflict: 'date' });

      await fetchData();
      return { mood, reflectionSummary, completionRate };
    } catch (error) {
      console.error('Error processing evening check-in:', error);
      throw error;
    }
  };

  const updateTaskStatus = async (taskId: string, status: Task['status']) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status })
        .eq('id', taskId);
      
      if (error) throw error;
      
      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, status } : task
      ));
    } catch (error) {
      console.error('Error updating task:', error);
      toast({ title: 'Error', description: 'Failed to update task', variant: 'destructive' });
    }
  };

  const getTasksForDate = (date: string): Task[] => {
    return tasks.filter(task => task.date === date);
  };

  const getReflectionForDate = (date: string): DailyReflection | undefined => {
    return reflections.find(r => r.date === date);
  };

  const getTodayProgress = () => {
    const today = getToday();
    const todayTasks = getTasksForDate(today);
    const reflection = getReflectionForDate(today);
    
    const completed = todayTasks.filter(t => t.status === 'completed').length;
    const total = todayTasks.length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      completionRate,
      mood: reflection?.mood || '',
      reflectionSummary: reflection?.reflection_summary || '',
      hasMorningPlan: reflection?.morning_plan_recorded || false,
      hasEveningCheckIn: reflection?.evening_checkin_recorded || false,
      totalTasks: total,
      completedTasks: completed,
    };
  };

  const getWeeklySummary = () => {
    const today = new Date();
    const weekStart = getWeekStart(today);
    
    const weekTasks = tasks.filter(task => {
      const taskDate = new Date(task.date);
      const taskWeekStart = getWeekStart(taskDate);
      return taskWeekStart === weekStart;
    });

    const weekReflections = reflections.filter(r => {
      const refDate = new Date(r.date);
      const refWeekStart = getWeekStart(refDate);
      return refWeekStart === weekStart;
    });

    const completed = weekTasks.filter(t => t.status === 'completed').length;
    const missed = weekTasks.filter(t => t.status === 'missed').length;
    const total = weekTasks.length;
    
    const avgCompletion = weekReflections.length > 0
      ? Math.round(weekReflections.reduce((sum, r) => sum + r.completion_rate, 0) / weekReflections.length)
      : 0;

    const moodCounts: Record<string, number> = {};
    weekReflections.forEach(r => {
      if (r.mood) {
        moodCounts[r.mood] = (moodCounts[r.mood] || 0) + 1;
      }
    });
    const commonMood = Object.entries(moodCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'Not enough data';

    // Find best day
    const bestDay = weekReflections.reduce((best, curr) => 
      curr.completion_rate > (best?.completion_rate || 0) ? curr : best
    , weekReflections[0]);
    
    let weeklyHighlight = "Keep building your journaling habit to unlock personalized highlights.";
    if (bestDay && bestDay.completion_rate > 0) {
      const date = new Date(bestDay.date);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      weeklyHighlight = `${dayName} was your most productive day with ${bestDay.completion_rate}% completion.`;
    }

    const insights = [
      "You tend to be most productive mid-week. Consider scheduling important tasks on Tuesdays and Wednesdays.",
      "Your completion rate improves when you set fewer, more focused goals. Quality over quantity works well for you.",
      "Morning planning sessions correlate with higher daily completion rates. Keep up this valuable habit.",
      "You've shown consistent progress this week. Celebrate these small victories.",
    ];

    return {
      weekStartDate: weekStart,
      totalTasks: total,
      completed,
      missed,
      avgCompletion,
      commonMood,
      weeklyHighlight,
      aiInsight: insights[Math.floor(Math.random() * insights.length)],
    };
  };

  return {
    tasks,
    reflections,
    isLoading,
    processMorningPlan,
    processEveningCheckIn,
    updateTaskStatus,
    getTasksForDate,
    getReflectionForDate,
    getTodayProgress,
    getWeeklySummary,
    refetch: fetchData,
  };
}
