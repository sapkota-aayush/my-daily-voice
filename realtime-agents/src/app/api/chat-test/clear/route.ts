import { NextRequest, NextResponse } from 'next/server';
import { clearChatTestConversation, clearSessionMemories, clearExperienceMemories } from '@/app/lib/redis';

/**
 * Clear chat-test conversation history and experience memories from Redis
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
    
    await clearChatTestConversation(userId, date);
    await clearSessionMemories(userId, date);
    await clearExperienceMemories(userId, date);
    
    return NextResponse.json({
      success: true,
      message: `Cleared conversation, session memories, and experience memories for ${date}`,
    });
  } catch (error: any) {
    console.error('Error clearing conversation:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to clear conversation' },
      { status: 500 }
    );
  }
}

