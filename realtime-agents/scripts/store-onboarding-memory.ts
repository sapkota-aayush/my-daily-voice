/**
 * Script to directly store onboarding conversation to mem0
 * Run with: npx tsx scripts/store-onboarding-memory.ts
 */

import MemoryClient from 'mem0ai';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env.local') });

const MEM0_API_KEY = process.env.MEM0_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!MEM0_API_KEY) {
  throw new Error('MEM0_API_KEY is not set in .env.local');
}

if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set in .env.local');
}

// The onboarding conversation transcript
const transcript = [
  { role: 'user', content: 'Hello.' },
  { role: 'assistant', content: "Hi! I'm here to help you reflect and grow. Before we start journaling, I'd love to get to know you a bit. Is that okay?" },
  { role: 'user', content: 'All right.' },
  { role: 'assistant', content: "Great! So, to start off, what's your name, or what should I call you?" },
  { role: 'user', content: 'My name is Ayush, you can call me AU.' },
  { role: 'assistant', content: 'Nice to meet you, Ayush! When do you usually prefer to reflect—morning, afternoon, night, or just whenever it strikes you?' },
  { role: 'user', content: 'I usually before I go to bed.' },
  { role: 'assistant', content: 'Got it, so nighttime reflection works best for you. When you feel stressed or stuck, what usually causes it the most—people, work, health, money, time, or maybe something else?' },
  { role: 'user', content: 'So the main cause for my frustration is, suppose if I say something I\'ll do and for some reason if I couldn\'t able to do that, then it really frustrates me.' },
  { role: 'assistant', content: 'I hear you. It sounds like not following through on your own expectations really gets to you. So, what are the two or three life areas that matter most to you right now? Like career, relationships, health, or anything else you\'re focusing on.' },
  { role: 'user', content: 'Career matters most to me right now. I\'m really focused on building myself, my skills, my personality, my communication, so it\'s my top priority.' },
  { role: 'assistant', content: 'That\'s a solid focus. So, in terms of career and personal growth, what kind of person are you trying to become?' },
  { role: 'user', content: 'My dream is to become an entrepreneur, building things for people. But right now I am trying to become a good communicator, I am building things, I am trying to learn how to sell things to the people. Side by side, I am kind of making content a little bit. But yeah, I started pretty late. I wouldn\'t say late, but you know, it\'s a new country for me, Canada is a new country for me, so I\'m adjusting myself, building myself from scratch.' },
  { role: 'assistant', content: 'That\'s really inspiring, Ayush. You\'re on a journey of building yourself step by step. So, with all of that going on, what\'s one thing you\'d love to have more of in your life right now?' },
  { role: 'user', content: 'Focus is one thing I want in my life more than anything else.' },
  { role: 'assistant', content: 'Focus is key, especially when you\'re juggling so much. On the flip side, what\'s one thing you\'d like to have less of in your life right now?' },
  { role: 'user', content: 'Hier ist die distraction.' },
  { role: 'assistant', content: 'That makes perfect sense, especially when you\'re aiming for more focus. So, would you say a recurring challenge you keep bumping into lately is staying on track with your goals despite distractions?' },
  { role: 'user', content: 'Yeah, lately I\'m having a hard time concentrating on the things because there are so many external things, you know, life problems, social medias, and I\'m trying to control my lust, I\'m trying to control myself. You know, basically I\'m trying to lead myself and in future if I want to become a leader, I have to learn how to lead myself first.' },
  { role: 'assistant', content: 'That\'s a powerful insight—leading yourself first. So, when you do have a good day, what usually makes it a good day for you?' },
  { role: 'user', content: 'Whenever I do the things I say and I don\'t get distracted, I feel good.' },
  { role: 'assistant', content: 'That sense of accomplishment is such a great feeling. On the other hand, when you have a bad day, what tends to make it feel like a bad day for you?' },
  { role: 'user', content: 'When I am procrastinating, like by myself, by looking at phones, and when I don\'t go to the gym, right now I am kind of procrastinating with exercise as well. I am a person who is very active with gym fitness and stuff. But right now due to studies and all the career things, I am kind of procrastinating it.' },
  { role: 'user', content: 'So basically not doing the things I\'m supposed to do.' },
  { role: 'user', content: 'Because of my own reasons, because of the things I can\'t control, like during those days I feel bad.' },
  { role: 'assistant', content: 'That makes a lot of sense—it\'s tough when you feel like you\'re not in control of your own routine. So, what\'s one habit or behavior you\'re trying to change or build right now?' },
  { role: 'user', content: 'That of staying focused no matter what is happening in my life, that is one thing I am trying to build. And once I achieve that, there are a few goals I want to achieve which is, you know, as usual, my public speaking thing. And third of sales, I want to sell my product. I want to persuade people. These are the few things which I want to achieve in near future. I mean, it\'s a long term process, I know, but, you know, these are my major goals.' },
  { role: 'assistant', content: 'Absolutely, those are big goals, and staying focused is like the foundation for all of them. What would you say is the biggest obstacle that usually gets in the way of that focus?' },
  { role: 'user', content: 'First thing social media, second thing last porn' },
  { role: 'assistant', content: 'Thanks for sharing that. It\'s really common for those things to trip people up, especially when they\'re trying to stay focused. If those obstacles pop up again, do you have a simple \'if-then\' plan you\'d like to try? Like, if you catch yourself scrolling, then you\'ll do something different?' },
  { role: 'user', content: 'Sometimes I kind of get aware of that and try to stop myself, rather than that it\'s just kind of heat, you know. You don\'t think, you just feel like let\'s do this, let\'s do this. And like the dopamine rush is greater than the motivation you get for self-reflection at that particular moment.' },
  { role: 'assistant', content: 'Yeah, that immediate dopamine rush can be tough to override in the moment. It\'s a real challenge. So, when you\'re under pressure, what kinds of thoughts tend to show up for you? Like, do you notice self-doubt, perfectionism, or something else?' },
  { role: 'user', content: 'Yeah, I mean self-doubt, these are the things which are kind of humanly, but I try to generally stay calm during the pressure situation, difficult times in my life, and always try to self-reflect.' },
  { role: 'user', content: 'is the best thing. And my word search reflect is talking to myself.' },
  { role: 'assistant', content: 'That\'s a great way to handle pressure—staying calm and checking in with yourself. When you\'re feeling overwhelmed, besides talking to yourself, is there anything else that helps you reset? Like a walk, music, or something similar?' },
  { role: 'user', content: 'Talking to myself solves half of the problem.' },
  { role: 'user', content: 'There\'s not like a specific things I do. Generally I go for a run and it gives me a peace but right now it\'s winter so I cannot go for a run.' },
  { role: 'user', content: 'I just generally like to sit and listen to music.' },
  { role: 'assistant', content: 'That sounds like a good way to recharge, especially in the winter. Shifting gears a bit—who or what do you feel most responsible for right now? Like family, work, or other goals?' },
  { role: 'user', content: 'I mean I have the family\'s responsibilities, but for now my top priority is building myself and unlocking my potentials. Do hard work, stay focused, stay away from girls, main thing and you know I have limited time so try to get as much as I can get from myself.' },
  { role: 'assistant', content: 'That\'s a very focused mindset, really investing in your growth and potential. With that in mind, what should I never do in our conversations? For example, don\'t push, or don\'t give advice—anything like that?' },
  { role: 'user', content: 'Yes, I don\'t like giving someone advice but you can just give me some random things which I repeat during our conversation. But you know, just kind of remind me. I don\'t like over advice. So, yeah, just do like normal conversation. Not like someone motivator or some gurus.' },
  { role: 'assistant', content: 'Got it—no heavy advice or motivational speeches, just a natural chat with gentle reminders. That makes sense. Would you prefer I ask fewer questions and give more space, or gently guide with follow-ups when we talk?' },
  { role: 'user', content: 'Yeah, I like to have more space.' },
  { role: 'user', content: 'Giving me space while, you know, trying to force me and asking the questions' },
  { role: 'user', content: 'on that I can deeply answer, and that is close to me.' },
  { role: 'assistant', content: 'That sounds like a good balance—we\'ll keep it natural and give you space to go deep when you want. How long do you usually want each session to be—short, like 2 to 5 minutes, or longer, maybe 5 to 15 minutes?' },
  { role: 'user', content: 'It depends on day' },
  { role: 'assistant', content: 'Totally understood—it\'ll depend on how you\'re feeling each day. Last question for now: what would make you say this app is worth coming back to tomorrow?' },
  { role: 'user', content: 'It looks kind of cool and in long term it really helps me reflect my behavior, reflect my thoughts, my mindset and I\'m becoming here for like whole life.' },
  { role: 'assistant', content: 'That\'s awesome to hear. I\'m here to help you reflect and keep growing. I\'ve learned a lot about you already. Let\'s start your first journal entry whenever you\'re ready!' },
  { role: 'user', content: 'Okay, for now, it\'s good.' },
  { role: 'assistant', content: 'Sounds good! Take care, Ayush, and we\'ll chat again soon. Bye for now!' },
];

const MEMORY_TAGS = [
  'emotion',
  'focus',
  'work',
  'goals',
  'actions',
  'habits',
  'challenges',
  'mindset',
  'relationships',
  'wins',
  'reflection',
  'health',
] as const;

async function extractMemoriesFromTranscript(transcript: any[]) {
  const transcriptText = transcript
    .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
    .join('\n');

  const prompt = `You are analyzing an onboarding conversation transcript. Extract structured memories that capture key information about the user.

Extract memories that fit into these categories: ${MEMORY_TAGS.join(', ')}

For each memory, provide:
- content: A concise statement about what was learned (1-2 sentences)
- tags: Array of relevant tags from the list above
- confidence: A number between 0 and 1 indicating how confident you are in this memory

Return a JSON object with a "memories" array. Example format:
{
  "memories": [
    {
      "content": "User works as a software engineer and values work-life balance",
      "tags": ["work", "focus"],
      "confidence": 0.9
    },
    {
      "content": "User struggles with morning routines and wants to build better habits",
      "tags": ["habits", "challenges", "actions"],
      "confidence": 0.85
    }
  ]
}

Transcript:
${transcriptText}

Extract memories:`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a memory extraction agent. Extract structured memories from conversations.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  let extracted;
  
  try {
    const content = data.choices[0].message.content;
    extracted = JSON.parse(content);
  } catch (e) {
    const content = data.choices[0].message.content;
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      extracted = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('Failed to parse extracted memories');
    }
  }

  const memories = Array.isArray(extracted) ? extracted : (extracted.memories || []);

  return memories.map((m: any) => ({
    content: m.content,
    tags: Array.isArray(m.tags) ? m.tags.filter((tag: string) => MEMORY_TAGS.includes(tag as any)) : [],
    confidence: m.confidence || 0.5,
  }));
}

async function main() {
  console.log('🚀 Starting memory extraction and storage...\n');

  try {
    // Initialize mem0 client
    console.log('📦 Initializing mem0 client...');
    const mem0 = new MemoryClient({ apiKey: MEM0_API_KEY });
    const userId = 'default-user';

    // Extract memories
    console.log('🧠 Extracting memories from transcript...');
    const extractedMemories = await extractMemoriesFromTranscript(transcript);
    console.log(`✅ Extracted ${extractedMemories.length} memories\n`);

    // Store memories
    console.log('💾 Storing memories in mem0...\n');
    const storedMemories = [];
    
    for (let i = 0; i < extractedMemories.length; i++) {
      const memory = extractedMemories[i];
      try {
        console.log(`[${i + 1}/${extractedMemories.length}] Storing: ${memory.content.substring(0, 60)}...`);
        const result = await mem0.add(
          [
            {
              role: 'user' as const,
              content: memory.content,
            },
          ],
          {
            user_id: userId,
            metadata: {
              source: 'onboarding',
              confidence: memory.confidence,
              tags: memory.tags,
            },
          }
        );
        storedMemories.push(result);
        console.log(`   ✅ Stored successfully\n`);
      } catch (error: any) {
        console.error(`   ❌ Failed: ${error.message}\n`);
      }
    }

    console.log('\n✨ Done!');
    console.log(`📊 Summary:`);
    console.log(`   - Memories extracted: ${extractedMemories.length}`);
    console.log(`   - Memories stored: ${storedMemories.length}`);
    console.log(`   - User ID: ${userId}`);
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
