import { Redis } from '@upstash/redis';
import type { ConversationState } from '@/app/types/session';
import { JOURNAL_THEMES } from '@/app/types/session';

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (redisClient) {
    return redisClient;
  }

  const url = process.env.UPSTASH_REDIS_URL;
  const token = process.env.UPSTASH_REDIS_TOKEN;

  if (!url || !token) {
    throw new Error(
      'UPSTASH_REDIS_URL and UPSTASH_REDIS_TOKEN must be set in environment variables!\n' +
      'Please set them in .env.local\n' +
      'Then restart your dev server: npm run dev'
    );
  }

  redisClient = new Redis({
    url,
    token,
  });

  return redisClient;
}

// Helper functions for session context caching
export async function getSessionContext(date: string): Promise<any | null> {
  const redis = getRedisClient();
  const key = `session:${date}:context`;
  const data = await redis.get(key);
  return data as any | null;
}

export async function setSessionContext(date: string, context: any, ttlSeconds: number = 7200): Promise<void> {
  const redis = getRedisClient();
  const key = `session:${date}:context`;
  await redis.set(key, context, { ex: ttlSeconds }); // Default 2 hours TTL
}

export async function deleteSessionContext(date: string): Promise<void> {
  const redis = getRedisClient();
  const key = `session:${date}:context`;
  await redis.del(key);
}

// Functions for conversation state
export async function getConversationState(sessionId: string, date: string): Promise<ConversationState | null> {
  const redis = getRedisClient();
  const key = `conversation:${date}:${sessionId}`;
  const data = await redis.get(key);
  return data as ConversationState | null;
}

export async function setConversationState(
  sessionId: string,
  date: string,
  state: ConversationState,
  ttlSeconds: number = 7200
): Promise<void> {
  const redis = getRedisClient();
  const key = `conversation:${date}:${sessionId}`;
  await redis.set(key, state, { ex: ttlSeconds });
}

export async function updateConversationState(
  sessionId: string,
  date: string,
  updates: Partial<ConversationState>
): Promise<ConversationState> {
  const redis = getRedisClient();
  const key = `conversation:${date}:${sessionId}`;
  
  // Get current state
  const current = await redis.get(key) as ConversationState | null;
  
  // Merge updates
  const updated: ConversationState = {
    ...(current || createInitialState(sessionId, date)),
    ...updates,
    lastUpdated: Date.now(),
  };
  
  // Save back
  await redis.set(key, updated, { ex: 7200 });
  
  return updated;
}

export async function deleteConversationState(sessionId: string, date: string): Promise<void> {
  const redis = getRedisClient();
  const key = `conversation:${date}:${sessionId}`;
  await redis.del(key);
}

// Functions for chat-test conversation history
export interface ChatTestMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ChatTestConversation {
  userId: string;
  date: string;
  messages: ChatTestMessage[];
  createdAt: number;
  lastUpdated: number;
}

/**
 * Get chat-test conversation history from Redis
 */
export async function getChatTestConversation(
  userId: string,
  date: string
): Promise<ChatTestConversation | null> {
  const redis = getRedisClient();
  const key = `chat-test:conversation:${userId}:${date}`;
  const data = await redis.get(key);
  if (!data) {
    return null;
  }
  // Upstash might return already parsed object or a string
  if (typeof data === 'string') {
    try {
      return JSON.parse(data) as ChatTestConversation;
    } catch {
      return null;
    }
  }
  return data as ChatTestConversation;
}

/**
 * Save chat-test conversation history to Redis
 */
export async function saveChatTestConversation(
  userId: string,
  date: string,
  messages: ChatTestMessage[]
): Promise<void> {
  const redis = getRedisClient();
  const key = `chat-test:conversation:${userId}:${date}`;
  
  // Get existing conversation or create new
  const existing = await getChatTestConversation(userId, date);
  
  const conversation: ChatTestConversation = {
    userId,
    date,
    messages,
    createdAt: existing?.createdAt || Date.now(),
    lastUpdated: Date.now(),
  };
  
  // Save with 24 hour TTL (one day)
  await redis.set(key, conversation, { ex: 86400 });
}

/**
 * Add a message to chat-test conversation history
 */
export async function addChatTestMessage(
  userId: string,
  date: string,
  role: 'user' | 'assistant',
  content: string
): Promise<ChatTestConversation> {
  const existing = await getChatTestConversation(userId, date);
  const messages = existing?.messages || [];
  
  const newMessage: ChatTestMessage = {
    role,
    content,
    timestamp: Date.now(),
  };
  
  const updatedMessages = [...messages, newMessage];
  await saveChatTestConversation(userId, date, updatedMessages);
  
  return {
    userId,
    date,
    messages: updatedMessages,
    createdAt: existing?.createdAt || Date.now(),
    lastUpdated: Date.now(),
  };
}

/**
 * Clear chat-test conversation history
 */
export async function clearChatTestConversation(userId: string, date: string): Promise<void> {
  const redis = getRedisClient();
  const key = `chat-test:conversation:${userId}:${date}`;
  try {
    const result = await redis.del(key);
    // Upstash returns 1 if deleted, 0 if not found
    if (result === 0) {
      // Key didn't exist, that's okay
    }
  } catch (error: any) {
    throw new Error(`Failed to delete chat conversation: ${error.message}`);
  }
}

// Functions for session memory cache (batch-fetched memories)
export interface SessionMemory {
  topic: string;
  memories: any[];
  summary: string | null;
  fetchedAt: number;
}

export interface SessionMemoriesCache {
  userId: string;
  date: string;
  memories: SessionMemory[];
  createdAt: number;
  lastUpdated: number;
}

/**
 * Store batch-fetched memories in Redis for a session
 */
export async function setSessionMemories(
  userId: string,
  date: string,
  memories: SessionMemory[]
): Promise<void> {
  const redis = getRedisClient();
  const key = `session:memories:${userId}:${date}`;
  
  const cache: SessionMemoriesCache = {
    userId,
    date,
    memories,
    createdAt: Date.now(),
    lastUpdated: Date.now(),
  };
  
  // Store with 24 hour TTL (one day)
  await redis.set(key, cache, { ex: 86400 });
}

/**
 * Get cached session memories from Redis
 */
export async function getSessionMemories(
  userId: string,
  date: string
): Promise<SessionMemory[] | null> {
  const redis = getRedisClient();
  const key = `session:memories:${userId}:${date}`;
  const data = await redis.get(key) as SessionMemoriesCache | null;
  return data?.memories || null;
}

/**
 * Get memory summary for a specific topic from cached session memories
 */
export async function getCachedMemoryForTopic(
  userId: string,
  date: string,
  topic: string
): Promise<{ memories: any[]; summary: string | null } | null> {
  const cached = await getSessionMemories(userId, date);
  if (!cached || cached.length === 0) {
    return null;
  }
  
  // Find memory for this topic (fuzzy match - more lenient)
  const topicLower = topic.toLowerCase().trim();
  const topicWords = topicLower.split(/\s+/);
  
  // Try exact match first
  let memoryEntry = cached.find((m) => 
    m.topic.toLowerCase().trim() === topicLower
  );
  
  // Try partial match (topic contains cached topic or vice versa)
  if (!memoryEntry) {
    memoryEntry = cached.find((m) => {
      const cachedTopicLower = m.topic.toLowerCase().trim();
      return cachedTopicLower.includes(topicLower) || 
             topicLower.includes(cachedTopicLower) ||
             topicWords.some(word => cachedTopicLower.includes(word)) ||
             cachedTopicLower.split(/\s+/).some(word => topicLower.includes(word));
    });
  }
  
  // If still no match, return ALL cached memories combined (user is talking about something related)
  if (!memoryEntry && cached.length > 0) {
    const allMemories = cached.flatMap(m => m.memories);
    const allSummaries = cached.map(m => m.summary).filter(Boolean).join(' ');
    return {
      memories: allMemories,
      summary: allSummaries || null,
    };
  }
  
  if (memoryEntry) {
    return {
      memories: memoryEntry.memories,
      summary: memoryEntry.summary,
    };
  }
  
  return null;
}

/**
 * Clear session memories cache
 */
export async function clearSessionMemories(userId: string, date: string): Promise<void> {
  const redis = getRedisClient();
  const key = `session:memories:${userId}:${date}`;
  try {
  await redis.del(key);
  } catch (error: any) {
    throw new Error(`Failed to delete session memories: ${error.message}`);
  }
}

/**
 * Store session grounding (compressed context)
 */
export async function setSessionGrounding(
  userId: string,
  date: string,
  grounding: any
): Promise<void> {
  const redis = getRedisClient();
  const key = `session:grounding:${userId}:${date}`;
  await redis.set(key, grounding, { ex: 86400 }); // 24 hour TTL
}

/**
 * Get session grounding (compressed context)
 */
export async function getSessionGrounding(
  userId: string,
  date: string
): Promise<any | null> {
  const redis = getRedisClient();
  const key = `session:grounding:${userId}:${date}`;
  const data = await redis.get(key);
  return data as any | null;
}

/**
 * Clear session grounding
 */
export async function clearSessionGrounding(
  userId: string,
  date: string
): Promise<void> {
  const redis = getRedisClient();
  const key = `session:grounding:${userId}:${date}`;
  try {
    await redis.del(key);
  } catch (error: any) {
    throw new Error(`Failed to delete session grounding: ${error.message}`);
  }
}

/**
 * Set experience memories (structured memory objects)
 */
export async function setExperienceMemories(
  userId: string,
  date: string,
  memories: any[]
): Promise<void> {
  const redis = getRedisClient();
  const key = `memory:experiences:${userId}:${date}`;
  await redis.set(key, JSON.stringify(memories), { ex: 86400 }); // 24 hour TTL
}

/**
 * Get experience memories
 */
export async function getExperienceMemories(
  userId: string,
  date: string
): Promise<any[] | null> {
  const redis = getRedisClient();
  const key = `memory:experiences:${userId}:${date}`;
  const data = await redis.get(key);
  if (!data) {
    return null;
  }
  try {
    // Upstash might return already parsed JSON or a string
    let parsed: any;
    if (typeof data === 'string') {
      parsed = JSON.parse(data);
    } else {
      parsed = data; // Already an object
    }
    
    // Ensure it's an array
    if (Array.isArray(parsed)) {
      return parsed;
    } else {
      console.error(`[Redis] ⚠️ Data is not an array:`, typeof parsed);
      return null;
    }
  } catch (error: any) {
    console.error(`[Redis] ❌ Error parsing data:`, error.message);
    console.error(`[Redis] Data type:`, typeof data);
    return null;
  }
}

/**
 * Clear experience memories
 */
export async function clearExperienceMemories(
  userId: string,
  date: string
): Promise<void> {
  const redis = getRedisClient();
  const key = `memory:experiences:${userId}:${date}`;
  try {
  await redis.del(key);
  } catch (error: any) {
    throw new Error(`Failed to delete experience memories: ${error.message}`);
  }
}

/**
 * Track last memory used and turn count for memory mention control
 */
export interface MemoryUsageTracker {
  lastMemoryTitle: string | null;
  turnsSinceLastMention: number;
  lastUpdated: number;
}

/**
 * Get memory usage tracker
 */
export async function getMemoryUsageTracker(
  userId: string,
  date: string
): Promise<MemoryUsageTracker> {
  const redis = getRedisClient();
  const key = `memory:usage:${userId}:${date}`;
  const data = await redis.get(key);
  
  if (data) {
    try {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      return parsed as MemoryUsageTracker;
    } catch {
      // Fall through to default
    }
  }
  
  return {
    lastMemoryTitle: null,
    turnsSinceLastMention: 0,
    lastUpdated: Date.now(),
  };
}

/**
 * Update memory usage tracker
 */
export async function updateMemoryUsageTracker(
  userId: string,
  date: string,
  memoryTitle: string | null,
  mentioned: boolean
): Promise<void> {
  const redis = getRedisClient();
  const key = `memory:usage:${userId}:${date}`;
  
  const tracker = await getMemoryUsageTracker(userId, date);
  
  if (mentioned) {
    tracker.lastMemoryTitle = memoryTitle;
    tracker.turnsSinceLastMention = 0;
  } else {
    tracker.turnsSinceLastMention += 1;
  }
  
  tracker.lastUpdated = Date.now();
  
  await redis.set(key, JSON.stringify(tracker), { ex: 86400 }); // 24 hour TTL
}

/**
 * Clear memory usage tracker
 */
export async function clearMemoryUsageTracker(
  userId: string,
  date: string
): Promise<void> {
  const redis = getRedisClient();
  const key = `memory:usage:${userId}:${date}`;
  try {
    await redis.del(key);
  } catch (error: any) {
    throw new Error(`Failed to delete memory usage tracker: ${error.message}`);
  }
}

// Initialize conversation state with context (all memories from mem0)
export function createInitialState(
  sessionId: string,
  date: string,
  context?: string[]
): ConversationState {
  return {
    sessionId,
    date,
    userId: 'default-user',
    createdAt: Date.now(),
    lastUpdated: Date.now(),
    yesterday_context: context || [],
    anchor: null,
    explored_themes: [],
    unexplored_themes: [...JOURNAL_THEMES], // Start with all themes available
    asked_questions: [],
    tone: null,
    conversation_mode: 'listener',
    last_ai_action: null,
    reflection_mode: 'neutral', // Default: neutral mirroring
    session_phase: 'listening', // V1 flow: start in listening phase
    user_initial_sharing: null, // Will store full initial sharing
    mood: null, // Will capture mood after initial sharing
  };
}

/**
 * Get the start date of the current week (Monday)
 * Returns date in YYYY-MM-DD format
 */
export function getWeekStartDate(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split('T')[0]; // YYYY-MM-DD
}

/**
 * Get weekly metrics from cache
 */
export async function getWeeklyMetrics(
  userId: string,
  weekStart: string
): Promise<any | null> {
  const redis = getRedisClient();
  const key = `metrics:weekly:${userId}:${weekStart}`;
  const data = await redis.get(key);
  if (data) {
    // Handle both string and object returns from Upstash
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch {
        return data;
      }
    }
    return data;
  }
  return null;
}

/**
 * Store weekly metrics in cache
 */
export async function setWeeklyMetrics(
  userId: string,
  weekStart: string,
  metrics: any
): Promise<void> {
  const redis = getRedisClient();
  const key = `metrics:weekly:${userId}:${weekStart}`;
  // Store for 8 days (covers the full week + buffer)
  await redis.set(key, JSON.stringify(metrics), { ex: 86400 * 8 });
}
