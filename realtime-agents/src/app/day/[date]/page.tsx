'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { cn, getTodayString, formatDateString } from '@/app/lib/utils';
import { supabase } from '@/app/lib/supabase';
import { VoiceOrb, type VoiceStatus } from '@/app/components/VoiceOrb';
import { useRealtimeSession } from '@/app/hooks/useRealtimeSession';
import { TranscriptProvider, useTranscript } from '@/app/contexts/TranscriptContext';
import { EventProvider } from '@/app/contexts/EventContext';
import { useHandleSessionHistory } from '@/app/hooks/useHandleSessionHistory';
import { getResponseWithMemory } from '@/app/lib/memoryTool';
import { RealtimeAgent } from '@openai/agents/realtime';
import { showSuccess, showError, showNotification } from '@/app/components/Notification';

function DayViewContent() {
  const params = useParams();
  const router = useRouter();
  const date = params.date as string;

  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>('idle');
  const [existingEntry, setExistingEntry] = useState<string | null>(null);
  const [isPolishing, setIsPolishing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [conversationState, setConversationState] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'conversation' | 'journal'>('conversation');
  const [savedTranscript, setSavedTranscript] = useState<Array<{ role: "user" | "assistant"; content: string }> | null>(null);
  const [interactionMode, setInteractionMode] = useState<'voice' | 'chat'>('voice');
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);
  const [isCapturingSelfie, setIsCapturingSelfie] = useState(false);
  const [isUploadingSelfie, setIsUploadingSelfie] = useState(false);
  const [showCameraMenu, setShowCameraMenu] = useState(false);
  const [swipeStart, setSwipeStart] = useState<{ x: number; y: number } | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [showSwipeHint, setShowSwipeHint] = useState(true);
  const connectionStatusRef = useRef<string>('DISCONNECTED');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const swipeContainerRef = useRef<HTMLDivElement>(null);

  const editorRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const conversationScrollRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const processedItemIdsRef = useRef<Set<string>>(new Set());
  const polishingRef = useRef<boolean>(false);
  const sessionStartTimeRef = useRef<number | null>(null);
  const existingContentRef = useRef<string>('');
  const manualEditTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const lastSavedContentRef = useRef<string>('');
  const responseTriggeredRef = useRef<boolean>(false);
  const sessionIdRef = useRef<string | null>(null);
  const lastQuestionRef = useRef<string | null>(null);
  const isRebuildingRef = useRef<boolean>(false);
  const userFinishedSharingRef = useRef<boolean>(false);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const sessionEndingRef = useRef<boolean>(false);

  const { transcriptItems, restoreTranscript, addTranscriptMessage, updateTranscriptItem } = useTranscript();

  // Check authentication
  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/login');
        }
      } catch (error) {
        // Error checking auth
        router.push('/login');
      }
    }
    checkAuth();
  }, [router]);

  // Set up session history handling
  useHandleSessionHistory();

  const {
    status: sessionStatus,
    connect,
    disconnect,
    sendEvent,
    sendUserText,
    interrupt,
  } = useRealtimeSession({
    onConnectionChange: async (s) => {
      if (s === 'CONNECTED') {
        setVoiceStatus('listening');
        connectionStatusRef.current = s;
        
        // Check if there's existing conversation - if so, don't trigger greeting
        const checkExistingConversation = async () => {
          try {
            // Get authenticated user ID
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
              // User not authenticated, skipping conversation restore
              return;
            }
            const userId = user.id;
            
            const response = await fetch('/api/chat-test/restore', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId, date }),
            });
            
            if (response.ok) {
              const data = await response.json();
              const hasExistingConversation = data.messages && data.messages.length > 0;
              
              // Conversation check completed
              
              // Configure VAD settings
              try {
                sendEvent({
                  type: 'session.update',
                  session: {
                    turn_detection: {
                      type: 'server_vad',
                      threshold: 0.9,
                      prefix_padding_ms: 300,
                      silence_duration_ms: 2000,
                      create_response: true,
                    },
                  },
                });
              } catch (err: any) {
                // Failed to update session
              }
              
              // Only trigger greeting if NO existing conversation
              if (!hasExistingConversation && !responseTriggeredRef.current && !isRebuildingRef.current) {
          responseTriggeredRef.current = true;
          setTimeout(() => {
                  try {
                    if (connectionStatusRef.current === 'CONNECTED') {
                      sendUserText('Hello');
                    }
                  } catch (err: any) {
                    // Failed to trigger initial response
                  }
                }, 500);
              } else if (hasExistingConversation) {
                // Existing conversation found - skipping greeting
              }
            }
              } catch (error) {
            // Failed to check existing conversation
              }
        };
        
        // Wait for data channel to be ready
        setTimeout(() => {
          checkExistingConversation();
        }, 500);
      } else if (s === 'CONNECTING') {
        setVoiceStatus('connecting');
        sessionStartTimeRef.current = Date.now();
        // Only reset trigger if this is a fresh start (not a rebuild)
        // For rebuilds, we'll manually trigger in rebuildAgentWithFreshState
        if (!isRebuildingRef.current) {
          responseTriggeredRef.current = false;
        }
      } else if (s === 'DISCONNECTED') {
        setVoiceStatus('idle');
        sessionStartTimeRef.current = null;
      } else {
        setVoiceStatus('idle');
      }
    },
  });

  // Parse date
  const dateObj = useMemo(() => {
    if (!date) return new Date();
    const [y, m, d] = date.split('-').map(Number);
    return new Date(y, m - 1, d);
  }, [date]);

  const isToday = date === getTodayString();

  // Auto-hide swipe hint after 5 seconds
  useEffect(() => {
    if (showSwipeHint && !isToday) {
      const timer = setTimeout(() => {
        setShowSwipeHint(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showSwipeHint, isToday]);

  const formattedDate = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Calculate previous and next dates
  const getPreviousDate = useCallback((currentDate: string): string => {
    const [y, m, d] = currentDate.split('-').map(Number);
    const prevDate = new Date(y, m - 1, d - 1);
    return formatDateString(prevDate);
  }, []);

  const getNextDate = useCallback((currentDate: string): string => {
    const [y, m, d] = currentDate.split('-').map(Number);
    const nextDate = new Date(y, m - 1, d + 1);
    const today = new Date();
    const todayString = formatDateString(today);
    const nextDateString = formatDateString(nextDate);
    // Don't allow navigating to future dates
    return nextDateString <= todayString ? nextDateString : currentDate;
  }, []);

  // Swipe handlers
  const handleSwipeStart = useCallback((clientX: number, clientY: number) => {
    setSwipeStart({ x: clientX, y: clientY });
    setSwipeOffset(0);
  }, []);

  const handleSwipeMove = useCallback((clientX: number, clientY: number) => {
    if (!swipeStart) return;
    
    const deltaX = clientX - swipeStart.x;
    const deltaY = clientY - swipeStart.y;
    
    // Only track horizontal swipes (ignore if vertical movement is greater)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      setSwipeOffset(deltaX);
    }
  }, [swipeStart]);

  const handleSwipeEnd = useCallback(() => {
    if (!swipeStart) return;
    
    const threshold = 100; // Minimum swipe distance
    const currentOffset = swipeOffset;
    
    if (Math.abs(currentOffset) > threshold) {
      if (currentOffset > 0) {
        // Swipe right - go to previous day
        const prevDate = getPreviousDate(date);
        router.push(`/day/${prevDate}`);
      } else {
        // Swipe left - go to next day
        const nextDate = getNextDate(date);
        if (nextDate !== date) {
          router.push(`/day/${nextDate}`);
        }
      }
    }
    
    setSwipeStart(null);
    setSwipeOffset(0);
  }, [swipeStart, swipeOffset, date, getPreviousDate, getNextDate, router]);

  // Touch event handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleSwipeStart(touch.clientX, touch.clientY);
  }, [handleSwipeStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleSwipeMove(touch.clientX, touch.clientY);
  }, [handleSwipeMove]);

  const handleTouchEnd = useCallback(() => {
    handleSwipeEnd();
  }, [handleSwipeEnd]);

  // Mouse event handlers (for desktop drag)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    handleSwipeStart(e.clientX, e.clientY);
  }, [handleSwipeStart]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (swipeStart) {
      handleSwipeMove(e.clientX, e.clientY);
    }
  }, [swipeStart, handleSwipeMove]);

  const handleMouseUp = useCallback(() => {
    if (swipeStart) {
      handleSwipeEnd();
    }
  }, [swipeStart, handleSwipeEnd]);

  // Add global mouse event listeners for drag
  useEffect(() => {
    if (swipeStart) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        handleSwipeMove(e.clientX, e.clientY);
      };
      const handleGlobalMouseUp = () => {
        handleSwipeEnd();
      };
      
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
      
      return () => {
        window.removeEventListener('mousemove', handleGlobalMouseMove);
        window.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [swipeStart, handleSwipeMove, handleSwipeEnd]);


  // Load existing data - always fetch fresh from database
  useEffect(() => {
    async function fetchReflection() {
      try {
        // Get authenticated user ID
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          // User not authenticated, cannot fetch reflection
          return;
        }
        const userId = user.id;

        // Fetching reflection from database
        
        const { data, error } = await supabase
          .from('daily_reflections')
          .select('*')
          .eq('user_id', userId)
          .eq('date', date)
          .maybeSingle();
        
        if (error) {
          // Fetch reflection error
          return;
        }
        
        // Reflection fetched successfully
        
        // Always load what's in database (even if empty) - this ensures we get latest saved version
        const content = data?.reflection_summary || '';
        if (textareaRef.current) {
          textareaRef.current.value = content;
          textareaRef.current.style.height = 'auto';
          textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
        }
        existingContentRef.current = content;
        lastSavedContentRef.current = content;
        setExistingEntry(content || null);
        
        // Load selfie URL if exists
        if (data?.selfie_url) {
          // If stored URL is a signed URL that might have expired, try to get a new one
          // Extract file path from URL if possible, or use stored URL
          const storedUrl = data.selfie_url;
          
          // Check if URL contains the file path pattern (userId/date-timestamp.ext)
          const urlMatch = storedUrl.match(/([^/]+\/[^/]+)$/);
          if (urlMatch) {
            const filePath = urlMatch[1];
            // Try to get a fresh signed URL
            supabase.storage
              .from('prody')
              .createSignedUrl(filePath, 3600 * 24 * 7)
              .then(({ data: signedData, error: signedError }) => {
                if (!signedError && signedData?.signedUrl) {
                  setSelfieUrl(signedData.signedUrl);
                } else {
                  // Fallback to stored URL
                  setSelfieUrl(storedUrl);
                }
              });
          } else {
            // Use stored URL as-is
            setSelfieUrl(storedUrl);
          }
        }
        
        // For past dates (not today), only show journal view
        if (!isToday) {
          setViewMode('journal');
        } else if (content && content.trim()) {
          // For today, if there's an existing entry, show journal view by default
          // But allow user to switch to conversation view
          setViewMode('journal');
        }
        
        // Always try to restore from Redis first (most up-to-date)
        try {
          const restoreResponse = await fetch('/api/chat-test/restore', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, date }),
          });
          
          if (restoreResponse.ok) {
            const restoreData = await restoreResponse.json();
            if (restoreData.messages && Array.isArray(restoreData.messages) && restoreData.messages.length > 0) {
              // Restored conversation from Redis
              // Convert to transcript format and restore
              const transcriptFormat = restoreData.messages.map((m: any, idx: number) => ({
                itemId: `restored-${idx}-${m.timestamp || Date.now()}`,
                role: m.role,
                title: m.content,
                status: 'DONE',
                createdAtMs: m.timestamp || Date.now() - (restoreData.messages.length - idx) * 1000,
              }));
              // Store for use when creating agent
              setSavedTranscript(restoreData.messages);
              // Restore transcript immediately
              restoreTranscript(transcriptFormat);
              return; // Use Redis data, skip Supabase transcript
            }
          }
        } catch (error) {
          // Failed to restore from Redis, fall through to Supabase
        }
        
        // Fallback: Load saved conversation transcript from Supabase if Redis had nothing
        if (data?.conversation_transcript && Array.isArray(data.conversation_transcript) && data.conversation_transcript.length > 0) {
          // Loaded saved transcript from Supabase
          // Store for use when creating agent
          setSavedTranscript(data.conversation_transcript);
          // Restore the saved conversation to the transcript context
          restoreTranscript(data.conversation_transcript);
        }
      } catch (error: any) {
        // Fetch reflection exception
      }
    }

    if (date) {
      fetchReflection();
    }
  }, [date, isToday]);

  // Set up audio element for voice playback
  useEffect(() => {
    if (typeof window !== 'undefined' && !audioElementRef.current) {
      const el = document.createElement('audio');
      el.autoplay = true;
      el.style.display = 'none';
      document.body.appendChild(el);
      audioElementRef.current = el;
    }

    return () => {
      if (audioElementRef.current) {
        audioElementRef.current.remove();
        audioElementRef.current = null;
      }
    };
  }, []);

  // Track if user is manually editing (to prevent transcript overwrites)
  const isManualEditingRef = useRef(false);

  // Get conversation messages from transcript (defined early for use in effects)
  // Filter out transcribing placeholders - only show completed messages
  const conversationMessages = useMemo(() => {
    return transcriptItems
      .filter(item => 
        item.role && 
        item.title && 
        item.title.trim() && 
        item.title !== '[inaudible]' &&
        item.title !== '[Transcribing...]' &&
        !item.title.includes('[Transcribing') &&
        item.status === 'DONE' // Only show completed messages
      )
      .map((item, idx) => ({
        id: item.itemId || `msg-${idx}-${Date.now()}`,
        role: item.role,
        text: item.title || '',
        status: item.status,
        timestamp: item.createdAtMs || Date.now(),
      }));
  }, [transcriptItems]);

  // Check if AI is currently speaking
  const isAISpeaking = useMemo(() => {
    return transcriptItems.some(
      item => item.role === 'assistant' && item.status !== 'DONE'
    );
  }, [transcriptItems]);

  // Check if voice is active (defined early for use in functions)
  const isVoiceActive = sessionStatus === 'CONNECTED' || sessionStatus === 'CONNECTING';

  // Auto-switch to conversation view when voice becomes active
  useEffect(() => {
    if (isVoiceActive && viewMode === 'journal') {
      // When user starts a new conversation, switch back to conversation view
      setViewMode('conversation');
    }
  }, [isVoiceActive, viewMode]);

  // Restore chat conversation from Redis when switching to chat mode
  useEffect(() => {
    if (interactionMode === 'chat' && !isVoiceActive && transcriptItems.length === 0) {
      const restoreChatConversation = async () => {
        try {
          // Get authenticated user ID
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            return;
          }
          const userId = user.id;
          
          const restoreResponse = await fetch('/api/chat-test/restore', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, date }),
          });
          
          if (restoreResponse.ok) {
            const restoreData = await restoreResponse.json();
            if (restoreData.messages && restoreData.messages.length > 0) {
              // Restored conversation from Redis
              // Convert to transcript format and restore
              const transcriptFormat = restoreData.messages.map((m: any, idx: number) => ({
                itemId: `restored-chat-${idx}-${m.timestamp || Date.now()}`,
                role: m.role,
                title: m.content,
                status: 'DONE',
                createdAtMs: m.timestamp || Date.now() - (restoreData.messages.length - idx) * 1000,
              }));
              restoreTranscript(transcriptFormat);
            }
          }
        } catch (error) {
          // Failed to restore from Redis
        }
      };
      
      restoreChatConversation();
    }
  }, [interactionMode, isVoiceActive, date, transcriptItems.length, restoreTranscript]);

  // Auto-scroll conversation to bottom when new messages arrive
  useEffect(() => {
    if (conversationScrollRef.current && conversationMessages.length > 0) {
      // Small delay to ensure DOM is updated
      const timeoutId = setTimeout(() => {
        if (conversationScrollRef.current) {
          conversationScrollRef.current.scrollTo({
            top: conversationScrollRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }
      }, 150);
      
      return () => clearTimeout(timeoutId);
    }
  }, [conversationMessages.length, transcriptItems.length, isAISpeaking]);

  // No interception needed - agent handles responses via getResponseWithMemory tool

  // Sync textarea with existing content when viewMode changes or entry updates
  useEffect(() => {
    if (textareaRef.current && existingEntry !== null) {
      textareaRef.current.value = existingEntry;
      if (viewMode === 'journal') {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${Math.max(textareaRef.current.scrollHeight, 500)}px`;
      } else {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
      }
    }
  }, [existingEntry, viewMode]);


  const saveContent = async (text: string) => {
    // Allow empty saves (user might delete everything)
    const trimmedText = text.trim();
    
    // Only skip if content is exactly the same as last saved
    if (lastSavedContentRef.current === trimmedText) {
      // Skipping save: content unchanged
      return;
    }
    
    setIsSaving(true);
    try {
      // Saving to database
      
      // Get authenticated user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Cannot save journal: User not authenticated
        return;
      }
      const userId = user.id;

      // Get existing selfie_url to preserve it
      const { data: existingData } = await supabase
        .from('daily_reflections')
        .select('selfie_url')
        .eq('user_id', userId)
        .eq('date', date)
        .maybeSingle();

      const { data, error } = await supabase
        .from('daily_reflections')
        .upsert({
          user_id: userId,
          date,
          reflection_summary: trimmedText || null, // Allow null for empty entries
          selfie_url: existingData?.selfie_url || selfieUrl || null, // Preserve existing selfie
          updated_at: new Date().toISOString(),
        }, { 
          onConflict: 'user_id,date',
        })
        .select();
      
      if (error) {
        // Database save error
        showError(`Failed to save: ${error.message}`);
        setIsSaving(false);
        return;
      }
      
      // Database save success
      
      // Update refs only after successful save
      lastSavedContentRef.current = trimmedText;
      existingContentRef.current = trimmedText;
      setLastSaved(new Date());
      setExistingEntry(trimmedText || null);
    } catch (error: any) {
      // Save exception
      showError(`Error saving: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Save conversation transcript to database
  const saveConversationTranscript = async () => {
    if (conversationMessages.length === 0) return;
    
    try {
      const transcript = conversationMessages.map(msg => ({
        role: msg.role,
        content: msg.text,
        timestamp: msg.timestamp,
      }));

      // Saving conversation transcript

      // Get authenticated user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Cannot save transcript: User not authenticated
        return;
      }
      const userId = user.id;

      const { data, error } = await supabase
        .from('daily_reflections')
        .upsert({
          user_id: userId,
          date,
          conversation_transcript: transcript,
          updated_at: new Date().toISOString(),
        }, { 
          onConflict: 'user_id,date',
        });
      
      if (error) {
        // Transcript save error
      } else {
        // Transcript saved successfully
      }
    } catch (error: any) {
      // Transcript save exception
    }
  };

  // Extract meaningful memories from conversation and store in mem0
  const extractConversationMemories = async () => {
    if (isExtracting || isVoiceActive) {
      return;
    }
    
    setIsExtracting(true);

    try {
      // Get all conversation messages
      if (conversationMessages.length === 0) {
        showError('No conversation to extract memories from. Please have a conversation first.');
        setIsExtracting(false);
        return;
      }

      // Get authenticated user ID from client
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showError('Please sign in to extract memories.');
        setIsExtracting(false);
        return;
      }

      // Build conversation history for API
      const conversationHistory = conversationMessages.map((msg) => ({
        role: msg.role,
        content: msg.text,
      }));

      const response = await fetch('/api/extract-conversation-memories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationHistory,
          date,
          userId: user.id, // Pass user ID from client
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        showError(`Failed to extract memories: ${errorData.error || 'Unknown error'}`);
        setIsExtracting(false);
        return;
      }

      const result = await response.json();

      if (result.success) {
        showSuccess(`Successfully extracted and stored ${result.memoriesStored} memories in mem0!`);
      } else {
        showNotification('Extraction completed but no memories were stored.', 'info');
      }
    } catch (error: any) {
      // Error extracting memories
      showError(`Failed to extract memories: ${error.message || 'Unknown error'}`);
    } finally {
      setIsExtracting(false);
    }
  };

  const polishJournalEntry = async () => {
    if (polishingRef.current || isPolishing || isVoiceActive) {
      return;
    }
    
    polishingRef.current = true;
    setIsPolishing(true);

    try {
      // Get all user messages from conversation (already filtered)
      const userMessages = conversationMessages.filter(msg => msg.role === 'user');
      
      if (userMessages.length === 0) {
        showError('No conversation to convert. Please have a conversation first.');
        polishingRef.current = false;
        setIsPolishing(false);
        return;
      }

      // Build transcript from conversation messages
      const transcript = userMessages.map((msg) => ({
        role: 'user',
        content: msg.text,
        timestamp: new Date(msg.timestamp).toISOString(),
      }));

      // Get authenticated user ID from client
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showError('Please sign in to convert conversation to journal.');
        polishingRef.current = false;
        setIsPolishing(false);
        return;
      }

      const response = await fetch('/api/polish-journal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript,
          date,
          userId: user.id, // Pass user ID from client
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        showError(`Failed to polish entry: ${errorData.error || 'Unknown error'}`);
        polishingRef.current = false;
        setIsPolishing(false);
        return;
      }

      const result = await response.json();

      if (result.polishedEntry && result.polishedEntry.trim()) {
        const polishedText = result.polishedEntry.trim();
        
        existingContentRef.current = polishedText;
        lastSavedContentRef.current = polishedText;
        setExistingEntry(polishedText);
        setLastSaved(new Date());
        
        // Save the polished entry to database
        await saveContent(polishedText);
        
        // Switch to journal view after conversion
        setViewMode('journal');
        
        // Update textarea if it exists
        if (textareaRef.current) {
          textareaRef.current.value = polishedText;
          textareaRef.current.style.height = 'auto';
          textareaRef.current.style.height = `${Math.max(textareaRef.current.scrollHeight, 500)}px`;
        }
      } else {
        showError('Failed to polish entry. No content returned.');
      }
    } catch (error: any) {
      showError(`Error polishing entry: ${error.message || 'Unknown error'}`);
    } finally {
      polishingRef.current = false;
      setIsPolishing(false);
    }
  };

  const handleEditorInput = (e?: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (textareaRef.current && !polishingRef.current) {
      // Mark as manual editing to prevent transcript overwrites
      isManualEditingRef.current = true;
      
      const currentContent = textareaRef.current.value || '';
      existingContentRef.current = currentContent;
      setExistingEntry(currentContent || null);
      
      // Auto-resize textarea (for journal view, allow full height)
      if (viewMode === 'journal') {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${Math.max(textareaRef.current.scrollHeight, 500)}px`;
      } else {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
      }
      
      // Clear manual edit flag after 2 seconds of no typing
      if (manualEditTimeoutRef.current) clearTimeout(manualEditTimeoutRef.current);
      manualEditTimeoutRef.current = setTimeout(() => {
        isManualEditingRef.current = false;
      }, 2000);
      
      // Clear any existing save timeout
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      
      // Save (allow empty saves for deletions)
      saveTimeoutRef.current = setTimeout(() => {
        if (textareaRef.current) {
          const textToSave = textareaRef.current.value || '';
          // Save even if empty (user might have deleted everything)
          saveContent(textToSave);
        }
      }, 800);
    }
  };

  // Rebuild agent with fresh Redis state (called after each user message)
  // V1 Flow: Handle when user finishes initial sharing
  const handleUserFinishedSharing = async (fullSharing: string) => {
    const sessionId = sessionIdRef.current;
    if (!sessionId || !date || userFinishedSharingRef.current || sessionStatus !== 'CONNECTED') return;
    
    // Double-check current state to prevent duplicate calls
    const currentState = conversationState;
    if (currentState && currentState.session_phase !== 'listening') {
      // Already moved past listening phase, don't process again
      return;
    }
    
    userFinishedSharingRef.current = true;
    
    try {
      // Step 1: Store initial sharing and move to mood_confirmation phase
      const response = await fetch('/api/session/state', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          date,
          updates: {
            session_phase: 'mood_confirmation',
            user_initial_sharing: fullSharing || '',
          },
        }),
      });

      if (!response.ok) {
        userFinishedSharingRef.current = false;
        return;
      }

      const data = await response.json();
      if (data.success && data.state) {
        setConversationState(data.state);
        
        // DON'T rebuild here - just trigger agent to ask mood
        // We'll rebuild ONLY ONCE after mood + memory search
        // This prevents the disconnect/reconnect glitch
        if (sessionStatus === 'CONNECTED' && !responseTriggeredRef.current) {
          responseTriggeredRef.current = true;
          setTimeout(() => {
            try {
              sendEvent({ type: 'response.create' });
            } catch {
              responseTriggeredRef.current = false;
            }
          }, 1000);
        }
      } else {
        userFinishedSharingRef.current = false;
      }
    } catch {
      userFinishedSharingRef.current = false;
    }
  };

  // Rebuild agent ONLY when necessary (after mood confirmation with theme-specific memories)
  // This prevents constant glitching from too many rebuilds
  const rebuildAgentWithFreshState = async (updatedState: any) => {
    if (!sessionIdRef.current) {
      return;
    }
    
    if (isRebuildingRef.current) {
      // Cannot rebuild: already rebuilding
      return;
    }
    
    // Rebuilding agent with memories
    
    // CRITICAL: Wait for AI to finish speaking before rebuilding
    const lastAssistantItem = transcriptItems
      .filter(item => item.role === 'assistant')
      .sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0))[0];
    
    // Check if AI is currently speaking (status is not DONE)
    const isAISpeaking = lastAssistantItem && lastAssistantItem.status !== 'DONE';
    
    // If AI just spoke or is speaking, wait longer (5 seconds minimum)
    if (lastAssistantItem && lastAssistantItem.createdAtMs) {
      const timeSinceLastMessage = Date.now() - lastAssistantItem.createdAtMs;
      const waitTime = isAISpeaking ? 5000 : Math.max(3000, 5000 - timeSinceLastMessage);
      
      if (timeSinceLastMessage < 5000) {
        // Waiting for AI to finish
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    } else {
      // No recent message, wait a bit anyway to be safe
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    isRebuildingRef.current = true;
    
    try {
      // Disconnect current session
      disconnect();
      setVoiceStatus('connecting');
      
      // Longer delay to ensure clean disconnect and prevent glitching
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Get fresh ephemeral key
      const EPHEMERAL_KEY = await fetchEphemeralKey();
      if (!EPHEMERAL_KEY) {
        setVoiceStatus('idle');
        isRebuildingRef.current = false;
        return;
      }

      // Create agent with UPDATED state (fresh from Redis - includes directly searched memories)
      // Creating rebuilt agent with state
      
      // Use memory tool agent for rebuilds (EXACTLY like test)
      const memoryAgent = new RealtimeAgent({
        name: 'journalCompanion',
        voice: 'sage',
        instructions: `You are a supportive journaling assistant. 

IMPORTANT RULES:
1. When user sends a message, ALWAYS call getResponseWithMemory tool first
2. When the tool returns a response, speak it completely word-for-word
3. Do NOT add anything to the tool response - speak it exactly as returned
4. Do NOT speak before the tool is called
5. Wait for user to speak first - do not initiate conversation

CRITICAL: You MUST only speak in English. Never respond in any other language.`,
        handoffs: [],
        tools: [getResponseWithMemory],
      });
      
      const agents = [memoryAgent];
      
      // Reconnect with fresh agent (AI will now see latest Redis state)
      await connect({
        getEphemeralKey: async () => EPHEMERAL_KEY,
        initialAgents: agents,
        audioElement: audioElementRef.current || undefined,
      });
      
      // CRITICAL: Wait longer before triggering - let connection fully stabilize
      // Don't trigger immediately - wait for agent to be ready
      setTimeout(() => {
        // Only trigger if we're still connected and not already triggered
        if (sessionStatus === 'CONNECTED' && !responseTriggeredRef.current) {
          responseTriggeredRef.current = true;
          try {
            sendEvent({ type: 'response.create' });
          } catch (error) {
            // Failed to trigger agent response after rebuild
            responseTriggeredRef.current = false;
          }
        }
        isRebuildingRef.current = false;
      }, 5000); // Increased to 5 seconds - let everything stabilize
      
    } catch (error) {
      setVoiceStatus('idle');
      isRebuildingRef.current = false;
      responseTriggeredRef.current = false;
    }
  };

  const fetchEphemeralKey = async (): Promise<string> => {
    const tokenResponse = await fetch("/api/session");
    const data = await tokenResponse.json();

    if (!data.client_secret?.value) {
      // No ephemeral key provided by the server
      throw new Error("No ephemeral key provided by the server");
    }

    return data.client_secret.value;
  };

  // V1 Flow: Store memories after session ends
  // Prevent duplicate session end calls
  const handleSessionEnd = async () => {
    if (!sessionIdRef.current || !date || sessionEndingRef.current) return;
    
    sessionEndingRef.current = true;
    
    try {
      // Save conversation transcript to database
      await saveConversationTranscript();
      
      // Get final journal content
      const finalContent = textareaRef.current?.value || existingContentRef.current || '';
      
      if (finalContent.trim()) {
        // Store memories in mem0 after session
        await fetch('/api/store-journal-memory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            journalText: finalContent.trim(),
            date,
          }),
        });
      }
      
      // Update state to closed - only if we have valid sessionId and date
      if (sessionIdRef.current && date) {
        const response = await fetch('/api/session/state', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: sessionIdRef.current,
            date,
            updates: { session_phase: 'closed' },
          }),
        });
        
        // Don't throw on error - just log it
        if (!response.ok) {
          return;
        }
      }
    } catch {
      // Silently fail - memories can be stored later
    } finally {
      // Reset after a delay to allow for cleanup
      setTimeout(() => {
        sessionEndingRef.current = false;
      }, 1000);
    }
  };

  // Handle file upload (from computer)
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showError('Please select an image file');
      return;
    }

    setShowCameraMenu(false);
    await uploadImage(file);
  };

  // Handle selfie capture (from camera) - using MediaDevices API for direct camera access
  const handleSelfieCapture = async () => {
    setShowCameraMenu(false);
    setIsCapturingSelfie(true);
    
    try {
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user', // Front camera
          width: { ideal: 1280 },
          height: { ideal: 1280 }
        } 
      });
      
      // Create video element to show camera preview
      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      video.playsInline = true;
      video.style.width = '100%';
      video.style.maxWidth = '500px';
      video.style.borderRadius = '12px';
      
      // Create container for camera preview
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.top = '0';
      container.style.left = '0';
      container.style.right = '0';
      container.style.bottom = '0';
      container.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.alignItems = 'center';
      container.style.justifyContent = 'center';
      container.style.zIndex = '9999';
      container.style.gap = '20px';
      
      // Create capture button
      const captureBtn = document.createElement('button');
      captureBtn.textContent = 'Capture';
      captureBtn.style.padding = '12px 32px';
      captureBtn.style.borderRadius = '50px';
      captureBtn.style.backgroundColor = '#f59e0b';
      captureBtn.style.color = 'white';
      captureBtn.style.fontWeight = '600';
      captureBtn.style.border = 'none';
      captureBtn.style.cursor = 'pointer';
      captureBtn.style.fontSize = '16px';
      
      // Create cancel button
      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.style.padding = '12px 32px';
      cancelBtn.style.borderRadius = '50px';
      cancelBtn.style.backgroundColor = 'transparent';
      cancelBtn.style.color = 'white';
      cancelBtn.style.fontWeight = '500';
      cancelBtn.style.border = '2px solid white';
      cancelBtn.style.cursor = 'pointer';
      cancelBtn.style.fontSize = '16px';
      
      // Create button container
      const buttonContainer = document.createElement('div');
      buttonContainer.style.display = 'flex';
      buttonContainer.style.gap = '12px';
      buttonContainer.appendChild(captureBtn);
      buttonContainer.appendChild(cancelBtn);
      
      container.appendChild(video);
      container.appendChild(buttonContainer);
      document.body.appendChild(container);
      
      // Capture photo
      captureBtn.onclick = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0);
          
          // Convert to blob
          canvas.toBlob(async (blob) => {
            if (blob) {
              // Stop camera stream
              stream.getTracks().forEach(track => track.stop());
              document.body.removeChild(container);
              setIsCapturingSelfie(false);
              
              // Convert blob to File
              const file = new File([blob], `selfie-${Date.now()}.jpg`, { type: 'image/jpeg' });
              await uploadImage(file);
            }
          }, 'image/jpeg', 0.9);
        }
      };
      
      // Cancel
      cancelBtn.onclick = () => {
        stream.getTracks().forEach(track => track.stop());
        document.body.removeChild(container);
        setIsCapturingSelfie(false);
      };
      
    } catch (error: any) {
      // Camera access error
      setIsCapturingSelfie(false);
      
      // Fallback to file input if camera access fails
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        showError('Camera access denied. Please allow camera access or use "Upload from Computer" instead.');
      } else {
        showError('Failed to access camera. Please use "Upload from Computer" instead.');
        // Fallback to file input
        cameraInputRef.current?.click();
      }
    }
  };

  // Handle file input change (fallback for camera input)
  const handleCameraInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showError('Please select an image file');
      return;
    }

    await uploadImage(file);
  };

  // Upload image to storage
  const uploadImage = async (file: File) => {
    setIsUploadingSelfie(true);
    try {
      // Get authenticated user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Cannot upload selfie: User not authenticated
        setIsUploadingSelfie(false);
        return;
      }
      const userId = user.id;

      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${date}-${Date.now()}.${fileExt}`;

      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('prody')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        // Provide helpful error message for bucket not found
        if (uploadError.message.includes('Bucket not found') || 
            uploadError.message.includes('does not exist') ||
            uploadError.message.includes('not found')) {
          throw new Error('Storage bucket "prody" not found. Please create it in your Supabase dashboard: Storage → New bucket → Name: "prody" → Public bucket → Create.');
        }
        throw uploadError;
      }

      // Get signed URL (works for both public and private buckets)
      // Signed URLs are more reliable and work even if bucket is private
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('prody')
        .createSignedUrl(fileName, 3600 * 24 * 7); // 7 days expiry
      
      let publicUrl: string;
      
      if (signedUrlError || !signedUrlData?.signedUrl) {
        // Fallback to public URL if signed URL fails
        // Signed URL failed, trying public URL
      const { data: urlData } = supabase.storage
          .from('prody')
        .getPublicUrl(fileName);
        publicUrl = urlData.publicUrl;
      } else {
        publicUrl = signedUrlData.signedUrl;
      }

      // Generated URL

      // Update database with selfie URL
      const { error: dbError } = await supabase
        .from('daily_reflections')
        .upsert({
          user_id: userId,
          date,
          selfie_url: publicUrl,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,date',
        });

      if (dbError) {
        throw dbError;
      }

      setSelfieUrl(publicUrl);
      // Uploaded successfully
    } catch (error: any) {
      // Upload error
      showError(`Failed to upload selfie: ${error.message}`);
    } finally {
      setIsUploadingSelfie(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Chat handler - uses chat-test API
  const handleChatSend = async () => {
    if (!chatInput.trim() || isChatLoading) return;

    const userMessage = chatInput.trim();
    setChatInput(''); // Clear input immediately
    
    // Add user message immediately (before API call)
    const userItemId = `chat-user-${Date.now()}`;
    addTranscriptMessage(userItemId, 'user', userMessage);
    // Mark user message as DONE immediately so it shows up right away
    setTimeout(() => {
      updateTranscriptItem(userItemId, { status: 'DONE' });
    }, 0);
    
    setIsChatLoading(true);

    try {
      // Get user ID
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || 'default-user';

      // Build conversation history from transcriptItems (includes the message we just added)
      const conversationHistory = conversationMessages.map((msg) => ({
        role: msg.role,
        content: msg.text,
      }));
      // Also include the user message we just added
      conversationHistory.push({ role: 'user', content: userMessage });

      const response = await fetch('/api/chat-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory,
          userId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        // Chat API error
        throw new Error(`Failed to get response: ${response.status}`);
      }

      const data = await response.json();
      // Chat API response received
      
      if (!data || !data.message) {
        // Invalid response format
        throw new Error('Invalid response from server');
      }
      
      // Add AI response
      const aiItemId = `chat-ai-${Date.now()}`;
      addTranscriptMessage(aiItemId, 'assistant', data.message);
      // Mark AI message as DONE immediately
      setTimeout(() => {
        updateTranscriptItem(aiItemId, { status: 'DONE' });
      }, 0);
      
      // AI response added
    } catch (error) {
      // Chat error occurred
      // Optionally add an error message to the transcript
      const errorItemId = `chat-error-${Date.now()}`;
      addTranscriptMessage(errorItemId, 'assistant', 'Sorry, I encountered an error. Please try again.');
      setTimeout(() => {
        updateTranscriptItem(errorItemId, { status: 'DONE' });
      }, 0);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleVoiceToggle = async () => {
    if (sessionStatus === 'CONNECTED' || sessionStatus === 'CONNECTING') {
      // Store memories before disconnecting (V1 flow)
      await handleSessionEnd();
      
      disconnect();
      setVoiceStatus('idle');
      sessionIdRef.current = null;
      userFinishedSharingRef.current = false;
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
    } else {
      if (sessionStatus !== 'DISCONNECTED') return;
      setVoiceStatus('connecting');
      
      // Reset V1 flow state and clear any timeouts
      userFinishedSharingRef.current = false;
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = undefined;
      }
      
      // Cleanup Redis for this date to start fresh (optional - can be removed if not needed)
      // Uncomment if you want to always start with a clean slate:
      // try {
      //   await fetch('/api/session/cleanup-redis', {
      //     method: 'POST',
      //     headers: { 'Content-Type': 'application/json' },
      //     body: JSON.stringify({ date }),
      //   });
      // } catch {}

      try {
        // Generate sessionId
        const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        sessionIdRef.current = sessionId;

        // Initialize conversation state (NO memory loading - will search mem0 after first response)
        let currentState = null;
        try {
          const stateResponse = await fetch('/api/session/state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId,
              date,
              yesterdayContext: [], // Empty - will search mem0 directly after first response
            }),
          });
          if (!stateResponse.ok) {
            throw new Error(`State initialization failed: ${stateResponse.status}`);
          }
          
          const stateData = await stateResponse.json();
          if (stateData.success && stateData.state) {
            currentState = stateData.state;
            setConversationState(stateData.state);
          } else {
            // If state already exists, fetch it
            const getResponse = await fetch(`/api/session/state?sessionId=${sessionId}&date=${date}`);
            if (getResponse.ok) {
              const getData = await getResponse.json();
              if (getData.success && getData.state) {
                currentState = getData.state;
                setConversationState(getData.state);
              }
            }
          }
        } catch {
          // Continue with null state - agent will use opening instructions
        }

        const EPHEMERAL_KEY = await fetchEphemeralKey();
        if (!EPHEMERAL_KEY) return;

        // Create agent - use memory tool agent for new system (EXACTLY like test)
        const memoryAgent = new RealtimeAgent({
          name: 'journalCompanion',
          voice: 'sage',
          instructions: `You are a supportive journaling assistant. 

IMPORTANT RULES:
1. When user sends a message, ALWAYS call getResponseWithMemory tool first
2. When the tool returns a response, speak it completely word-for-word
3. Do NOT add anything to the tool response - speak it exactly as returned
4. Do NOT speak before the tool is called
5. Wait for user to speak first - do not initiate conversation

CRITICAL: You MUST only speak in English. Never respond in any other language.`,
          handoffs: [],
          tools: [getResponseWithMemory],
        });
        
        const agents = [memoryAgent];
        
        await connect({
          getEphemeralKey: async () => EPHEMERAL_KEY,
          initialAgents: agents,
          audioElement: audioElementRef.current || undefined,
        });
        
        // Store initial state reference so agent can access it
        // The agent instructions will guide it based on session_phase
      } catch {
        setVoiceStatus('idle');
        sessionIdRef.current = null;
      }
    }
  };

  // Cleanup Redis for current date (helper function)
  const handleCleanupRedis = async () => {
    try {
      const response = await fetch('/api/session/cleanup-redis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      });
      const data = await response.json();
      if (data.success) {
        showSuccess(`Redis cleaned: ${data.message}`);
        // Reset state
        setConversationState(null);
        userFinishedSharingRef.current = false;
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
          silenceTimeoutRef.current = undefined;
        }
      }
    } catch (error) {
      // Failed to cleanup Redis
    }
  };

  // Clear conversation for current date (Redis + Database)
  const handleClearConversation = async () => {
    if (!confirm(`Clear all conversation data for ${date}? This will remove the conversation transcript and reset the session.`)) {
      return;
    }

    try {
      // Get user ID
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || 'default-user';

      // Clear chat-test conversation from Redis (matches test implementation)
      const response = await fetch('/api/chat-test/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, date }),
      });
      const data = await response.json();
      if (data.success) {
        // Also clear Supabase transcript
        try {
          await supabase
            .from('daily_reflections')
            .update({ 
              conversation_transcript: null,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId)
            .eq('date', date);
        } catch (dbError) {
          // Failed to clear Supabase transcript
        }

        showSuccess(`Conversation cleared: ${data.message}`);
        // Reset local state
        setConversationState(null);
        setSavedTranscript(null);
        userFinishedSharingRef.current = false;
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
          silenceTimeoutRef.current = undefined;
        }
        // Clear transcript items in UI
        restoreTranscript([]);
        // Reload the page to refresh everything
        window.location.reload();
      } else {
        showError(`Failed to clear conversation: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      // Failed to clear conversation
      showError('Failed to clear conversation. Please try again.');
    }
  };

  const handleBack = async () => {
    // Save current content before navigating away
    if (textareaRef.current && !polishingRef.current) {
      const currentContent = textareaRef.current.value || '';
      if (currentContent !== lastSavedContentRef.current) {
        await saveContent(currentContent);
        // Wait a bit for save to complete
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
    
    if (sessionStatus === 'CONNECTED') {
      disconnect();
    }
    // Go back to previous page or calendar
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/calendar');
    }
  };

  // NO context loading - will search mem0 directly after first response
  // Removed handleLoadContext and auto-loading
  
  // Format date for display
  const formattedDateLong = dateObj.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'short', 
    day: 'numeric' 
  });

  return (
    <div 
      ref={swipeContainerRef}
      className="bg-white text-amber-900 font-sans antialiased min-h-screen overflow-x-hidden selection:bg-amber-200 selection:text-amber-900 flex flex-col relative"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      style={{
        transform: swipeOffset !== 0 ? `translateX(${swipeOffset}px)` : undefined,
        transition: swipeStart ? 'none' : 'transform 0.2s ease-out',
      }}
    >
      {/* Animated Background Blobs - matching dashboard */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white via-amber-50/50 to-yellow-50/40"></div>
        <div className="absolute top-0 left-0 w-full h-full aurora-bg opacity-100"></div>
        <div className="absolute -top-[10%] -left-[10%] w-[60vw] h-[60vw] bg-amber-200/70 rounded-full mix-blend-multiply filter blur-[90px] opacity-80 animate-blob"></div>
        <div className="absolute top-[15%] -right-[15%] w-[55vw] h-[55vw] bg-yellow-200/70 rounded-full mix-blend-multiply filter blur-[90px] opacity-80 animate-blob" style={{ animationDelay: '2s' }}></div>
        <div className="absolute -bottom-[20%] left-[20%] w-[60vw] h-[60vw] bg-orange-100/60 rounded-full mix-blend-multiply filter blur-[100px] opacity-70 animate-blob" style={{ animationDelay: '4s' }}></div>
      </div>


      {/* Header */}
      <header className="fixed top-0 w-full z-40 px-6 md:px-12 py-6 flex items-center justify-between transition-all duration-300">
        <div className="flex items-center gap-4">
          <button 
            onClick={handleBack}
            className="flex items-center gap-3 opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
          >
            <span className="material-symbols-outlined text-amber-600 text-2xl">auto_stories</span>
          </button>
          
          {/* Date Navigation Buttons */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-lg p-1 border border-amber-200/50 shadow-sm">
              <button
                onClick={() => {
                  const prevDate = getPreviousDate(date);
                  router.push(`/day/${prevDate}`);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50 rounded-md transition-all hover:shadow-sm"
                title="Previous day"
              >
                <span className="material-symbols-outlined text-base">chevron_left</span>
                <span className="hidden sm:inline">Prev</span>
              </button>
              <div className="h-6 w-px bg-amber-200/50"></div>
              <button
                onClick={() => {
                  const nextDate = getNextDate(date);
                  if (nextDate !== date) {
                    router.push(`/day/${nextDate}`);
                  }
                }}
                disabled={getNextDate(date) === date}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50 rounded-md transition-all hover:shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                title="Next day"
              >
                <span className="hidden sm:inline">Next</span>
                <span className="material-symbols-outlined text-base">chevron_right</span>
              </button>
            </div>
            {/* Go to Calendar Button */}
            <button
              onClick={() => router.push('/calendar')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-white/80 backdrop-blur-sm hover:bg-amber-50 rounded-lg border border-amber-200/50 shadow-sm transition-all hover:shadow-md"
              title="Go to Calendar"
            >
              <span className="material-symbols-outlined text-base">calendar_month</span>
              <span className="hidden md:inline">Calendar</span>
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Mode Toggle - Chat/Voice */}
          {isToday && (
            <div className="flex items-center gap-2 bg-white/60 backdrop-blur-sm rounded-lg p-1 border border-amber-200/50">
              <button
                onClick={() => setInteractionMode('chat')}
                className={`px-3 py-1.5 text-xs rounded-md transition-all ${
                  interactionMode === 'chat'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-amber-700 hover:bg-amber-50'
                }`}
              >
                Chat
              </button>
              <button
                onClick={() => setInteractionMode('voice')}
                className={`px-3 py-1.5 text-xs rounded-md transition-all ${
                  interactionMode === 'voice'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-amber-700 hover:bg-amber-50'
                }`}
              >
                Voice
              </button>
            </div>
          )}
          {/* Saved indicator */}
          {lastSaved && (
            <div className="flex items-center gap-2 text-xs text-amber-800">
              <span className="material-symbols-outlined text-sm text-amber-600">check_circle</span>
              <span>Saved {lastSaved.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
            </div>
          )}
          {isSaving && (
            <div className="flex items-center gap-2 text-xs text-amber-800">
              <span className="material-symbols-outlined text-sm animate-spin text-amber-600">sync</span>
              <span>Saving...</span>
            </div>
          )}
          {/* Clear conversation button */}
          <button
            onClick={handleClearConversation}
            className="px-3 py-1.5 text-xs bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors border border-red-200"
            title="Clear conversation for this date"
          >
            Clear Conversation
          </button>
          <div className="bg-center bg-no-repeat bg-cover rounded-full size-8 ring-1 ring-primary/20 cursor-pointer opacity-80 hover:opacity-100 transition-all shadow-sm bg-gradient-to-br from-primary/20 to-primary/40"></div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 md:px-8 lg:px-12 pt-32 pb-48 flex flex-col lg:flex-row gap-8 lg:gap-12 relative">
        {/* Conversation Section */}
        <section className="flex-1 relative w-full lg:max-w-4xl xl:max-w-5xl mx-auto">
          {/* Simple tag */}
          <div className="mb-8 flex justify-end">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 border border-slate-200/60">
              <span className="material-symbols-outlined text-slate-500 text-sm">
                {viewMode === 'journal' ? 'auto_stories' : 'chat'}
              </span>
              <p className="text-xs font-medium text-slate-700">
                {viewMode === 'journal' ? 'Journal' : 'Conversation'}
              </p>
            </div>
          </div>

          {/* Journal View */}
          {viewMode === 'journal' ? (
            <div className="max-w-4xl mx-auto w-full relative">
              {/* Hidden file inputs */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isUploadingSelfie}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="user"
                onChange={handleCameraInputChange}
                className="hidden"
                disabled={isUploadingSelfie}
              />

              {/* Camera button with menu */}
              {isToday && viewMode === 'journal' && (
                <div className="fixed bottom-10 right-28 z-40">
                  {/* Camera Menu */}
                  {showCameraMenu && (
                    <div className="absolute bottom-20 right-0 mb-2 w-64 bg-white rounded-xl shadow-2xl border border-slate-200/60 overflow-hidden">
                      {/* Slogan */}
                      <div className="px-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100">
                        <p className="text-xs font-semibold text-amber-800 text-center italic">
                          "one selfie a day keep stress away"
                        </p>
                      </div>
                      
                      {/* Menu Options */}
                      <div className="py-2">
                <button
                          onClick={() => {
                            handleSelfieCapture();
                          }}
                          disabled={isUploadingSelfie || isCapturingSelfie}
                          className="w-full px-4 py-3 text-left hover:bg-amber-50 transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="material-symbols-outlined text-amber-600">camera_alt</span>
                          <span className="text-sm font-medium text-amber-900">
                            {isCapturingSelfie ? 'Opening camera...' : 'Take Selfie'}
                          </span>
                        </button>
                        <button
                          onClick={() => {
                            setShowCameraMenu(false);
                            fileInputRef.current?.click();
                          }}
                  disabled={isUploadingSelfie}
                          className="w-full px-4 py-3 text-left hover:bg-amber-50 transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed border-t border-slate-100"
                        >
                          <span className="material-symbols-outlined text-amber-600">upload_file</span>
                          <span className="text-sm font-medium text-amber-900">Upload from Computer</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Camera Button */}
                  <button
                    onClick={() => setShowCameraMenu(!showCameraMenu)}
                    disabled={isUploadingSelfie}
                    className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-xl hover:shadow-2xl flex items-center justify-center transition-all hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed animate-breathe"
                  title={selfieUrl ? "Change selfie" : "Add selfie"}
                >
                  {isUploadingSelfie ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  ) : (
                    <span className="material-symbols-outlined text-white text-[32px]">camera_alt</span>
                  )}
                </button>
                </div>
              )}

              {/* Display selfie if exists */}
              {selfieUrl && (
                <div className="mb-6 flex justify-center">
                  <div className="rounded-xl overflow-hidden border border-slate-200/60 shadow-sm max-w-md w-full">
                  <img
                    src={selfieUrl}
                    alt="Daily selfie"
                      className="w-full h-auto max-h-[300px] object-cover"
                      onError={(e) => {
                      // Image load error
                      
                      // Try to extract file path and get signed URL
                      const img = e.currentTarget;
                      if (selfieUrl) {
                        // Extract file path from URL (format: userId/date-timestamp.ext)
                        const urlParts = selfieUrl.split('/');
                        const fileName = urlParts.slice(-2).join('/'); // Get userId/filename
                        
                        // Attempting to get signed URL
                        
                        supabase.storage
                          .from('prody')
                          .createSignedUrl(fileName, 3600 * 24 * 7)
                          .then(({ data, error }) => {
                            if (!error && data?.signedUrl) {
                              // Successfully got signed URL
                              img.src = data.signedUrl;
                            } else {
                              // Failed to get signed URL
                              // Show user-friendly error
                              const errorDiv = document.createElement('div');
                              errorDiv.className = 'p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm';
                              errorDiv.textContent = 'Failed to load image. Please check browser console for details.';
                              img.parentElement?.appendChild(errorDiv);
                            }
                          })
                          .catch((err) => {
                            // Exception getting signed URL
                          });
                      }
                    }}
                    onLoad={() => {
                      // Image loaded successfully
                    }}
                  />
                  </div>
                </div>
              )}

              <textarea
                ref={textareaRef}
                value={existingEntry || ''}
                onChange={handleEditorInput}
                placeholder="Your journal entry will appear here..."
                disabled={!isToday}
                className={cn(
                  "w-full min-h-[600px] p-8 rounded-none bg-transparent border-none shadow-none text-amber-900 text-base leading-relaxed focus:outline-none resize-none transition-all font-normal",
                  !isToday && "opacity-90 cursor-default"
                )}
                style={{
                  fontSize: '1rem',
                  lineHeight: '1.75rem',
                }}
              />
            </div>
          ) : (
            /* Conversation Thread */
            <div 
              ref={conversationScrollRef}
              className="relative space-y-12 md:space-y-16 max-h-[calc(100vh-18rem)] overflow-y-auto no-scrollbar pb-32 rounded-2xl p-6 md:p-10 lg:p-12 bg-white border border-slate-200/60 shadow-lg"
              style={{ scrollBehavior: 'smooth' }}
            >
            {/* Subtle paper texture */}
            <div className="absolute inset-0 opacity-[0.02] bg-[radial-gradient(circle_at_1px_1px,_rgba(0,0,0,0.1)_1px,_transparent_0)] bg-[length:20px_20px] rounded-2xl pointer-events-none"></div>
            
            {/* Vertical timeline */}
            <div className="absolute left-4 md:left-[50%] top-4 bottom-4 w-px bg-slate-200/50 md:-translate-x-1/2 hidden md:block"></div>

              {/* Render conversation messages */}
              {conversationMessages.length === 0 ? (
                <div className="text-center py-24 relative z-10">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100/50 mb-4">
                    <span className="material-symbols-outlined text-slate-400 text-2xl">chat_bubble_outline</span>
                  </div>
                  <p className="text-base font-normal text-slate-600" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    Start a conversation to begin reflecting...
                  </p>
                </div>
              ) : (
                conversationMessages.map((msg, idx) => {
                const isAI = msg.role === 'assistant';
                const isLast = idx === conversationMessages.length - 1;
                const isTyping = isLast && isAI && isAISpeaking;

                return (
                  <div key={msg.id} className="relative flex flex-col md:flex-row md:items-start group">
                    {/* Timeline dot */}
                    {!isTyping && (
                      <div className={cn(
                        "hidden md:block absolute left-[50%] -translate-x-1/2 z-10",
                        isAI 
                          ? "top-3 size-2 rounded-full border border-slate-300 bg-white"
                          : "top-4 size-3 rounded-full bg-amber-500/60"
                      )}></div>
                    )}

                    {isAI ? (
                      // AI Message (Left side on desktop)
                      <>
                        <div className="md:w-[50%] md:pr-16 md:text-right relative">
                          <span className="inline-block md:hidden text-sm font-bold text-slate-500 mb-2 uppercase tracking-wide">
                            VoiceJournal
                          </span>
                          <p className="text-base md:text-lg text-slate-900 font-normal leading-relaxed" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                            {msg.text}
                          </p>
                        </div>
                        <div className="md:w-[50%]"></div>
                      </>
                    ) : (
                      // User Message (Right side on desktop)
                      <>
                        <div className="md:w-[50%]"></div>
                        <div className="md:w-[50%] md:pl-16 relative mt-4 md:mt-0">
                          <span className="inline-block md:hidden text-sm font-bold text-slate-500 mb-2 uppercase tracking-wide">
                            You
                          </span>
                          <div className="font-sans text-base md:text-lg text-slate-900 leading-relaxed font-normal">
                            {msg.text}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}

              {/* Typing indicator - Show for voice AI speaking OR chat loading */}
              {(isAISpeaking || isChatLoading) && (
                <div className="relative flex flex-col md:flex-row md:items-start group">
                  {/* Timeline dot */}
                  <div className="hidden md:block absolute left-[50%] -translate-x-1/2 top-2 size-2 rounded-full bg-amber-500/60 animate-pulse z-10"></div>
                  
                  {/* AI typing message */}
                  <div className="md:w-[50%] md:pr-16 md:text-right relative">
                    <span className="inline-block md:hidden text-sm font-bold text-slate-500 mb-2 uppercase tracking-wide">
                      VoiceJournal
                    </span>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/50 shadow-sm">
                      <div className="flex gap-1.5">
                        <span className="size-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0s', animationDuration: '1.4s' }}></span>
                        <span className="size-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s', animationDuration: '1.4s' }}></span>
                        <span className="size-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s', animationDuration: '1.4s' }}></span>
                      </div>
                      <span className="text-xs text-amber-700 font-medium ml-1">Thinking...</span>
                    </div>
                  </div>
                  <div className="md:w-[50%]"></div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Right Sidebar - View Toggle Buttons */}
        <aside className="hidden xl:flex w-64 flex-col sticky top-32 h-fit justify-start pb-8">
          {/* View Toggle Buttons - Show based on date */}
          <div className="space-y-3">
            {/* Conversation View Button - Only show for today */}
            {isToday && (
              <button
                onClick={() => {
                  setViewMode('conversation');
                }}
                className={cn(
                  "group relative w-full overflow-hidden rounded-xl border p-4 transition-all hover:-translate-y-1 hover:shadow-lg",
                  viewMode === 'conversation'
                    ? "bg-amber-50 border-amber-300/50 shadow-sm"
                    : "bg-white shadow-sm border-amber-200/50"
                )}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-amber-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative flex items-center justify-between">
                  <span className={cn(
                    "text-xs font-bold uppercase tracking-widest",
                    viewMode === 'conversation' ? "text-amber-700" : "text-amber-700 group-hover:text-amber-700"
                  )}>
                    Conversation View
                  </span>
                  <span className={cn(
                    "material-symbols-outlined transition-transform",
                    viewMode === 'conversation' ? "text-amber-600" : "text-amber-600 group-hover:text-amber-600"
                  )}>
                    chat
                  </span>
                </div>
              </button>
            )}

            {/* Extract Memories Button - Show when in conversation view with messages */}
            {viewMode === 'conversation' && conversationMessages.length > 0 && (
              <button
                onClick={async () => {
                  if (!isExtracting && !isVoiceActive) {
                    await extractConversationMemories();
                  }
                }}
                disabled={isExtracting || isVoiceActive || conversationMessages.length === 0}
                className="group relative w-full overflow-hidden rounded-xl bg-white shadow-sm border border-amber-200/50 p-4 transition-all hover:-translate-y-1 hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-amber-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-700 uppercase tracking-widest group-hover:text-amber-700">
                    {isExtracting ? 'Extracting...' : 'Extract Memories'}
                  </span>
                  <span className="material-symbols-outlined text-amber-600 group-hover:text-amber-600 group-hover:rotate-12 transition-transform">
                    psychology
                  </span>
                </div>
              </button>
            )}

            {/* Convert to Journal Button - Show when in conversation view with messages */}
            {viewMode === 'conversation' && conversationMessages.length > 0 && (
              <button
                onClick={async () => {
                  if (!isPolishing && !isVoiceActive) {
                    await polishJournalEntry();
                  }
                }}
                disabled={isPolishing || isVoiceActive || conversationMessages.length === 0}
                className="group relative w-full overflow-hidden rounded-xl bg-white shadow-sm border border-amber-200/50 p-4 transition-all hover:-translate-y-1 hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-amber-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-700 uppercase tracking-widest group-hover:text-amber-700">
                    {isPolishing ? 'Polishing...' : 'Convert to Journal'}
                  </span>
                  <span className="material-symbols-outlined text-amber-600 group-hover:text-amber-600 group-hover:rotate-12 transition-transform">
                    auto_awesome
                  </span>
                </div>
              </button>
            )}

            {/* Journal View Button */}
            <button
              onClick={() => {
                setViewMode('journal');
              }}
              disabled={isPolishing || isVoiceActive}
              className={cn(
                "group relative w-full overflow-hidden rounded-xl border p-4 transition-all hover:-translate-y-1 hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed",
                viewMode === 'journal'
                  ? "bg-amber-50 border-amber-300/50 shadow-sm"
                  : "bg-white shadow-sm border-amber-200/50"
              )}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-amber-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative flex items-center justify-between">
                <span className={cn(
                  "text-xs font-bold uppercase tracking-widest",
                  viewMode === 'journal' ? "text-amber-700" : "text-amber-700 group-hover:text-amber-700",
                  isPolishing && "text-amber-700/50"
                )}>
                  Journal View
                </span>
                <span className={cn(
                  "material-symbols-outlined transition-transform",
                  viewMode === 'journal' ? "text-amber-600" : "text-amber-600 group-hover:text-amber-600"
                )}>
                  auto_stories
                </span>
              </div>
            </button>
          </div>
        </aside>
      </main>

      {/* Bottom Input Bar - Only show when voice is active */}
      {isToday && isVoiceActive && (
        <div className="fixed bottom-8 right-8 z-50 pointer-events-none">
          <div className="pointer-events-auto glass-panel rounded-2xl shadow-lg border border-white/50 p-3 flex items-center gap-3 transition-all hover:shadow-xl">
            <button
              onClick={handleVoiceToggle}
              className={cn(
                "flex items-center justify-center size-10 rounded-full transition-all",
                isVoiceActive
                  ? "bg-red-100 text-red-500 hover:bg-red-200"
                  : "bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-500"
              )}
              title="Stop Voice"
            >
              <span className="material-symbols-outlined text-[20px]">mic</span>
            </button>
            <div className="flex items-center gap-2">
              <p className="text-sm text-amber-900 font-medium whitespace-nowrap">
                {sessionStatus === 'CONNECTED' ? 'Listening...' : 'Connecting...'}
              </p>
            </div>
            <button
              onClick={handleVoiceToggle}
              className="flex items-center justify-center size-10 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-all"
              title="Stop"
            >
              <span className="material-symbols-outlined text-[18px]">stop</span>
            </button>
          </div>
        </div>
      )}

      {/* Chat Input - Show when in chat mode and voice is NOT active */}
      {isToday && interactionMode === 'chat' && !isVoiceActive && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-4xl px-6 z-50">
          <div className="bg-white border border-slate-200/60 rounded-xl shadow-lg p-4">
            <div className="flex items-end gap-4">
              <textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleChatSend();
                  }
                }}
                placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
                className="flex-1 min-h-[60px] max-h-[200px] px-4 py-3 rounded-lg border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50 resize-none text-slate-950 placeholder:text-slate-500 text-sm font-normal"
                disabled={isChatLoading}
                rows={1}
              />
              <button
                onClick={handleChatSend}
                disabled={!chatInput.trim() || isChatLoading}
                className="px-6 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all text-sm relative overflow-hidden min-w-[80px]"
              >
                {isChatLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>Sending...</span>
                  </span>
                ) : (
                  'Send'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Voice Toggle Button - Show when voice mode and voice is NOT active */}
      {isToday && interactionMode === 'voice' && !isVoiceActive && (
        <div className="fixed bottom-10 right-10 z-50">
          <button
            onClick={handleVoiceToggle}
            className="flex items-center justify-center size-16 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-xl hover:from-amber-600 hover:to-orange-600 hover:scale-110 hover:shadow-2xl transition-all animate-breathe"
            title="Start Voice Conversation"
          >
            <span className="material-symbols-outlined text-[32px]">mic</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default function DayViewPage() {
  return (
    <TranscriptProvider>
      <EventProvider>
        <DayViewContent />
      </EventProvider>
    </TranscriptProvider>
  );
}

