export type TaskStatus = 'pending' | 'completed' | 'missed';

export interface Task {
  id: string;
  date: string;
  name: string;
  status: TaskStatus;
}

export interface DailyReflection {
  date: string;
  mood: string;
  reflectionSummary: string;
  completionRate: number;
  morningPlanRecorded: boolean;
  eveningCheckInRecorded: boolean;
}

export interface WeeklySummary {
  weekStartDate: string;
  totalTasks: number;
  completed: number;
  missed: number;
  avgCompletion: number;
  commonMood: string;
  weeklyHighlight: string;
  aiInsight: string;
}

export type RecordingType = 'morning' | 'evening';
