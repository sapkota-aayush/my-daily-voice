/**
 * Memory Service - Handles all memory operations
 * 
 * This service runs in the background and handles:
 * - Theme detection from user sharing
 * - Searching mem0 for relevant memories
 * - Updating Redis with context
 * 
 * The conversation agent just reads from Redis - it doesn't need to know about mem0
 */

import { getMem0Client } from './mem0';
import { getConversationState, updateConversationState } from './redis';
import { extractFromMessage } from './conversationExtraction';
import type { ConversationState } from '@/app/types/session';

/**
 * Search mem0 for theme-specific memories
 */
export async function searchThemeMemories(
  anchor: string,
  userId: string = 'default-user'
): Promise<string[]> {
  try {
    const mem0 = getMem0Client();
    
    // Search mem0 for memories related to the anchor theme
    const searchQuery = `memories about ${anchor}, ${anchor} challenges, ${anchor} experiences`;
    
    let searchResults: any[] = [];
    try {
      // Try search method (if available in TypeScript SDK)
      // @ts-ignore - search might not be in types yet
      if (typeof mem0.search === 'function') {
        searchResults = await mem0.search(searchQuery, {
          user_id: userId,
          limit: 5, // Get top 5 relevant memories
        });
      } else {
        throw new Error('search method not available');
      }
    } catch (searchError: any) {
      // Fallback: get all memories and filter by theme/tags
      console.warn('mem0.search() not available, using getAll() fallback:', searchError.message);
      const allMemories = await mem0.getAll({ user_id: userId });
      
      // Filter memories that might be related to the anchor theme
      const anchorLower = anchor.toLowerCase();
      const anchorWords = anchorLower.split(/\s+/); // Split into words for better matching
      
      searchResults = Array.isArray(allMemories)
        ? allMemories.filter((m: any) => {
            const content = (m.memory || m.content || '').toLowerCase();
            const tags = (m.metadata?.tags || []).map((t: string) => t.toLowerCase());
            
            // Check if any anchor word appears in content or tags
            return anchorWords.some(word => 
              content.includes(word) || tags.some((tag: string) => tag.includes(word))
            );
          })
        : [];
      
      // Sort by relevance (memories with theme in content are more relevant than just in tags)
      searchResults.sort((a, b) => {
        const aContent = (a.memory || a.content || '').toLowerCase();
        const bContent = (b.memory || b.content || '').toLowerCase();
        const aHasInContent = anchorWords.some(word => aContent.includes(word));
        const bHasInContent = anchorWords.some(word => bContent.includes(word));
        
        if (aHasInContent && !bHasInContent) return -1;
        if (!aHasInContent && bHasInContent) return 1;
        return 0;
      });
    }
    
    // Format theme-specific memories
    return searchResults
      .slice(0, 5) // Limit to top 5
      .map((m: any) => m.memory || m.content || '')
      .filter((content: string) => content.trim().length > 0);
    
  } catch (error: any) {
    console.error('Error searching mem0 for theme-specific memories:', error);
    return []; // Return empty array on error
  }
}

/**
 * Process user sharing: detect theme, search memories, update Redis
 * This is the main memory service function
 */
export async function processUserSharing(
  sessionId: string,
  date: string,
  fullSharing: string,
  mood?: string | null
): Promise<{
  anchor: string | null;
  themeSpecificMemories: string[];
  updatedState: ConversationState;
}> {
  // Get current state
  let state = await getConversationState(sessionId, date);
  if (!state) {
    throw new Error(`Conversation state not found for session ${sessionId} on ${date}`);
  }

  // STEP 1: Extract anchor theme and tone from full sharing
  const extraction = extractFromMessage(fullSharing, null);
  
  // Determine anchor theme
  let anchor = state.anchor;
  if (extraction.touched_theme && !anchor) {
    anchor = extraction.touched_theme;
  }

  // STEP 2: Search mem0 for theme-specific memories (only after anchor is detected)
  let themeSpecificMemories: string[] = [];
  if (anchor) {
    themeSpecificMemories = await searchThemeMemories(anchor);
  }

  // STEP 3: Update Redis state with theme-specific context
  const updates: Partial<ConversationState> = {
    session_phase: 'reflecting',
    user_initial_sharing: fullSharing,
    anchor: anchor || state.anchor,
    tone: extraction.tone || state.tone,
    mood: mood || null,
  };

  // Add theme-specific memories to yesterday_context (or create new array)
  if (themeSpecificMemories.length > 0) {
    // Combine with existing yesterday_context, but prioritize theme-specific memories
    updates.yesterday_context = [
      ...themeSpecificMemories,
      ...(state.yesterday_context || []).filter(ctx => 
        !themeSpecificMemories.includes(ctx)
      ),
    ].slice(0, 10); // Limit to 10 total context items
  }

  // Move theme from unexplored to explored if detected
  if (extraction.touched_theme) {
    if (!state.explored_themes.includes(extraction.touched_theme)) {
      updates.explored_themes = [...state.explored_themes, extraction.touched_theme];
      updates.unexplored_themes = state.unexplored_themes.filter(
        t => t !== extraction.touched_theme
      );
    }
  }

  // Update Redis state
  const updatedState = await updateConversationState(sessionId, date, updates);

  return {
    anchor: updatedState.anchor,
    themeSpecificMemories,
    updatedState,
  };
}
