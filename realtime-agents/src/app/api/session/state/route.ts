import { NextResponse } from 'next/server';
import {
  getConversationState,
  setConversationState,
  createInitialState,
} from '@/app/lib/redis';
import { getSessionContext, setSessionContext } from '@/app/lib/redis';
import { getMem0Client } from '@/app/lib/mem0';

// GET: Retrieve conversation state
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const date = searchParams.get('date');

    if (!sessionId || !date) {
      return NextResponse.json(
        { error: 'sessionId and date parameters are required' },
        { status: 400 }
      );
    }

    const state = await getConversationState(sessionId, date);

    if (!state) {
      return NextResponse.json({
        success: false,
        message: 'No conversation state found',
      });
    }

    return NextResponse.json({
      success: true,
      state,
    });
  } catch (error: any) {
    console.error('Error fetching conversation state:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch conversation state',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// POST: Initialize conversation state
export async function POST(request: Request) {
  try {
    const { sessionId, date, yesterdayContext } = await request.json();

    if (!sessionId || !date) {
      return NextResponse.json(
        { error: 'sessionId and date are required' },
        { status: 400 }
      );
    }

    // Check if state already exists
    const existing = await getConversationState(sessionId, date);
    if (existing) {
      return NextResponse.json({
        success: true,
        state: existing,
        message: 'State already exists',
      });
    }

    // NO memory loading at start - will search mem0 directly after first response
    const providedContext = Array.isArray(yesterdayContext) ? yesterdayContext : [];
    
    // Create initial state (empty memories - will be populated after first response)
    const initialState = createInitialState(sessionId, date, providedContext);

    // Save to Redis
    await setConversationState(sessionId, date, initialState);

    return NextResponse.json({
      success: true,
      state: initialState,
      message: 'Conversation state initialized',
    });
  } catch (error: any) {
    console.error('Error initializing conversation state:', error);
    return NextResponse.json(
      {
        error: 'Failed to initialize conversation state',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// PATCH: Update conversation state
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, date, updates } = body;

    // Validate all required fields
    if (!sessionId || typeof sessionId !== 'string' || sessionId.trim() === '') {
      return NextResponse.json(
        { error: 'sessionId is required and must be a non-empty string', received: sessionId },
        { status: 400 }
      );
    }

    if (!date || typeof date !== 'string' || date.trim() === '') {
      return NextResponse.json(
        { error: 'date is required and must be a non-empty string', received: date },
        { status: 400 }
      );
    }

    if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'updates is required and must be a non-empty object', received: updates },
        { status: 400 }
      );
    }

    // Check if state exists before updating
    const { getConversationState, updateConversationState } = await import('@/app/lib/redis');
    const existingState = await getConversationState(sessionId, date);
    
    if (!existingState) {
      return NextResponse.json(
        { error: 'Conversation state not found. Initialize state first.' },
        { status: 404 }
      );
    }

    const updated = await updateConversationState(sessionId, date, updates);

    return NextResponse.json({
      success: true,
      state: updated,
    });
  } catch (error: any) {
    console.error('Error updating conversation state:', error);
    return NextResponse.json(
      {
        error: 'Failed to update conversation state',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
