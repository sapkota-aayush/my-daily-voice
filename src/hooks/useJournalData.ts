import { useState, useEffect } from 'react';
import { Task, DailyReflection, WeeklySummary } from '@/types/journal';
import { generateReflectionSummary, generateWeeklyInsight, generateWeeklyHighlight } from '@/lib/mockAI';

const TASKS_KEY = 'journal_tasks';
const REFLECTIONS_KEY = 'journal_reflections';

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

  useEffect(() => {
    const storedTasks = localStorage.getItem(TASKS_KEY);
    const storedReflections = localStorage.getItem(REFLECTIONS_KEY);
    
    if (storedTasks) setTasks(JSON.parse(storedTasks));
    if (storedReflections) setReflections(JSON.parse(storedReflections));
    
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
    }
  }, [tasks, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(REFLECTIONS_KEY, JSON.stringify(reflections));
    }
  }, [reflections, isLoading]);

  const addTasks = (newTasks: string[], date: string = getToday()) => {
    const tasksToAdd: Task[] = newTasks.map((name, index) => ({
      id: `${date}-${Date.now()}-${index}`,
      date,
      name,
      status: 'pending' as const,
    }));
    
    setTasks(prev => [...prev, ...tasksToAdd]);
    updateReflection(date, { morningPlanRecorded: true });
    return tasksToAdd;
  };

  const updateTaskStatus = (taskId: string, status: Task['status']) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, status } : task
    ));
  };

  const getTasksForDate = (date: string): Task[] => {
    return tasks.filter(task => task.date === date);
  };

  const getReflectionForDate = (date: string): DailyReflection | undefined => {
    return reflections.find(r => r.date === date);
  };

  const updateReflection = (date: string, updates: Partial<DailyReflection>) => {
    setReflections(prev => {
      const existing = prev.find(r => r.date === date);
      if (existing) {
        return prev.map(r => r.date === date ? { ...r, ...updates } : r);
      } else {
        const newReflection: DailyReflection = {
          date,
          mood: '',
          reflectionSummary: '',
          completionRate: 0,
          morningPlanRecorded: false,
          eveningCheckInRecorded: false,
          ...updates,
        };
        return [...prev, newReflection];
      }
    });
  };

  const recordEveningCheckIn = (
    date: string,
    completedTaskIds: string[],
    missedTaskIds: string[],
    mood: string
  ) => {
    // Update task statuses
    setTasks(prev => prev.map(task => {
      if (completedTaskIds.includes(task.id)) {
        return { ...task, status: 'completed' as const };
      }
      if (missedTaskIds.includes(task.id)) {
        return { ...task, status: 'missed' as const };
      }
      return task;
    }));

    // Calculate completion rate
    const dayTasks = tasks.filter(t => t.date === date);
    const completed = completedTaskIds.length;
    const total = dayTasks.length || 1;
    const completionRate = Math.round((completed / total) * 100);

    // Generate reflection
    const updatedTasks = dayTasks.map(task => ({
      ...task,
      status: completedTaskIds.includes(task.id) ? 'completed' as const :
              missedTaskIds.includes(task.id) ? 'missed' as const : task.status
    }));
    const reflectionSummary = generateReflectionSummary(updatedTasks);

    updateReflection(date, {
      mood,
      reflectionSummary,
      completionRate,
      eveningCheckInRecorded: true,
    });
  };

  const getWeeklySummary = (): WeeklySummary => {
    const today = new Date();
    const weekStart = getWeekStart(today);
    
    // Get all tasks and reflections for this week
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
    
    // Calculate average completion
    const avgCompletion = weekReflections.length > 0
      ? Math.round(weekReflections.reduce((sum, r) => sum + r.completionRate, 0) / weekReflections.length)
      : 0;

    // Find most common mood
    const moodCounts: Record<string, number> = {};
    weekReflections.forEach(r => {
      if (r.mood) {
        moodCounts[r.mood] = (moodCounts[r.mood] || 0) + 1;
      }
    });
    const commonMood = Object.entries(moodCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'Not enough data';

    return {
      weekStartDate: weekStart,
      totalTasks: total,
      completed,
      missed,
      avgCompletion,
      commonMood,
      weeklyHighlight: generateWeeklyHighlight(weekReflections),
      aiInsight: generateWeeklyInsight(),
    };
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
      reflectionSummary: reflection?.reflectionSummary || '',
      hasMorningPlan: reflection?.morningPlanRecorded || false,
      hasEveningCheckIn: reflection?.eveningCheckInRecorded || false,
      totalTasks: total,
      completedTasks: completed,
    };
  };

  return {
    tasks,
    reflections,
    isLoading,
    addTasks,
    updateTaskStatus,
    getTasksForDate,
    getReflectionForDate,
    updateReflection,
    recordEveningCheckIn,
    getWeeklySummary,
    getTodayProgress,
  };
}
