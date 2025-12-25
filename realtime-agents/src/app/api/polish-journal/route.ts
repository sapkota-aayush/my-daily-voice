import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { transcript, date, userId } = await request.json();

    if (!transcript || !date) {
      return NextResponse.json(
        { error: 'transcript and date are required' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required - userId is missing' },
        { status: 401 }
      );
    }

    // Extract only user messages from transcript
    const userMessages = transcript
      .filter((item: any) => item.role === 'user' && item.content && item.content.trim())
      .map((item: any) => item.content.trim());

    if (userMessages.length === 0) {
      return NextResponse.json(
        { error: 'No user messages found in transcript' },
        { status: 400 }
      );
    }

    // Use OpenAI to transform conversational transcript into journal entry
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    const conversationText = userMessages.join('\n');

    const prompt = `Clean up this conversational transcript. Remove filler words, vague language, and format it naturally. Keep the user's authentic voice and style.

CRITICAL RULES:
- Keep the user's natural voice - don't make it sound formal or overly edited
- Remove filler words: "okay", "yeah", "sure", "I mean", "you know", "like", "um", "uh", "so", "well"
- Remove vague/weak words: "kind of", "sort of", "maybe", "perhaps", "I think", "I guess", "probably", "a bit", "a little", "somewhat", "quite", "rather", "pretty", "really", "very", "actually", "basically", "literally", "honestly", "just", "simply"
- Remove greetings/farewells: "hello", "hi", "thanks", "thank you", "bye", "goodbye"
- Remove redundant phrases: "that's a good question", "to be honest", "to start", "to begin with"
- Keep ALL original thoughts and meaning exactly as spoken
- Keep the user's natural sentence structure and flow
- Use "I" if they said "I", keep their exact words otherwise
- Structure into paragraphs only if natural breaks exist
- Make it sound like the user wrote it themselves, not like an editor polished it
- DO NOT add any new sentences or ideas
- DO NOT expand on what was said
- DO NOT summarize or paraphrase
- Return ONLY the cleaned text, nothing else

Transcript:
${conversationText}

Cleaned text:`;

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
          content: 'You are a text cleaner that preserves the user\'s authentic voice. Remove filler words, vague language, and format naturally. Keep it sounding like the user wrote it themselves - not overly formal or edited. DO NOT add, expand, summarize, or change meaning.',
        },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const polishedEntry = data.choices[0].message.content.trim();

    // Save polished entry to database
    // Create server-side Supabase client for database operations
    const cookieStore = await cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const serverSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storage: {
          getItem: (key: string) => {
            const cookie = cookieStore.get(key);
            return cookie?.value || null;
          },
          setItem: () => {},
          removeItem: () => {},
        },
      },
    });

    await serverSupabase
      .from('daily_reflections')
      .upsert({
        user_id: userId,
        date,
        reflection_summary: polishedEntry,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,date' });

    return NextResponse.json({
      success: true,
      polishedEntry,
    });
  } catch (error: any) {
    console.error('Error polishing journal:', error);
    return NextResponse.json(
      { error: 'Failed to polish journal entry', details: error.message },
      { status: 500 }
    );
  }
}
