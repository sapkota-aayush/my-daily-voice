# Backboard.ai Integration in Vojur

## Overview

Vojur leverages **Backboard.ai** as its core orchestration layer for AI-powered journaling conversations. Backboard.ai provides unified access to language models, automatic memory management, and persistent conversation context - all essential for creating personalized journaling experiences.

## Why Backboard.ai?

1. **Automatic Memory Management**: Backboard.ai automatically searches for relevant memories, writes new ones, and maintains conversation context without manual intervention
2. **Unified LLM Access**: Single interface to access 2,200+ language models
3. **Assistant/Thread Model**: Persistent conversation architecture that maintains context across sessions
4. **OpenAI-Compatible Interface**: Drop-in replacement for OpenAI SDK, making integration seamless

## Integration Architecture

### 1. Client Wrapper (`src/app/lib/backboardClient.ts`)

We created a wrapper that provides an OpenAI-compatible interface, allowing us to use Backboard.ai as a drop-in replacement:

```typescript
export async function getAIClient(userId: string, date: string) {
  if (process.env.BACKBOARD_API_KEY) {
    const { BackboardClient } = await import('backboard-sdk');
    const backboard = new BackboardClient({
      apiKey: process.env.BACKBOARD_API_KEY,
    });
    // Returns OpenAI-compatible interface
  }
  // Falls back to OpenAI if Backboard not configured
}
```

### 2. Assistant and Thread Management

Backboard.ai uses an Assistant/Thread model:
- **Assistant**: Represents a personalized journaling companion with system instructions
- **Thread**: Represents a conversation session for a specific user and date

**Key Implementation:**
- Assistants are created per user/date combination
- System messages are stored in assistant descriptions
- Threads maintain conversation history automatically
- Both are cached for performance

### 3. Automatic Memory Management

When a message is sent to Backboard.ai:
1. Backboard automatically searches its memory for relevant context
2. Writes new memories based on the conversation
3. Maintains conversation history in the thread
4. Generates responses using the enriched context

**Configuration:**
```typescript
formData.append('memory', 'Auto'); // Automatic memory management
formData.append('llm_provider', 'openai');
formData.append('model_name', 'gpt-4o');
```

### 4. Model Mapping

Since Backboard.ai doesn't support `gpt-4o-mini`, we map it to `gpt-4o`:
- `gpt-4o-mini` → `gpt-4o` (automatic mapping)
- `gpt-4o` → Used directly
- Provider: `openai`

## Usage in Vojur

### Chat API Endpoints

Both main chat endpoints use Backboard.ai:

1. **`/api/chat/route.ts`** - Main chat endpoint
2. **`/api/chat-test/route.ts`** - Chat test endpoint

**Flow:**
```typescript
// Check if Backboard is configured
if (process.env.BACKBOARD_API_KEY) {
  const { getAIClient } = await import('@/app/lib/backboardClient');
  const client = await getAIClient(userId, date);
  
  // Use OpenAI-compatible interface
  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini', // Automatically mapped to gpt-4o
    messages: [...],
  });
}
```

### Integration with Memory System

Backboard.ai works alongside our custom memory system:

1. **Initial Journal Entry**: 
   - Our Memory Agent extracts structured information (events, projects, patterns, emotions)
   - Creates experience memories stored in Redis
   - Backboard.ai uses these memories for context

2. **Subsequent Messages**:
   - Experience memories fetched from Redis
   - Backboard.ai automatically searches its own memory
   - Both memory sources inform the response

### Error Handling and Fallback

If Backboard.ai encounters issues, the system gracefully falls back to direct OpenAI integration:

```typescript
try {
  // Use Backboard.ai
  return await backboardResponse;
} catch (error) {
  // Fallback to OpenAI directly
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return await openai.chat.completions.create({...});
}
```

## Benefits in Vojur

1. **Personalized Conversations**: Backboard.ai's automatic memory ensures conversations build on past interactions
2. **Context Continuity**: Thread-based architecture maintains context across sessions
3. **Reduced Complexity**: No need to manually manage memory storage and retrieval
4. **Scalability**: Unified interface allows easy model switching
5. **Reliability**: Graceful fallback ensures uninterrupted service

## Configuration

Set the following environment variable to enable Backboard.ai:
```bash
BACKBOARD_API_KEY=your_backboard_api_key
```

If not set, the system automatically falls back to direct OpenAI integration.

## Testing

A test endpoint is available at `/api/test-backboard` to verify Backboard.ai integration.

## Files

- `src/app/lib/backboardClient.ts` - Backboard.ai wrapper and client
- `src/app/api/chat/route.ts` - Main chat endpoint using Backboard
- `src/app/api/chat-test/route.ts` - Chat test endpoint using Backboard
- `src/app/api/test-backboard/route.ts` - Backboard.ai test endpoint

## Conclusion

Backboard.ai serves as the intelligent orchestration layer that makes Vojur's personalized journaling experience possible. By handling memory management, conversation persistence, and LLM access automatically, Backboard.ai allows us to focus on creating meaningful user experiences rather than managing infrastructure.
