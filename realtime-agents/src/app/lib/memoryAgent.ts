/**
 * Memory Agent - Backend Logic
 * 
 * This agent handles:
 * 1. Topic extraction from user message (1-3 words)
 * 2. Confidence assessment (0-10) to decide if memory search is needed
 * 3. Memory search in mem0 when confidence ≥ threshold
 * 4. Memory summarization (2-3 sentences)
 * 
 * Never directly interacts with user - only processes data
 */

import OpenAI from 'openai';
import { getMem0Client } from './mem0';
import { 
  setExperienceMemories,
  getExperienceMemories,
} from './redis';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});


// Lower threshold for memory usage - use when memories are found
// If memories exist, use them even with lower confidence
const CONFIDENCE_THRESHOLD_FOR_MEMORY_USAGE = 2; // Use memory if confidence ≥ 2 AND memories found
const CONFIDENCE_THRESHOLD_FOR_SEARCH = 2; // Search at threshold 2

/**
 * Structured extraction interface
 */
export interface JournalExtraction {
  events: string[];        // Concrete things that occurred
  projects: string[];      // Long-running contexts, ongoing work
  patterns: string[];      // Repeatable behaviors, habits, tendencies
  emotions: string[];      // Emotional states, feelings
}

/**
 * Structured experience memory format
 * This replaces multiple raw memories with a single, meaningful memory object
 */
export interface ExperienceMemory {
  type: 'experience_memory';
  title: string;                    // Short, descriptive title
  core_fact: string;                // One sentence fact
  key_details: string[];            // Max 4 details
  user_meaning: string;             // 1 sentence about what this means to the user
  emotional_tone: string;          // Comma-separated emotions
  reflection_hooks: string[];       // Max 3 questions for reflection
}

/**
 * Compressed session grounding stored in Redis
 */
export interface SessionGrounding {
  anchors: {
    confidence: string[];  // Positive anchors (achievements, wins)
    struggles: string[];   // Recurring challenges
  };
  active_projects: string[];
  known_patterns: string[];
  fetchedAt: number;
  // Reasoning model outputs (added by advanced AI model)
  session_signals?: {
    dominant_topics: string[];        // 2-4 main themes
    dominant_emotion: string;         // Single emotion label (e.g., "mixed-positive", "frustrated-hopeful")
    primary_struggle: string | null; // Main challenge, or null if none
    positive_anchor: string | null;   // Key confidence builder, or null
    conversation_goal: string;        // What the conversation should achieve
    suggested_questions: string[];    // 3-5 questions to guide reflection
  };
}

/**
 * Extract structured information from journal entry (4 categories)
 * This runs ONCE after the big journal dump
 */
export async function extractStructuredJournal(journalEntry: string): Promise<{ extraction: JournalExtraction; thinking: string[] }> {
  const thinking: string[] = [];
  
  try {
    thinking.push('🧠 **AI Thinking Process:**');
    thinking.push('');
    thinking.push('📝 **Step 1: Analyzing Journal Entry**');
    thinking.push(`   - Received journal entry (${journalEntry.length} characters)`);
    thinking.push('   - Identifying key information across 4 categories: Events, Projects, Patterns, Emotions');
    thinking.push('');
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a journal extraction specialist. Extract structured facts from a journal entry that the system should remember and use during this session.

Extract FOUR categories:

1️⃣ EVENTS (what happened)
- Concrete things that occurred
- Specific achievements, activities, interactions
- Examples: "Hackathon featured on college website", "Studied for 3-4 hours", "Talked with friend about project"

2️⃣ PROJECTS (long-running contexts)
- Ongoing work, goals, major life contexts
- Things that span multiple days/weeks
- Examples: "Hackathon", "Journaling app development", "Communication skills improvement", "Academics/studying"

3️⃣ PATTERNS (repeatable behaviors)
- Habits, tendencies, recurring situations
- Things that happen repeatedly over time
- Examples: "Loses focus due to social media scrolling", "Productivity improves after morning reset routine", "Difficulty staying focused"

4️⃣ EMOTIONS (emotional states)
- Feelings, moods, emotional reactions
- How the user felt at different times
- Examples: "Distracted in the morning", "Felt productive later", "Felt surreal and positive about recognition"

Rules:
- Be specific and concrete
- Avoid generic words like "today", "morning", "woke"
- Focus on what MATTERS to the user
- Extract 3-10 items per category (more is better if relevant)
- Return ONLY a JSON object with these exact keys: "events", "projects", "patterns", "emotions"
- Each value should be an array of strings`,
        },
        {
          role: 'user',
          content: `Extract structured information from this journal entry:\n\n${journalEntry}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    });
    
    thinking.push('📝 **Step 2: Processing AI Response**');
    thinking.push('   - Called OpenAI GPT-4o-mini for extraction');
    thinking.push('   - Received structured JSON response');
    thinking.push('');

    const content = response.choices[0]?.message?.content?.trim() || '{}';
    let parsed: any;
    
    try {
      parsed = JSON.parse(content);
      thinking.push('📝 **Step 3: Validating Extraction**');
      thinking.push(`   - Successfully parsed JSON response`);
      thinking.push(`   - Found keys: ${Object.keys(parsed).join(', ')}`);
    } catch (parseError: any) {
      thinking.push('❌ **Step 3: JSON Parse Failed**');
      thinking.push(`   - Error: ${parseError.message}`);
      thinking.push(`   - Raw response: ${content.substring(0, 200)}...`);
      throw parseError;
    }
    
    const extraction: JournalExtraction = {
      events: Array.isArray(parsed.events) ? parsed.events.filter((e: any) => typeof e === 'string' && e.trim().length > 0) : [],
      projects: Array.isArray(parsed.projects) ? parsed.projects.filter((p: any) => typeof p === 'string' && p.trim().length > 0) : [],
      patterns: Array.isArray(parsed.patterns) ? parsed.patterns.filter((p: any) => typeof p === 'string' && p.trim().length > 0) : [],
      emotions: Array.isArray(parsed.emotions) ? parsed.emotions.filter((e: any) => typeof e === 'string' && e.trim().length > 0) : [],
    };
    
    thinking.push('📝 **Step 4: Extraction Results**');
    thinking.push(`   ✅ Extracted ${extraction.events.length} events`);
    thinking.push(`   ✅ Extracted ${extraction.projects.length} projects`);
    thinking.push(`   ✅ Extracted ${extraction.patterns.length} patterns`);
    thinking.push(`   ✅ Extracted ${extraction.emotions.length} emotions`);
    thinking.push('');
    
    return { extraction, thinking };
  } catch (error: any) {
    thinking.push('❌ **Error During Extraction**');
    thinking.push(`   - Error: ${error.message}`);
    thinking.push(`   - This extraction failed, returning empty results`);
    
    return {
      extraction: {
        events: [],
        projects: [],
        patterns: [],
        emotions: [],
      },
      thinking,
    };
  }
}

/**
 * Memory Agent - Runs ONCE after extraction
 * Searches Mem0 for ALL extracted topics (events, projects, patterns, emotions)
 */
export interface MemorySearchResult {
  topic: string;
  category: 'event' | 'project' | 'pattern' | 'emotion';
  memories: any[];
  query: string;
}

/**
 * Reasoning Model - Converts memories into session signals
 * Uses advanced AI model (GPT-4o) to analyze and create conversation guidance
 * Runs ONCE after memory search
 */
export async function runReasoningModel(
  extraction: JournalExtraction,
  searchResults: MemorySearchResult[],
  thinking: string[]
): Promise<SessionGrounding['session_signals']> {
  thinking.push('');
  thinking.push('🧠 **REASONING MODEL - Session Signal Generation**');
  thinking.push('   Using advanced AI model to convert memories into conversation guidance.');
  thinking.push('   This runs ONCE after memory search.');
  thinking.push('');

  // Prepare context for reasoning model (optimized for token usage)
  const allMemories = searchResults.flatMap(result => result.memories);
  // Reduced: Use top 10 memories (was 20) and truncate to 80 chars (was 150)
  const memorySummaries = allMemories.slice(0, 10).map((mem: any) => 
    (mem.memory || mem.content || '').substring(0, 80)
  ).filter(Boolean);

  const prompt = `You are a conversation psychologist analyzing a user's journal entry and their historical memories.

**Extracted Information:**
- Events: ${extraction.events.join(', ')}
- Projects: ${extraction.projects.join(', ')}
- Patterns: ${extraction.patterns.join(', ')}
- Emotions: ${extraction.emotions.join(', ')}

**Historical Memories Found (${memorySummaries.length}):**
${memorySummaries.map((m, i) => `${i + 1}. ${m}`).join('\n')}

**Your Task:**
Analyze this information and generate session-level signals that will guide the conversation. Convert raw memories into actionable conversation control signals.

**Output Format (JSON):**
{
  "dominant_topics": ["topic1", "topic2", "topic3"],  // 2-4 main themes from events/projects/patterns
  "dominant_emotion": "mixed-positive",  // Single emotion label (e.g., "mixed-positive", "frustrated-hopeful", "anxious-excited")
  "primary_struggle": "focus/distraction" | null,  // Main challenge, or null if no clear struggle
  "positive_anchor": "hackathon featured + productivity rebound" | null,  // Key confidence builder, or null
  "conversation_goal": "reflect + regain clarity",  // What the conversation should achieve (e.g., "validate feelings", "explore solutions", "celebrate wins")
  "suggested_questions": [
    "What usually pulls your focus first?",
    "What helped you recover today?",
    "What would a good tomorrow morning look like?"
  ]  // 3-5 questions to guide reflection (not advice, just questions)
}

**Rules:**
- dominant_topics: Extract 2-4 key themes, not individual events
- dominant_emotion: Single label that captures the overall emotional state
- primary_struggle: The main challenge, or null if user is doing well
- positive_anchor: A specific achievement or pattern that builds confidence, or null
- conversation_goal: What should the AI help achieve? (validate, explore, celebrate, problem-solve)
- suggested_questions: Open-ended questions that help user reflect, NOT advice or suggestions

Return ONLY valid JSON, no other text.`;

  try {
    thinking.push('🤖 **Calling Advanced AI Model (GPT-4o)**');
    thinking.push('   Analyzing extraction + memories to generate session signals...');
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // Advanced model for reasoning
      messages: [
        {
          role: 'system',
          content: 'You are a conversation psychologist. Analyze journal entries and memories to generate session-level conversation guidance. Return ONLY valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3, // Lower temperature for more consistent reasoning
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from reasoning model');
    }

    thinking.push('   ✅ Received reasoning model response');
    
    const signals = JSON.parse(content);
    
    // Validate structure
    if (!signals.dominant_topics || !signals.dominant_emotion || !signals.conversation_goal) {
      throw new Error('Invalid reasoning model response structure');
    }

    thinking.push(`   ✅ Generated session signals:`);
    thinking.push(`      - Dominant topics: ${signals.dominant_topics.join(', ')}`);
    thinking.push(`      - Dominant emotion: ${signals.dominant_emotion}`);
    thinking.push(`      - Primary struggle: ${signals.primary_struggle || 'none'}`);
    thinking.push(`      - Positive anchor: ${signals.positive_anchor || 'none'}`);
    thinking.push(`      - Conversation goal: ${signals.conversation_goal}`);
    thinking.push(`      - Suggested questions: ${signals.suggested_questions.length}`);
    thinking.push('');

    return signals as SessionGrounding['session_signals'];
  } catch (error: any) {
    thinking.push(`   ❌ Reasoning model failed: ${error.message}`);
    thinking.push('   ⚠️ Falling back to basic session signals');
    thinking.push('');

    // Fallback to basic signals
    return {
      dominant_topics: extraction.projects.slice(0, 3),
      dominant_emotion: extraction.emotions[0] || 'neutral',
      primary_struggle: extraction.patterns.find(p => 
        p.toLowerCase().includes('struggle') || 
        p.toLowerCase().includes('difficult') ||
        p.toLowerCase().includes('distracted')
      ) || null,
      positive_anchor: extraction.events.find(e => 
        e.toLowerCase().includes('featured') || 
        e.toLowerCase().includes('productive') ||
        e.toLowerCase().includes('good')
      ) || null,
      conversation_goal: 'reflect',
      suggested_questions: [
        'What stood out most from your day?',
        'How are you feeling about everything?',
        'What would help you feel better?'
      ]
    };
  }
}

/**
 * One-Time Memory Agent - Searches Mem0 for EVERY extracted topic
 * This runs ONCE after the user summarizes their day
 */
export async function runOneTimeMemoryAgent(
  extraction: JournalExtraction,
  userId: string = 'default-user',
  thinking: string[]
): Promise<{ results: MemorySearchResult[]; grounding: SessionGrounding; experienceMemories: ExperienceMemory[] }> {
  thinking.push('');
  thinking.push('🧠 **MEMORY AGENT - One-Time Search**');
  thinking.push('   You are a one-time search agent. Your job is to search Mem0 for EVERY topic extracted.');
  thinking.push('   This runs ONCE after the user summarizes their day.');
  thinking.push('   After this, all memories will be cached and no more Mem0 calls are needed.');
  thinking.push('');
  
  const allTopics: Array<{ topic: string; category: 'event' | 'project' | 'pattern' | 'emotion'; query: string }> = [];
  
  // Add all events
  extraction.events.forEach(event => {
    const cleanQuery = event.toLowerCase().replace(/[^\w\s]/g, ' ').trim();
    if (cleanQuery.length > 0) {
      allTopics.push({ topic: event, category: 'event', query: cleanQuery });
    }
  });
  
  // Add all projects
  extraction.projects.forEach(project => {
    const cleanQuery = project.toLowerCase().replace(/[^\w\s]/g, ' ').trim();
    if (cleanQuery.length > 0) {
      allTopics.push({ topic: project, category: 'project', query: cleanQuery });
    }
  });
  
  // Add all patterns
  extraction.patterns.forEach(pattern => {
    // Extract key words (3-5 words max)
    const words = pattern.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2)
      .slice(0, 5)
      .join(' ');
    if (words.length > 0) {
      allTopics.push({ topic: pattern, category: 'pattern', query: words });
    }
  });
  
  // Add all emotions
  extraction.emotions.forEach(emotion => {
    const cleanQuery = emotion.toLowerCase().replace(/[^\w\s]/g, ' ').trim();
    if (cleanQuery.length > 0) {
      allTopics.push({ topic: emotion, category: 'emotion', query: cleanQuery });
    }
  });
  
  thinking.push(`📋 **Memory Agent Plan:**`);
  thinking.push(`   - Total topics to search: ${allTopics.length}`);
  thinking.push(`   - Events: ${extraction.events.length}`);
  thinking.push(`   - Projects: ${extraction.projects.length}`);
  thinking.push(`   - Patterns: ${extraction.patterns.length}`);
  thinking.push(`   - Emotions: ${extraction.emotions.length}`);
  thinking.push('');
  
  const searchResults: MemorySearchResult[] = [];
  const allMemories: any[] = [];
  const confidenceAnchors: string[] = [];
  const struggleAnchors: string[] = [];
  
  // Search Mem0 for EACH topic
  for (const { topic, category, query } of allTopics) {
    thinking.push(`🔎 **Searching Mem0 for "${topic}"** (${category})`);
    thinking.push(`   Query: "${query}"`);
    
    try {
      const memories = await searchMemories(query, topic, userId);
      thinking.push(`   ✅ Found ${memories.length} memories`);
      
      // Show sample memories
      if (memories.length > 0) {
        memories.slice(0, 2).forEach((mem: any, i: number) => {
          const content = mem.memory || mem.content || '';
          thinking.push(`      ${i + 1}. ${content.substring(0, 80)}...`);
        });
        if (memories.length > 2) {
          thinking.push(`      ... and ${memories.length - 2} more`);
        }
      }
      
      searchResults.push({
        topic,
        category,
        memories,
        query,
      });
      
      allMemories.push(...memories);
      
      // Categorize memories
      memories.forEach((mem: any) => {
        const content = (mem.memory || mem.content || '').toLowerCase();
        if (content.match(/\b(success|achieved|accomplished|won|completed|improved|better|good|great|excited|happy|proud|surreal|amazing)\b/)) {
          confidenceAnchors.push(mem.memory || mem.content || '');
        } else if (content.match(/\b(difficult|struggle|challenge|problem|issue|frustrated|stuck|hard|trouble|distracted|unfocused)\b/)) {
          struggleAnchors.push(mem.memory || mem.content || '');
        }
      });
      
      thinking.push('');
    } catch (error: any) {
      thinking.push(`   ❌ Search failed: ${error.message}`);
      thinking.push('');
    }
  }
  
  thinking.push(`📊 **Memory Agent Summary:**`);
  thinking.push(`   ✅ Total searches completed: ${searchResults.length}`);
  thinking.push(`   ✅ Total memories found: ${allMemories.length}`);
  thinking.push(`   ✅ Confidence anchors: ${confidenceAnchors.length}`);
  thinking.push(`   ✅ Struggle anchors: ${struggleAnchors.length}`);
  thinking.push('');
  
  // Step 2: Convert memories into structured ExperienceMemory objects (3-5 max)
  const experienceMemories = await createExperienceMemories(searchResults, extraction, thinking);
  
  // Step 3: Run Reasoning Model to generate session signals
  const sessionSignals = await runReasoningModel(extraction, searchResults, thinking);
  
  // Create session grounding with reasoning model outputs
  const grounding: SessionGrounding = {
    anchors: {
      confidence: [...new Set(confidenceAnchors)].slice(0, 10), // More anchors
      struggles: [...new Set(struggleAnchors)].slice(0, 10),
    },
    active_projects: extraction.projects,
    known_patterns: extraction.patterns,
    fetchedAt: Date.now(),
    session_signals: sessionSignals, // Add reasoning model outputs
  };
  
  thinking.push('💾 **Memory Agent Complete**');
  thinking.push(`   - All memories searched and categorized`);
  thinking.push(`   - Created ${experienceMemories.length} structured experience memories`);
  thinking.push(`   - Reasoning model generated session signals`);
  thinking.push(`   - Session grounding ready to be stored`);
  thinking.push(`   - No more Mem0 calls needed for this session`);
  thinking.push(`   - No more reasoning calls needed for this session`);
  thinking.push('');
  
  return { results: searchResults, grounding, experienceMemories };
}

/**
 * Extract primary topic from user message (1-3 words)
 */
export async function extractTopic(userMessage: string): Promise<string> {
  try {
    const systemInstruction = `You are a topic extraction specialist. Your job is to extract ONLY the single most important primary topic from a user message.

Rules:
- Extract ONLY ONE primary topic (1-3 words maximum)
- If the message contains multiple ideas, choose the one that seems most important or most central to what the user is trying to say
- Prioritize the MAIN SUBJECT or MAIN FOCUS of what the user is talking about
- If user mentions a specific topic (like "leadership", "hackathon", "stress"), extract that topic
- Prioritize future/active goals over past/retrospective events ONLY when both are present
- Do NOT extract filler words like "hey", "yeah" unless the message is ONLY a greeting/acknowledgment
- Do NOT list multiple topics
- Do NOT extract every keyword
- Return only the topic as plain text (no quotes, no explanation, no JSON)

Examples:
Input: "Yesterday I organized HackSLC and next week I'm preparing for my pitch."
Output: pitch event

Input: "My pitch went amazing yesterday and I want to host a hackathon next month."
Output: hackathon

Input: "Hey"
Output: greeting

Input: "Yeah, that's right"
Output: acknowledgment

Input: "I need to check my emails"
Output: email

Input: "What's the weather like?"
Output: weather`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemInstruction,
        },
        {
          role: 'user',
          content: `Now extract the primary topic from the user message:\n\n${userMessage}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 10,
    });

    let topic = response.choices[0]?.message?.content?.trim().toLowerCase() || '';
    
    // Normalize filler patterns
    const fillerPatterns: Record<string, string> = {
      'yeah': 'acknowledgment',
      'yes': 'acknowledgment',
      'yep': 'acknowledgment',
      'yup': 'acknowledgment',
      'ok': 'acknowledgment',
      'okay': 'acknowledgment',
      'sure': 'acknowledgment',
      'right': 'acknowledgment',
      'correct': 'acknowledgment',
      'exactly': 'acknowledgment',
      'absolutely': 'acknowledgment',
      'definitely': 'acknowledgment',
      'uh': 'filler',
      'um': 'filler',
      'hmm': 'filler',
      'huh': 'filler',
      'ah': 'filler',
      'oh': 'filler',
      'thanks': 'gratitude',
      'thank you': 'gratitude',
      'thx': 'gratitude',
      'hi': 'greeting',
      'hello': 'greeting',
      'hey': 'greeting',
      'greetings': 'greeting',
    };

    // Check if topic matches any filler pattern
    for (const [pattern, normalized] of Object.entries(fillerPatterns)) {
      if (topic === pattern || topic.includes(pattern)) {
        topic = normalized;
        break;
      }
    }
    
    // Fallback: use first few words if extraction fails
    if (!topic || topic.length === 0) {
      const words = userMessage.trim().split(/\s+/).slice(0, 3);
      return words.join(' ').toLowerCase();
    }

    return topic;
  } catch (error) {
    console.error('Error extracting topic:', error);
    // Fallback: use first few words
    const words = userMessage.trim().split(/\s+/).slice(0, 3);
    return words.join(' ').toLowerCase();
  }
}

/**
 * Assess confidence score (0-10) to decide if memory search is needed
 */
export async function assessConfidence(userMessage: string, topic: string): Promise<number> {
  try {
    const systemInstruction = `You are a memory relevance assessor. Your job is to determine if the user's message would benefit from retrieving past memories.

**Default to searching memories** - only skip if the message is clearly a one-time question or simple statement with no personal context.

Look for ANY of these signals (presence of any = higher confidence):
1. **Personal experiences**: Sharing achievements, events, activities, projects (e.g., "I lead the hackathon", "I finished my project")
2. **Emotional content**: Any emotions, feelings, reactions (excitement, stress, frustration, joy, etc.)
3. **Recurrence signals**: "again", "always", "still", "more than once", "keep", "repeatedly"
4. **Personal topics**: Work, projects, hobbies, relationships, goals, challenges
5. **Reflection cues**: "I've been thinking", "remember when", "like before", "similar to"
6. **Pattern indicators**: Describing ongoing situations, repeated experiences

Scoring guide:
- **Simple greetings** (e.g., "Hello", "Hi") → 1-2 (low but still search for context)
- **Simple factual questions** (e.g., "What's the weather?") → 0-1
- **One-time tasks** (e.g., "I need to check emails") → 2-3
- **Personal experiences/achievements** (e.g., "I lead the hackathon", "I cleaned my room") → 5-7
- **Emotional statements** (e.g., "I'm stressed", "I'm excited", "I'm feeling better") → 6-8
- **Activities/actions** (e.g., "I was watching videos", "I took a shower") → 4-6
- **Recurrence/patterns** (e.g., "I keep losing focus") → 7-9
- **Explicit reflection** (e.g., "This reminds me of...") → 8-10

**Be generous** - if there's any personal context, emotional content, activities, or topic that might have memories, give at least 4-5. Personal experiences and activities should always get at least 4.

Return ONLY a number from 0-10. No explanation, just the number.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemInstruction,
        },
        {
          role: 'user',
          content: `User message: "${userMessage}"

Topic: "${topic}"

Assess confidence (0-10):`,
        },
      ],
      temperature: 0.2,
      max_tokens: 3,
    });

    const scoreText = response.choices[0]?.message?.content?.trim() || '0';
    const score = parseInt(scoreText, 10);
    
    // Validate score is between 0-10
    if (isNaN(score) || score < 0) return 0;
    if (score > 10) return 10;
    
    return score;
  } catch (error) {
    console.error('Error assessing confidence:', error);
    // Safe fallback: default to searching (score 3)
    return 3;
  }
}

/**
 * Search mem0 for relevant memories
 */
export async function searchMemories(
  searchQuery: string,
  userMessage: string,
  userId: string = 'default-user'
): Promise<any[]> {
  try {
    const mem0 = getMem0Client();
    let searchResults: any[] = [];
    
    try {
      // Try search method (if available in TypeScript SDK)
      // @ts-ignore - search might not be in types yet
      if (typeof mem0.search === 'function') {
        // First try with actual user ID
        searchResults = await mem0.search(searchQuery, {
          user_id: userId,
          limit: 5,
        });
        
        // If no results and userId is not 'default-user', also try 'default-user' as fallback
        // (for backwards compatibility with old memories stored under 'default-user')
        if (searchResults.length === 0 && userId !== 'default-user') {
          try {
            const fallbackResults = await mem0.search(searchQuery, {
              user_id: 'default-user',
              limit: 5,
            });
            if (fallbackResults.length > 0) {
              searchResults = fallbackResults;
            }
          } catch (fallbackError: any) {
            console.error('[Memory Search] Fallback search failed:', fallbackError.message);
          }
        }
      } else {
        throw new Error('search method not available');
      }
    } catch (searchError: any) {
      // Fallback: get all memories and filter
      const allMemories = await mem0.getAll({ user_id: userId });
      
      // Filter memories that might be related to the search query
      const queryLower = searchQuery.toLowerCase();
      const queryWords = queryLower.split(/\s+/);
      
      searchResults = Array.isArray(allMemories)
        ? allMemories.filter((m: any) => {
            const content = (m.memory || m.content || '').toLowerCase();
            const tags = (m.metadata?.tags || []).map((t: string) => t.toLowerCase());
            
            // Check if any query word appears in content or tags
            return queryWords.some((word: string) => 
              content.includes(word) || tags.some((tag: string) => tag.includes(word))
            );
          })
        : [];
      
      // Sort by relevance
      searchResults.sort((a, b) => {
        const aContent = (a.memory || a.content || '').toLowerCase();
        const bContent = (b.memory || b.content || '').toLowerCase();
        const aHasInContent = queryWords.some((word: string) => aContent.includes(word));
        const bHasInContent = queryWords.some((word: string) => bContent.includes(word));
        
        if (aHasInContent && !bHasInContent) return -1;
        if (!aHasInContent && bHasInContent) return 1;
        return 0;
      });
    }
    
    return searchResults.slice(0, 5); // Limit to top 5 most relevant
  } catch (error) {
    console.error('[Memory Search] Error searching memories:', error);
    return []; // Return empty array on error
  }
}

/**
 * Summarize memories into 2-3 sentences
 */
/**
 * Convert memories into structured ExperienceMemory objects
 * Groups memories by real-world event and creates 3-5 structured memories
 */
export async function createExperienceMemories(
  searchResults: MemorySearchResult[],
  extraction: JournalExtraction,
  thinking: string[]
): Promise<ExperienceMemory[]> {
  if (searchResults.length === 0) {
    return [];
  }

  thinking.push('');
  thinking.push('🔄 **Creating Structured Experience Memories**');
  thinking.push(`   Converting ${searchResults.length} memory groups into exactly 2 structured memories...`);

  try {
    // Group memories into 2 categories:
    // 1. Daily Regulation (routine day patterns, morning routines, productivity patterns)
    // 2. Major Events (significant achievements, projects, recognitions)
    
    const dailyRegulationMemories: any[] = [];
    const majorEventMemories: any[] = [];
    
    searchResults.forEach(result => {
      const topic = result.topic.toLowerCase();
      const category = result.category;
      
      // Check if it's a major event (hackathon, featured, recognition, achievement)
      const isMajorEvent = 
        topic.includes('hackathon') ||
        topic.includes('featured') ||
        topic.includes('recognition') ||
        topic.includes('achievement') ||
        topic.includes('organize') ||
        category === 'project' ||
        result.memories.some((m: any) => {
          const content = (m.memory || m.content || '').toLowerCase();
          return content.includes('hackathon') || 
                 content.includes('featured') || 
                 content.includes('college website') ||
                 content.includes('first ever');
        });
      
      // Filter out standalone emotion memories that will be encoded in experience memories
      // If emotion is about hackathon/achievement → it will be in major event memory
      // If emotion is about daily routine → it will be in daily regulation memory
      // We don't need to store them separately once merged
      const filteredMemories = result.memories.filter((m: any) => {
        const content = (m.memory || m.content || '').toLowerCase();
        
        // Skip pure emotional statements that are just feelings without context
        // These will be encoded in emotional_tone and user_meaning of experience memories
        if (category === 'emotion') {
          // If it's just "felt amazing", "confidence boosted" without specific context, skip it
          // It will be represented in the experience memory's emotional_tone
          const isPureEmotion = 
            content.match(/^(felt|feeling|feels|boosted|amazing|delighted|proud|motivated|confident)/i) &&
            !content.includes('because') &&
            !content.includes('after') &&
            !content.includes('due to');
          
          if (isPureEmotion) {
            return false; // Skip - will be in experience memory
          }
        }
        
        return true; // Keep all other memories
      });
      
      if (isMajorEvent) {
        majorEventMemories.push(...filteredMemories);
      } else {
        // Daily regulation: morning routines, productivity patterns, distractions, self-care
        dailyRegulationMemories.push(...filteredMemories);
      }
    });

    thinking.push(`   Grouped memories:`);
    thinking.push(`   - Daily Regulation: ${dailyRegulationMemories.length} memories`);
    thinking.push(`   - Major Events: ${majorEventMemories.length} memories`);

    const experienceMemories: ExperienceMemory[] = [];

    // Helper function to create an experience memory
    const createMemory = async (
      memories: any[],
      memoryType: 'daily_regulation' | 'major_event',
      thinking: string[]
    ): Promise<ExperienceMemory | null> => {
      if (memories.length === 0) return null;

      const memoryTexts = memories
        .map((m: any) => m.memory || m.content || '')
        .filter((text: string) => text.trim().length > 0)
        .slice(0, 15);

      const truncatedMemories = memoryTexts.map((m, i) => `${i + 1}. ${m.substring(0, 100)}`).join('\n');

      const typeLabel = memoryType === 'daily_regulation' 
        ? 'Daily Regulation (routine day patterns, morning routines, productivity patterns, self-care)'
        : 'Major Event (significant achievements, projects, recognitions)';

      const prompt = `You are creating ONE structured experience memory for ${typeLabel}.

**Memory Type:** ${typeLabel}

**Related Memories (${memoryTexts.length}):**
${truncatedMemories}

**Current Context:**
- Events: ${extraction.events.join(', ')}
- Projects: ${extraction.projects.join(', ')}
- Patterns: ${extraction.patterns.join(', ')}

**CRITICAL RULE - HARD ENFORCEMENT:**
A memory may reference ONLY ONE real-world scope:
- Either daily regulation (routine patterns, morning struggles, self-care, productivity)
- Or major achievement (significant events, recognitions, projects)
- NEVER BOTH

**Your Task:**
Create ONE experience_memory that combines ALL related memories into a single, meaningful memory.

**IMPORTANT - Emotional Encoding:**
- Pure emotional statements (like "felt amazing", "confidence boosted", "delighted") will be encoded in the emotional_tone field
- Do NOT create separate memories for emotions that are already represented in emotional_tone
- Only include emotions that add specific context beyond the feeling itself
- If an emotion is fully represented in emotional_tone → it's already encoded, don't duplicate it

${memoryType === 'daily_regulation' ? `**STRICT RULES FOR DAILY REGULATION:**
- Combine ONLY routine patterns: waking up, distractions, self-care, productivity, studying
- Do NOT include any major achievements, recognitions, or projects (like hackathon, featured, college website)
- Do NOT create separate memories for breakfast, shower, cleaning - combine them all
- Focus ONLY on the pattern: bad start → recovery through self-care → improved focus
- Title example: "Morning friction and recovery through self-care"
- If you see hackathon/featured/recognition mentions in the memories, EXCLUDE them completely
- This memory is ONLY about daily routine and self-regulation
- **CORE FACT WRITING**: Be specific and conversational. Avoid generic "self-care" language.
  ❌ Bad: "User started the day unfocused but regained productivity through self-care and cleaning."
  ✅ Good: "User started the day unfocused due to social media use but regained momentum after cleaning and intentional self-care."
  - Mention specific actions (social media, cleaning, studying) not abstract concepts
  - Use "due to" and "after" to show cause-effect relationships` : `**STRICT RULES FOR MAJOR EVENTS:**
- Focus ONLY on the significant achievement or recognition (hackathon, featured, projects)
- Do NOT include routine daily patterns (waking up, cleaning, studying, distractions)
- Include key details about preparation, execution, and impact
- Title example: "First hackathon recognized by college"
- If you see routine patterns (morning struggles, self-care, studying) in the memories, EXCLUDE them completely
- This memory is ONLY about the major achievement/recognition
- **CORE FACT WRITING**: Be specific and concrete. Avoid vague achievement language.
  - Mention specific details: "first-ever hackathon", "featured on official website"
  - Use concrete actions: "organized", "led", "coordinated"`}

**Output Format (JSON):**
{
  "type": "experience_memory",
  "title": "Short descriptive title (5-8 words)",
  "core_fact": "One sentence fact about what happened",
  "key_details": ["detail1", "detail2", "detail3", "detail4"],  // MAX 4
  "user_meaning": "One sentence about what this means to the user",
  "emotional_tone": "emotion1, emotion2, emotion3",  // Comma-separated
  "reflection_hooks": ["question1", "question2", "question3"]  // MAX 3
}

**Rules:**
- key_details: MAX 4 items (ONLY items relevant to this memory type - NO SCOPE CONTAMINATION)
- reflection_hooks: MAX 3 questions
- user_meaning: Exactly 1 sentence
- core_fact: Exactly 1 sentence
- Be specific, not generic
- Focus on what matters to the user
- Questions should help user reflect, not give advice
- **CRITICAL: SCOPE SEPARATION** - If a memory contains mixed scopes, extract ONLY the relevant scope. Delete any contamination.

${memoryType === 'daily_regulation' ? `**EXAMPLES FOR DAILY REGULATION (what to EXCLUDE):**
❌ "Hackathon event featured on college website" - This belongs in Major Event memory
❌ "Organized hackathon" - This belongs in Major Event memory  
❌ "Featured on website" - This belongs in Major Event memory
✅ "Woke up late and scrolled social media" - This belongs here
✅ "Cleaned room and studied" - This belongs here
✅ "Lost focus but recovered through self-care" - This belongs here` : `**EXAMPLES FOR MAJOR EVENT (what to EXCLUDE):**
❌ "Woke up late" - This belongs in Daily Regulation memory
❌ "Lost time scrolling" - This belongs in Daily Regulation memory
❌ "Cleaned room" - This belongs in Daily Regulation memory
❌ "Studied for 3-4 hours" - This belongs in Daily Regulation memory
✅ "Hackathon featured on website" - This belongs here
✅ "Organized first hackathon" - This belongs here
✅ "Recognition from college" - This belongs here`}

**Example:**
If memories are about "hackathon featured on website", create:
{
  "type": "experience_memory",
  "title": "First hackathon recognized by college",
  "core_fact": "User organized their first-ever hackathon which was featured on the official St. Lawrence College website.",
  "key_details": [
    "First student-led hackathon at the college",
    "Prepared in roughly two weeks",
    "Participants built projects in ~6 hours",
    "User led organization and coordination"
  ],
  "user_meaning": "This experience significantly boosted the user's confidence and reinforced their belief that they can execute real-world initiatives, not just plan them.",
  "emotional_tone": "surreal, proud, motivated",
  "reflection_hooks": [
    "What part of organizing this felt hardest?",
    "What surprised you about yourself during this?",
    "Would you approach the next event differently?"
  ]
}

Return ONLY valid JSON, nothing else.`;

      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-4o', // Use advanced model for structured output
          messages: [
            {
              role: 'system',
              content: 'You are a memory structuring specialist. Convert related memories into structured experience_memory objects. Return ONLY valid JSON.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3,
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
          return null;
        }

        const memoryObj = JSON.parse(content);
        
        // Validate structure
        if (
          memoryObj.type === 'experience_memory' &&
          memoryObj.title &&
          memoryObj.core_fact &&
          Array.isArray(memoryObj.key_details) &&
          Array.isArray(memoryObj.reflection_hooks) &&
          memoryObj.user_meaning &&
          memoryObj.emotional_tone
        ) {
          // Enforce limits
          memoryObj.key_details = memoryObj.key_details.slice(0, 4);
          memoryObj.reflection_hooks = memoryObj.reflection_hooks.slice(0, 3);
          
          // CRITICAL: Filter out scope contamination
          const contaminationKeywords = memoryType === 'daily_regulation' 
            ? ['hackathon', 'featured', 'college website', 'organized', 'recognition', 'achievement', 'project']
            : ['woke up', 'scrolling', 'cleaned', 'shower', 'breakfast', 'studied', 'distracted', 'social media'];
          
          // Filter key_details for contamination
          memoryObj.key_details = memoryObj.key_details.filter((detail: string) => {
            const detailLower = detail.toLowerCase();
            return !contaminationKeywords.some(keyword => detailLower.includes(keyword));
          });
          
          // Filter core_fact for contamination (if contaminated, return null)
          const coreFactLower = memoryObj.core_fact.toLowerCase();
          const hasContamination = contaminationKeywords.some(keyword => coreFactLower.includes(keyword));
          if (hasContamination) {
            thinking.push(`   ⚠️ Scope contamination detected in core_fact - rejecting memory`);
            return null;
          }
          
          // Ensure we still have at least 2 key_details after filtering
          if (memoryObj.key_details.length < 2) {
            thinking.push(`   ⚠️ Too few key_details after contamination filtering - rejecting memory`);
            return null;
          }
          
          return memoryObj as ExperienceMemory;
        } else {
          return null;
        }
      } catch (error: any) {
        thinking.push(`   ❌ Error creating ${memoryType} memory: ${error.message}`);
        return null;
      }
    };

    // Create Memory 1: Daily Regulation
    const dailyMemory = await createMemory(dailyRegulationMemories, 'daily_regulation', thinking);
    if (dailyMemory) {
      experienceMemories.push(dailyMemory);
      thinking.push(`   ✅ Created Memory 1: "${dailyMemory.title}"`);
    }

    // Create Memory 2: Major Event
    const majorMemory = await createMemory(majorEventMemories, 'major_event', thinking);
    if (majorMemory) {
      experienceMemories.push(majorMemory);
      thinking.push(`   ✅ Created Memory 2: "${majorMemory.title}"`);
    }

    thinking.push(`   ✅ Created ${experienceMemories.length} structured memories (max 2)`);
    thinking.push('');
    
    return experienceMemories.slice(0, 2); // Max 2 memories per day
  } catch (error: any) {
    thinking.push(`   ❌ Error creating experience memories: ${error.message}`);
    thinking.push('');
    return [];
  }
}

/**
 * Memory Agent - Fetches experience memories from Redis (NO MEM0 SEARCHES)
 * Returns the 2 experience memories stored in Redis for conversation use
 */
export async function runMemoryAgent(
  userMessage: string,
  userId: string = 'default-user',
  date?: string
): Promise<{
  topic: string;
  confidence: number;
  shouldSearch: boolean;
  memorySummary: string | null;
  memoriesFound: number;
  shouldUseMemory: boolean;
}> {
  // Extract topic for logging
  const topic = await extractTopic(userMessage);
  
  // Always fetch from Redis - NO MEM0 SEARCHES
  let memorySummary: string | null = null;
  let memoriesFound = 0;
  let shouldUseMemory = false;
  
  if (date) {
    const experienceMemories = await getExperienceMemories(userId, date);
    
    if (experienceMemories && experienceMemories.length > 0) {
      
      // Format experience memories for use in conversation
      // Use core_fact + 1-2 key_details
      const formattedMemories = experienceMemories.map(mem => {
        const details = mem.key_details.slice(0, 2).join(', ');
        return `${mem.core_fact} ${details ? `(${details})` : ''}`;
      }).join(' ');
      
      memorySummary = formattedMemories;
      memoriesFound = experienceMemories.length;
      shouldUseMemory = true;
    } else {
      memorySummary = null;
      memoriesFound = 0;
      shouldUseMemory = false;
    }
  } else {
    memorySummary = null;
    memoriesFound = 0;
    shouldUseMemory = false;
  }
  
  return {
    topic,
    confidence: shouldUseMemory ? 8 : 0, // High confidence if memories found
    shouldSearch: false, // NEVER search Mem0 anymore
    memorySummary,
    memoriesFound,
    shouldUseMemory,
  };
}

