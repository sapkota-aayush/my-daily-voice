import { NextResponse } from 'next/server';
import { getConversationState, updateConversationState } from '@/app/lib/redis';
import { extractFromMessage } from '@/app/lib/conversationExtraction';
import { buildAgentInstructions } from '@/app/lib/agentInstructions';
import type { ConversationState } from '@/app/types/session';

/**
 * V1 Flow: Process after user finishes initial sharing
 * 
 * Steps:
 * 1. Extract anchor theme and tone
 * 2. Directly search mem0 by tags/themes (NO Redis caching)
 * 3. Update Redis state to 'reflecting' phase
 * 4. Return memories directly for agent to use
 */
export async function POST(request: Request) {
  try {
    const { sessionId, date, fullSharing, mood } = await request.json();

    if (!sessionId || !date || !fullSharing) {
      return NextResponse.json(
        { error: 'sessionId, date, and fullSharing are required' },
        { status: 400 }
      );
    }

    // Get current state
    let state = await getConversationState(sessionId, date);
    if (!state) {
      return NextResponse.json(
        { error: 'Conversation state not found. Initialize state first.' },
        { status: 404 }
      );
    }

    // STEP 1: Extract anchor theme and tone
    const extraction = extractFromMessage(fullSharing, null);
    let anchor = state.anchor;
    if (extraction.touched_theme && !anchor) {
      anchor = extraction.touched_theme;
    }
    
    // Simple extraction - no memory matching needed
    console.log('THEME EXTRACTION:', {
      extraction,
      anchor: anchor || 'none',
    });

    // STEP 2: NO memory search during conversation - mem0 only for post-session insights
    // Removed all memory fetching logic

    // STEP 3: Update Redis state (no memories - just phase and mood)
    const updates: Partial<ConversationState> = {
      session_phase: 'reflecting',
      user_initial_sharing: fullSharing,
      anchor: anchor || state.anchor,
      tone: extraction.tone || state.tone,
      mood: mood || null,
      yesterday_context: [], // No memories during conversation
    };

    // Move theme from unexplored to explored if detected
    if (extraction.touched_theme) {
      if (!state.explored_themes.includes(extraction.touched_theme)) {
        updates.explored_themes = [...state.explored_themes, extraction.touched_theme];
        updates.unexplored_themes = state.unexplored_themes.filter(
          t => t !== extraction.touched_theme
        );
      }
    }

    // Update Redis state
    const updatedState = await updateConversationState(sessionId, date, updates);

    // Build fresh instructions for reflecting phase (with directly searched memories)
    const freshInstructions = buildAgentInstructions(updatedState);

    return NextResponse.json({
      success: true,
      updatedState,
      instructions: freshInstructions,
      anchor: updatedState.anchor,
      tone: updatedState.tone,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Failed to process finished sharing',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
