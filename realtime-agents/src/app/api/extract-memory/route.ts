import { NextResponse } from 'next/server';
import { getMem0Client, MEMORY_TAGS } from '@/app/lib/mem0';
import { supabase } from '@/app/lib/supabase';

export async function POST(request: Request) {
  try {
    const { transcriptId, transcript } = await request.json();

    if (!transcriptId || !transcript) {
      return NextResponse.json(
        { error: 'transcriptId and transcript are required' },
        { status: 400 }
      );
    }

    // Get user from Supabase session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const extractedMemories = await extractMemoriesFromTranscript(transcript);
    const mem0 = getMem0Client();
    const userId = user.id;

    const storedMemories = [];
    for (const memory of extractedMemories) {
      try {
        // Store each memory with user_id and metadata
        // Categories will be inferred by mem0 or can be added via metadata
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
              source: 'onboarding',
              transcriptId: transcriptId,
              confidence: memory.confidence,
              tags: memory.tags, // Store tags in metadata for now
            },
          }
        );
        storedMemories.push(result);
      } catch (error: any) {
        console.error(`Failed to store memory: ${memory.content}`, error.message);
      }
    }

    await supabase
      .from('onboarding_transcripts')
      .update({ extracted_at: new Date().toISOString() })
      .eq('id', transcriptId)
      .eq('user_id', user.id);

    return NextResponse.json({
      success: true,
      memoriesExtracted: extractedMemories.length,
      memoriesStored: storedMemories.length,
    });
  } catch (error: any) {
    console.error('Error extracting memories:', error);
    return NextResponse.json(
      { error: 'Failed to extract memories', details: error.message },
      { status: 500 }
    );
  }
}

async function extractMemoriesFromTranscript(transcript: any[]) {
  // Use OpenAI to extract structured memories from the transcript
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  // Convert transcript to text format
  const transcriptText = transcript
    .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
    .join('\n');

  const prompt = `Extract structured memories from this onboarding transcript.

Categories: ${MEMORY_TAGS.join(', ')}

For each memory provide: content (1-2 sentences), tags (from categories), confidence (0-1).

Return JSON: {"memories": [{"content": "...", "tags": [...], "confidence": 0.9}]}

Transcript:
${transcriptText}`;

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
          content: 'Extract structured memories from conversations.',
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
    // If parsing fails, try to extract JSON from text
    const content = data.choices[0].message.content;
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      extracted = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('Failed to parse extracted memories');
    }
  }

  // Handle both {memories: [...]} and direct array formats
  const memories = Array.isArray(extracted) ? extracted : (extracted.memories || []);

  return memories.map((m: any) => ({
    content: m.content,
    tags: Array.isArray(m.tags) ? m.tags.filter((tag: string) => MEMORY_TAGS.includes(tag as any)) : [],
    confidence: m.confidence || 0.5,
  }));
}
