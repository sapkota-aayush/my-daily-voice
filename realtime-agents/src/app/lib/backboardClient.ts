/**
 * Backboard AI Client Wrapper
 * 
 * This wrapper provides an OpenAI-compatible interface for Backboard AI
 * Allows easy switching between OpenAI and Backboard without changing calling code
 * 
 * Backboard uses Assistants/Threads model:
 * 1. Create/get an assistant
 * 2. Create/get a thread for that assistant
 * 3. Add messages to thread (automatically gets response)
 */

interface ChatCompletionParams {
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  max_tokens?: number;
}

interface ChatCompletionResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

// Cache for assistant and thread IDs per user/date
const assistantCache = new Map<string, string>();
const threadCache = new Map<string, string>();

/**
 * Get or create a Backboard assistant for a user
 * System message is stored in assistant description
 */
async function getOrCreateAssistant(backboard: any, userId: string, date: string, systemMessage?: string): Promise<string> {
  const cacheKey = `${userId}:${date}`;
  
  // If system message changed, we might need to update assistant
  // For now, we'll use a single assistant per user/date
  if (assistantCache.has(cacheKey)) {
    const assistantId = assistantCache.get(cacheKey)!;
    
    // Update assistant description if system message is provided
    if (systemMessage) {
      try {
        await backboard.updateAssistant(assistantId, {
          description: systemMessage,
        });
      } catch (error) {
        console.error('Error updating assistant:', error);
      }
    }
    
    return assistantId;
  }

  try {
    // Try to get existing assistant first
    const assistants = await backboard.listAssistants({ limit: 100 });
    const assistantName = `journal-assistant-${userId}-${date}`;
    let assistant = assistants.find((a: any) => a.name === assistantName);

    if (!assistant) {
      // Create new assistant with system message as description
      assistant = await backboard.createAssistant({
        name: assistantName,
        description: systemMessage || 'Journal conversation assistant',
      });
    } else if (systemMessage) {
      // Update existing assistant with new system message
      assistant = await backboard.updateAssistant(assistant.assistantId, {
        description: systemMessage,
      });
    }

    assistantCache.set(cacheKey, assistant.assistantId);
    return assistant.assistantId;
  } catch (error) {
    console.error('Error getting/creating assistant:', error);
    throw error;
  }
}

/**
 * Get or create a Backboard thread for a user/date
 */
async function getOrCreateThread(backboard: any, assistantId: string, userId: string, date: string): Promise<string> {
  const cacheKey = `${userId}:${date}`;
  
  if (threadCache.has(cacheKey)) {
    return threadCache.get(cacheKey)!;
  }

  try {
    // Try to get existing thread first
    const threads = await backboard.listThreads({ limit: 100 });
    const threadName = `journal-thread-${userId}-${date}`;
    // Note: Backboard threads might not have names, so we'll create new ones per session
    // Or we could store thread IDs in Redis for persistence
    
    // For now, create a new thread
    const thread = await backboard.createThread(assistantId);
    threadCache.set(cacheKey, thread.threadId);
    return thread.threadId;
  } catch (error) {
    console.error('Error getting/creating thread:', error);
    throw error;
  }
}

/**
 * Get AI client - returns either Backboard or OpenAI based on configuration
 * This maintains the same interface as getOpenAIClient() for drop-in replacement
 */
export async function getAIClient(userId: string = 'default-user', date: string = new Date().toISOString().split('T')[0]) {
  // If Backboard API key is set, use Backboard; otherwise fall back to OpenAI
  if (process.env.BACKBOARD_API_KEY) {
    const { BackboardClient } = await import('backboard-sdk');
    
    const backboard = new BackboardClient({
      apiKey: process.env.BACKBOARD_API_KEY,
    });
    
    // Return a wrapper that mimics OpenAI's interface
    return {
      chat: {
        completions: {
          create: async (params: ChatCompletionParams): Promise<ChatCompletionResponse> => {
            // Convert OpenAI messages format to Backboard format
            // Find system message and user messages
            const systemMessage = params.messages.find(m => m.role === 'system')?.content;
            const userMessages = params.messages.filter(m => m.role === 'user' || m.role === 'assistant');
            
            // Get the last user message (the one we want to respond to)
            const lastUserMessage = userMessages[userMessages.length - 1];
            
            if (!lastUserMessage || lastUserMessage.role !== 'user') {
              throw new Error('Last message must be from user');
            }

            // Get or create assistant with system message
            const assistantId = await getOrCreateAssistant(backboard, userId, date, systemMessage);
            const threadId = await getOrCreateThread(backboard, assistantId, userId, date);

            // Add message to thread (this automatically gets a response)
            // Backboard handles memory automatically and maintains conversation history
            try {
              // Make direct API call to avoid SDK parsing issues
              // The SDK's createMessageResponse might fail if latest_message is missing
              const FormData = (await import('form-data')).default;
              const fetch = (await import('node-fetch')).default;
              
              const formData = new FormData();
              formData.append('stream', 'false');
              formData.append('content', lastUserMessage.content);
              formData.append('llm_provider', 'openai'); // Specify OpenAI as provider
              
              // Map common OpenAI model names to Backboard format
              // Backboard doesn't support gpt-4o-mini, so use gpt-4o instead
              let modelName = params.model;
              if (modelName === 'gpt-4o-mini' || modelName === 'gpt-4o') {
                // Use gpt-4o which is supported (we saw it working in dashboard)
                modelName = 'gpt-4o';
              }
              formData.append('model_name', modelName);
              formData.append('memory', 'Auto');
              
              const apiKey = process.env.BACKBOARD_API_KEY!;
              const baseUrl = 'https://app.backboard.io/api';
              const url = `${baseUrl}/threads/${threadId}/messages`;
              
              const apiResponse = await fetch(url, {
                method: 'POST',
                headers: {
                  'X-API-Key': apiKey,
                  'User-Agent': 'backboard-sdk/1.4.3',
                  ...formData.getHeaders(),
                },
                body: formData,
              });
              
              if (!apiResponse.ok) {
                const errorText = await apiResponse.text();
                throw new Error(`Backboard API error: ${apiResponse.status} ${errorText}`);
              }
              
              const rawResponse = await apiResponse.json();
              
              // Debug: Log the response structure to understand it better
              console.log('Backboard raw response keys:', Object.keys(rawResponse || {}));
              console.log('Backboard raw response:', JSON.stringify(rawResponse, null, 2));
              
              // Check if response contains an error about model/provider
              if (rawResponse.status === 'FAILED' || (rawResponse.content && typeof rawResponse.content === 'string' && rawResponse.content.includes('LLM Error'))) {
                console.error('Backboard model/provider error:', rawResponse.content);
                // Instead of throwing, fall back to OpenAI
                console.log('Backboard failed, falling back to OpenAI...');
                throw new Error('BACKBOARD_FALLBACK_TO_OPENAI');
              }
              
              // Extract content from raw API response
              // Backboard API response structure varies - check multiple paths
              let responseContent = '';
              
              // Method 1: Check direct content field (most common)
              if (rawResponse.content && typeof rawResponse.content === 'string' && !rawResponse.content.includes('Error')) {
                responseContent = rawResponse.content;
                console.log('Found content in rawResponse.content');
              }
              // Method 2: Check message object (could be nested)
              else if (rawResponse.message) {
                if (typeof rawResponse.message === 'string') {
                  responseContent = rawResponse.message;
                  console.log('Found content in rawResponse.message (string)');
                } else if (rawResponse.message.content) {
                  responseContent = rawResponse.message.content;
                  console.log('Found content in rawResponse.message.content');
                } else {
                  console.log('rawResponse.message structure:', Object.keys(rawResponse.message));
                }
              }
              // Method 3: Check latest_message object
              else if (rawResponse.latest_message) {
                if (typeof rawResponse.latest_message === 'string') {
                  responseContent = rawResponse.latest_message;
                  console.log('Found content in rawResponse.latest_message (string)');
                } else if (rawResponse.latest_message.content) {
                  responseContent = rawResponse.latest_message.content;
                  console.log('Found content in rawResponse.latest_message.content');
                } else {
                  console.log('rawResponse.latest_message structure:', Object.keys(rawResponse.latest_message || {}));
                }
              }
              // Method 4: Check if there's a response array or choices array
              else if (rawResponse.choices && Array.isArray(rawResponse.choices) && rawResponse.choices.length > 0) {
                responseContent = rawResponse.choices[0]?.message?.content || rawResponse.choices[0]?.content || '';
                console.log('Found content in rawResponse.choices');
              }
              // Method 5: Try fetching the thread to get the latest message
              else {
                console.log('No content found in direct response, fetching thread to get latest message...');
                try {
                  const threadResponse = await fetch(`${baseUrl}/threads/${threadId}`, {
                    method: 'GET',
                    headers: {
                      'X-API-Key': apiKey,
                      'User-Agent': 'backboard-sdk/1.4.3',
                    },
                  });
                  
                  if (threadResponse.ok) {
                    const threadData = await threadResponse.json();
                    console.log('Thread data keys:', Object.keys(threadData || {}));
                    
                    // Get the last assistant message from the thread
                    if (threadData.messages && Array.isArray(threadData.messages)) {
                      const assistantMessages = threadData.messages
                        .filter((msg: any) => msg.role === 'assistant')
                        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                      
                      if (assistantMessages.length > 0 && assistantMessages[0].content) {
                        responseContent = assistantMessages[0].content;
                        console.log('Found content from thread messages');
                      }
                    }
                  }
                } catch (threadError) {
                  console.error('Error fetching thread:', threadError);
                }
              }
              
              // If still no content, log for debugging
              if (!responseContent) {
                console.error('Could not extract content from Backboard response. Full response:', JSON.stringify(rawResponse, null, 2));
                responseContent = 'Thanks for sharing. What would you like to explore?';
              } else {
                console.log('Successfully extracted response content:', responseContent.substring(0, 100));
              }
              
              return {
                choices: [{
                  message: {
                    content: responseContent,
                  },
                }],
              };
            } catch (error: any) {
              console.error('Error calling Backboard API:', error);
              console.error('Error details:', error.message);
              
              // If Backboard fails, fall back to OpenAI
              if (error.message === 'BACKBOARD_FALLBACK_TO_OPENAI') {
                console.log('Falling back to OpenAI due to Backboard error');
                const { default: OpenAI } = await import('openai');
                const apiKey = process.env.OPENAI_API_KEY || 'sk-dummy-key-for-build';
                const openai = new OpenAI({
                  apiKey: apiKey,
                });
                
                // Use OpenAI directly
                const openaiResponse = await openai.chat.completions.create({
                  model: params.model, // Use original model (gpt-4o-mini)
                  messages: params.messages,
                  temperature: params.temperature || 0.7,
                  max_tokens: params.max_tokens,
                });
                
                return openaiResponse;
              }
              
              // Return a fallback response only if OpenAI also fails
              return {
                choices: [{
                  message: {
                    content: 'Thanks for sharing. What would you like to explore?',
                  },
                }],
              };
            }
          },
        },
      },
    };
  } else {
    // Fallback to OpenAI
    const { default: OpenAI } = await import('openai');
    const apiKey = process.env.OPENAI_API_KEY || 'sk-dummy-key-for-build';
    return new OpenAI({
      apiKey: apiKey,
    });
  }
}
