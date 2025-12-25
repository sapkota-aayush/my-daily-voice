/**
 * Chat Tool for Voice Agent
 * 
 * This tool allows the Realtime voice agent to call the /api/chat endpoint
 * which orchestrates the Memory Agent + Conversational Agent system
 * 
 * Note: For RealtimeAgent, tools are executed server-side by OpenAI.
 * We need to handle tool execution via the session context or server-side handlers.
 */

/**
 * Create the chat tool definition
 * 
 * This tool will be called by the Realtime agent when it needs to generate a response.
 * The tool execution will be handled server-side via the Realtime API.
 */
export function createChatTool() {
  return {
    type: 'function',
    name: 'chat',
    description: `Process user message through the two-agent architecture (Memory Agent + Conversational Agent). This tool handles memory retrieval, confidence-gated search, and response generation with the 3-step response pattern. Always call this tool when the user speaks, then speak the returned response.`,
    parameters: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'The user\'s message that you need to respond to. This should be the transcribed text of what the user just said.',
        },
      },
      required: ['message'],
    },
  };
}

/**
 * Handle chat tool execution
 * This is called when the agent invokes the chat tool
 */
export async function handleChatTool(
  args: { message: string },
  context: {
    sessionId?: string;
    date?: string;
    userId?: string;
    history?: any[];
  } = {}
): Promise<string> {
  const { message } = args;
  const { sessionId, date, userId = 'default-user', history = [] } = context;

  if (!message || typeof message !== 'string') {
    return 'I need a message to respond to.';
  }

  try {
    // Convert Realtime history format to standard format if needed
    let conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    
    if (Array.isArray(history) && history.length > 0) {
      conversationHistory = history
        .filter((item: any) => {
          // Filter out system messages and tool calls
          return (
            item.role === 'user' ||
            (item.role === 'assistant' && item.type === 'message')
          );
        })
        .map((item: any) => {
          if (item.role === 'user') {
            return {
              role: 'user' as const,
              content: item.content?.[0]?.text || item.content || '',
            };
          } else {
            return {
              role: 'assistant' as const,
              content: item.content?.[0]?.text || item.content || '',
            };
          }
        })
        .filter((msg: any) => msg.content && msg.content.trim().length > 0);
    }

    // Call the /api/chat endpoint
    // Use environment variable for production, fallback to relative URL for server-side calls
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window === 'undefined' ? '' : 'http://localhost:3000');
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        conversationHistory,
        realtimeHistory: history,
        userId,
        sessionId,
        date,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('Chat API error:', errorData);
      return 'I had trouble processing that. Could you try again?';
    }

    const data = await response.json();
    return data.message || 'I hear you.';
  } catch (error: any) {
    console.error('Error in chat tool:', error);
    return 'I encountered an error. Let me try again.';
  }
}

