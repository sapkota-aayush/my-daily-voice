import { extractFromMessage, decideNextAIMove, type ExtractionResult, type NextAIMove } from './conversationExtraction';
import { getConversationState, updateConversationState } from './redis';
import type { ConversationState } from '@/app/types/session';

/**
 * 4-Step Loop: Process user message and update conversation state
 * 
 * Step 1: Load Redis state
 * Step 2: Light extraction (rule-based)
 * Step 3: Update Redis state
 * Step 4: Decide next AI move (returns decision, not executed)
 */
export async function processUserMessage(
  sessionId: string,
  date: string,
  userMessage: string,
  lastQuestion?: string | null
): Promise<{
  updatedState: ConversationState;
  nextMove: NextAIMove;
}> {
  // Step 1: Load Redis state
  let state = await getConversationState(sessionId, date);
  
  if (!state) {
    throw new Error(`Conversation state not found for session ${sessionId} on ${date}. Initialize state first.`);
  }

  // Step 2: Light extraction (rule-based)
  const extraction = extractFromMessage(userMessage, lastQuestion);

  // Step 3: Update Redis state
  const updates: Partial<ConversationState> = {};

  // Update anchor if theme detected
  if (extraction.touched_theme) {
    if (!state.anchor) {
      updates.anchor = extraction.touched_theme;
    }
    
    // Move theme from unexplored to explored (if not already explored)
    if (!state.explored_themes.includes(extraction.touched_theme)) {
      updates.explored_themes = [...state.explored_themes, extraction.touched_theme];
      updates.unexplored_themes = state.unexplored_themes.filter(
        t => t !== extraction.touched_theme
      );
    }
  }

  // Update tone if detected
  if (extraction.tone) {
    updates.tone = extraction.tone;
  }

  // Track question in Redis (regardless of whether user answered)
  // This prevents the AI from repeating questions
  if (lastQuestion) {
    if (!state.asked_questions.includes(lastQuestion)) {
      updates.asked_questions = [...state.asked_questions, lastQuestion];
    }
  }

  // Update conversation mode based on message length and state
  // Only update if not in listening/reflecting phase (V1 flow)
  if (state.session_phase === 'questioning' || state.session_phase === 'closed') {
    if (extraction.message_length === 'long') {
      updates.conversation_mode = 'deepening';
    } else if (extraction.message_length === 'short' && state.explored_themes.length > 0) {
      updates.conversation_mode = 'exploring';
    }
  }

  // Apply updates
  const updatedState = await updateConversationState(sessionId, date, updates);

  // Step 4: Decide next AI move (rule-based)
  const nextMove = decideNextAIMove(extraction, {
    explored_themes: updatedState.explored_themes,
    unexplored_themes: updatedState.unexplored_themes,
    asked_questions: updatedState.asked_questions,
    conversation_mode: updatedState.conversation_mode,
  });

  // Update last_ai_action
  await updateConversationState(sessionId, date, {
    last_ai_action: nextMove.action,
  });

  const finalState = await getConversationState(sessionId, date) as ConversationState;

  return {
    updatedState: finalState,
    nextMove,
  };
}
