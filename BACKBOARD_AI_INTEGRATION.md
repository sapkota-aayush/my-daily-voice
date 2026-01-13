# Backboard.io Integration in Vojur

## Overview

Vojur leverages **Backboard.io** as its core orchestration layer for AI-powered journaling conversations. Backboard.io provides unified access to language models, automatic memory management, and persistent conversation context - all essential for creating personalized journaling experiences.

## Why Backboard.io?

1. **Automatic Memory Management**: Backboard.io automatically searches for relevant memories, writes new ones, and maintains conversation context without manual intervention
2. **Unified LLM Access**: Single interface to access 2,200+ language models
3. **Assistant/Thread Model**: Persistent conversation architecture that maintains context across sessions
4. **OpenAI-Compatible Interface**: Drop-in replacement for OpenAI SDK, making integration seamless

## Integration Architecture

### 1. Client Wrapper (`src/app/lib/backboardClient.ts`)

We created a wrapper that provides an OpenAI-compatible interface, allowing us to use Backboard.io as a drop-in replacement:

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

Backboard.io uses an Assistant/Thread model:
- **Assistant**: Represents a personalized journaling companion with system instructions
- **Thread**: Represents a conversation session for a specific user and date

**Key Implementation:**
- Assistants are created per user/date combination
- System messages are stored in assistant descriptions
- Threads maintain conversation history automatically
- Both are cached for performance

### 3. Automatic Memory Management

When a message is sent to Backboard.io:
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

Since Backboard.io doesn't support `gpt-4o-mini`, we map it to `gpt-4o`:
- `gpt-4o-mini` → `gpt-4o` (automatic mapping)
- `gpt-4o` → Used directly
- Provider: `openai`

## Usage in Vojur

### Chat API Endpoints

Both main chat endpoints use Backboard.io:

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

## Memory Extraction and Storage Flow

### How Memories Are Extracted

When a user shares their initial journal entry, Vojur's Memory Agent performs structured extraction:

1. **Structured Extraction** (`extractStructuredJournal`):
   - Extracts **Events**: Concrete things that occurred (e.g., "organized hackathon", "got featured")
   - Extracts **Projects**: Long-running contexts and ongoing work (e.g., "preparing pitch", "building app")
   - Extracts **Patterns**: Repeatable behaviors and habits (e.g., "morning distraction", "productivity cycles")
   - Extracts **Emotions**: Emotional states and feelings (e.g., "excited", "frustrated", "proud")

2. **One-Time Memory Search** (`runOneTimeMemoryAgent`):
   - Searches mem0 database for **every extracted topic** (events, projects, patterns, emotions)
   - For each topic, queries mem0 with semantic search
   - Retrieves relevant historical memories from past journal entries and conversations
   - Categorizes memories into confidence anchors (positive experiences) and struggle anchors (challenges)

3. **Experience Memory Creation** (`createExperienceMemories`):
   - Converts raw mem0 search results into structured ExperienceMemory objects
   - Creates 2-5 meaningful experience memories that capture:
     - Core facts about the experience
     - Key details
     - User's personal meaning
     - Emotional tone
     - Reflection hooks for future conversations

### How Memories Are Stored in mem0 Database

Memories are stored in mem0 through multiple pathways:

1. **Onboarding Memories** (`/api/extract-memory/route.ts`):
   ```typescript
   await mem0.add([{
     role: 'user',
     content: memory.content,
   }], {
     user_id: userId,
     metadata: {
       source: 'onboarding',
       transcriptId: transcriptId,
       confidence: memory.confidence,
       tags: memory.tags,
     },
   });
   ```

2. **Journal Entry Memories** (`/api/store-journal-memory/route.ts`):
   ```typescript
   await mem0.add([{
     role: 'user',
     content: memory.content,
   }], {
     user_id: userId,
     metadata: {
       source: 'journal',
       date: date,
       confidence: memory.confidence,
       tags: memory.tags,
     },
   });
   ```

3. **Conversation Memories** (`/api/extract-conversation-memories/route.ts`):
   ```typescript
   await mem0.add([{
     role: 'user',
     content: memory.content,
   }], {
     user_id: userId,
     metadata: {
       source: 'conversation',
       date: date,
       confidence: memory.confidence,
       tags: memory.tags,
     },
   });
   ```

**Key Features:**
- Each memory is stored with `user_id` for user-specific retrieval
- Metadata includes source, date, confidence score, and tags
- mem0 handles semantic indexing and search automatically
- Memories persist across sessions and can be searched by semantic similarity

### How Backboard.io Uses Memories

Backboard.io integrates with mem0 memories through its automatic memory management:

1. **Memory Search Integration**:
   - When Backboard.io receives a user message, it automatically searches mem0 for relevant memories
   - Uses semantic search to find memories related to the current conversation topic
   - Retrieves memories stored from previous journal entries, onboarding, and conversations

2. **Memory Context in Responses**:
   - Backboard.io includes relevant mem0 memories in the conversation context
   - These memories inform the AI's understanding of the user's history, patterns, and experiences
   - Responses are personalized based on what Backboard.io finds in mem0

3. **Automatic Memory Writing**:
   - After each conversation, Backboard.io automatically writes new memories to mem0
   - Captures insights, patterns, and important moments from the conversation
   - These new memories become available for future conversations

**Configuration:**
```typescript
formData.append('memory', 'Auto'); // Enables automatic memory management
```

This tells Backboard.io to:
- Automatically search mem0 for relevant memories
- Automatically write new memories after conversations
- Use memory context to generate personalized responses

### Complete Flow: Extraction → Storage → Usage

Here's the complete flow of how memories work with Backboard.io:

```
1. USER SHARES JOURNAL ENTRY
   ↓
2. MEMORY AGENT EXTRACTS STRUCTURED DATA
   - Events, Projects, Patterns, Emotions
   ↓
3. SEARCH MEM0 DATABASE
   - For each extracted topic, query mem0
   - Retrieve relevant historical memories
   ↓
4. CREATE EXPERIENCE MEMORIES
   - Convert mem0 results into structured ExperienceMemory objects
   - Store in Redis for fast access
   ↓
5. BACKBOARD.IO PROCESSES MESSAGE
   - Automatically searches mem0 for additional relevant memories
   - Uses both Redis experience memories AND mem0 memories
   - Generates personalized response
   ↓
6. BACKBOARD.IO WRITES NEW MEMORIES
   - Automatically stores new insights to mem0
   - These become available for future conversations
   ↓
7. RESPONSE RETURNED TO USER
   - Personalized based on memory context
   - User feels understood and remembered
```

### Integration with Memory System

Backboard.io works seamlessly with our dual-memory architecture:

1. **Initial Journal Entry**: 
   - Our Memory Agent extracts structured information (events, projects, patterns, emotions)
   - Searches mem0 database for historical context
   - Creates experience memories stored in Redis
   - Backboard.io receives the message and automatically searches mem0 again for additional context
   - Backboard.io uses both Redis experience memories AND its own mem0 search results

2. **Subsequent Messages**:
   - Experience memories fetched from Redis (fast access)
   - Backboard.io automatically searches mem0 for relevant memories
   - Both memory sources inform the response
   - Backboard.io writes new memories to mem0 after each conversation

**Why This Dual Approach?**
- **Redis**: Fast, session-specific memory for immediate conversation context
- **mem0**: Long-term semantic memory that persists across sessions
- **Backboard.io**: Orchestrates both, automatically managing mem0 while using Redis for speed

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

## Memory Tools and Backboard.io

### Memory Tool Integration (`src/app/lib/memoryTool.ts`)

The Memory Tool connects voice agents to Backboard.io's memory-powered chat system:

1. **Voice Agent Calls Memory Tool**:
   - When user speaks, voice agent receives transcribed message
   - Calls `getResponseWithMemory` tool with the message

2. **Memory Tool Processes Request**:
   - Fetches experience memories from Redis
   - Calls `/api/chat-test` endpoint with user message and memory context

3. **Backboard.io Generates Response**:
   - Receives message with memory context
   - Automatically searches mem0 for additional relevant memories
   - Uses both Redis memories and mem0 memories to generate personalized response
   - Returns response to memory tool

4. **Response Delivered to User**:
   - Memory tool returns response to voice agent
   - Voice agent speaks the response using OpenAI TTS
   - User hears personalized, memory-informed response

**Key Point**: Backboard.io's automatic memory management means it seamlessly integrates mem0 memories into every conversation, making responses deeply personalized.

## Benefits in Vojur

1. **Personalized Conversations**: Backboard.io's automatic memory management ensures conversations build on past interactions stored in mem0. Every response is informed by the user's history, patterns, and experiences.

2. **Automatic Memory Integration**: Backboard.io automatically searches mem0 for relevant memories and writes new ones, eliminating the need for manual memory management. This means memories from onboarding, past journal entries, and previous conversations are all automatically available.

3. **Context Continuity**: Thread-based architecture maintains context across sessions. Combined with mem0's persistent semantic memory, conversations feel continuous and connected over time.

4. **Semantic Memory Search**: Backboard.io leverages mem0's semantic search capabilities to find relevant memories even when exact keywords don't match. This enables more natural memory recall.

5. **Dual Memory Architecture**: Redis provides fast session-specific memory, while mem0 provides long-term semantic memory. Backboard.io orchestrates both seamlessly.

6. **Reduced Complexity**: No need to manually manage memory storage, retrieval, or search. Backboard.io handles all memory operations automatically.

7. **Scalability**: Unified interface allows easy model switching while maintaining memory consistency.

8. **Reliability**: Graceful fallback ensures uninterrupted service even if Backboard.io encounters issues.

## Configuration

Set the following environment variable to enable Backboard.io:
```bash
BACKBOARD_API_KEY=your_backboard_api_key
```

If not set, the system automatically falls back to direct OpenAI integration.

## Testing

A test endpoint is available at `/api/test-backboard` to verify Backboard.io integration.

## Files

- `src/app/lib/backboardClient.ts` - Backboard.io wrapper and client
- `src/app/api/chat/route.ts` - Main chat endpoint using Backboard.io
- `src/app/api/chat-test/route.ts` - Chat test endpoint using Backboard.io
- `src/app/api/test-backboard/route.ts` - Backboard.io test endpoint

## Conclusion

Backboard.io serves as the intelligent orchestration layer that makes Vojur's personalized journaling experience possible. By automatically managing mem0 memory searches, writing new memories, and maintaining conversation context, Backboard.io creates a seamless integration between our structured memory extraction system and long-term semantic memory storage.

**The Complete Picture:**
- **Memory Extraction**: Our Memory Agent extracts structured information from journal entries
- **mem0 Storage**: Memories are stored in mem0 database with semantic indexing
- **Backboard.io Orchestration**: Automatically searches mem0, uses memories in responses, and writes new memories
- **Personalized Conversations**: Users experience AI that truly remembers and understands their journey

This architecture allows Vojur to create deeply personalized journaling experiences where every conversation builds on past interactions, stored memories, and user patterns - all orchestrated seamlessly by Backboard.io.
