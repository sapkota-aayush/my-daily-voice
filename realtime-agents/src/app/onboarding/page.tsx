'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { VoiceOrb, type VoiceStatus } from '@/app/components/VoiceOrb';
import { useRealtimeSession } from '@/app/hooks/useRealtimeSession';
import { onboardingScenario } from '@/app/agentConfigs/onboardingAgent';
import { TranscriptProvider, useTranscript } from '@/app/contexts/TranscriptContext';
import { EventProvider } from '@/app/contexts/EventContext';
import { useHandleSessionHistory } from '@/app/hooks/useHandleSessionHistory';
import { supabase } from '@/app/lib/supabase';
import { saveOnboardingTranscript, triggerMemoryExtraction } from '@/app/lib/onboarding';

const TOTAL_ONBOARDING_QUESTIONS = 20;

function OnboardingContent() {
  const router = useRouter();
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>('idle');
  const [isCompleted, setIsCompleted] = useState(false);
  const [questionsAsked, setQuestionsAsked] = useState(0);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const onboardingCompletedRef = useRef<boolean>(false);

  const { transcriptItems } = useTranscript();

  const {
    status: sessionStatus,
    connect,
    disconnect,
  } = useRealtimeSession({
    onConnectionChange: (s) => {
      if (s === 'CONNECTED') setVoiceStatus('listening');
      else if (s === 'CONNECTING') setVoiceStatus('connecting');
      else setVoiceStatus('idle');
    },
  });

  // Set up session history handling
  useHandleSessionHistory();

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

  // Check authentication (onboarding completion check removed - it's optional now)
  useEffect(() => {
    async function checkAuth() {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }
        // Onboarding is optional - no redirect if already completed
      } catch (error) {
        console.error('Error checking auth:', error);
        router.push('/login');
      }
    }

    checkAuth();
  }, [router]);

  const handleOnboardingComplete = useCallback(async (items: any[]) => {
    try {
      const transcript = items.map(item => ({
        role: item.role,
        content: item.title || '',
        timestamp: item.timestamp || new Date().toISOString(),
      }));

      const savedTranscript = await saveOnboardingTranscript(transcript);
      await triggerMemoryExtraction(savedTranscript.id, transcript);

      setIsCompleted(true);
      disconnect();

      // Redirect to calendar after a brief delay
      setTimeout(() => {
        router.push('/calendar');
      }, 1500);
    } catch (error: any) {
      console.error('Error completing onboarding:', error);
      setIsCompleted(true);
    }
  }, [router, disconnect]);

  // Track questions asked and detect completion
  useEffect(() => {
    if (isCompleted || onboardingCompletedRef.current) return;

    const allItems = transcriptItems.filter(item => item.type === 'MESSAGE' && item.status === 'DONE');
    const assistantItems = allItems.filter(item => item.role === 'assistant');
    
    // Count questions (assistant messages that end with ? or are questions)
    const questionCount = assistantItems.filter(item => {
      const text = (item.title || '').toLowerCase();
      return text.includes('?') || 
             text.startsWith('what') || 
             text.startsWith('how') || 
             text.startsWith('when') || 
             text.startsWith('where') || 
             text.startsWith('who') || 
             text.startsWith('why') ||
             text.startsWith('tell me') ||
             text.startsWith('can you');
    }).length;
    
    setQuestionsAsked(questionCount);

    const lastAssistantMessage = assistantItems[assistantItems.length - 1]?.title?.toLowerCase() || '';
    
    const onboardingCompletePhrases = [
      "let's start your first journal entry",
      "ready to start journaling",
      "great! i've learned a lot about you",
      "let's start your first journal",
    ];

    const isComplete = onboardingCompletePhrases.some(phrase => 
      lastAssistantMessage.includes(phrase)
    );

    if (isComplete && allItems.length > 0 && !onboardingCompletedRef.current) {
      onboardingCompletedRef.current = true;
      handleOnboardingComplete(allItems);
    }
  }, [transcriptItems, isCompleted, handleOnboardingComplete]);

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
    } else {
      try {
        await connect({
          getEphemeralKey: fetchEphemeralKey,
          initialAgents: onboardingScenario,
          audioElement: audioElementRef.current || undefined,
        });
      } catch (error) {
        console.error('Failed to connect:', error);
        setVoiceStatus('idle');
      }
    }
  };

  const isVoiceActive = sessionStatus === 'CONNECTED' || sessionStatus === 'CONNECTING';
  const questionsRemaining = Math.max(0, TOTAL_ONBOARDING_QUESTIONS - questionsAsked);
  const progressPercentage = Math.min(100, (questionsAsked / TOTAL_ONBOARDING_QUESTIONS) * 100);

  return (
    <div className="bg-white text-amber-900/80 font-sans min-h-screen overflow-x-hidden selection:bg-amber-200 selection:text-amber-900 flex flex-col">
      {/* Animated Background Blobs - subtle */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white via-amber-50/20 to-yellow-50/10"></div>
        <div className="absolute -top-[10%] -left-[10%] w-[50vw] h-[50vw] bg-amber-100/30 rounded-full mix-blend-multiply filter blur-[80px] opacity-40 animate-blob"></div>
        <div className="absolute top-[20%] -right-[15%] w-[45vw] h-[45vw] bg-yellow-100/30 rounded-full mix-blend-multiply filter blur-[80px] opacity-40 animate-blob" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center relative px-6 md:px-12 py-12">
        <div className="max-w-2xl w-full space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="font-serif text-4xl md:text-5xl text-amber-900/90 tracking-tight">
              Let's get to know you
            </h1>
            <p className="text-lg md:text-xl text-amber-900/70 font-serif font-normal max-w-xl mx-auto leading-relaxed">
              {isCompleted 
                ? "Perfect! We've learned a lot about you. Setting everything up..."
                : isVoiceActive
                  ? "I'm listening... Take your time and speak naturally."
                  : "We'll have a quick conversation so I can personalize your journaling experience. Just a few questions to get started."
              }
            </p>
          </div>

          {/* Progress Indicator - Only show when active */}
          {isVoiceActive && !isCompleted && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm text-amber-800/70">
                <span className="font-medium">Progress</span>
                <span className="font-semibold">
                  {questionsRemaining === 0 
                    ? "Almost done!" 
                    : questionsRemaining === 1
                      ? "1 question left"
                      : `${questionsRemaining} questions left`
                  }
                </span>
              </div>
              <div className="w-full h-2 bg-amber-100/50 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <p className="text-xs text-center text-amber-800/60">
                {questionsAsked > 0 
                  ? `You're doing great! ${questionsAsked} of ${TOTAL_ONBOARDING_QUESTIONS} questions completed.`
                  : "Getting started..."
                }
              </p>
            </div>
          )}

          {/* Voice Interface */}
          <div className="flex flex-col items-center pt-4">
            <VoiceOrb
              status={voiceStatus}
              isActive={isVoiceActive}
              onToggle={handleVoiceToggle}
            />
            {!isVoiceActive && !isCompleted && (
              <p className="mt-6 text-base text-amber-900/70 text-center max-w-md">
                Tap the button above when you're ready to begin. This is a one-time setup to personalize your experience.
              </p>
            )}
          </div>

          {/* Completion Message */}
          {isCompleted && (
            <div className="mt-8 p-6 bg-gradient-to-br from-amber-50/80 to-orange-50/60 rounded-2xl border border-amber-200/50 text-center">
              <div className="flex items-center justify-center gap-2 mb-3">
                <span className="material-symbols-outlined text-2xl text-amber-600">check_circle</span>
                <p className="text-lg font-semibold text-amber-900/90">
                  Onboarding completed!
                </p>
              </div>
              <p className="text-sm text-amber-900/70">
                Your preferences are being saved. Redirecting to your calendar...
              </p>
            </div>
          )}

          {/* Reassurance Message */}
          {isVoiceActive && !isCompleted && questionsAsked > 0 && (
            <div className="mt-6 p-4 bg-amber-50/40 rounded-xl border border-amber-200/30 text-center">
              <p className="text-sm text-amber-900/70">
                💭 Don't worry about perfect answers. Just share what comes to mind naturally.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <TranscriptProvider>
      <EventProvider>
        <OnboardingContent />
      </EventProvider>
    </TranscriptProvider>
  );
}
