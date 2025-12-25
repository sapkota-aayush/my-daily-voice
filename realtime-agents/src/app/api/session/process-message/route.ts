import { NextResponse } from 'next/server';
import { processUserMessage } from '@/app/lib/conversationProcessor';
import { buildAgentInstructions } from '@/app/lib/agentInstructions';

/**
 * Process user message through 4-step loop
 * Called from client when user message is received
 * 
 * STEP 1: Read latest Redis state
 * STEP 2: Update Redis based on user message
 * STEP 3: REBUILD instructions with updated state
 * STEP 4: Return updated state and fresh instructions
 */
export async function POST(request: Request) {
  try {
    const { sessionId, date, userMessage, lastQuestion } = await request.json();

    if (!sessionId || !date || !userMessage) {
      return NextResponse.json(
        { error: 'sessionId, date, and userMessage are required' },
        { status: 400 }
      );
    }

    // STEP 1 & 2: Run 4-step loop (reads Redis, updates Redis)
    const result = await processUserMessage(
      sessionId,
      date,
      userMessage,
      lastQuestion || null
    );

    // STEP 3: REBUILD instructions with updated state
    const freshInstructions = buildAgentInstructions(result.updatedState);

    return NextResponse.json({
      success: true,
      updatedState: result.updatedState,
      nextMove: result.nextMove,
      instructions: freshInstructions, // Fresh instructions for this turn
    });
  } catch (error: any) {
    console.error('Error processing user message:', error);
    return NextResponse.json(
      {
        error: 'Failed to process user message',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
