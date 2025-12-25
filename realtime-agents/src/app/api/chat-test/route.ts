import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { runOneTimeMemoryAgent, extractStructuredJournal, type JournalExtraction, type ExperienceMemory } from '@/app/lib/memoryAgent';
import { 
  getChatTestConversation, 
  addChatTestMessage,
  getExperienceMemories,
  getMemoryUsageTracker,
  updateMemoryUsageTracker,
  type ChatTestMessage,
} from '@/app/lib/redis';

// Lazy initialization - only create client when needed (not during build)
function getOpenAIClient() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

/**
 * Generate conversational response using experience memories
 * Follows strict structure: One acknowledgment + Optional memory reference (one clause, max) + One question
 * Memory is used sparingly - only once every few turns, never back-to-back
 */
async function generateConversationalResponse(
  userMessage: string,
  experienceMemories: ExperienceMemory[],
  extraction: JournalExtraction,
  isInitialJournalEntry: boolean = false,
  userId: string = 'default-user',
  date: string = new Date().toISOString().split('T')[0]
): Promise<string> {
  // Format experience memories for context
  const memoryContext = experienceMemories.map((mem, idx) => {
    return `Memory ${idx + 1}: ${mem.title}
- ${mem.core_fact}
- Key details: ${mem.key_details.slice(0, 2).join(', ')}
- What this means: ${mem.user_meaning}
- Emotional tone: ${mem.emotional_tone}
- Reflection hooks: ${mem.reflection_hooks.join(' | ')}`;
  }).join('\n\n');

  // Determine which memory is relevant based on user message
  const userMessageLower = userMessage.toLowerCase();
  let relevantMemory: ExperienceMemory | null = null;
  
  // Check for hackathon-related keywords
  const hackathonKeywords = ['event', 'featured', 'hackathon', 'college website', 'organized', 'recognition'];
  const hasHackathonMention = hackathonKeywords.some(keyword => userMessageLower.includes(keyword));
  
  // Check for daily regulation keywords
  const dailyKeywords = ['morning', 'woke up', 'distracted', 'social media', 'cleaning', 'studying', 'self-care', 'focus'];
  const hasDailyMention = dailyKeywords.some(keyword => userMessageLower.includes(keyword));
  
  // Select relevant memory ONLY if user message actually relates to it
  // DO NOT force memory if user is talking about something new/unrelated
  if (hasHackathonMention) {
    relevantMemory = experienceMemories.find(m => m.title.toLowerCase().includes('hackathon')) || null;
  } else if (hasDailyMention) {
    relevantMemory = experienceMemories.find(m => m.title.toLowerCase().includes('morning') || m.title.toLowerCase().includes('regulation')) || null;
  }
  
  // NO FALLBACK - if no match, don't use memory
  // Only use memory when user's message actually relates to it

  // SPECIAL CASE: Initial journal entry - ask what's on their mind
  if (isInitialJournalEntry) {
    const prompt = `The user just shared their journal entry. The memory agent has processed it and created structured memories.

**Your Task:**
Ask the user what's on their mind to expand further. Keep it brief and open-ended.

**Response Format:**
- One short, warm acknowledgment
- One open question asking what they want to explore

**Example:**
"Thanks for sharing all of that. What's on your mind that you'd like to explore further?"`;

    try {
      const openai = getOpenAIClient();
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a supportive conversation partner. After the user shares their journal entry, ask what they want to explore further. Be brief and warm.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 80,
      });

      return response.choices[0]?.message?.content?.trim() || "Thanks for sharing. What's on your mind that you'd like to explore further?";
    } catch (error) {
      console.error('Error generating initial response:', error);
      return "Thanks for sharing. What's on your mind that you'd like to explore further?";
    }
  }

  // NORMAL CONVERSATION: Follow strict structure with controlled memory usage
  // Get memory usage tracker to avoid back-to-back repetition
  const tracker = await getMemoryUsageTracker(userId, date);
  
  // Check if we should mention memory:
  // 1. Memory must be relevant to user's message
  // 2. Must be at least 2-3 turns since last mention (use sparingly)
  // 3. Cannot be the same memory as last time (no back-to-back)
  const shouldMentionMemory = relevantMemory !== null && 
                               relevantMemory.title !== tracker.lastMemoryTitle &&
                               tracker.turnsSinceLastMention >= 2;
  
  // Memory should still influence questions even if not explicitly mentioned
  const memoryForContext = relevantMemory || (experienceMemories.length > 0 ? experienceMemories[0] : null);
  
  // Check if message is casual/short - should get simpler response
  const isCasualMessage = (
    userMessage.length < 50 &&
    !userMessage.includes('?') &&
    !userMessage.match(/\.{2,}/) // Not multiple sentences
  );
  
  const memoryMention = shouldMentionMemory && relevantMemory
    ? `**Memory to Mention (ONE CLAUSE MAX - subtle, not proof of recall):**
Memory: ${relevantMemory.title}
Core fact: ${relevantMemory.core_fact}

Use ONE subtle clause (max 8 words, embedded naturally):
- "I remember ${relevantMemory.title.toLowerCase()},"
- "Like when ${relevantMemory.core_fact.split('.')[0].toLowerCase()},"
- "Similar to ${relevantMemory.title.toLowerCase()},"
DO NOT make it a full sentence. Just one clause, then continue.`
    : memoryForContext
    ? `**Memory to Mention:**
NONE - Do NOT explicitly mention memory. 

**Memory Context (use to inform your question subtly):**
Memory: ${memoryForContext.title}
Core fact: ${memoryForContext.core_fact}
Reflection hooks: ${memoryForContext.reflection_hooks.join(' | ')}

Let this memory influence what you ask, but don't mention it explicitly.`
    : `**Memory to Mention:**
NONE - User's message does not relate to any stored memories.`;

  const prompt = `You are a supportive conversation partner. Follow this EXACT structure:

**Structure (LOCK THIS IN - "React once, then ask once"):**
1. One human reaction (1 sentence) - reflects MEANING, not events
   ${shouldMentionMemory ? 'Can include brief memory reference (ONE CLAUSE MAX, 8 words, embedded naturally)' : 'Memory can influence reaction but don\'t mention it explicitly'}
2. One open-ended question - builds FROM the reaction, invites depth
3. Stop

**User's Current Message:**
${userMessage.substring(0, 300)}

**Available Memories (for context - use to inform reaction/question, mention sparingly):**
${memoryContext}

${memoryMention}

**CRITICAL RULES:**
${isCasualMessage 
  ? `🔒 Keep it brief and natural - match the user's casual tone
🔒 No deep questions for casual messages
🔒 Just acknowledge and respond warmly`
  : `🔒 EVERY question must be preceded by ONE reflective reaction sentence
🔒 Reaction reflects MEANING/interpretation, not events/summary
🔒 No consecutive turns that are only questions
🔒 Memory mention = ONE CLAUSE MAX (8 words), subtle, not proof of recall
🔒 Use memory SPARINGLY - only once every few turns, never back-to-back
🔒 Never recap what user already said
🔒 Never surface system summaries
🔒 Never repeat the same memory back-to-back`}

**Reaction Philosophy:**
- React to what the user MEANS, not what they said
- Add new framing/interpretation, not repetition
- Show understanding of the deeper layer
- Then ask a question that builds from that reaction

**Examples:**

Example 1 - With memory mention:
User: "you know my event got featured i feel amazing"
❌ Wrong: "That's amazing! What challenges did you face?" (no reaction, just question)
✅ Correct: "Leading a group with a tight deadline can really stretch someone. What part of that leadership felt the heaviest for you?"

Example 2 - Without memory mention:
User: "I learned about leadership and it was great experience"
❌ Wrong: "That's great! What did you learn?" (no reaction, just question)
✅ Correct: "It sounds like you surprised yourself there. What about that moment stuck with you?"

Example 3 - With subtle memory:
User: "I woke up early today and felt more focused"
❌ Wrong: "Nice! What made today different?" (acknowledgment, not reaction)
✅ Correct: "Like when self-care helped reset, you're finding what works. What made today's approach feel different?"

**What NOT to do:**
❌ "That's great! What challenges did you face?" (no reaction, just question)
❌ "What made it feel amazing?" (question without reaction)
❌ "You mentioned X. What about Y?" (recap + question, no reaction)
❌ Consecutive turns that are only questions

${isCasualMessage 
  ? `**For casual messages:**
- Respond naturally and briefly
- Match the user's energy
- No need for deep reflection or questions
- Just be warm and human

**Your Response (brief and natural):**`
  : `**Internal Check Before Responding:**
Ask: "If I remove the question, does the response still feel human?"
If no → add a reaction sentence.

**Your Response (follow structure exactly - React once, then ask once):**`}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a supportive conversation partner. Follow "React once, then ask once" - every question must be preceded by ONE human reaction that reflects meaning, not events. Use memory SPARINGLY - only once every few turns. When you do mention memory: ONE CLAUSE MAX (8 words), subtle, embedded naturally. Never recap what user said. Never ask questions without a reaction first.`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 120,
    });

    let responseText = response.choices[0]?.message?.content?.trim() || "Thanks for sharing. What would you like to explore?";
    
    // Validate structure: Must have reaction before question
    // Check if response starts with a question (missing reaction)
    const startsWithQuestion = /^(What|How|Why|When|Where|Which|Who|Tell me|Can you|Do you|Did you|Are you|Is it|Was it)/i.test(responseText.trim());
    const hasQuestionMark = responseText.includes('?');
    const sentences = responseText.split(/[.!?]/).filter(s => s.trim().length > 0);
    
    // If response starts with question or only has question without reaction, regenerate
    if (startsWithQuestion || (hasQuestionMark && sentences.length === 1)) {
      console.warn('[Response] Missing reaction before question. Regenerating...');
      const reactionPrompt = `${prompt}\n\n⚠️ You must include ONE human reaction sentence BEFORE the question. React to what the user MEANS, not what they said. Then ask a question that builds from that reaction.`;
      const openai = getOpenAIClient();
      const retry = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You MUST include ONE human reaction sentence that reflects meaning before asking a question. Structure: Reaction → Question. Never start with a question.',
          },
          {
            role: 'user',
            content: reactionPrompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 120,
      });
      responseText = retry.choices[0]?.message?.content?.trim() || responseText;
    }
    
    // Check if memory was actually mentioned in response
    const hasMemoryMention = responseText.toLowerCase().includes('remember') || 
                              responseText.toLowerCase().includes('last time') ||
                              responseText.toLowerCase().includes('mentioned before') ||
                              responseText.toLowerCase().includes('like when') ||
                              responseText.toLowerCase().includes('similar to');
    
    // Validate memory mention is one clause max (8 words) if memory was mentioned
    if (hasMemoryMention && shouldMentionMemory && relevantMemory) {
      // Find the sentence/clause with memory mention
      const sentences = responseText.split(/[.!?]/);
      const memorySentence = sentences.find(s => 
        s.toLowerCase().includes('remember') || 
        s.toLowerCase().includes('last time') ||
        s.toLowerCase().includes('mentioned before') ||
        s.toLowerCase().includes('like when') ||
        s.toLowerCase().includes('similar to')
      );
      
      if (memorySentence) {
        // Count words in the memory clause (up to comma or end)
        const clause = memorySentence.split(',')[0].trim();
        const wordCount = clause.split(/\s+/).length;
        
        if (wordCount > 8) {
          console.warn(`[Response] Memory mention exceeded 8 words (${wordCount} words): ${clause}`);
          // Regenerate with stricter constraint
          const strictPrompt = `${prompt}\n\n⚠️ Your memory mention was too long. Keep it to ONE CLAUSE, MAX 8 WORDS.`;
          const openai = getOpenAIClient();
      const retry = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: 'Memory mention must be ONE CLAUSE, MAX 8 WORDS. Use phrases like "I remember X," or "Like when X," then continue.',
              },
              {
                role: 'user',
                content: strictPrompt,
              },
            ],
            temperature: 0.7,
            max_tokens: 100,
          });
          responseText = retry.choices[0]?.message?.content?.trim() || responseText;
        }
      }
    }
    
    // If memory shouldn't be mentioned but AI included it, regenerate
    if (hasMemoryMention && !shouldMentionMemory) {
      console.warn('[Response] AI included memory mention when it should not have. Regenerating...');
      const noMemoryPrompt = `${prompt}\n\n⚠️ Do NOT mention any memories explicitly. Let memory influence your question subtly instead.`;
      const openai = getOpenAIClient();
      const retry = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Do NOT mention any memories explicitly. Let memory influence your reaction/question subtly. Structure: ONE human reaction (reflects meaning) → ONE question. Never ask without a reaction first.',
          },
          {
            role: 'user',
            content: noMemoryPrompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 100,
      });
      responseText = retry.choices[0]?.message?.content?.trim() || responseText;
    }
    
    // Track memory usage
    await updateMemoryUsageTracker(
      userId,
      date,
      hasMemoryMention && relevantMemory ? relevantMemory.title : null,
      hasMemoryMention && shouldMentionMemory
    );

    return responseText;
  } catch (error) {
    console.error('Error generating conversational response:', error);
    return "Thanks for sharing. What would you like to explore?";
  }
}

/**
 * Two-Agent Architecture:
 * 1. Memory Agent: Searches mem0, returns summaries (never talks to user)
 * 2. Conversational Agent: Responds to user (doesn't know about mem0)
 * 
 * Flow:
 * User message → Memory Agent (searches) → Backend combines → Conversational Agent → Response
 */
export async function POST(req: NextRequest) {
  try {
    // Get authenticated user ID (server-side)
    const { getAuthenticatedUserId } = await import('@/app/lib/auth');
    const authenticatedUserId = await getAuthenticatedUserId();
    
    const { message, conversationHistory = [], userId: providedUserId } = await req.json();
    
    // Use authenticated user ID if available, otherwise fall back to provided or default
    const userId = authenticatedUserId || providedUserId || 'default-user';

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'message is required and must be a string' },
        { status: 400 }
      );
    }

    // Get current date for conversation key
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Normalize message for greeting and farewell checks FIRST (before any Redis operations)
    const normalizedMessage = message.toLowerCase().trim();
    const isGreetingMessage = (
      normalizedMessage === 'hello' || 
      normalizedMessage === 'hi' ||
      normalizedMessage === 'hey' ||
      normalizedMessage.startsWith('hello')
    );

    // Check for farewell/goodbye messages - should get brief, warm response
    const isFarewellMessage = (
      normalizedMessage.includes('bye') ||
      normalizedMessage.includes('talk later') ||
      normalizedMessage.includes('talk to you later') ||
      normalizedMessage.includes('see you') ||
      normalizedMessage.includes('gotta go') ||
      normalizedMessage.includes('have to go') ||
      normalizedMessage.includes('catch you later') ||
      (normalizedMessage.includes('alrighty') && (normalizedMessage.includes('later') || normalizedMessage.includes('talk')))
    );

    // FAST PATH: Handle greetings immediately (no Redis, no memory operations)
    if (isGreetingMessage && (!conversationHistory || conversationHistory.length === 0)) {
      // First-time greeting - return immediately without any operations
      const greetingMessage = "How is your mood? Tell me everything that happened during the day.";
      
      // Save greeting to Redis (async, don't wait)
      getChatTestConversation(userId, date).then(savedConversation => {
        if (!savedConversation || savedConversation.messages.length === 0) {
          addChatTestMessage(userId, date, 'assistant', greetingMessage).catch(console.error);
        }
      }).catch(console.error);
      
      return NextResponse.json({
        message: greetingMessage,
        response: greetingMessage,
        metadata: {
          topic: 'greeting',
          confidence: 0,
          shouldSearch: false,
          memoriesFound: 0,
          memorySummary: null,
          memoryAgentUsed: false,
        },
      });
    }

    // Load conversation history from Redis if not provided (only if not a greeting)
    let savedConversationHistory: ChatTestMessage[] = [];
    if (!conversationHistory || conversationHistory.length === 0) {
      const savedConversation = await getChatTestConversation(userId, date);
      if (savedConversation && savedConversation.messages.length > 0) {
        savedConversationHistory = savedConversation.messages;
      }
    }

    // SPECIAL HANDLING: Initial greeting - return specific message without processing
    // Combine both saved and provided history for checking
    const allHistory = [...savedConversationHistory, ...(conversationHistory || [])];
    const hasAnyHistory = allHistory.length > 0;
    
    // Check if history is just a greeting exchange (2 messages: user "hello" + assistant greeting)
    // OR if history only has user's greeting (1 message) - means greeting response hasn't been sent yet
    const isOnlyGreetingExchange = (
      (allHistory.length === 2 &&
       allHistory[0]?.role === 'user' &&
       (allHistory[0]?.content?.toLowerCase().includes('hello') || 
        allHistory[0]?.content?.toLowerCase().includes('hi') ||
        allHistory[0]?.content?.toLowerCase().includes('hey')) &&
       allHistory[1]?.role === 'assistant' &&
       allHistory[1]?.content?.includes('mood')) ||
      // OR just user's greeting (greeting response not sent yet)
      (allHistory.length === 1 &&
       allHistory[0]?.role === 'user' &&
       (allHistory[0]?.content?.toLowerCase().includes('hello') || 
        allHistory[0]?.content?.toLowerCase().includes('hi') ||
        allHistory[0]?.content?.toLowerCase().includes('hey')))
    );
    
    const isInitialGreeting = (
      isGreetingMessage &&
      (!hasAnyHistory || isOnlyGreetingExchange)
    );

    if (isInitialGreeting) {
      const greetingMessage = "How is your mood? Tell me everything that happened during the day.";
      
      // Save greeting to Redis (async, don't block response)
      addChatTestMessage(userId, date, 'assistant', greetingMessage).catch(console.error);
      
      return NextResponse.json({
        message: greetingMessage,
        response: greetingMessage,
        metadata: {
          topic: 'greeting',
          confidence: 0,
          shouldSearch: false,
          memoriesFound: 0,
          memorySummary: null,
          memoryAgentUsed: false,
        },
      });
    }

    // SPECIAL HANDLING: Farewell messages - brief, warm response, no questions
    if (isFarewellMessage) {
      const farewellResponses = [
        "Sounds good! Talk to you later. Take care.",
        "Bye! Have a great day.",
        "Take care! Talk soon.",
        "See you later!",
      ];
      const farewellMessage = farewellResponses[Math.floor(Math.random() * farewellResponses.length)];
      
      // Save farewell to Redis
      await addChatTestMessage(userId, date, 'assistant', farewellMessage);
      
      return NextResponse.json({
        message: farewellMessage,
        response: farewellMessage,
        metadata: {
          topic: 'farewell',
          confidence: 0,
          shouldSearch: false,
          memoriesFound: 0,
          memorySummary: null,
          memoryAgentUsed: false,
        },
      });
    }

    // Use saved conversation history if available, otherwise use provided
    const effectiveHistory = savedConversationHistory.length > 0 
      ? savedConversationHistory 
      : (Array.isArray(conversationHistory) ? conversationHistory : []);
    
    // Save user message to Redis
    await addChatTestMessage(userId, date, 'user', message);

    // Check if this is the initial journal entry (first user message after greeting)
    // Check if experience memories already exist in Redis
    const hasCachedMemories = !!(await getExperienceMemories(userId, date));
    const isLongMessage = message.length > 100 && message.split(/\s+/).length > 15;
    const isGreetingResponse = effectiveHistory.length > 0 && 
      effectiveHistory[0]?.role === 'assistant' && 
      (effectiveHistory[0]?.content?.includes('mood') || 
       effectiveHistory[0]?.content?.includes('Tell me') ||
       effectiveHistory[0]?.content?.includes('everything'));
    
    // FORCE batch fetch if: long message + no cached memories
    // This ensures we always extract multiple topics and store memories properly
    const isInitialJournalEntry = (
      isLongMessage &&
      !hasCachedMemories &&
      !message.toLowerCase().trim().match(/^(hey|hi|hello|thanks|thank you|ok|okay|yes|no|yeah|yep)$/i)
    );
    
    console.log('[Chat Test] Initial journal entry check:', {
      isInitialJournalEntry,
      historyLength: effectiveHistory.length,
      messageLength: message.length,
      wordCount: message.split(/\s+/).length,
      firstMessage: effectiveHistory[0]?.content?.substring(0, 50),
      hasCachedMemories,
      isLongMessage,
      isGreetingResponse,
      reason: isInitialJournalEntry ? 'FORCING batch fetch - long message with no cached memories' : 'Not triggering batch fetch',
    });

    let structuredExtraction: JournalExtraction | undefined = undefined;
    
    if (isInitialJournalEntry) {
      // STRUCTURED EXTRACTION: Extract 4 categories (Events, Projects, Patterns, Emotions)
      console.log('\n========== STRUCTURED EXTRACTION ==========');
      console.log('[Chat Test] Processing initial journal entry - extracting structured information');
      console.log('[Chat Test] User journal entry:', message.substring(0, 100) + '...\n');
      
      const extractionResult = await extractStructuredJournal(message);
      structuredExtraction = extractionResult.extraction;
      
      // Run Memory Agent (ONE-TIME SEARCH)
      const memoryAgentResult = await runOneTimeMemoryAgent(
        structuredExtraction,
        userId,
        extractionResult.thinking
      );
      
      const experienceMemories = memoryAgentResult.experienceMemories || [];
      
      // Store experience memories in Redis (this is what we'll use in every response)
      if (experienceMemories.length > 0) {
        const { setExperienceMemories } = await import('@/app/lib/redis');
        await setExperienceMemories(userId, date, experienceMemories);
      }
      
      // Generate conversational response using experience memories
      const conversationalResponse = await generateConversationalResponse(
        message,
        experienceMemories,
        structuredExtraction,
        true, // isInitialJournalEntry
        userId,
        date
      );
      
      // Save response to Redis
      await addChatTestMessage(userId, date, 'assistant', conversationalResponse);
      
      return NextResponse.json({
        message: conversationalResponse,
        response: conversationalResponse,
        metadata: {
          topic: 'initial_journal_entry',
          confidence: 8,
          shouldSearch: false,
          memoriesFound: experienceMemories.length,
          memorySummary: null,
          memoryAgentUsed: true,
          shouldUseMemory: true,
        },
      });
    } else {
      // NORMAL FLOW: Fetch experience memories from Redis and generate conversational response
      console.log('[Chat Test] 🔍 Fetching experience memories from Redis...');
      
      // Get experience memories from Redis (no need for runMemoryAgent - just fetch directly)
      const experienceMemories = await getExperienceMemories(userId, date);
      
      // Generate conversational response using memories
      const conversationalResponse = await generateConversationalResponse(
        message,
        experienceMemories || [],
        structuredExtraction || { events: [], projects: [], patterns: [], emotions: [] },
        false, // isInitialJournalEntry
        userId,
        date
      );
      
      // Save response to Redis
      await addChatTestMessage(userId, date, 'assistant', conversationalResponse);
      
      return NextResponse.json({
        message: conversationalResponse,
        response: conversationalResponse,
        metadata: {
          topic: 'conversation',
          confidence: experienceMemories && experienceMemories.length > 0 ? 8 : 0,
          shouldSearch: false,
          memoriesFound: experienceMemories?.length || 0,
          memorySummary: null,
          memoryAgentUsed: experienceMemories && experienceMemories.length > 0,
          shouldUseMemory: experienceMemories && experienceMemories.length > 0,
      },
    });
    }
    
  } catch (error: any) {
    console.error('Error in chat endpoint:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process chat message' },
      { status: 500 }
    );
  }
}

