import type { JournalTheme, JOURNAL_THEMES } from '@/app/types/session';

// Rule-based extraction result
export interface ExtractionResult {
  touched_theme: JournalTheme | null;
  answered_previous: boolean;
  tone: string | null;
  message_length: 'short' | 'medium' | 'long';
}

// Theme keywords mapping (rule-based detection)
const THEME_KEYWORDS: Record<JournalTheme, string[]> = {
  focus: ['focus', 'focused', 'concentrate', 'concentration', 'distracted', 'distraction', 'scattered', 'attention'],
  energy: ['tired', 'exhausted', 'energetic', 'energy', 'drained', 'fatigue', 'lazy', 'motivated'],
  motivation: ['motivated', 'motivation', 'unmotivated', 'drive', 'purpose', 'why', 'goal'],
  'self-control': ['control', 'self-control', 'discipline', 'willpower', 'temptation', 'resist', 'impulse'],
  routine: ['routine', 'habit', 'schedule', 'morning', 'wake up', 'bedtime', 'daily'],
  gym: ['gym', 'workout', 'exercise', 'fitness', 'sauna', 'train', 'training'],
  work: ['work', 'project', 'portfolio', 'coding', 'job', 'task', 'deadline'],
  projects: ['project', 'portfolio', 'website', 'building', 'creating', 'developing'],
  emotions: ['feel', 'feeling', 'emotion', 'emotional', 'mood', 'upset', 'happy', 'sad'],
  guilt: ['guilt', 'guilty', 'regret', 'ashamed', 'disappointed'],
  progress: ['progress', 'improve', 'better', 'growth', 'advance', 'moving forward'],
  distractions: ['distraction', 'distracted', 'youtube', 'video', 'waste', 'procrastinate'],
};

// Tone keywords
const TONE_KEYWORDS: Record<string, string[]> = {
  frustrated: ['frustrated', 'frustrating', 'pissed', 'annoyed', 'irritated', 'angry'],
  calm: ['calm', 'peaceful', 'relaxed', 'chill', 'zen'],
  energetic: ['energetic', 'excited', 'pumped', 'motivated', 'ready'],
  tired: ['tired', 'exhausted', 'drained', 'worn out', 'beat'],
  guilty: ['guilty', 'ashamed', 'disappointed', 'regret'],
  positive: ['good', 'great', 'awesome', 'amazing', 'happy', 'proud'],
  negative: ['bad', 'terrible', 'awful', 'horrible', 'sad', 'down'],
};

/**
 * Step 2: Rule-based extraction
 * Detects: touched theme, answered question, tone
 */
export function extractFromMessage(
  message: string,
  lastQuestion?: string | null
): ExtractionResult {
  const lowerMessage = message.toLowerCase();
  const wordCount = message.split(/\s+/).length;

  // Determine message length
  let message_length: 'short' | 'medium' | 'long';
  if (wordCount < 10) message_length = 'short';
  else if (wordCount < 30) message_length = 'medium';
  else message_length = 'long';

  // Detect touched theme
  let touched_theme: JournalTheme | null = null;
  let maxMatches = 0;

  for (const [theme, keywords] of Object.entries(THEME_KEYWORDS)) {
    const matches = keywords.filter(keyword => lowerMessage.includes(keyword)).length;
    if (matches > maxMatches) {
      maxMatches = matches;
      touched_theme = theme as JournalTheme;
    }
  }

  // Detect if user answered previous question
  let answered_previous = false;
  if (lastQuestion) {
    // Simple heuristic: if message is longer than 5 words and contains question-related words
    const questionWords = ['because', 'since', 'when', 'what', 'how', 'why', 'feels', 'feel', 'think', 'thought'];
    const hasQuestionWords = questionWords.some(word => lowerMessage.includes(word));
    answered_previous = wordCount > 5 && (hasQuestionWords || message_length === 'medium' || message_length === 'long');
  }

  // Detect tone
  let tone: string | null = null;
  let toneMatches = 0;

  for (const [toneName, keywords] of Object.entries(TONE_KEYWORDS)) {
    const matches = keywords.filter(keyword => lowerMessage.includes(keyword)).length;
    if (matches > toneMatches) {
      toneMatches = matches;
      tone = toneName;
    }
  }

  return {
    touched_theme: touched_theme || null,
    answered_previous,
    tone: tone || null,
    message_length,
  };
}

/**
 * Step 4: Rule-based decision for next AI move
 * Returns what the AI should do next
 */
export interface NextAIMove {
  action: 'reflect' | 'ask_gentle' | 'offer_choice' | 'reframe' | 'close';
  question?: string;
  reflection?: string;
  themes_to_suggest?: JournalTheme[];
}

export function decideNextAIMove(
  extraction: ExtractionResult,
  state: {
    explored_themes: string[];
    unexplored_themes: string[];
    asked_questions: string[];
    conversation_mode: string;
  }
): NextAIMove {
  const { message_length, touched_theme, answered_previous } = extraction;
  const { explored_themes, unexplored_themes, asked_questions } = state;

  // Rule 1: User spoke a lot
  if (message_length === 'long') {
    return {
      action: 'reflect',
      reflection: `I hear you. ${touched_theme ? `The ${touched_theme} theme is coming through.` : ''}`,
      question: touched_theme && !explored_themes.includes(touched_theme)
        ? `What part of ${touched_theme} feels most important right now?`
        : undefined,
    };
  }

  // Rule 2: User spoke briefly
  if (message_length === 'short') {
    // Offer choice between 2 unexplored themes
    const availableThemes = unexplored_themes.slice(0, 2) as JournalTheme[];
    return {
      action: 'offer_choice',
      themes_to_suggest: availableThemes,
      question: availableThemes.length === 2
        ? `Would you like to explore ${availableThemes[0]} or ${availableThemes[1]}?`
        : undefined,
    };
  }

  // Rule 3: User seems stuck (short answer, didn't answer question)
  if (message_length === 'short' && !answered_previous && asked_questions.length > 0) {
    return {
      action: 'reframe',
      reflection: 'That\'s okay. Sometimes it\'s hard to put words to things.',
      question: undefined, // No question, just gentle reframe
    };
  }

  // Rule 4: No unexplored themes left
  if (unexplored_themes.length === 0) {
    return {
      action: 'close',
      reflection: 'You\'ve covered a lot today.',
      question: 'Is there anything else you want to share before we wrap up?',
    };
  }

  // Default: Medium message, gentle follow-up
  if (touched_theme && !explored_themes.includes(touched_theme)) {
    return {
      action: 'ask_gentle',
      question: `Tell me more about ${touched_theme}.`,
    };
  }

  // Fallback: Reflect and gently explore
  const nextTheme = unexplored_themes[0] as JournalTheme;
  return {
    action: 'reflect',
    reflection: 'I\'m listening.',
    question: `What\'s coming up around ${nextTheme}?`,
  };
}
