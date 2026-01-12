# Vojur - System Architecture Overview

## Application Overview
Vojur is a voice and text-based journaling application that uses AI to have natural conversations with users about their daily experiences. The system integrates multiple AI services (Backboard AI, OpenAI, mem0) for orchestration, conversation, and memory management.

---

## 1. VOICE FUNCTIONALITY

### Flow: Voice Recording → Transcription → AI Response → Speech

**Technology Stack:**
- **OpenAI Realtime API** (`gpt-4o-realtime-preview-2025-06-03`)
  - Handles voice-to-text transcription (input)
  - Handles text-to-speech synthesis (output)
  - WebRTC connection for real-time audio streaming

**Components:**
1. **Voice Orb Component** (`VoiceOrb.tsx`)
   - Visual indicator for voice status (idle, connecting, listening, speaking)
   - Click to start/stop voice session

2. **Realtime Session Hook** (`useRealtimeSession.ts`)
   - Manages WebRTC connection to OpenAI Realtime API
   - Handles audio input/output streaming
   - Manages conversation history and transcript

3. **Journal Agent** (`journalAgent.ts`)
   - Configured with instructions, voice, and tools
   - Uses `sage` voice (calm, conversational)
   - Receives transcribed user messages
   - Calls memory tool to get responses

**Voice Flow:**
```
1. User clicks Voice Orb → Starts WebRTC connection
2. User speaks → Audio streamed to OpenAI Realtime API
3. OpenAI transcribes speech → Text sent to Journal Agent
4. Journal Agent calls memory tool (`getResponseWithMemory`)
5. Memory tool calls `/api/chat-test` with transcribed message
6. API generates response using Backboard AI (or OpenAI)
7. Response returned to Journal Agent
8. Journal Agent speaks response via OpenAI TTS
9. User hears AI response through speakers
```

**Key Files:**
- `src/app/day/[date]/page.tsx` - Main journal page with voice UI
- `src/app/hooks/useRealtimeSession.ts` - Realtime API connection
- `src/app/lib/memoryTool.ts` - Tool that connects voice agent to chat API
- `src/app/agentConfigs/journalAgent.ts` - Agent configuration

---

## 2. TEXT CHAT FUNCTIONALITY (Writing)

### Flow: Text Input → API Processing → Response Display

**Components:**
1. **Chat Input** (`day/[date]/page.tsx`)
   - Text input field for typing messages
   - Submit button to send message
   - Same `/api/chat-test` endpoint as voice

2. **Chat Messages Display**
   - Shows conversation history
   - User messages on right, AI messages on left
   - Auto-scrolls to latest message

**Text Chat Flow:**
```
1. User types message → Clicks send
2. Frontend calls `/api/chat-test` with message
3. API processes message (same as voice flow)
4. Response displayed in chat UI
5. Conversation history saved to Redis
```

**Key Files:**
- `src/app/day/[date]/page.tsx` - Chat UI components
- `src/app/api/chat-test/route.ts` - Main chat processing endpoint

---

## 3. REDIS USAGE (Upstash Redis)

Redis is used as a fast, temporary cache for conversation data and memories.

### Redis Keys Structure:

1. **Conversation History**
   - Key: `chat-test:conversation:${userId}:${date}`
   - Stores: Array of messages (user/assistant) with timestamps
   - TTL: 24 hours
   - Used for: Restoring conversation on page load

2. **Experience Memories**
   - Key: `memory:experiences:${userId}:${date}`
   - Stores: Structured memory objects (2-3 per day)
   - TTL: 24 hours
   - Used for: Context in AI responses

3. **Session Memories**
   - Key: `session:memories:${userId}:${date}`
   - Stores: Cached memory search results
   - TTL: 2 hours
   - Used for: Fast memory retrieval during conversation

4. **Memory Usage Tracker**
   - Key: `memory:usage:${userId}:${date}`
   - Stores: Which memories were mentioned, when
   - TTL: 24 hours
   - Used for: Preventing repetitive memory mentions

5. **Session Context**
   - Key: `session:${date}:context`
   - Stores: General session state
   - TTL: 2 hours

6. **Session Grounding**
   - Key: `session:grounding:${userId}:${date}`
   - Stores: Conversation grounding information
   - TTL: 2 hours

### Redis Functions:
- `getChatTestConversation()` - Get conversation history
- `addChatTestMessage()` - Add message to history
- `getExperienceMemories()` - Get structured memories
- `setExperienceMemories()` - Store structured memories
- `getMemoryUsageTracker()` - Get memory mention tracking
- `updateMemoryUsageTracker()` - Update memory mentions

**Location:** `src/app/lib/redis.ts`

---

## 4. AI COMPONENTS

### A. Backboard AI (ORCHESTRATION LAYER)

**Purpose:** Unified orchestration, persistent memory, and LLM access

**Integration:**
- **Wrapper:** `src/app/lib/backboardClient.ts`
- **Interface:** OpenAI-compatible (drop-in replacement)
- **Features:**
  - Automatic memory management (`memory: 'Auto'`)
  - Assistant/Thread model for conversation persistence
  - Unified access to 2,200+ LLMs

**How It Works:**
```
1. System checks for BACKBOARD_API_KEY
2. If set → Uses Backboard client wrapper
3. Creates/gets Assistant with system message
4. Creates/gets Thread for conversation
5. Adds user message to thread
6. Backboard automatically:
   - Searches memory
   - Writes new memories
   - Generates response using OpenAI (gpt-4o)
7. Returns response in OpenAI-compatible format
8. If Backboard fails → Falls back to OpenAI directly
```

**Model Mapping:**
- `gpt-4o-mini` → Mapped to `gpt-4o` (Backboard doesn't support mini)
- `gpt-4o` → Used directly
- Provider: `openai`

**Key Files:**
- `src/app/lib/backboardClient.ts` - Backboard wrapper
- `src/app/api/chat/route.ts` - Uses Backboard via wrapper
- `src/app/api/chat-test/route.ts` - Uses Backboard via wrapper

### B. OpenAI (PRIMARY LLM)

**Models Used:**

1. **GPT-4o Realtime** (Voice)
   - Model: `gpt-4o-realtime-preview-2025-06-03`
   - Used for: Voice agent, transcription, TTS
   - Location: `useRealtimeSession.ts`

2. **GPT-4o-mini** (Conversation & Processing)
   - Used for: Chat responses, topic extraction, memory extraction
   - Location: `memoryAgent.ts`, `chat/route.ts`
   - **Note:** Now routed through Backboard (as `gpt-4o`)

3. **GPT-4o** (Advanced Processing)
   - Used for: Memory structuring, experience memory creation
   - Location: `memoryAgent.ts`
   - **Note:** Now routed through Backboard when available

**Fallback Logic:**
```
IF Backboard API key exists:
  → Use Backboard (which uses OpenAI under the hood)
  → If Backboard fails → Fall back to OpenAI directly
ELSE:
  → Use OpenAI directly
```

### C. mem0 (SEMANTIC MEMORY - Historical)

**Purpose:** Long-term semantic memory storage and search

**Note:** Currently, the system uses Redis experience memories instead of mem0 for active conversations. mem0 is still in the codebase but not actively searched during conversations.

**Original Flow (Deprecated):**
1. Extract topic from user message
2. Search mem0 for relevant memories
3. Create experience memories from results
4. Cache in Redis

**Current Flow (Active):**
1. Memory Agent extracts structured journal data ONCE
2. Creates 2 experience memories from extraction
3. Stores in Redis (NOT mem0)
4. Future conversations use Redis memories directly

**Location:**
- `src/app/lib/mem0.ts` - mem0 client
- `src/app/lib/memoryAgent.ts` - Memory agent (now uses Redis primarily)

---

## 5. MEMORY AGENT

**Purpose:** Extract structured information from journal entries and create experience memories

**Location:** `src/app/lib/memoryAgent.ts`

### Flow:
```
1. User shares initial journal entry (long message >100 chars, >15 words)
2. Memory Agent extracts structured data:
   - Events (concrete things that happened)
   - Projects (ongoing work)
   - Patterns (behaviors, habits)
   - Emotions (feelings, states)
3. Creates 2 structured Experience Memories:
   - Daily Regulation (routines, patterns)
   - Major Events (significant moments)
4. Stores in Redis under `memory:experiences:${userId}:${date}`
5. Future conversations use these memories (no more extraction)
```

### Experience Memory Structure:
```typescript
{
  type: 'experience_memory',
  title: string,              // Short title
  core_fact: string,          // One sentence fact
  key_details: string[],      // Max 4 details
  user_meaning: string,       // What this means to user
  emotional_tone: string,     // Emotions
  reflection_hooks: string[]  // Questions for reflection
}
```

---

## 6. CONVERSATIONAL AGENT

**Purpose:** Generate natural, human-like responses with memory context

**Location:** `src/app/api/chat-test/route.ts` → `generateConversationalResponse()`

### Response Pattern: "React once, then ask once"
- **Structure:** One acknowledgment + Optional memory reference (subtle) + One question
- **Memory Usage:** Sparingly (once every 2-3 turns, never back-to-back)
- **Memory Mention:** ONE CLAUSE MAX (8 words), embedded naturally

### Flow:
```
1. Receives user message
2. Gets experience memories from Redis
3. Gets conversation history from Redis
4. Builds prompt with:
   - System instructions
   - Experience memories (if relevant)
   - Conversation history (last few messages)
   - User's current message
5. Calls Backboard AI (or OpenAI) to generate response
6. Validates response structure
7. Returns response
8. Saves response to Redis conversation history
```

---

## 7. COMPLETE SYSTEM FLOW

### Voice Flow (End-to-End):
```
USER SPEAKS
  ↓
OpenAI Realtime API (transcribes)
  ↓
Journal Agent receives text
  ↓
Calls getResponseWithMemory tool
  ↓
Tool calls /api/chat-test
  ↓
API checks if initial journal entry
  ↓
If YES → Memory Agent extracts structured data → Creates experience memories → Stores in Redis
If NO → Gets experience memories from Redis
  ↓
Generates response via Backboard AI (with memory context)
  ↓
Response returned to Journal Agent
  ↓
OpenAI Realtime API (TTS)
  ↓
USER HEARS RESPONSE
```

### Text Chat Flow (End-to-End):
```
USER TYPES MESSAGE
  ↓
Frontend calls /api/chat-test
  ↓
(Same as voice flow from here)
  ↓
Response displayed in chat UI
```

### Memory Creation Flow (One-Time):
```
USER SHARES LONG JOURNAL ENTRY
  ↓
Memory Agent extracts:
  - Events, Projects, Patterns, Emotions
  ↓
Groups into 2 categories:
  - Daily Regulation
  - Major Events
  ↓
Creates 2 Experience Memories using GPT-4o (via Backboard)
  ↓
Stores in Redis: memory:experiences:${userId}:${date}
  ↓
Future conversations use these memories
```

---

## 8. DATA PERSISTENCE

### Redis (Fast Cache - Temporary)
- Conversation history (24h TTL)
- Experience memories (24h TTL)
- Memory usage tracker (24h TTL)
- Session state (2h TTL)

### Supabase PostgreSQL (Long-term Storage)
- User authentication
- Daily reflections table:
  - `conversation_transcript` (JSON)
  - `reflection_summary` (text)
  - `date`, `user_id`
- Onboarding transcripts

### Backboard AI (Persistent Memory)
- Maintains conversation threads
- Stores memories automatically
- Persists across sessions via thread IDs

---

## 9. KEY INTEGRATIONS

### Backboard AI Integration:
- **Wrapper:** OpenAI-compatible interface
- **Orchestration:** Handles memory, conversation state
- **Models:** Uses OpenAI models (gpt-4o) through Backboard
- **Fallback:** Direct OpenAI if Backboard fails
- **Memory:** Automatic memory search and write
- **Threads:** Persistent conversation threads per user/date

### OpenAI Integration:
- **Realtime API:** Voice transcription and TTS
- **Chat API:** Conversation responses (via Backboard or direct)
- **Models:** gpt-4o-realtime, gpt-4o, gpt-4o-mini

### Redis Integration:
- **Cache:** Fast access to conversation and memories
- **TTL:** Automatic expiration for temporary data
- **Format:** JSON serialization for complex objects

---

## 10. SYSTEM ARCHITECTURE SUMMARY

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  ┌──────────────┐         ┌──────────────┐                 │
│  │  Voice UI    │         │  Text Chat   │                 │
│  │  (VoiceOrb)  │         │  (Input Box) │                 │
│  └──────┬───────┘         └──────┬───────┘                 │
│         │                        │                          │
│         └────────┬───────────────┘                          │
└──────────────────┼──────────────────────────────────────────┘
                   │
        ┌──────────▼──────────┐
        │  OpenAI Realtime    │ (Voice only)
        │  (WebRTC Stream)    │
        └──────────┬──────────┘
                   │
        ┌──────────▼──────────┐
        │  Journal Agent      │ (Voice only)
        │  (RealtimeAgent)    │
        └──────────┬──────────┘
                   │
        ┌──────────▼──────────┐
        │  Memory Tool        │
        │  (getResponseWith   │
        │   Memory)           │
        └──────────┬──────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│                    API LAYER                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  /api/chat-test (or /api/chat)                       │  │
│  │  - Receives message (voice/text)                     │  │
│  │  - Checks if initial journal entry                   │  │
│  │  - Calls Memory Agent if needed                      │  │
│  │  - Gets experience memories from Redis               │  │
│  │  - Generates response via Backboard AI               │  │
│  │  - Saves to Redis                                    │  │
│  └──────────────┬───────────────────────────────────────┘  │
└──────────────────┼──────────────────────────────────────────┘
                   │
        ┌──────────▼──────────┐
        │  BACKBOARD AI       │ ← ORCHESTRATION LAYER
        │  - Unified LLM      │
        │  - Auto Memory      │
        │  - Threads          │
        └──────────┬──────────┘
                   │
        ┌──────────▼──────────┐
        │  OpenAI (gpt-4o)    │ ← LLM PROVIDER
        │  - Chat responses   │
        │  - Memory creation  │
        └─────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│                    MEMORY LAYER                              │
│  ┌──────────────────┐    ┌──────────────────┐              │
│  │  Memory Agent    │    │  Redis Cache     │              │
│  │  - Extracts      │───▶│  - Experience    │              │
│  │  - Structures    │    │  - Conversations │              │
│  │  - Creates       │    │  - Usage tracker │              │
│  └──────────────────┘    └──────────────────┘              │
│                                                            │
│  ┌──────────────────┐                                      │
│  │  mem0 (Historical)│ (Not actively used in conversations)│
│  │  - Long-term      │                                      │
│  │  - Semantic search│                                      │
│  └──────────────────┘                                      │
└────────────────────────────────────────────────────────────┘
```

---

## 11. ENVIRONMENT VARIABLES

```env
# OpenAI
OPENAI_API_KEY=sk-...

# Backboard AI (NEW)
BACKBOARD_API_KEY=espr_...

# Redis (Upstash)
UPSTASH_REDIS_URL=https://...
UPSTASH_REDIS_TOKEN=...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# mem0 (Historical - optional)
MEM0_API_KEY=...
```

---

## 12. KEY FILES REFERENCE

### Voice Components:
- `src/app/day/[date]/page.tsx` - Main journal page
- `src/app/hooks/useRealtimeSession.ts` - Realtime API connection
- `src/app/lib/memoryTool.ts` - Tool connecting voice to API
- `src/app/agentConfigs/journalAgent.ts` - Agent config

### Chat API:
- `src/app/api/chat-test/route.ts` - Main chat endpoint
- `src/app/api/chat/route.ts` - Alternative endpoint (same logic)

### Backboard Integration:
- `src/app/lib/backboardClient.ts` - Backboard wrapper
- `src/app/api/test-backboard/route.ts` - Test endpoint

### Memory System:
- `src/app/lib/memoryAgent.ts` - Memory extraction and creation
- `src/app/lib/redis.ts` - Redis utilities
- `src/app/lib/mem0.ts` - mem0 client (historical)

### Data Storage:
- `src/app/lib/supabase.ts` - Supabase client
- PostgreSQL tables: `daily_reflections`, `onboarding_transcripts`

---

## 13. CONVERSATION FLOW STATES

1. **Initial Greeting**
   - User says hello → AI greets back
   - No memory search, no extraction

2. **Initial Journal Entry** (Long message)
   - User shares day summary
   - Memory Agent extracts structured data
   - Creates 2 experience memories
   - Stores in Redis
   - AI responds conversationally

3. **Follow-up Conversations**
   - Gets experience memories from Redis
   - Uses memory sparingly (once every 2-3 turns)
   - Follows "React once, ask once" pattern
   - Maintains conversation context

4. **Farewell**
   - User says goodbye
   - Brief, warm response
   - No questions

---

This architecture provides a seamless voice and text experience with intelligent memory management and natural conversation flow.

