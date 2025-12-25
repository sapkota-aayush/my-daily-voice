import { FunctionTool } from '@openai/agents/realtime';

/**
 * Create a chat tool for the test agent
 * This tool calls /api/chat-test and returns the response
 */
export function createChatTestTool(): FunctionTool {
  return {
    type: 'function',
    name: 'chat_with_backend',
    description: 'Call the backend chat API to get a response. Use this for all user messages.',
    parameters: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'The user message to send to the backend',
        },
      },
      required: ['message'],
    },
  };
}

/**
 * Handle chat tool execution
 */
export async function handleChatTestTool(
  args: { message: string },
  context: {
    userId?: string;
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  } = {}
): Promise<string> {
  const { message } = args;
  const { userId = 'default-user', conversationHistory = [] } = context;

  if (!message || typeof message !== 'string') {
    return 'I need a message to respond to.';
  }

  try {
    // Use environment variable for production, fallback to relative URL for server-side calls
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window === 'undefined' ? '' : 'http://localhost:3000');
    const response = await fetch(`${baseUrl}/api/chat-test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        conversationHistory,
        userId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      return `Error: ${errorData.error || 'Failed to get response'}`;
    }

    const data = await response.json();
    return data.message || 'No response received';
  } catch (error: any) {
    return `Error: ${error.message || 'Failed to call backend'}`;
  }
}

