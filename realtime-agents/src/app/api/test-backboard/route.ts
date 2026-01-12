/**
 * Test Backboard AI Integration
 * 
 * Simple test endpoint to verify Backboard API works
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAIClient } from '@/app/lib/backboardClient';

export async function GET(request: NextRequest) {
  try {
    const backboardApiKey = process.env.BACKBOARD_API_KEY;
    
    if (!backboardApiKey) {
      return NextResponse.json(
        { error: 'BACKBOARD_API_KEY not set' },
        { status: 500 }
      );
    }

    // Test using our wrapper
    const client = await getAIClient('test-user', new Date().toISOString().split('T')[0]);
    
    // Test a simple chat completion using OpenAI-compatible interface
    // Test both gpt-4o and gpt-4o-mini to see which works
    const testResponse = await client.chat.completions.create({
      model: 'gpt-4o-mini', // Testing if gpt-4o-mini also works
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant.',
        },
        {
          role: 'user',
          content: 'Say "Hello from Backboard!" in one sentence.',
        },
      ],
      temperature: 0.7,
      max_tokens: 50,
    });

    return NextResponse.json({
      success: true,
      response: testResponse,
      message: 'Backboard AI test successful!',
      responseText: testResponse.choices[0]?.message?.content,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Backboard test failed',
        details: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}


