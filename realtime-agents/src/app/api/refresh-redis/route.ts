import { NextRequest, NextResponse } from 'next/server';
import { getRedisClient } from '@/app/lib/redis';
import { 
  clearChatTestConversation,
  clearSessionMemories,
  clearExperienceMemories,
  clearMemoryUsageTracker,
} from '@/app/lib/redis';

/**
 * Refresh/Clear Redis for a specific date
 * Clears all conversation data, memories, and usage trackers
 */
export async function POST(req: NextRequest) {
  try {
    const { userId = 'default-user', date } = await req.json();
    
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    const redis = getRedisClient();
    const deletedKeys: string[] = [];
    
    // Clear all conversation-related data
    try {
      await clearChatTestConversation(userId, targetDate);
      deletedKeys.push(`chat-test:conversation:${userId}:${targetDate}`);
      console.log(`✓ Cleared chat-test conversation`);
    } catch (error: any) {
      console.error('Error clearing chat-test conversation:', error);
    }
    
    try {
      await clearSessionMemories(userId, targetDate);
      deletedKeys.push(`session:memories:${userId}:${targetDate}`);
      console.log(`✓ Cleared session memories`);
    } catch (error: any) {
      console.error('Error clearing session memories:', error);
    }
    
    try {
      await clearExperienceMemories(userId, targetDate);
      deletedKeys.push(`memory:experiences:${userId}:${targetDate}`);
      console.log(`✓ Cleared experience memories`);
    } catch (error: any) {
      console.error('Error clearing experience memories:', error);
    }
    
    try {
      await clearMemoryUsageTracker(userId, targetDate);
      deletedKeys.push(`memory:usage:${userId}:${targetDate}`);
      console.log(`✓ Cleared memory usage tracker`);
    } catch (error: any) {
      console.error('Error clearing memory usage tracker:', error);
    }
    
    // Also clear session context
    try {
      const contextKey = `session:${targetDate}:context`;
      await redis.del(contextKey);
      deletedKeys.push(contextKey);
      console.log(`✓ Cleared session context`);
    } catch (error: any) {
      console.error('Error clearing session context:', error);
    }
    
    // Clear session grounding
    try {
      const groundingKey = `session:grounding:${userId}:${targetDate}`;
      await redis.del(groundingKey);
      deletedKeys.push(groundingKey);
      console.log(`✓ Cleared session grounding`);
    } catch (error: any) {
      console.error('Error clearing session grounding:', error);
    }
    
    return NextResponse.json({
      success: true,
      message: `Redis refreshed for ${targetDate}`,
      date: targetDate,
      userId,
      deletedKeys,
    });
  } catch (error: any) {
    console.error('Error refreshing Redis:', error);
    return NextResponse.json(
      { 
        error: 'Failed to refresh Redis',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * GET: Refresh Redis for today
 */
export async function GET(req: NextRequest) {
  const date = new Date().toISOString().split('T')[0];
  const userId = 'default-user';
  
  // Call POST handler logic
  const response = await POST(
    new NextRequest(req.url, {
      method: 'POST',
      body: JSON.stringify({ userId, date }),
      headers: { 'Content-Type': 'application/json' },
    })
  );
  
  return response;
}

