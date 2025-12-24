# My Daily Voice - Complete Documentation

## Table of Contents
1. [Database Design](#database-design)
   - [PostgreSQL Database](#postgresql-database)
   - [mem0 Memory Database](#mem0-memory-database)
2. [Database Tables & Relationships](#database-tables--relationships)
3. [mem0 Memory System](#mem0-memory-system)
4. [AI Configuration](#ai-configuration)
5. [Agents System](#agents-system)

---

## Database Design

### PostgreSQL Database

**Technology:** Supabase (PostgreSQL)

**Purpose:** Stores all structured application data including user authentication, journal entries, transcripts, and tasks.

**Connection:**
- Uses Supabase client library
- Environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Location: `realtime-agents/src/app/lib/supabase.ts`

**Key Features:**
- Row Level Security (RLS) enabled on all tables
- User-specific data isolation via `user_id` foreign keys
- JSONB columns for flexible data storage (transcripts, conversation data)
- Automatic timestamps (`created_at`, `updated_at`)

### mem0 Memory Database

**Technology:** mem0ai (External Memory Service)

**Purpose:** Stores long-term semantic memories extracted from user conversations and journal entries. Used for context-aware AI responses.

**Connection:**
- Uses mem0ai SDK (`MemoryClient`)
- Environment variable: `MEM0_API_KEY`
- Location: `realtime-agents/src/app/lib/mem0.ts`

**Key Features:**
- Semantic search capabilities
- User-scoped memories (via `user_id`)
- Metadata tagging system
- Automatic memory categorization

---

## Database Tables & Relationships

### 1. `daily_reflections` Table

**Purpose:** Stores daily journal entries and reflection data.

**Schema:**
```sql
CREATE TABLE public.daily_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  mood TEXT,
  reflection_summary TEXT,
  completion_rate INTEGER DEFAULT 0,
  morning_plan_recorded BOOLEAN DEFAULT false,
  evening_checkin_recorded BOOLEAN DEFAULT false,
  conversation_transcript JSONB,  -- Full conversation as JSON array
  selfie_url TEXT,                -- URL to selfie image
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT daily_reflections_user_date_unique UNIQUE (user_id, date)
);
```

**Relationships:**
- `user_id` → `auth.users(id)` (Many-to-One)
- One reflection per user per date (unique constraint)

**Indexes:**
- `idx_daily_reflections_user_id` on `user_id`
- `idx_daily_reflections_user_date` on `(user_id, date)`
- `idx_reflections_date` on `date`

**RLS Policies:**
- Users can only SELECT, INSERT, UPDATE, DELETE their own reflections

**Key Fields:**
- `conversation_transcript`: Stores full voice conversation as JSONB array for resuming conversations
- `reflection_summary`: AI-generated summary of the day
- `mood`: User's emotional state

### 2. `onboarding_transcripts` Table

**Purpose:** Stores onboarding conversation transcripts before memory extraction.

**Schema:**
```sql
CREATE TABLE public.onboarding_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  transcript JSONB NOT NULL,  -- Full conversation transcript as JSON array
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  extracted_at TIMESTAMP WITH TIME ZONE,  -- When memory extraction completed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Relationships:**
- `user_id` → `auth.users(id)` (Many-to-One)

**Indexes:**
- `idx_onboarding_transcripts_user_id` on `user_id`
- `idx_onboarding_transcripts_created_at` on `created_at`

**RLS Policies:**
- Users can only SELECT, INSERT, UPDATE their own transcripts

**Key Fields:**
- `transcript`: Full onboarding conversation stored as JSONB
- `extracted_at`: Timestamp when memories were extracted and stored in mem0

### 3. `tasks` Table

**Purpose:** Stores daily tasks and their completion status.

**Schema:**
```sql
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'completed', 'missed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Relationships:**
- `user_id` → `auth.users(id)` (Many-to-One)

**Indexes:**
- `idx_tasks_user_id` on `user_id`
- `idx_tasks_date` on `date`

**RLS Policies:**
- Users can only SELECT, INSERT, UPDATE, DELETE their own tasks

**Key Fields:**
- `status`: Must be one of: 'pending', 'completed', 'missed'

### 4. Storage: `selfies` Bucket

**Purpose:** Stores user selfie images uploaded during journaling.

**Configuration:**
- Bucket ID: `selfies`
- Public read access enabled
- Public insert/update access (for prototype)

**Location:** Supabase Storage

---

## mem0 Memory System

### Overview

mem0 is an external memory service that stores semantic memories extracted from user conversations and journal entries. It enables the AI to remember past experiences and provide context-aware responses.

### How It Works

#### 1. Memory Storage Flow

**Onboarding Memories:**
```
User completes onboarding → Transcript saved to PostgreSQL → 
Extract memories using GPT-4o-mini → Store in mem0 with metadata
```

**Journal Memories:**
```
User writes journal entry → Extract structured memories → 
Store in mem0 with date and source metadata
```

**Conversation Memories:**
```
User has voice conversation → Extract memories from conversation → 
Store in mem0 with conversation context
```

#### 2. Memory Extraction Process

**Location:** `realtime-agents/src/app/lib/memoryAgent.ts`

**Extraction Categories:**
- **Events**: Concrete things that occurred (e.g., "Hackathon featured on college website")
- **Projects**: Long-running contexts, ongoing work (e.g., "Hackathon", "Journaling app development")
- **Patterns**: Repeatable behaviors, habits (e.g., "Loses focus due to social media scrolling")
- **Emotions**: Emotional states, feelings (e.g., "Felt productive later", "Distracted in the morning")

**Extraction Method:**
1. Uses GPT-4o-mini to analyze text
2. Extracts structured information across 4 categories
3. Returns JSON with events, projects, patterns, emotions arrays

#### 3. Memory Storage Format

**Memory Structure:**
```typescript
{
  role: 'user',
  content: string,  // Memory content (1-2 sentences)
  user_id: string,  // User identifier
  metadata: {
    source: 'onboarding' | 'journal' | 'conversation',
    date?: string,  // For journal/conversation memories
    transcriptId?: string,  // For onboarding memories
    confidence: number,  // 0-1 confidence score
    tags: string[]  // Memory tags (emotion, focus, work, etc.)
  }
}
```

**Memory Tags:**
- `emotion`, `focus`, `work`, `goals`, `actions`, `habits`, `challenges`, `mindset`, `relationships`, `wins`, `reflection`, `health`

#### 4. Memory Search

**Search Process:**
1. Extract topic from user message (1-3 words)
2. Assess confidence score (0-10) to decide if search is needed
3. If confidence ≥ 2, search mem0 for relevant memories
4. Return top 5 most relevant memories

**Search Method:**
- Uses mem0's semantic search API
- Searches by user_id for user-specific memories
- Falls back to 'default-user' for backwards compatibility

**Location:** `realtime-agents/src/app/lib/memoryAgent.ts` → `searchMemories()`

#### 5. Experience Memories (Redis Cache)

**Purpose:** Structured memories created from mem0 search results, cached in Redis for fast access during conversations.

**Structure:**
```typescript
interface ExperienceMemory {
  type: 'experience_memory';
  title: string;                    // Short descriptive title
  core_fact: string;                // One sentence fact
  key_details: string[];            // Max 4 details
  user_meaning: string;             // What this means to the user
  emotional_tone: string;          // Comma-separated emotions
  reflection_hooks: string[];       // Max 3 questions for reflection
}
```

**Creation Process:**
1. After user shares journal entry, extract structured information
2. Search mem0 for all extracted topics (events, projects, patterns, emotions)
3. Group memories into categories (Daily Regulation vs Major Events)
4. Use GPT-4o to create 2 structured experience memories
5. Store in Redis with date-based key

**Location:** `realtime-agents/src/app/lib/memoryAgent.ts` → `createExperienceMemories()`

**Redis Storage:**
- Key format: `experience_memories:${userId}:${date}`
- TTL: 2 hours (7200 seconds)
- Location: `realtime-agents/src/app/lib/redis.ts`

---

## AI Configuration

### OpenAI Configuration

**Models Used:**
- **GPT-4o**: Advanced reasoning, memory structuring, session signal generation
- **GPT-4o-mini**: Topic extraction, confidence assessment, memory extraction, conversational responses
- **GPT-4o-realtime**: Voice agent (Realtime API)

**Environment Variables:**
- `OPENAI_API_KEY`: Required for all OpenAI API calls

**Usage Locations:**
- Memory extraction: `realtime-agents/src/app/api/extract-memory/route.ts`
- Journal memory storage: `realtime-agents/src/app/api/store-journal-memory/route.ts`
- Chat responses: `realtime-agents/src/app/api/chat/route.ts`
- Memory agent: `realtime-agents/src/app/lib/memoryAgent.ts`
- Metrics generation: `realtime-agents/src/app/api/metrics/route.ts`
- Journal polishing: `realtime-agents/src/app/api/polish-journal/route.ts`

### mem0 Configuration

**Environment Variables:**
- `MEM0_API_KEY`: Required for mem0 memory service

**Client Initialization:**
- Location: `realtime-agents/src/app/lib/mem0.ts`
- Singleton pattern (client created once, reused)
- Throws error if API key not set

### Redis Configuration (Upstash)

**Purpose:** Caches session state, conversation context, and experience memories for fast access.

**Environment Variables:**
- `UPSTASH_REDIS_URL`: Redis connection URL
- `UPSTASH_REDIS_TOKEN`: Redis authentication token

**Client Initialization:**
- Location: `realtime-agents/src/app/lib/redis.ts`
- Uses `@upstash/redis` SDK
- Singleton pattern

**Data Stored:**
- Conversation state (session-scoped)
- Experience memories (date-scoped)
- Chat test conversations
- Weekly metrics cache
- Memory usage tracking

### Supabase Configuration

**Environment Variables:**
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key

**Client Initialization:**
- Location: `realtime-agents/src/app/lib/supabase.ts`
- Uses `@supabase/supabase-js` SDK
- Server-side and client-side clients available

---

## Agents System

### Overview

The application uses OpenAI Realtime Agents for voice-based journaling conversations. Agents are configured with specific instructions, voices, and tools to guide users through reflective journaling sessions.

### Agent Architecture

#### 1. Journal Agent (`journalCompanion`)

**Purpose:** Main journaling companion for daily reflection conversations.

**Location:** `realtime-agents/src/app/agentConfigs/journalAgent.ts`

**Configuration:**
```typescript
{
  name: 'journalCompanion',
  voice: 'sage',  // Calm, reflective voice
  instructions: buildAgentInstructions(state, previousConversation),
  handoffs: [],
  tools: []
}
```

**Key Features:**
- Dynamic instructions based on conversation state
- Supports conversation resumption (remembers previous conversations)
- Phase-based conversation flow

**Conversation Phases:**
1. **Opening**: Invites user to share ("How was your day? Tell me everything.")
2. **Listening**: User speaks freely, AI listens silently
3. **Mood Confirmation**: AI asks "How are you feeling right now?"
4. **Reflecting**: AI follows along naturally, asks gentle questions
5. **Questioning**: AI asks thoughtful questions for deeper reflection
6. **Closed**: Session ends gracefully

**Instruction Building:**
- Location: `realtime-agents/src/app/lib/agentInstructions.ts`
- Function: `buildAgentInstructions(state, previousConversation)`
- Adapts instructions based on:
  - Current conversation phase
  - Previous conversation context
  - User's initial sharing status

**Special Response Handling:**
- If user message starts with `[SPEAK_THIS]` and ends with `[/SPEAK_THIS]`, agent speaks the text exactly as written
- This allows backend system to control agent speech
- For normal messages, agent stays silent (backend handles responses)

#### 2. Onboarding Agent (`onboardingCompanion`)

**Purpose:** Guides new users through onboarding conversation to learn about them.

**Location:** `realtime-agents/src/app/agentConfigs/onboardingAgent.ts`

**Configuration:**
```typescript
{
  name: 'onboardingCompanion',
  voice: 'cedar',  // Warm, friendly voice
  instructions: `You are conducting a warm onboarding conversation...`,
  handoffs: [],
  tools: []
}
```

**Onboarding Questions (20 total):**
1. Name/what to call them
2. Preferred reflection time (morning/afternoon/night/whenever)
3. Main stress causes (people/work/health/money/time)
4. Top 2-3 life areas (career/relationships/health/growth/creativity)
5. Who they're trying to become
6. What they want more of
7. What they want less of
8. Recurring challenges
9. What makes a good day
10. What makes a bad day
11. Habits trying to change/build
12. Biggest obstacle
13. Simple "if-then" plan for obstacle
14. Thoughts under pressure
15. What helps reset when overwhelmed
16. What they feel responsible for
17. What you should never do
18. Fewer questions vs gentle guidance preference
19. Session length preference (short 2-5min vs longer 5-15min)
20. What would make app worth returning

**Completion:**
- When finished, says: "Great! I've learned a lot about you. Let's start your first journal entry whenever you're ready."
- Transcript saved to `onboarding_transcripts` table
- Memories extracted and stored in mem0

### Agent Workflow

#### Voice Session Flow

1. **User starts voice session:**
   - Frontend calls OpenAI Realtime API
   - Creates ephemeral key for session
   - Initializes agent with conversation state

2. **Agent receives user message:**
   - User speaks → Realtime API transcribes
   - Agent receives transcribed message
   - Agent follows instructions based on phase

3. **Backend processing (if needed):**
   - For initial journal entry: Extract structured info, search mem0, create experience memories
   - For follow-up messages: Use cached experience memories from Redis
   - Generate response using GPT-4o-mini with memory context
   - Send response to agent via `[SPEAK_THIS]` format

4. **Agent speaks response:**
   - Agent receives `[SPEAK_THIS]` message
   - Speaks response exactly as written
   - User hears response via TTS

5. **State updates:**
   - Conversation state updated in Redis
   - Transcript saved to PostgreSQL
   - Memories extracted and stored in mem0 (post-session)

#### Memory Integration

**One-Time Memory Agent:**
- Runs ONCE after user shares initial journal entry
- Extracts structured information (events, projects, patterns, emotions)
- Searches mem0 for all extracted topics
- Creates 2 structured experience memories
- Stores in Redis for fast access
- No more mem0 searches during conversation

**Memory Usage in Conversations:**
- Experience memories fetched from Redis (not mem0)
- Used sparingly in responses (once every few turns, never back-to-back)
- Response format: One acknowledgment + Optional memory reference (one clause) + One question

**Location:** `realtime-agents/src/app/lib/memoryAgent.ts` → `runOneTimeMemoryAgent()`

### Agent Tools

**Current Status:** Tools are temporarily disabled. The system uses direct API calls via agent instructions instead.

**Previous Tool (Disabled):**
- `chat` tool: Would call `/api/chat` endpoint for memory-aware responses
- Location: `realtime-agents/src/app/lib/chatTool.ts`

**Current Approach:**
- Backend generates responses via `/api/chat` endpoint
- Responses sent to agent via `[SPEAK_THIS]` format
- Agent speaks responses verbatim

### Agent Scenarios

**Journal Scenario:**
- Single agent: `journalCompanion`
- Used for daily journaling sessions

**Onboarding Scenario:**
- Single agent: `onboardingCompanion`
- Used for first-time user onboarding

**Location:** `realtime-agents/src/app/agentConfigs/index.ts`

---

## Summary

### Database Summary

**PostgreSQL (Supabase):**
- 3 main tables: `daily_reflections`, `onboarding_transcripts`, `tasks`
- All tables have user-scoped RLS policies
- JSONB columns for flexible data storage
- Storage bucket for selfie images

**mem0:**
- Stores semantic memories extracted from conversations and journals
- User-scoped via `user_id`
- Supports semantic search
- Metadata tagging system

**Redis (Upstash):**
- Caches session state and experience memories
- Fast access during conversations
- TTL-based expiration (2 hours default)

### AI Summary

**OpenAI Models:**
- GPT-4o: Advanced reasoning and memory structuring
- GPT-4o-mini: Extraction, assessment, conversational responses
- GPT-4o-realtime: Voice agent

**Memory System:**
- One-time extraction after initial journal entry
- Structured experience memories cached in Redis
- Used sparingly in conversations

### Agents Summary

**2 Main Agents:**
1. **Journal Agent**: Daily reflection companion (voice: sage)
2. **Onboarding Agent**: First-time user guide (voice: cedar)

**Key Features:**
- Phase-based conversation flow
- Conversation resumption support
- Memory-aware responses
- Backend-controlled speech via `[SPEAK_THIS]` format

---

## Environment Variables Required

```bash
# OpenAI
OPENAI_API_KEY=your-openai-api-key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# mem0
MEM0_API_KEY=your-mem0-api-key

# Redis (Upstash)
UPSTASH_REDIS_URL=your-redis-url
UPSTASH_REDIS_TOKEN=your-redis-token
```

All environment variables should be set in `.env.local` file (which is gitignored).

