/**
 * Simple in-memory cache for memory search results
 * Cache key: userId + topic
 * TTL: 5 minutes
 */

interface CacheEntry {
  data: any[];
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

export function getCachedMemories(userId: string, topic: string): any[] | null {
  const key = `${userId}:${topic}`;
  const entry = cache.get(key);
  
  if (!entry) {
    return null;
  }
  
  // Check if cache entry is expired
  const now = Date.now();
  if (now - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  
  return entry.data;
}

export function setCachedMemories(userId: string, topic: string, data: any[]): void {
  const key = `${userId}:${topic}`;
  cache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

export function clearCache(): void {
  cache.clear();
}

export function clearCacheForUser(userId: string): void {
  const keysToDelete: string[] = [];
  for (const key of cache.keys()) {
    if (key.startsWith(`${userId}:`)) {
      keysToDelete.push(key);
    }
  }
  keysToDelete.forEach(key => cache.delete(key));
}

