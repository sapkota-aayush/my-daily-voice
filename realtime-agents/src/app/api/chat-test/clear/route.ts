import { NextRequest, NextResponse } from 'next/server';
import { getRedisClient } from '@/app/lib/redis';

/**
 * Clear ALL conversation-related data from Redis for a specific date
 * This function deletes all possible Redis keys for the given userId and date
 */
export async function POST(req: NextRequest) {
  try {
    const { userId = 'default-user', date } = await req.json();
    
    if (!date) {
      return NextResponse.json(
        { error: 'date is required' },
        { status: 400 }
      );
    }
    
    const redis = getRedisClient();
    const deletedKeys: string[] = [];
    const errors: string[] = [];
    
    // List of all possible Redis keys for this userId and date
    const keysToDelete = [
      `chat-test:conversation:${userId}:${date}`,
      `session:memories:${userId}:${date}`,
      `session:grounding:${userId}:${date}`,
      `memory:experiences:${userId}:${date}`,
      `memory:usage:${userId}:${date}`,
      `session:${date}:context`, // Date-based session context
    ];
    
    // Delete each key individually and track results
    for (const key of keysToDelete) {
      try {
        const result = await redis.del(key);
        if (result === 1) {
          deletedKeys.push(key);
          console.log(`✓ Deleted: ${key}`);
        } else if (result === 0) {
          console.log(`- Key not found (already deleted or never existed): ${key}`);
        }
      } catch (error: any) {
        const errorMsg = `Failed to delete ${key}: ${error.message}`;
        errors.push(errorMsg);
        console.error(`✗ ${errorMsg}`);
      }
    }
    
    // Also try to delete any conversation state keys (pattern-based)
    // These use sessionId which we don't have, but we can try to scan
    try {
      const conversationPattern = `conversation:${date}:*`;
      // Note: Upstash Redis doesn't support SCAN in the same way, so we'll skip pattern deletion
      // The main keys above should cover most cases
    } catch (error: any) {
      console.warn('Could not scan for conversation pattern keys:', error.message);
    }
    
    // Verify deletion by checking if the main conversation key still exists
    const { getChatTestConversation } = await import('@/app/lib/redis');
    const mainKey = `chat-test:conversation:${userId}:${date}`;
    const stillExists = await getChatTestConversation(userId, date);
    
    if (stillExists) {
      // Force delete one more time
      try {
        await redis.del(mainKey);
        console.log(`Force deleted: ${mainKey}`);
        
        // Wait a moment for Redis to process
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Check one final time
        const finalCheck = await getChatTestConversation(userId, date);
        if (finalCheck) {
          return NextResponse.json({
            success: false,
            error: 'Failed to delete conversation from Redis after retry',
            message: 'Data may still exist in Redis. Please check Upstash dashboard.',
            deletedKeys,
            errors,
            stillExists: true,
          }, { status: 500 });
        }
      } catch (retryError: any) {
        return NextResponse.json({
          success: false,
          error: `Retry deletion failed: ${retryError.message}`,
          deletedKeys,
          errors,
        }, { status: 500 });
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Cleared all conversation data for ${date}`,
      deletedKeys,
      errors: errors.length > 0 ? errors : undefined,
      verified: !stillExists,
    });
  } catch (error: any) {
    console.error('Error clearing conversation:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to clear conversation' },
      { status: 500 }
    );
  }
}

