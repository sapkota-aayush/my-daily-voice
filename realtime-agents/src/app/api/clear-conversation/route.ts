import { NextResponse } from 'next/server';
import { getRedisClient } from '@/app/lib/redis';
import { supabase } from '@/app/lib/supabase';

/**
 * Clear conversation for a specific date
 * Clears both Redis conversation states and Supabase conversation transcript
 */
export async function POST(request: Request) {
  try {
    const { date } = await request.json();
    
    if (!date) {
      return NextResponse.json(
        { error: 'date is required (format: YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    // Get current user from request headers
    const authHeader = request.headers.get('authorization');
    let userId: string | null = null;
    
    try {
      // Try to get user from Supabase auth
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (!authError && user) {
        userId = user.id;
      }
    } catch (authError) {
      // If auth fails, try to continue without user ID (for development)
      console.warn('Auth check failed, continuing without user ID:', authError);
    }
    
    // If no user ID, we can still clear Redis but skip database update
    if (!userId) {
      console.warn('No user ID found, clearing Redis only');
    }

    // 1. Clear Redis conversation states for this date
    const redis = getRedisClient();
    const pattern = `conversation:${date}:*`;
    
    let cursor: number = 0;
    let deletedCount = 0;
    const keys: string[] = [];
    
    // Scan for keys
    do {
      const result = await redis.scan(cursor, { match: pattern, count: 100 });
      cursor = typeof result[0] === 'string' ? parseInt(result[0], 10) : (result[0] as number);
      keys.push(...(result[1] || []));
    } while (cursor !== 0);
    
    // Delete all found keys
    if (keys.length > 0) {
      await redis.del(...keys);
      deletedCount = keys.length;
    }
    
    // Also clean up session context for this date
    const contextKey = `session:${date}:context`;
    await redis.del(contextKey);
    
    // 2. Clear conversation transcript from Supabase (if user ID available)
    let transcriptCleared = false;
    if (userId) {
      const { error: dbError } = await supabase
        .from('daily_reflections')
        .update({ 
          conversation_transcript: null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('date', date);
      
      if (dbError) {
        console.error('Error clearing conversation transcript:', dbError);
        return NextResponse.json(
          {
            error: 'Failed to clear conversation transcript',
            details: dbError.message,
            redisCleared: deletedCount,
          },
          { status: 500 }
        );
      }
      transcriptCleared = true;
    }
    
    return NextResponse.json({
      success: true,
      message: `Cleared conversation for ${date}`,
      redisKeysDeleted: deletedCount,
      transcriptCleared,
      note: userId ? 'Redis and database cleared' : 'Redis cleared (no user ID found for database)',
    });
  } catch (error: any) {
    console.error('Error clearing conversation:', error);
    return NextResponse.json(
      {
        error: 'Failed to clear conversation',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

