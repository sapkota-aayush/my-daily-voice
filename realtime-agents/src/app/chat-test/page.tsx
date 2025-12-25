'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';
import { VoiceOrb, type VoiceStatus } from '@/app/components/VoiceOrb';
import { useRealtimeSession } from '@/app/hooks/useRealtimeSession';
import { RealtimeAgent } from '@openai/agents/realtime';
import { TranscriptProvider, useTranscript } from '@/app/contexts/TranscriptContext';
import { EventProvider } from '@/app/contexts/EventContext';
import { useHandleSessionHistory } from '@/app/hooks/useHandleSessionHistory';
import { getResponseWithMemory } from '@/app/lib/memoryTool';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  metadata?: {
    topic?: string;
    confidence?: number;
    shouldSearch?: boolean;
    memoriesFound?: number;
    memorySummary?: string | null;
    memoryAgentUsed?: boolean;
  };
}

function ChatTestContent() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showMetadata, setShowMetadata] = useState(true);
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>('idle');
  const [mode, setMode] = useState<'text' | 'voice'>('text');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const processedUserMessagesRef = useRef<Set<string>>(new Set());
  const isProcessingChatRef = useRef<boolean>(false);
  const responseTriggeredRef = useRef<boolean>(false);
  const connectionStatusRef = useRef<string>('DISCONNECTED');

  const { transcriptItems } = useTranscript();
  useHandleSessionHistory();
  
  // Restore conversation from Redis on mount (text mode only)
  useEffect(() => {
    if (mode !== 'text') return; // Only restore in text mode
    
    const restoreConversation = async () => {
      try {
        const userId = 'default-user';
        const date = new Date().toISOString().split('T')[0];
        
        const response = await fetch('/api/chat-test/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, date }),
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.messages && data.messages.length > 0) {
            // Restore messages to UI (for text mode)
            setMessages(data.messages.map((m: any) => ({
              role: m.role,
              content: m.content,
            })));
          }
        }
      } catch (error) {
        console.error('Failed to restore conversation:', error);
      }
    };
    
    restoreConversation();
  }, [mode]);

  // Create conversational agent - uses memory tool
  // IDENTICAL to chat system - just voice interaction
  const testAgent = new RealtimeAgent({
    name: 'testAgent',
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

  const {
    status: sessionStatus,
    connect,
    disconnect,
    sendEvent,
    sendUserText,
    interrupt,
  } = useRealtimeSession({
    onConnectionChange: async (s) => {
      console.log('[Voice Agent] Connection status changed:', s);
      connectionStatusRef.current = s; // Update ref with latest status
      
      if (s === 'CONNECTED') {
        setVoiceStatus('listening');
        
        // Configure VAD settings (same as chat - user speaks first)
        setTimeout(() => {
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
            console.error('Failed to update session:', err);
          }
        }, 500);
        
        // Check if there's existing conversation - if not, trigger greeting (SAME AS CHAT)
        const checkExistingConversation = async () => {
          try {
            const userId = 'default-user';
            const date = new Date().toISOString().split('T')[0];
            
            const response = await fetch('/api/chat-test/restore', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId, date }),
            });
            
            if (response.ok) {
              const data = await response.json();
              const hasExistingConversation = data.messages && data.messages.length > 0;
              
              // Only trigger greeting if NO existing conversation (SAME AS CHAT)
              if (!hasExistingConversation && !responseTriggeredRef.current) {
                responseTriggeredRef.current = true;
                
                // Wait for connection to be fully ready, then send "Hello" (SAME AS CHAT)
                setTimeout(() => {
                  try {
                    if (connectionStatusRef.current === 'CONNECTED') {
                      sendUserText('Hello');
                      // Agent will call tool, tool calls API, API returns greeting, agent speaks it
                    }
                  } catch (err: any) {
                    console.error('Failed to trigger greeting:', err);
                    responseTriggeredRef.current = false;
                  }
                }, 1000); // Wait 1 second for connection to stabilize
              }
            }
          } catch (error) {
            console.error('Failed to check existing conversation:', error);
          }
        };
        
        checkExistingConversation();
      } else if (s === 'CONNECTING') {
        setVoiceStatus('connecting');
      } else if (s === 'DISCONNECTED') {
        setVoiceStatus('idle');
        responseTriggeredRef.current = false;
      } else {
        setVoiceStatus('idle');
      }
    },
  });

  // Set up audio element
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

  // No interception needed - agent handles via tool

  // Store metadata for AI responses (keyed by content)
  const aiResponseMetadataRef = useRef<Map<string, ChatMessage['metadata']>>(new Map());

  // Sync transcript items to messages for display in voice mode
  useEffect(() => {
    if (mode !== 'voice') return;

    const voiceMessages: ChatMessage[] = transcriptItems
      .filter(item => 
        item.status === 'DONE' && 
        item.title && 
        item.title.trim() && 
        item.title !== '[Transcribing...]' &&
        item.title !== '[inaudible]'
      )
      .map(item => {
        let content = item.title || '';
        
        // Remove [SPEAK_ONLY] markers from display
        content = content.replace(/\[SPEAK_ONLY\]/g, '').replace(/\[\/SPEAK_ONLY\]/g, '');
        
        // Try to find metadata for this message (check both with and without markers)
        const metadata = aiResponseMetadataRef.current.get(content.trim()) || 
                        aiResponseMetadataRef.current.get((item.title || '').trim());
        
        return {
          role: item.role as 'user' | 'assistant',
          content,
          metadata,
        };
      });

    // Update messages - use transcriptItems as source of truth for voice mode
    setMessages(voiceMessages);
  }, [transcriptItems, mode]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchEphemeralKey = async (): Promise<string> => {
    const tokenResponse = await fetch("/api/session");
    const data = await tokenResponse.json();

    if (!data.client_secret?.value) {
      console.error("No ephemeral key provided by the server");
      throw new Error("No ephemeral key provided by the server");
    }

    return data.client_secret.value;
  };

  const handleVoiceToggle = async () => {
    if (sessionStatus === 'CONNECTED' || sessionStatus === 'CONNECTING') {
      disconnect();
      setVoiceStatus('idle');
      setMode('text');
      processedUserMessagesRef.current.clear();
      isProcessingChatRef.current = false;
    } else {
      try {
        setMode('voice');
        await connect({
          getEphemeralKey: fetchEphemeralKey,
          initialAgents: [testAgent],
          audioElement: audioElementRef.current || undefined,
        });
      } catch (error) {
        console.error('Failed to connect:', error);
        setVoiceStatus('idle');
        setMode('text');
      }
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const conversationHistory = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await fetch('/api/chat-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          conversationHistory,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to get response');
      }

      const data = await response.json();


      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.message,
        metadata: data.metadata,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `Error: ${error.message || 'Failed to get response'}`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = async () => {
    // Clear UI messages
    setMessages([]);
    processedUserMessagesRef.current.clear();
    
    // Clear Redis conversation data
    try {
      const userId = 'default-user'; // TODO: Get from auth
      const date = new Date().toISOString().split('T')[0];
      
      const response = await fetch('/api/chat-test/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, date }),
      });
      
      if (response.ok) {
        const data = await response.json();
      } else {
        console.error('Failed to clear Redis conversation');
      }
    } catch (error) {
      console.error('Error clearing Redis conversation:', error);
    }
  };

  const isVoiceActive = sessionStatus === 'CONNECTED' || sessionStatus === 'CONNECTING';

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-amber-200/50 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-amber-900">Chat Test - Two-Agent System</h1>
            <p className="text-sm text-amber-700/70 mt-1">
              Testing Memory Agent + Conversational Agent {mode === 'voice' && '(Voice Mode)'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-amber-800">
              <input
                type="checkbox"
                checked={showMetadata}
                onChange={(e) => setShowMetadata(e.target.checked)}
                className="rounded"
              />
              Show Metadata
            </label>
            <button
              onClick={clearChat}
              className="px-4 py-2 text-sm bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg transition-colors"
            >
              Clear Chat
            </button>
            <button
              onClick={handleVoiceToggle}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                isVoiceActive
                  ? 'bg-red-100 hover:bg-red-200 text-red-900'
                  : 'bg-amber-600 hover:bg-amber-700 text-white'
              }`}
            >
              {isVoiceActive ? 'Stop Voice' : 'Start Voice'}
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 text-sm bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* Voice Orb - Fixed Position */}
      {mode === 'voice' && (
        <div className="fixed bottom-24 right-6 z-50">
          <VoiceOrb
            status={voiceStatus}
            isActive={isVoiceActive}
            onToggle={handleVoiceToggle}
          />
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="inline-block p-6 bg-white/60 rounded-2xl border border-amber-200/50">
                <h2 className="text-xl font-semibold text-amber-900 mb-2">
                  Two-Agent System Test
                </h2>
                <p className="text-amber-700/80 mb-4">
                  This chat tests the Memory Agent + Conversational Agent system.
                </p>
                <div className="text-left text-sm text-amber-700/70 space-y-2 max-w-md mx-auto">
                  <p><strong>Memory Agent:</strong> Extracts topic, assesses confidence, searches memories</p>
                  <p><strong>Conversational Agent:</strong> Generates personalized responses</p>
                  <p className="mt-4 text-xs">
                    Try messages like: "I'm stressed about deadlines again" or "I want to start going to the gym"
                  </p>
                  <p className="mt-2 text-xs font-semibold">
                    Click "Start Voice" to test with voice interaction!
                  </p>
                </div>
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-6 py-4 ${
                  msg.role === 'user'
                    ? 'bg-amber-600 text-white'
                    : 'bg-white/90 text-amber-900 border border-amber-200/50'
                }`}
              >
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>

                {/* Metadata */}
                {showMetadata && msg.metadata && (
                  <div className="mt-4 pt-4 border-t border-amber-200/50 text-xs space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="font-semibold text-amber-700">Topic:</span>{' '}
                        <span className="text-amber-600">{msg.metadata.topic || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-amber-700">Confidence:</span>{' '}
                        <span className="text-amber-600">{msg.metadata.confidence ?? 'N/A'}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-amber-700">Should Search:</span>{' '}
                        <span className="text-amber-600">
                          {msg.metadata.shouldSearch ? 'Yes' : 'No'}
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-amber-700">Memories Found:</span>{' '}
                        <span className="text-amber-600">{msg.metadata.memoriesFound ?? 0}</span>
                      </div>
                    </div>
                    {msg.metadata.memorySummary && (
                      <div className="mt-2 p-2 bg-amber-50/50 rounded border border-amber-200/30">
                        <span className="font-semibold text-amber-700">Memory Summary:</span>
                        <p className="text-amber-700/80 mt-1">{msg.metadata.memorySummary}</p>
                      </div>
                    )}
                    {msg.metadata.memoryAgentUsed && (
                      <div className="mt-2 text-xs text-amber-600 font-medium">
                        ✓ Memory Agent used - response includes memory context
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && mode === 'text' && (
            <div className="flex justify-start">
              <div className="bg-white/90 rounded-2xl px-6 py-4 border border-amber-200/50">
                <div className="flex items-center gap-2 text-amber-700">
                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  <span className="ml-2 text-sm">Processing...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input - Only show in text mode */}
      {mode === 'text' && (
        <div className="bg-white/80 backdrop-blur-sm border-t border-amber-200/50 px-6 py-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-end gap-4">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
                className="flex-1 min-h-[60px] max-h-[200px] px-4 py-3 rounded-xl border border-amber-300/50 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 resize-none text-amber-900 placeholder:text-amber-400"
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="px-6 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ChatTestPage() {
  return (
    <EventProvider>
      <TranscriptProvider>
        <ChatTestContent />
      </TranscriptProvider>
    </EventProvider>
  );
}
