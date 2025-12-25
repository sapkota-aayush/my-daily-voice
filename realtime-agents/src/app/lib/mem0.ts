import MemoryClient from 'mem0ai';

let mem0Client: MemoryClient | null = null;

export function getMem0Client(): MemoryClient {
  if (mem0Client) {
    return mem0Client;
  }

  const apiKey = process.env.MEM0_API_KEY;
  
  if (!apiKey) {
    throw new Error(
      'MEM0_API_KEY is not set in environment variables!\n' +
      'Please set MEM0_API_KEY in .env.local\n' +
      'Then restart your dev server: npm run dev'
    );
  }

  mem0Client = new MemoryClient({
    apiKey: apiKey,
  });

  return mem0Client;
}

// Tags for memory categorization
export const MEMORY_TAGS = [
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

export type MemoryTag = typeof MEMORY_TAGS[number];
