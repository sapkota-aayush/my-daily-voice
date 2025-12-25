import { Redis } from '@upstash/redis';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const url = process.env.UPSTASH_REDIS_URL;
const token = process.env.UPSTASH_REDIS_TOKEN;

if (!url || !token) {
  console.error('UPSTASH_REDIS_URL and UPSTASH_REDIS_TOKEN must be set in .env.local');
  process.exit(1);
}

const redis = new Redis({
  url,
  token,
});

async function clearRedis() {
  try {
    const userId = 'default-user';
    const date = new Date().toISOString().split('T')[0];
    
    console.log(`Clearing Redis for userId: ${userId}, date: ${date}`);
    
    // Clear chat-test conversation
    const chatTestKey = `chat-test:conversation:${userId}:${date}`;
    await redis.del(chatTestKey);
    console.log(`✓ Cleared: ${chatTestKey}`);
    
    // Clear session memories
    const sessionMemoriesKey = `session:memories:${userId}:${date}`;
    await redis.del(sessionMemoriesKey);
    console.log(`✓ Cleared: ${sessionMemoriesKey}`);
    
    // Clear session context
    const sessionContextKey = `session:${date}:context`;
    await redis.del(sessionContextKey);
    console.log(`✓ Cleared: ${sessionContextKey}`);
    
    // Clear conversation states (scan for all matching keys)
    const conversationPattern = `conversation:${date}:*`;
    let cursor = 0;
    let deletedCount = 0;
    const keys: string[] = [];
    
    do {
      const result = await redis.scan(cursor, { match: conversationPattern, count: 100 });
      cursor = typeof result[0] === 'string' ? parseInt(result[0], 10) : (result[0] as number);
      keys.push(...(result[1] || []));
    } while (cursor !== 0);
    
    if (keys.length > 0) {
      await redis.del(...keys);
      deletedCount = keys.length;
      console.log(`✓ Cleared ${deletedCount} conversation state keys`);
    } else {
      console.log(`✓ No conversation state keys found`);
    }
    
    console.log('\n✅ Redis cleared successfully!');
  } catch (error: any) {
    console.error('❌ Error clearing Redis:', error);
    process.exit(1);
  }
}

clearRedis();

