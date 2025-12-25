import { NextResponse } from 'next/server';
import { getMem0Client, MEMORY_TAGS } from '@/app/lib/mem0';

export async function POST(request: Request) {
  try {
    const { conversationHistory, date, userId } = await request.json();

    if (!conversationHistory || !Array.isArray(conversationHistory) || !date) {
      return NextResponse.json(
        { error: 'conversationHistory (array) and date are required' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required - userId is missing' },
        { status: 401 }
      );
    }

    // Extract meaningful insights from conversation
    const extractedMemories = await extractMemoriesFromConversation(conversationHistory);
    const mem0 = getMem0Client();

    const storedMemories = [];
    for (const memory of extractedMemories) {
      try {
        const result = await mem0.add(
          [
            {
              role: 'user' as const,
              content: memory.content,
            },
          ],
          {
            user_id: userId,
            metadata: {
              source: 'conversation',
              date: date,
              confidence: memory.confidence,
              tags: memory.tags,
            },
          }
        );
        storedMemories.push(result);
      } catch (error: any) {
        console.error(`Failed to store memory: ${memory.content}`, error.message);
      }
    }

    return NextResponse.json({
      success: true,
      memoriesExtracted: extractedMemories.length,
      memoriesStored: storedMemories.length,
      memories: extractedMemories,
    });
  } catch (error: any) {
    console.error('Error extracting conversation memories:', error);
    return NextResponse.json(
      { error: 'Failed to extract conversation memories', details: error.message },
      { status: 500 }
    );
  }
}

async function extractMemoriesFromConversation(conversationHistory: Array<{ role: string; content: string }>) {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  // Build conversation text (only user messages for context, but analyze full conversation)
  const conversationText = conversationHistory
    .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
    .join('\n\n');

  const prompt = `Analyze this conversation and extract meaningful insights, patterns, emotions, goals, and personal growth moments.

Focus on:
- Key insights and realizations
- Emotional patterns and states
- Goals, aspirations, or intentions mentioned
- Challenges or struggles discussed
- Wins, achievements, or positive moments
- Habits, routines, or behavioral patterns
- Relationship dynamics or social interactions
- Health, wellness, or self-care mentions
- Work, projects, or professional topics
- Mindset shifts or reflections

Categories/Tags available: ${MEMORY_TAGS.join(', ')}

For each meaningful memory, provide:
- content: 1-2 sentences capturing the insight (in first person, as if the user said it)
- tags: array of relevant tags from the categories above
- confidence: 0-1 score (higher for clear, significant insights)

Return JSON: {"memories": [{"content": "...", "tags": [...], "confidence": 0.9}]}

Extract only meaningful, significant insights - not every detail. Focus on what matters for long-term memory and personal growth.

Conversation:
${conversationText}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a memory extraction agent. Analyze conversations and extract meaningful insights that should be remembered long-term. Focus on patterns, emotions, goals, challenges, wins, and personal growth moments. Return structured JSON with memories.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  let extracted;
  
  try {
    const content = data.choices[0].message.content;
    extracted = JSON.parse(content);
  } catch (e) {
    const content = data.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      extracted = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('Failed to parse extracted memories');
    }
  }

  const memories = Array.isArray(extracted) ? extracted : (extracted.memories || []);

  return memories.map((m: any) => ({
    content: m.content,
    tags: Array.isArray(m.tags) ? m.tags.filter((tag: string) => MEMORY_TAGS.includes(tag as any)) : [],
    confidence: m.confidence || 0.5,
  }));
}

