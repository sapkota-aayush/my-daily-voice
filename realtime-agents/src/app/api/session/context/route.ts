import { NextResponse } from 'next/server';
import { getMem0Client } from '@/app/lib/mem0';
import { getSessionContext, setSessionContext } from '@/app/lib/redis';
import type { ConversationState } from '@/app/types/session';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json(
        { error: 'date parameter is required' },
        { status: 400 }
      );
    }

    // Calculate yesterday's date
    const dateObj = new Date(date);
    dateObj.setDate(dateObj.getDate() - 1);
    const yesterdayDate = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD format

    const cachedContext = await getSessionContext(yesterdayDate);
    if (cachedContext && cachedContext.all_memories && cachedContext.all_memories.length > 0) {
      return NextResponse.json({
        success: true,
        source: 'redis',
        date: yesterdayDate,
        context: cachedContext,
      });
    }

    // Load ALL memories from mem0 into Redis (not just yesterday's)
    const mem0 = getMem0Client();
    const userId = 'default-user';

    let allMemories;
    try {
      // Get ALL memories from mem0
      allMemories = await mem0.getAll({ user_id: userId });
    } catch (error: any) {
      console.error('Error fetching memories from Mem0:', error);
      return NextResponse.json({
        success: true,
        source: 'mem0',
        date: yesterdayDate,
        context: {
          memories: [],
          all_memories: [],
          summary: 'No memories found.',
        },
      });
    }

    // Format ALL memories (not just yesterday's)
    const formattedAllMemories = Array.isArray(allMemories)
      ? allMemories.map((m: any) => ({
          content: m.memory || m.content || '',
          tags: m.metadata?.tags || [],
          date: m.metadata?.date || '',
          mood: m.metadata?.mood || '',
        }))
      : [];
    
    console.log('MEM0 FETCH:', {
      total: allMemories?.length || 0,
      formatted: formattedAllMemories.length,
      sample: formattedAllMemories.slice(0, 3).map(m => ({
        content: m.content.substring(0, 80),
        date: m.date,
        mood: m.mood,
      })),
    });

    // Also get yesterday's memories for backward compatibility
    const yesterdayMemories = formattedAllMemories.filter((m: any) => {
      const memoryDate = m.date;
      return memoryDate === yesterdayDate;
    });
    
    // DEBUG: Show date distribution
    const dateDistribution: Record<string, number> = {};
    formattedAllMemories.forEach(m => {
      const d = m.date || 'no-date';
      dateDistribution[d] = (dateDistribution[d] || 0) + 1;
    });
    console.log('MEMORY DATE DISTRIBUTION:', dateDistribution);
    console.log('TOTAL MEMORIES BY DATE:', Object.entries(dateDistribution).map(([d, c]) => `${d}: ${c}`).join(', '));

    // Extract context as simple strings (ALL memories, not just yesterday's)
    const allContextStrings = formattedAllMemories.map(m => {
      const moodPart = m.mood ? `[${m.mood}]` : '';
      const datePart = m.date ? `[${m.date}]` : '';
      return `${moodPart}${datePart} ${m.content}`.trim();
    });
    
    const yesterdayContextStrings = yesterdayMemories.map(m => m.content);
    
    console.log('CONTEXT STRINGS CREATED:', {
      allContext: allContextStrings.length,
      yesterdayContext: yesterdayContextStrings.length,
      first5: allContextStrings.slice(0, 5),
    });

    // Create summary
    const summary = formattedAllMemories.length > 0
      ? `Loaded ${formattedAllMemories.length} total memories from your journal history.`
      : 'No memories found.';

    const context = {
      date: yesterdayDate,
      memories: yesterdayMemories, // Yesterday's memories (for backward compatibility)
      all_memories: formattedAllMemories, // ALL memories from mem0
      all_context: allContextStrings, // ALL memories as strings for Redis
      summary,
      yesterday_context: yesterdayContextStrings, // Yesterday's context (for backward compatibility)
    };

    // Cache in Redis with 2 hour TTL
    await setSessionContext(yesterdayDate, context, 7200);

    return NextResponse.json({
      success: true,
      source: 'mem0',
      date: yesterdayDate,
      context,
      memoriesCount: formattedAllMemories.length,
    });
  } catch (error: any) {
    console.error('Error fetching session context:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch session context',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
