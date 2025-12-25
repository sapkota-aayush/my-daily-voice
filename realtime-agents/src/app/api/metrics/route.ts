import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/app/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
// OpenAI imported dynamically to avoid build-time execution
import { getWeeklyMetrics, setWeeklyMetrics, getWeekStartDate } from '@/app/lib/redis';

// Lazy initialization - only create client when needed (not during build)
async function getOpenAIClient() {
  const { default: OpenAI } = await import('openai');
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

interface JournalEntry {
  date: string;
  reflection_summary: string | null;
}

interface MetricsResult {
  emotionalDirection: {
    title: string;
    reflection: string;
    overallDirection?: string;
  };
  energyFocus: {
    title: string;
    reflection: string;
    optionalInsight?: string;
  };
  journalingHabit: {
    title: string;
    reflection: string;
    optionalEncouragement?: string;
  };
  recurringThemes: {
    title: string;
    reflection: string;
    themes?: string[];
  };
}

export async function GET(request: Request) {
  try {
    // Try to get userId from query params (passed from client)
    const url = new URL(request.url);
    const userIdFromQuery = url.searchParams.get('userId');
    const forceRefresh = url.searchParams.get('refresh') === 'true';
    
    // Also try cookie-based auth as fallback
    const userIdFromAuth = await getAuthenticatedUserId();
    const userId = userIdFromQuery || userIdFromAuth;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get current week start date (Monday)
    const weekStart = getWeekStartDate();
    
    // Check if we have cached metrics for this week (unless force refresh)
    if (!forceRefresh) {
      const cachedMetrics = await getWeeklyMetrics(userId, weekStart);
      if (cachedMetrics) {
        // Return cached metrics immediately (no computation needed)
        return NextResponse.json({
          ...cachedMetrics,
          cached: true,
          weekStart,
        });
      }
    }

    // Create server-side Supabase client
    const cookieStore = await cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
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

    // Fetch journal entries from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startDate = thirtyDaysAgo.toISOString().split('T')[0];

    const { data: entries, error } = await serverSupabase
      .from('daily_reflections')
      .select('date, reflection_summary')
      .eq('user_id', userId)
      .gte('date', startDate)
      .not('reflection_summary', 'is', null)
      .order('date', { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch journal entries', details: error.message },
        { status: 500 }
      );
    }

    if (!entries || entries.length === 0) {
      return NextResponse.json({
        emotionalDirection: {
          title: 'Emotional Direction (Last 7 Days)',
          reflection: 'You haven\'t journaled enough yet to see patterns in your emotional direction. Keep reflecting, and insights will emerge.',
        },
        energyFocus: {
          title: 'Where Your Energy Went',
          reflection: 'Once you start journaling regularly, you\'ll begin to notice where your energy naturally flows and what patterns emerge.',
        },
        journalingHabit: {
          title: 'Your Journaling Habit',
          reflection: 'Every reflection matters. Start building your journaling habit, and you\'ll discover how valuable this space becomes.',
        },
        recurringThemes: {
          title: 'What Keeps Showing Up',
          reflection: 'Themes and patterns will reveal themselves as you continue to check in with yourself regularly.',
        },
      });
    }

    // Prepare entries for LLM analysis
    const entriesText = entries
      .map((entry: JournalEntry) => {
        const date = new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return `Date: ${date}\nEntry: ${entry.reflection_summary}`;
      })
      .join('\n\n---\n\n');

    // Use GPT-4o to generate narrative reflections (can take time, that's okay)
    const analysisPrompt = `You are a thoughtful friend who has been listening to someone's journal entries for the past week. 

Your task: Write 4 short, reflective insights that feel personal and meaningful—not clinical or data-heavy.

Journal Entries:
${entriesText}

Write reflections for these 4 categories:

1. EMOTIONAL DIRECTION (Last 7 Days)
   - Title: "Emotional Direction (Last 7 Days)"
   - Write 2-3 sentences describing their emotional patterns over the past week
   - Focus on patterns, not numbers: Did they end days differently than they started? Were there ups and downs? What helped them recover?
   - Optional: Add one-line overall direction (e.g., "Overall direction: slightly improving") ONLY if it adds meaning
   - NO percentages, NO scores, NO averages
   - Example tone: "Your mood this week had ups and downs, but you often ended your days on a more positive note than you started. Challenging mornings showed up a few times, but productive actions later in the day helped you recover emotionally."

2. WHERE YOUR ENERGY WENT
   - Title: "Where Your Energy Went"
   - Write 2-3 sentences about where their attention and energy flowed
   - Focus on patterns: What did they talk about trying to do? What got in the way? What helped them get back on track?
   - Optional: Add one insightful follow-up line if it adds value (e.g., "This suggests focus isn't the problem — protecting it is.")
   - NO mention counts, NO ratios
   - Example tone: "This week, you talked a lot about trying to stay focused while dealing with distractions, especially around social media. You also described moments where structure and small routines helped you get back on track."

3. YOUR JOURNALING HABIT
   - Title: "Your Journaling Habit"
   - Write 2-3 sentences about their journaling pattern
   - Focus on meaning: When do they tend to journal? What does the pattern say about how they're using this space?
   - Optional: Add one encouraging line (e.g., "Building consistency slowly is still progress.")
   - NO streaks, NO rates, NO day counts (keep these internal)
   - Example tone: "You checked in with yourself regularly this month, even if not every day. The pattern shows you tend to journal more during intense or meaningful periods, which means you're using this space when it matters most."

4. WHAT KEEPS SHOWING UP
   - Title: "What Keeps Showing Up"
   - Write 2-3 sentences about recurring themes
   - Identify 2-3 themes that appeared multiple times
   - Focus on what these themes suggest about their current phase or state
   - Optional: List theme names simply (e.g., ["Focus and attention", "Project work", "Personal growth"])
   - NO frequencies, NO counts
   - Example tone: "Certain themes appeared repeatedly in your reflections this week: focus, project work, and self-improvement. This suggests you're in a phase of growth, balancing ambition with the pressure that comes with it."

CRITICAL RULES:
- Write like a thoughtful friend, not a data analyst
- 2-3 sentences max per reflection
- One clear takeaway per section
- Avoid all numbers, percentages, scores, and counts unless absolutely necessary for meaning
- Natural, conversational language
- Focus on meaning, patterns, and reassurance
- If a user can't understand it in 5 seconds, it's too much

Return JSON in this exact format:
{
  "emotionalDirection": {
    "title": "Emotional Direction (Last 7 Days)",
    "reflection": "2-3 sentences describing emotional patterns...",
    "overallDirection": "optional one-line direction if it adds meaning"
  },
  "energyFocus": {
    "title": "Where Your Energy Went",
    "reflection": "2-3 sentences about energy and attention patterns...",
    "optionalInsight": "optional follow-up insight if valuable"
  },
  "journalingHabit": {
    "title": "Your Journaling Habit",
    "reflection": "2-3 sentences about journaling patterns...",
    "optionalEncouragement": "optional encouraging line if helpful"
  },
  "recurringThemes": {
    "title": "What Keeps Showing Up",
    "reflection": "2-3 sentences about recurring themes and what they suggest...",
    "themes": ["Theme 1", "Theme 2", "Theme 3"]
  }
}`;

    const openai = await getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a thoughtful friend who has been listening to someone\'s journal entries. Write reflections that feel personal, meaningful, and reassuring—like insights from someone who genuinely cares. Always return valid JSON only, no markdown, no explanations outside the JSON structure. Focus on meaning, patterns, and human understanding, not data or metrics.',
        },
        {
          role: 'user',
          content: analysisPrompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7, // Higher temperature for more natural, conversational tone
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    let metrics: MetricsResult;
    try {
      metrics = JSON.parse(content);
    } catch (parseError) {
      // Fallback: return simple reflections if parsing fails
      metrics = {
        emotionalDirection: {
          title: 'Emotional Direction (Last 7 Days)',
          reflection: 'Your journal entries show a mix of experiences and emotions. Keep reflecting to discover your patterns.',
        },
        energyFocus: {
          title: 'Where Your Energy Went',
          reflection: 'Your reflections reveal what matters to you right now. Continue journaling to see where your attention naturally flows.',
        },
        journalingHabit: {
          title: 'Your Journaling Habit',
          reflection: 'You\'re building a valuable practice of self-reflection. Every entry adds to your understanding of yourself.',
        },
        recurringThemes: {
          title: 'What Keeps Showing Up',
          reflection: 'Patterns will emerge as you continue to reflect. Your journal will help you notice what matters most to you.',
        },
      };
    }

    // Cache the computed metrics for this week
    await setWeeklyMetrics(userId, weekStart, metrics);

    return NextResponse.json({
      ...metrics,
      cached: false,
      weekStart,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to generate reflections', details: error.message },
      { status: 500 }
    );
  }
}


