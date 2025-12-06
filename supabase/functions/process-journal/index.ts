import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, transcription, tasks } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    let systemPrompt = '';
    let userPrompt = '';

    if (type === 'morning') {
      systemPrompt = `You are an AI assistant that helps extract tasks from a user's morning plan.
Extract actionable tasks from the user's speech and return them as a JSON array of task names.
Keep task names concise (under 50 characters each).
Return ONLY valid JSON in this format: {"tasks": ["task 1", "task 2", "task 3"]}`;
      userPrompt = `Extract tasks from this morning plan: "${transcription}"`;
    } else if (type === 'evening') {
      systemPrompt = `You are an empathetic AI assistant that helps process evening check-ins.
Analyze the user's evening reflection and determine:
1. Which tasks were completed (match against provided task list)
2. Which tasks were missed
3. The user's mood (one word: calm, energized, focused, grateful, tired, hopeful, productive, stressed, content)
4. A brief reflection summary (1-2 sentences, warm and supportive)

Return ONLY valid JSON in this format:
{
  "completedTasks": ["task name 1", "task name 2"],
  "missedTasks": ["task name 3"],
  "mood": "focused",
  "reflectionSummary": "A supportive 1-2 sentence reflection."
}`;
      const taskNames = tasks?.map((t: { name: string }) => t.name).join(', ') || 'no tasks recorded';
      userPrompt = `Today's tasks were: ${taskNames}

User's evening check-in: "${transcription}"

Analyze which tasks were completed or missed based on what the user said.`;
    } else {
      throw new Error('Invalid type. Use "morning" or "evening"');
    }

    console.log(`Processing ${type} entry...`);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    console.log('AI response:', content);

    // Parse the JSON from AI response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse AI response');
    }
    
    const result = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in process-journal:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
