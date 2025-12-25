import { NextRequest, NextResponse } from 'next/server';
import { getExperienceMemories, getRedisClient } from '@/app/lib/redis';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const userId = searchParams.get('userId') || 'default-user';
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    
    
    // Get raw data from Redis to see what it returns
    const redis = getRedisClient();
    const key = `memory:experiences:${userId}:${date}`;
    
    const rawData = await redis.get(key);
    
    // Also use our function
    const experienceMemories = await getExperienceMemories(userId, date);
    
    return NextResponse.json({
      key,
      userId,
      date,
      rawData: rawData,
      rawDataType: typeof rawData,
      rawDataIsArray: Array.isArray(rawData),
      rawDataString: typeof rawData === 'string' ? rawData : JSON.stringify(rawData),
      rawDataSample: rawData ? (typeof rawData === 'string' ? rawData.substring(0, 200) : JSON.stringify(rawData).substring(0, 200)) : null,
      experienceMemories: experienceMemories,
      experienceMemoriesLength: experienceMemories?.length || 0,
      parsedSuccessfully: experienceMemories !== null,
      memoryTitles: experienceMemories?.map(m => m.title) || [],
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}

