import { NextRequest, NextResponse } from 'next/server';
import { getChatTestConversation } from '@/app/lib/redis';

/**
 * Restore conversation history from Redis
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
    
    const conversation = await getChatTestConversation(userId, date);
    
    if (!conversation || conversation.messages.length === 0) {
      return NextResponse.json({
        messages: [],
        restored: false,
      });
    }
    
    return NextResponse.json({
      messages: conversation.messages,
      restored: true,
      messageCount: conversation.messages.length,
    });
  } catch (error: any) {
    console.error('Error restoring conversation:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to restore conversation' },
      { status: 500 }
    );
  }
}

