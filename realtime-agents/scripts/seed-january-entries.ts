/**
 * Seed January 2025 entries with fake data for demo purposes
 * Run with: npx tsx scripts/seed-january-entries.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Fake conversation transcripts for different days
const fakeConversations: Record<string, Array<{ role: 'user' | 'assistant'; content: string; timestamp?: number }>> = {
  '2025-01-01': [
    {
      role: 'assistant',
      content: "Hello! How's your mood today? Tell me everything that happened during the day.",
    },
    {
      role: 'user',
      content: "Hey! I'm feeling pretty good actually. Started the new year with a morning run, which was refreshing. Then I spent most of the day working on my hackathon project. It's exciting to see it come together. I also had lunch with some friends and we talked about our goals for the year.",
    },
    {
      role: 'assistant',
      content: "That sounds like a really productive start to the year! A morning run followed by focused work on something meaningful—I can see why you're feeling good. What aspect of your hackathon project are you most excited about?",
    },
    {
      role: 'user',
      content: "I'm really excited about integrating AI into our project. It's going to make it so much more interactive and helpful for users. We're using Backboard AI which should handle memory and orchestration really well.",
    },
    {
      role: 'assistant',
      content: "That's fascinating! AI integration, especially with memory capabilities, can really transform user experiences. It sounds like you're building something that will actually remember and learn from interactions. What challenges are you anticipating with the integration?",
    },
    {
      role: 'user',
      content: "The main challenge is making sure the memory system works smoothly. We want it to feel natural, not robotic. Also, we need to make sure the responses are conversational and helpful.",
    },
    {
      role: 'assistant',
      content: "Those are really thoughtful considerations. The balance between natural conversation and effective memory recall is definitely key. It sounds like you're thinking deeply about the user experience. How do you plan to test it?",
    },
    {
      role: 'user',
      content: "We'll probably do some internal testing first, then maybe show it to a few friends to get feedback. The hackathon demo will be the real test though!",
    },
  ],
  '2025-01-05': [
    {
      role: 'assistant',
      content: "Hello! How's your mood today? Tell me everything that happened during the day.",
    },
    {
      role: 'user',
      content: "I'm feeling a bit tired today. Had an early morning meeting at 7am which threw off my routine. But the meeting went well—we finalized our hackathon project timeline. After that, I caught up on some coding work. The afternoon was slower, had some coffee and just relaxed. Not the most productive day but I'm okay with that.",
    },
    {
      role: 'assistant',
      content: "Early mornings can definitely be challenging, especially when they disrupt your usual rhythm. It's good that your meeting was productive though—finalizing the timeline must feel like solid progress. What's making you feel tired specifically?",
    },
    {
      role: 'user',
      content: "I think it's just the lack of sleep from staying up late working on the project. I get really excited about coding and lose track of time. Need to work on better sleep habits.",
    },
    {
      role: 'assistant',
      content: "That excitement for coding is great, but sleep is so important for both productivity and well-being. Have you noticed how your work quality changes when you're well-rested versus when you're tired?",
    },
    {
      role: 'user',
      content: "Oh definitely. When I'm well-rested, I write much better code and make fewer mistakes. When I'm tired, I tend to overthink things and take longer to solve problems. It's frustrating because I know I should sleep more but I just get caught up in the work.",
    },
  ],
  '2025-01-08': [
    {
      role: 'assistant',
      content: "Hello! How's your mood today? Tell me everything that happened during the day.",
    },
    {
      role: 'user',
      content: "Today was really good! I finally got the Backboard AI integration working properly. There was a bug where it wasn't extracting responses correctly, but I figured it out. It feels great to solve that problem. I also went to the gym, did some meal prep for the week, and had a video call with my project partner.",
    },
    {
      role: 'assistant',
      content: "That sounds like a really fulfilling day! Solving technical challenges, especially integration issues, can be so satisfying when everything clicks. What was the breakthrough moment when you realized what was wrong?",
    },
    {
      role: 'user',
      content: "I was looking at the API response structure and realized Backboard returns data differently than OpenAI. Once I understood the response format, it was actually pretty straightforward to fix. I just needed to parse it correctly.",
    },
    {
      role: 'assistant',
      content: "That's a great example of how understanding the actual API response structure is crucial. It's easy to assume it works one way when it actually works differently. How are you feeling about the project overall now?",
    },
    {
      role: 'user',
      content: "I'm feeling really confident! We're on track for the hackathon and everything is coming together. The AI integration was the last big piece, so now we can focus on polishing and preparing for the demo.",
    },
  ],
  '2025-01-12': [
    {
      role: 'assistant',
      content: "Hello! How's your mood today? Tell me everything that happened during the day.",
    },
    {
      role: 'user',
      content: "I'm feeling a bit stressed today. The hackathon is getting closer and there's still a lot to do. I spent the whole day working on the demo presentation, trying to make sure everything works smoothly. Also had to fix a bug with Redis data not clearing properly. It's been a long day of debugging.",
    },
    {
      role: 'assistant',
      content: "It sounds like you've been pushing hard to get everything ready. The stress of deadlines, especially for something important like a hackathon, can be really intense. What's the main thing that's worrying you about the demo?",
    },
    {
      role: 'user',
      content: "I'm worried that something will break during the live demo. Like, what if the API doesn't respond fast enough? Or what if there's a bug we haven't found yet? I want everything to be perfect.",
    },
    {
      role: 'assistant',
      content: "That desire for perfection makes sense, especially when you're showcasing your work. But remember, demos don't need to be flawless—they just need to show the potential and your passion for the project. What's one thing you're most proud of in what you've built?",
    },
    {
      role: 'user',
      content: "I'm really proud of how we integrated Backboard AI. It wasn't easy, but now the system has persistent memory and better orchestration. That's going to make the user experience so much better.",
    },
  ],
  '2025-01-15': [
    {
      role: 'assistant',
      content: "Hello! How's your mood today? Tell me everything that happened during the day.",
    },
    {
      role: 'user',
      content: "Feeling optimistic today! Did a practice run of our hackathon demo this morning and it went really well. Everything worked as expected. After that, I took a break and went for a walk. The weather was nice. In the afternoon, I did some final testing and documentation. Feeling much more prepared now.",
    },
    {
      role: 'assistant',
      content: "That's wonderful! Practice runs can really build confidence. It sounds like you've put a lot of thought and effort into preparing. How did it feel to see everything working together smoothly?",
    },
    {
      role: 'user',
      content: "It felt amazing! Seeing all the pieces working together—the voice interface, the memory system, the AI responses—it really clicked. This is what we've been building towards, and it actually works!",
    },
    {
      role: 'assistant',
      content: "That moment when everything comes together must be incredibly rewarding. All that debugging, integration work, and problem-solving has led to something functional and meaningful. What are you most excited to show during the actual demo?",
    },
    {
      role: 'user',
      content: "I'm excited to show how the memory system works. Like, when you talk about something one day, and then the next day the AI remembers it. That's going to be really cool to demonstrate. Also showing both voice and text chat modes.",
    },
  ],
  '2025-01-18': [
    {
      role: 'assistant',
      content: "Hello! How's your mood today? Tell me everything that happened during the day.",
    },
    {
      role: 'user',
      content: "I'm feeling great! The hackathon was today and we did really well. Our demo went smoothly, the judges seemed impressed with the AI integration. We didn't win first place but we got great feedback. The best part was seeing people actually use the app and enjoy it. After the hackathon, we went out to celebrate with the team.",
    },
    {
      role: 'assistant',
      content: "That sounds like such a rewarding experience! Completing a hackathon project and seeing people use it must feel amazing. The fact that people enjoyed using it is huge—that's validation that you built something valuable. What feedback stood out to you?",
    },
    {
      role: 'user',
      content: "People really liked the voice interface. They said it felt natural and conversational. The memory feature also got a lot of attention—judges were asking about how we implemented it with Backboard AI. It was cool to explain the technical details.",
    },
    {
      role: 'assistant',
      content: "That's fantastic feedback! When people notice and appreciate the natural conversation flow, it means you nailed the user experience. The technical questions from judges show they recognized the sophistication of what you built. How are you feeling about the project now?",
    },
    {
      role: 'user',
      content: "I'm feeling really proud. We built something that works, that people enjoyed, and that solves a real problem. Even though we didn't win, I'm happy with what we created. And now I'm thinking about what we could do next—maybe improve it, or work on new features.",
    },
  ],
  '2025-01-22': [
    {
      role: 'assistant',
      content: "Hello! How's your mood today? Tell me everything that happened during the day.",
    },
    {
      role: 'user',
      content: "Feeling reflective today. Post-hackathon, I've been thinking about what I learned and what I want to do differently. Had a slow morning, just journaling and planning. In the afternoon, I cleaned up the codebase, removed some debug logs, organized everything. It's nice to have a clean, production-ready version of the project.",
    },
    {
      role: 'assistant',
      content: "Taking time to reflect after an intense period is really valuable. Cleaning up and organizing can also be quite satisfying—it's like putting everything in its proper place. What did you learn from the hackathon experience?",
    },
    {
      role: 'user',
      content: "I learned that preparation really matters. All those hours of testing and debugging paid off during the demo. I also learned that sometimes good enough is actually good enough—we didn't need everything to be perfect. And I learned how to explain technical concepts to non-technical people, which was important during the presentation.",
    },
    {
      role: 'assistant',
      content: "Those are really insightful takeaways. The ability to explain technical concepts clearly is such a valuable skill. And the balance between perfectionism and pragmatism is something many developers struggle with. What's next for you and this project?",
    },
    {
      role: 'user',
      content: "I'm thinking about continuing to work on it. Maybe add more features, improve the UI, make it more polished. I also want to actually use it for my own journaling. That would be the real test—using it every day and seeing if it's actually helpful.",
    },
  ],
  '2025-01-25': [
    {
      role: 'assistant',
      content: "Hello! How's your mood today? Tell me everything that happened during the day.",
    },
    {
      role: 'user',
      content: "Feeling good! I've been using the journaling app for the past few days and it's actually really nice. I like having the conversation with the AI, it helps me reflect on my day in a different way. Today I talked about my morning routine and how I want to improve it. The AI asked some good questions that made me think deeper about it.",
    },
    {
      role: 'assistant',
      content: "That's wonderful that you're actually using it for yourself! Using your own product is the best way to understand what works and what doesn't. How is your morning routine going currently?",
    },
    {
      role: 'user',
      content: "It's inconsistent. Some days I wake up early and get a lot done, other days I sleep in and feel rushed. I want to be more consistent, but it's hard when some days I stay up late working.",
    },
    {
      role: 'assistant',
      content: "Consistency is challenging, especially when work and sleep schedules fluctuate. What would an ideal morning routine look like for you?",
    },
    {
      role: 'user',
      content: "I'd like to wake up at 6:30am, do some stretching or light exercise, have a good breakfast, and then start work by 8am. But right now I'm usually waking up at 7:30 or 8, which means I'm rushing to start work.",
    },
    {
      role: 'assistant',
      content: "That ideal routine sounds really balanced—exercise, nutrition, and a clear work start time. What's the biggest barrier to achieving that 6:30 wake-up time?",
    },
    {
      role: 'user',
      content: "Probably going to bed earlier. I usually stay up until midnight or later working or just browsing. I need to be more disciplined about shutting down by 11pm.",
    },
  ],
  '2025-01-28': [
    {
      role: 'assistant',
      content: "Hello! How's your mood today? Tell me everything that happened during the day.",
    },
    {
      role: 'user',
      content: "Feeling productive! I've been better about my sleep schedule this week—going to bed by 11pm most nights. And I've been waking up earlier, around 6:45am, which is closer to my goal. Did my morning routine, went to the gym, had a good breakfast. Then spent the day coding some new features for the journal app. It's nice to work on something when you're well-rested.",
    },
    {
      role: 'assistant',
      content: "That's great progress on your sleep schedule! It sounds like you're experiencing firsthand how better rest impacts your work quality. What new features are you working on?",
    },
    {
      role: 'user',
      content: "I'm adding a calendar view so people can see all their journal entries. And I'm working on better search functionality so you can find entries about specific topics. Just small improvements that make the app more useful.",
    },
    {
      role: 'assistant',
      content: "Those sound like really practical features that would enhance the daily experience. A calendar view especially seems useful for seeing patterns over time. How is the search functionality coming along?",
    },
    {
      role: 'user',
      content: "It's going well. I'm using the memory system we built—since we're already storing structured memories, we can search through those. It's actually easier than I thought because we have all that data already. The calendar view is also straightforward, just querying entries by date.",
    },
    {
      role: 'assistant',
      content: "Leveraging the existing memory system for search is smart—you're building on infrastructure you already have. It's great when previous design decisions make future features easier to implement. How long do you think these features will take?",
    },
    {
      role: 'user',
      content: "Probably another week or two. I want to make sure they work well and look good. No rush, just working on it in my free time.",
    },
  ],
};

// Reflection summaries for each entry
const reflectionSummaries: Record<string, string> = {
  '2025-01-01': 'Started the new year with energy and focus. Morning run set a positive tone, followed by productive work on hackathon project. Excited about AI integration possibilities.',
  '2025-01-05': 'Tired but satisfied. Early meeting disrupted routine but was productive. Realized need for better sleep habits when staying up late coding. Important balance between passion and rest.',
  '2025-01-08': 'Breakthrough day! Solved Backboard AI integration issue. Felt accomplished solving technical challenge. Good mix of work, exercise, and social connection.',
  '2025-01-12': 'Stressed about upcoming hackathon demo. Long day of debugging and preparation. Worried about things breaking during live demo. Need to manage perfectionism.',
  '2025-01-15': 'Practice demo went well! Built confidence and reduced stress. Everything working smoothly. Feeling prepared and optimistic about hackathon.',
  '2025-01-18': 'Hackathon day! Demo successful, received great feedback. People enjoyed using the app, especially voice interface. Proud of what we built despite not winning.',
  '2025-01-22': 'Reflective post-hackathon day. Learned value of preparation and clear communication. Cleaned up codebase. Thinking about future improvements and actually using the app daily.',
  '2025-01-25': 'Using the journal app daily now. Enjoying the conversation format for reflection. Discussed morning routine inconsistency. Realized need for better sleep discipline.',
  '2025-01-28': 'Productive week! Improved sleep schedule showing results. Waking up earlier, feeling better rested. Working on new features—calendar view and search. Making steady progress.',
};

// Moods for variety
const moods = ['good', 'tired', 'excited', 'stressed', 'optimistic', 'reflective', 'proud', 'productive'];

async function seedJanuaryEntries() {
  try {
    // Get all users (for demo, we'll use the first authenticated user or create entries for default-user)
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error('Error fetching users:', usersError);
      // Continue anyway - we'll use a test user ID
    }

    // Use first user if available, otherwise we'll need to create entries differently
    const userId = users && users.length > 0 ? users[0].id : null;
    
    if (!userId) {
      console.log('No users found. You may need to create a user first or we can insert with a placeholder.');
      console.log('Creating entries anyway - they may need user_id to be set manually...');
    }

    console.log(`Seeding January entries${userId ? ` for user: ${userId.substring(0, 8)}...` : ''}...\n`);

    const dates = Object.keys(fakeConversations);
    let successCount = 0;
    let errorCount = 0;

    for (const date of dates) {
      const conversation = fakeConversations[date];
      const reflectionSummary = reflectionSummaries[date];
      const mood = moods[Math.floor(Math.random() * moods.length)];

      // Add timestamps to conversation transcript
      const transcriptWithTimestamps = conversation.map((msg, index) => ({
        role: msg.role,
        content: msg.content,
        timestamp: Date.now() - (conversation.length - index) * 60000, // 1 min apart
      }));

      const entryData: any = {
        date,
        conversation_transcript: transcriptWithTimestamps,
        reflection_summary: reflectionSummary,
        mood,
        completion_rate: Math.floor(Math.random() * 30) + 70, // 70-100%
        morning_plan_recorded: Math.random() > 0.5,
        evening_checkin_recorded: true, // Always true for demo entries
        updated_at: new Date().toISOString(),
      };

      // Only add user_id if we have one
      if (userId) {
        entryData.user_id = userId;
      }

      const { error } = await supabase
        .from('daily_reflections')
        .upsert(entryData, {
          onConflict: userId ? 'user_id,date' : 'date',
        });

      if (error) {
        console.error(`✗ Error seeding ${date}:`, error.message);
        errorCount++;
      } else {
        console.log(`✓ Seeded entry for ${date}`);
        successCount++;
      }
    }

    console.log(`\n✅ Seeding complete!`);
    console.log(`   Success: ${successCount} entries`);
    console.log(`   Errors: ${errorCount} entries`);

    if (!userId) {
      console.log(`\n⚠️  Note: Entries created without user_id. You may need to update them manually.`);
    }

  } catch (error: any) {
    console.error('Fatal error seeding entries:', error);
    process.exit(1);
  }
}

seedJanuaryEntries();

