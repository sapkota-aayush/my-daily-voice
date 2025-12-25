import { NextRequest, NextResponse } from 'next/server';
import { getSessionMemories, getChatTestConversation } from '@/app/lib/redis';

/**
 * Debug endpoint to check what's stored in Redis
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || 'default-user';
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    const sessionMemories = await getSessionMemories(userId, date);
    const conversation = await getChatTestConversation(userId, date);

    return NextResponse.json({
      userId,
      date,
      sessionMemories: sessionMemories || [],
      sessionMemoriesCount: sessionMemories?.length || 0,
      conversation: conversation?.messages || [],
      conversationCount: conversation?.messages.length || 0,
      details: sessionMemories?.map(m => ({
        topic: m.topic,
        memoriesCount: m.memories.length,
        summary: m.summary?.substring(0, 100) + '...',
      })) || [],
    });
  } catch (error: any) {
    console.error('Error checking Redis:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check Redis' },
      { status: 500 }
    );
  }
}

