// Conversation state stored in Redis (session-scoped)
export interface ConversationState {
  // Core session info
  sessionId: string;
  date: string; // YYYY-MM-DD
  userId: string;
  createdAt: number;
  lastUpdated: number;

  // Yesterday's context (from Mem0)
  yesterday_context: string[];

  // Conversation control signals
  anchor: string | null; // Main theme of current conversation
  explored_themes: string[]; // Themes already discussed
  unexplored_themes: string[]; // Themes available to explore
  asked_questions: string[]; // Questions already asked (to avoid repetition)
  tone: string | null; // Current emotional tone (e.g., "frustrated", "calm", "energetic")
  conversation_mode: 'listener' | 'exploring' | 'deepening' | 'closing';
  last_ai_action: string | null; // Last action AI took (e.g., "asked_about_focus", "reflected_on_energy")
  reflection_mode: 'neutral' | 'coaching' | 'learning'; // Reflection style (default: neutral)
  session_phase: 'listening' | 'mood_confirmation' | 'reflecting' | 'questioning' | 'closed'; // V1 flow phase
  user_initial_sharing: string | null; // Full initial sharing from user (stored after they finish)
  mood: string | null; // User's mood (captured after initial sharing)
}

// Predefined themes for journaling
export const JOURNAL_THEMES = [
  'focus',
  'energy',
  'motivation',
  'self-control',
  'routine',
  'gym',
  'work',
  'projects',
  'emotions',
  'guilt',
  'progress',
  'distractions',
] as const;

export type JournalTheme = typeof JOURNAL_THEMES[number];
