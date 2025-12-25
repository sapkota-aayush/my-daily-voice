# My Daily Voice

A peaceful, voice-first journaling companion built with OpenAI Realtime API.

## About

This is a minimal journaling app where you simply speak, and the AI guides you through a structured reflection on your day. No chat boxes, no clutter - just a calm voice companion and a peaceful writing space.

## Features

- **Voice-first journaling**: Speak naturally with an AI companion
- **Structured reflection**: Guided through 4-5 thoughtful questions
- **Calendar view**: See your journal entries at a glance
- **Auto-save**: Your words are automatically saved to your journal
- **Peaceful design**: Warm, minimal UI focused on reflection

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env.local` file:
   ```env
   OPENAI_API_KEY=your-openai-api-key
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

3. Start the dev server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000)

## Tech Stack

- **Next.js 15** - React framework
- **OpenAI Realtime API** - Voice agent with `gpt-4o-realtime`
- **OpenAI Agents SDK** - Agent management
- **Supabase** - Database and storage
- **Tailwind CSS** - Styling

## Project Structure

```
src/app/
├── agentConfigs/
│   └── journalAgent.ts    # Journal companion agent
├── components/
│   ├── Calendar.tsx       # Calendar view
│   └── VoiceOrb.tsx       # Voice button
├── day/[date]/
│   └── page.tsx           # Daily journal page
└── page.tsx               # Home (calendar)
```

## How It Works

1. **Calendar Home**: Tap any date to view or create an entry
2. **Voice Reflection**: Tap the voice orb to start a conversation
3. **Guided Questions**: The AI asks 4-5 questions about your day
4. **Auto-Save**: Your responses are saved to your journal automatically

## License

MIT
