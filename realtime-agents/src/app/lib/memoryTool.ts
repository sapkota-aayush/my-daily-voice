import { tool } from '@openai/agents/realtime';
import { supabase } from '@/app/lib/supabase';

/**
 * Memory Tool - Called by conversational agent
 * Flow: Calls server API which runs Memory Agent first → Then generates response
 */
export const getResponseWithMemory = tool({
  name: 'getResponseWithMemory',
  description: 'Get response with memory context. Always call this when user sends a message.',
  parameters: {
    type: 'object',
    properties: {
      userMessage: {
        type: 'string',
        description: 'The user message to respond to.',
      },
    },
    required: ['userMessage'],
    additionalProperties: false,
  },
  execute: async (input, details) => {
    const { userMessage } = input as { userMessage: string };
    
    // Filter out very short messages (likely false triggers from background noise)
    // BUT allow "Hello", "Hi", "Hey" for initial greeting
    const trimmedMessage = userMessage.trim();
    const normalizedMessage = trimmedMessage.toLowerCase();
    const isGreetingMessage = normalizedMessage === 'hello' || normalizedMessage === 'hi' || normalizedMessage === 'hey';
    
    if (!trimmedMessage || trimmedMessage.length < 3) {
      // Allow greetings even if short
      if (!isGreetingMessage) {
      return { response: '' }; // Return empty - agent won't speak
      }
    }
    
    // Filter out single words that are likely false triggers
    // BUT allow greetings
    const words = trimmedMessage.split(/\s+/);
    if (words.length === 1 && trimmedMessage.length < 10) {
      const singleWord = normalizedMessage;
      // Common false trigger words (but NOT greetings)
      if (!isGreetingMessage && ['what', 'huh', 'um', 'uh', 'ah', 'oh', 'yeah', 'yes', 'no', 'ok', 'okay'].includes(singleWord)) {
        return { response: '' }; // Return empty - agent won't speak
      }
    }
    
    // Get userId from context or fetch from Supabase auth (client-side)
    let userId = (details?.context as any)?.userId;
    if (!userId || userId === 'default-user') {
      try {
        // Try to get user from Supabase auth (works on client-side)
        const { data: { user }, error } = await supabase.auth.getUser();
        if (!error && user?.id) {
          userId = user.id;
        } else {
          userId = userId || 'default-user';
        }
      } catch (err) {
        userId = userId || 'default-user';
      }
    }
    
    const history = (details?.context as any)?.history || [];
    
    // Build conversation history
    const conversationHistory = history
      .filter((item: any) => item.type === 'message')
      .map((item: any) => {
        // Extract content - handle both array and string formats
        let content = '';
        if (Array.isArray(item.content)) {
          content = item.content?.[0]?.text || item.content?.[0] || '';
        } else if (typeof item.content === 'string') {
          content = item.content;
        } else {
          content = String(item.content || '');
        }
        
        return {
          role: item.role,
          content: content,
        };
      })
      .filter((msg: any) => msg.content && typeof msg.content === 'string' && msg.content.trim().length > 0);
    
    // CRITICAL: Filter out echo/feedback - check if user message matches recent AI response
    // This prevents the AI from hearing its own voice and responding to itself
    const recentAssistantMessages = conversationHistory
      .filter((msg: any) => msg.role === 'assistant')
      .slice(-5) // Check last 5 assistant messages
      .map((msg: any) => msg.content.toLowerCase().trim());
    
    const userMessageNormalized = trimmedMessage.toLowerCase().trim();
    
    // Check for echo: user message matches or is very similar to recent AI response
    const isEcho = recentAssistantMessages.some((aiMsg: string) => {
      if (!aiMsg || aiMsg.length < 10) return false; // Skip very short AI messages
      
      // Extract first 30 chars for comparison (most distinctive part)
      const aiStart = aiMsg.substring(0, Math.min(30, aiMsg.length));
      const userStart = userMessageNormalized.substring(0, Math.min(30, userMessageNormalized.length));
      
      // Check if user message contains AI message start, or vice versa
      const containsMatch = userMessageNormalized.includes(aiStart) || aiMsg.includes(userStart);
      
      // Also check word overlap (if >50% words match, likely echo)
      const aiWords = aiStart.split(/\s+/).filter(w => w.length > 2);
      const userWords = userStart.split(/\s+/).filter(w => w.length > 2);
      const commonWords = aiWords.filter(w => userWords.includes(w));
      const wordOverlap = aiWords.length > 0 ? commonWords.length / aiWords.length : 0;
      
      return containsMatch || wordOverlap > 0.5;
    });
    
    if (isEcho) {
        const userStart = userMessageNormalized.substring(0, Math.min(30, userMessageNormalized.length));
        return userMessageNormalized.includes(aiStart) || aiMsg.includes(userStart);
      }));
      return { response: '' }; // Return empty - agent won't speak
    }
    
    // Use the same greeting check (already defined above)
    // If greeting and no conversation history, ensure we pass empty history to API
    // This ensures the API treats it as an initial greeting
    const effectiveHistory = (isGreetingMessage && conversationHistory.length === 0) ? [] : conversationHistory;
    
    try {
        userId,
        conversationHistoryLength: effectiveHistory.length,
        isGreeting: isGreetingMessage,
      });
      
      // Call server API - it handles initial greeting without memory search
      const response = await fetch('/api/chat-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmedMessage,
          conversationHistory: effectiveHistory, // Use effectiveHistory (empty for greeting)
          userId,
        }),
      });
      
      if (!response.ok) {
        console.error('[Memory Tool] API error:', response.status, response.statusText);
        return { error: 'Failed to get response' };
      }
      
      const data = await response.json();
        messageLength: data.message?.length || 0,
        metadata: data.metadata,
      });
      
      return { response: data.message || data.response || '' };
    } catch (error: any) {
      console.error('[Memory Tool] Error:', error);
      return { error: error.message || 'Failed to process' };
    }
  },
});
