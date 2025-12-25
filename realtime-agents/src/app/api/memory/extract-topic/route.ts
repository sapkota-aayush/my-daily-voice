import { NextRequest, NextResponse } from 'next/server';

// Lazy initialization - only create client when needed (not during build)
async function getOpenAIClient() {
  const { default: OpenAI } = await import('openai');
  const apiKey = process.env.OPENAI_API_KEY || 'dummy-key-for-build';
  // During build, Next.js might analyze this, so we provide a dummy key
  // At runtime, this will fail gracefully if the real key is missing
  return new OpenAI({
    apiKey: apiKey,
  });
}

/**
 * Extract the single primary topic from a user message
 * Uses gpt-4o-mini for fast, focused topic extraction
 */
export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();
    
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'message is required and must be a string' },
        { status: 400 }
      );
    }

    const openai = await getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Extract the main topic from the user message. Return only 1-3 words.`,
        },
        {
          role: 'user',
          content: message,
        },
      ],
      max_tokens: 10,
      temperature: 0.3,
    });
    
    let topic = (response.choices[0]?.message?.content || '').trim().toLowerCase();
    
    // Filter out weird/meaningless topics
    const invalidTopics = ['incoherence', 'unclear', 'unknown', 'error', 'none', 'n/a', 'na'];
    if (invalidTopics.includes(topic) || topic.length > 20) {
      // If topic is invalid, try to extract from message directly
      const words = message.toLowerCase().split(/\s+/).filter(w => w.length > 3).slice(0, 3);
      topic = words.join(' ') || 'general';
      console.log('[Topic Extraction] Invalid topic detected, using fallback:', topic);
    }
    
    // Normalize common filler/acknowledgment patterns
    const normalizedTopic = normalizeTopic(topic);
    
    return NextResponse.json({ topic: normalizedTopic });
  } catch (error: any) {
    console.error('Error extracting topic:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to extract topic', topic: '' },
      { status: 500 }
    );
  }
}

/**
 * Normalize topic to handle common variations
 */
function normalizeTopic(topic: string): string {
  const lower = topic.toLowerCase().trim();
  
  // Map common filler/acknowledgment patterns
  const fillerPatterns = [
    /^(yeah|yes|yep|yup|ok|okay|sure|right|correct|exactly|absolutely|definitely)$/i,
    /^(uh|um|hmm|huh|ah|oh)$/i,
    /^(thanks|thank you|thx)$/i,
    /^(hi|hello|hey|greetings)$/i,
  ];
  
  for (const pattern of fillerPatterns) {
    if (pattern.test(lower)) {
      if (pattern === fillerPatterns[0]) return 'acknowledgment';
      if (pattern === fillerPatterns[1]) return 'filler';
      if (pattern === fillerPatterns[2]) return 'gratitude';
      if (pattern === fillerPatterns[3]) return 'greeting';
    }
  }
  
  return lower;
}

