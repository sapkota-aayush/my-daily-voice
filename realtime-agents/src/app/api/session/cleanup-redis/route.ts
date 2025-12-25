import { NextResponse } from 'next/server';
import { getRedisClient } from '@/app/lib/redis';

/**
 * Cleanup Redis: Delete all conversation states for a specific date
 * This helps clear stale data that might be causing issues
 */
export async function POST(request: Request) {
  try {
    const { date } = await request.json();
    
    if (!date) {
      return NextResponse.json(
        { error: 'date is required' },
        { status: 400 }
      );
    }

    const redis = getRedisClient();
    
    // Find all keys matching conversation pattern for this date
    const pattern = `conversation:${date}:*`;
    
    // Note: Upstash Redis doesn't support KEYS command in production
    // We'll use SCAN instead, but for now, we'll delete by known pattern
    // For a more robust solution, we'd need to track session IDs
    
    // Get all keys (this is a simplified approach - in production you'd want to track session IDs)
    let cursor = 0;
    let deletedCount = 0;
    const keys: string[] = [];
    
    // Scan for keys (Upstash supports SCAN)
    do {
      const result = await redis.scan(cursor, { match: pattern, count: 100 });
      cursor = result[0];
      keys.push(...result[1]);
    } while (cursor !== 0);
    
    // Delete all found keys
    if (keys.length > 0) {
      await redis.del(...keys);
      deletedCount = keys.length;
    }
    
    // Also clean up session context for this date
    const contextKey = `session:${date}:context`;
    await redis.del(contextKey);
    
    return NextResponse.json({
      success: true,
      message: `Cleaned up ${deletedCount} conversation states for ${date}`,
      deletedCount,
    });
  } catch (error: any) {
    console.error('Error cleaning up Redis:', error);
    return NextResponse.json(
      {
        error: 'Failed to cleanup Redis',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET: Cleanup all old conversation states (older than 7 days)
 */
export async function GET(request: Request) {
  try {
    const redis = getRedisClient();
    const { searchParams } = new URL(request.url);
    const daysOld = parseInt(searchParams.get('days') || '7', 10);
    
    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    // This is a simplified cleanup - in production you'd want to track dates better
    // For now, we'll just return a message about what would be cleaned
    
    return NextResponse.json({
      success: true,
      message: `Cleanup would remove states older than ${daysOld} days`,
      cutoffDate: cutoffDate.toISOString(),
      note: 'Use POST with specific date to cleanup that date\'s states',
    });
  } catch (error: any) {
    console.error('Error in cleanup GET:', error);
    return NextResponse.json(
      {
        error: 'Failed to get cleanup info',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
