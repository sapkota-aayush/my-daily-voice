import { NextResponse } from 'next/server';
import { getMem0Client, MEMORY_TAGS } from '@/app/lib/mem0';
import { supabase } from '@/app/lib/supabase';

export async function POST(request: Request) {
  try {
    const { journalText, date } = await request.json();

    if (!journalText || !date) {
      return NextResponse.json(
        { error: 'journalText and date are required' },
        { status: 400 }
      );
    }

    // Get user ID from Supabase auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Extract structured memories from journal entry
    const extractedMemories = await extractMemoriesFromJournal(journalText);
    const mem0 = getMem0Client();
    const userId = user.id; // Use actual user ID, not hardcoded 'default-user'

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
              source: 'journal',
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
    console.error('Error storing journal memories:', error);
    return NextResponse.json(
      { error: 'Failed to store journal memories', details: error.message },
      { status: 500 }
    );
  }
}

async function extractMemoriesFromJournal(journalText: string) {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  const prompt = `Extract structured memories from this journal entry.

Categories: ${MEMORY_TAGS.join(', ')}

For each memory provide: content (1-2 sentences), tags (from categories), confidence (0-1).

Return JSON: {"memories": [{"content": "...", "tags": [...], "confidence": 0.9}]}

Journal Entry:
${journalText}`;

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
          content: 'Extract structured memories from journal entries. Focus on high-signal insights, patterns, emotions, goals, and personal growth moments.',
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
    const jsonMatch = content.match(/\[[\s\S]*\]/);
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
