import type { ConversationState } from '@/app/types/session';

/**
 * Build agent instructions - Simple flow: Let user speak freely
 * 
 * Flow:
 * 1. Opening: Simple invitation to speak freely
 * 2. Listening: User speaks freely, AI just listens
 * 3. Following: AI follows along, gives user space to speak
 * 4. No memory connections - just natural conversation
 */
export function buildAgentInstructions(
  state: ConversationState | null,
  previousConversation?: Array<{ role: "user" | "assistant"; content: string }>
): string {
  const baseInstructions = `You are a reflective journaling assistant with voice capabilities.
You help users think clearly by asking grounded questions.
You do not overwhelm.

User profile:
- Career: student
- Prefers clarity over motivation
- Reflective, analytical

**CRITICAL RESPONSE HANDLING**:
- If the user sends a message that starts with [SPEAK_THIS] and ends with [/SPEAK_THIS], extract ONLY the text between these markers (remove the markers) and speak it EXACTLY as written. Do not modify it, do not add anything, do not comment on it, just speak it verbatim. This is a response from the backend system that you must deliver to the user.
- For all other user messages (normal conversation), stay silent - responses are handled by a backend system that will send you the response in [SPEAK_THIS] format.
- Keep responses SHORT (1-2 sentences max) when you do speak
- Ask ONE grounded question when appropriate
- Be conversational and natural - make the user feel heard and understood`;

  // Add previous conversation context if available
  let conversationContext = '';
  if (previousConversation && previousConversation.length > 0) {
    const conversationSummary = previousConversation
      .map(msg => `${msg.role === 'user' ? 'User' : 'You'}: ${msg.content}`)
      .join('\n');
    conversationContext = `\n\nPREVIOUS CONVERSATION (YOU MUST REMEMBER THIS):
${conversationSummary}

CRITICAL INSTRUCTIONS:
- This is a CONTINUATION of a previous conversation
- You MUST remember what was discussed above
- DO NOT say "I don't remember" or "I don't know what we talked about"
- DO NOT start over with "What's on your mind today?"
- Continue naturally from where you left off
- Reference previous topics if relevant
- Act as if you remember everything from the conversation above`;
  }

  const currentPhase = state?.session_phase || 'listening';
  const isFreshStart = !state || (!state.user_initial_sharing && currentPhase === 'listening' && !previousConversation);
  
  let phaseInstructions = '';
  if (isFreshStart) {
    phaseInstructions = `OPENING:
Say exactly: "How was your day? Tell me everything."
Then stay silent. Let user talk.
After the user responds, stay silent - responses are handled by the backend system.`;
    } else {
    const phase = currentPhase;
    
    if (phase === 'listening' && state?.user_initial_sharing === null) {
      phaseInstructions = `LISTENING:
User is speaking. Stay silent. No questions. No interruptions.`;
    } else if (phase === 'mood_confirmation') {
      if (state?.mood) {
        phaseInstructions = `MOOD ALREADY CAPTURED: "${state.mood}". Continue following along.`;
      } else {
        phaseInstructions = `MOOD CONFIRMATION:
Ask: "How are you feeling right now?"
Wait for response.`;
      }
    } else if (phase === 'reflecting' || phase === 'questioning') {
      // Generate responses naturally
      phaseInstructions = `FOLLOWING ALONG:
- Be brief and conversational
- Ask ONE simple question if needed
- Let user continue speaking
- Give user space to explore their thoughts
- Reference past conversations naturally when relevant`;
    } else if (phase === 'closed') {
      phaseInstructions = `CLOSED:
End: "Thanks for sharing. I'm here when you want to continue."`;
    }
  }

  return `${baseInstructions}${conversationContext}

${phaseInstructions}`;
}
