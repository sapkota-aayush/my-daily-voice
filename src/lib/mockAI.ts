import { Task, DailyReflection } from '@/types/journal';

const moods = ['calm', 'energized', 'focused', 'grateful', 'tired', 'hopeful', 'productive'];

const reflectionTemplates = [
  "Today was a day of steady progress. You tackled your priorities with focus.",
  "A balanced day with meaningful accomplishments. Take pride in what you achieved.",
  "You showed resilience today, adapting to challenges as they came.",
  "A productive day filled with purpose. Your efforts are building momentum.",
  "Today brought both wins and lessons. Each step forward counts.",
];

const insightTemplates = [
  "You tend to be most productive mid-week. Consider scheduling important tasks on Tuesdays and Wednesdays.",
  "Your completion rate improves when you set fewer, more focused goals. Quality over quantity works well for you.",
  "Morning planning sessions correlate with higher daily completion rates. Keep up this valuable habit.",
  "You've shown consistent progress this week. Celebrate these small victories.",
  "Rest days seem to boost your productivity the following day. Balance is key.",
];

export function extractTasksFromText(text: string): string[] {
  // Simple mock extraction - in real app, this would use AI
  const commonPhrases = [
    'review project proposal',
    'team standup meeting',
    'finish report draft',
    'email follow-ups',
    'exercise session',
    'read for 30 minutes',
    'plan tomorrow',
    'call with client',
    'code review',
    'documentation update',
  ];
  
  // Return 3-5 random tasks for demo
  const count = Math.floor(Math.random() * 3) + 3;
  const shuffled = [...commonPhrases].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function extractMoodFromText(text: string): string {
  // Mock mood extraction
  return moods[Math.floor(Math.random() * moods.length)];
}

export function generateReflectionSummary(tasks: Task[]): string {
  const completed = tasks.filter(t => t.status === 'completed').length;
  const total = tasks.length;
  const rate = total > 0 ? (completed / total) * 100 : 0;
  
  if (rate >= 80) {
    return "Outstanding day! You crushed your goals and maintained excellent focus throughout.";
  } else if (rate >= 60) {
    return reflectionTemplates[Math.floor(Math.random() * reflectionTemplates.length)];
  } else if (rate >= 40) {
    return "A day of learning and adjustment. Tomorrow brings new opportunities to build on today's foundation.";
  } else {
    return "Some days are about rest and reset. Honor where you are and prepare for a fresh start tomorrow.";
  }
}

export function generateWeeklyInsight(): string {
  return insightTemplates[Math.floor(Math.random() * insightTemplates.length)];
}

export function generateWeeklyHighlight(reflections: DailyReflection[]): string {
  const bestDay = reflections.reduce((best, curr) => 
    curr.completionRate > best.completionRate ? curr : best
  , reflections[0]);
  
  if (bestDay) {
    const date = new Date(bestDay.date);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    return `${dayName} was your most productive day with ${Math.round(bestDay.completionRate)}% completion.`;
  }
  
  return "Keep building your journaling habit to unlock personalized highlights.";
}
