import { RealtimeAgent } from '@openai/agents/realtime';
import { buildAgentInstructions } from '@/app/lib/agentInstructions';
import type { ConversationState } from '@/app/types/session';
import { createChatTool } from '@/app/lib/chatTool';

// Default base agent (for backward compatibility)
export const journalAgent = new RealtimeAgent({
  name: 'journalCompanion',
  voice: 'sage', // Calm voice (the one used at first)
  instructions: buildAgentInstructions(null),
  handoffs: [],
  tools: [],
  handoffDescription: 'A calm, conversational journaling companion for natural daily reflection',
});

// Function to create journal agent with conversation state
export function createJournalAgentWithContext(
  conversationState: ConversationState | null,
  previousEntry?: string | null,
  yesterdayMemories?: any,
  previousConversation?: Array<{ role: "user" | "assistant"; content: string }>
): RealtimeAgent {
  // Build instructions from conversation state (Phase 3)
  let instructions = buildAgentInstructions(conversationState, previousConversation);

  // Add closing guidance (neutral) - V1 flow
  instructions += `\n\nIf user says "That's it", "I'm done", or indicates they're finished, end neutrally: "Thanks for sharing. I'm here when you want to continue."`;

  // SERVER-SIDE LOG: Verify instructions include memories
  const hasMemories = instructions.includes('YOUR PAST JOURNAL MEMORIES') || instructions.includes('MEMORIES');
  const memoryCount = conversationState?.yesterday_context?.length || 0;
  const memoryListInInstructions = instructions.includes('YOUR PAST JOURNAL MEMORIES');
  
  console.log('AGENT CREATED:', {
    phase: conversationState?.session_phase || 'unknown',
    hasMemories: memoryListInInstructions,
    memoryCount,
    instructionsLength: instructions.length,
    instructionsPreview: instructions.substring(0, 500),
    memoriesInState: conversationState?.yesterday_context?.slice(0, 3),
  });
  
  // If we're in reflecting/questioning phase but no memories in instructions, that's a problem
  if ((conversationState?.session_phase === 'reflecting' || conversationState?.session_phase === 'questioning') && !memoryListInInstructions) {
    console.error('ERROR: Agent in reflecting/questioning phase but NO MEMORIES in instructions!');
  }

  // Instructions are already complete from buildAgentInstructions
  const instructionsWithTool = instructions;

  return new RealtimeAgent({
    name: 'journalCompanion',
    voice: 'sage', // Calm voice (the one used at first)
    instructions: instructionsWithTool,
    handoffs: [],
    tools: [], // Tools temporarily disabled - using direct API calls via instructions instead
    handoffDescription: 'A calm, conversational journaling companion for natural daily reflection',
  });
}

export const journalScenario = [journalAgent];

