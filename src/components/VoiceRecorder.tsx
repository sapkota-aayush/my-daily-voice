import { useState, useEffect, useRef } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface VoiceRecorderProps {
  onTranscriptionComplete: (text: string) => void;
  isOpen: boolean;
  onClose: () => void;
  type: 'morning' | 'evening';
  isProcessing?: boolean;
}

export function VoiceRecorder({ onTranscriptionComplete, isOpen, onClose, type, isProcessing = false }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [hasRecognition, setHasRecognition] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Initialize speech recognition
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      const recognitionInstance = new SpeechRecognitionAPI();
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'en-US';
      
      recognitionInstance.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          }
        }
        if (finalTranscript) {
          setTranscript(prev => prev + finalTranscript);
        }
      };

      recognitionInstance.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
      };

      recognitionRef.current = recognitionInstance;
      setHasRecognition(true);
    }
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  useEffect(() => {
    if (!isOpen) {
      setDuration(0);
      setTranscript('');
      setIsRecording(false);
    }
  }, [isOpen]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = () => {
    setIsRecording(true);
    setTranscript('');
    try {
      recognitionRef.current?.start();
    } catch (e) {
      console.log('Speech recognition not available, using demo mode');
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    try {
      recognitionRef.current?.stop();
    } catch (e) {
      // Ignore
    }
    
    // Use transcript if we have one, otherwise use a demo transcript
    const finalTranscript = transcript.trim() || getDemoTranscript(type);
    onTranscriptionComplete(finalTranscript);
  };

  const getDemoTranscript = (recordingType: 'morning' | 'evening') => {
    if (recordingType === 'morning') {
      return "Today I want to review the project proposal, have a team standup meeting, finish the report draft, do some exercise, and read for 30 minutes.";
    }
    return "I completed the team standup and finished the report draft. I missed the exercise session because I had an unexpected meeting. Today I felt productive but a bit tired.";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm animate-fade-in-up">
      <div className="bg-card rounded-2xl shadow-medium p-8 max-w-sm w-full mx-4">
        <h3 className="font-display text-2xl text-center mb-2">
          {type === 'morning' ? 'Morning Plan' : 'Evening Check-In'}
        </h3>
        <p className="text-muted-foreground text-center text-sm mb-8">
          {type === 'morning' 
            ? 'Tell me what you want to accomplish today' 
            : 'Share what you completed and how you feel'}
        </p>

        <div className="flex flex-col items-center gap-6">
          {isProcessing ? (
            <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
          ) : (
            <div className="relative">
              {isRecording && (
                <div className="absolute inset-0 rounded-full bg-primary/20 animate-pulse-ring" />
              )}
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={cn(
                  "relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300",
                  isRecording 
                    ? "bg-destructive hover:bg-destructive/90" 
                    : "bg-primary hover:bg-primary/90 shadow-glow"
                )}
              >
                {isRecording ? (
                  <Square className="w-8 h-8 text-destructive-foreground fill-current" />
                ) : (
                  <Mic className="w-10 h-10 text-primary-foreground" />
                )}
              </button>
            </div>
          )}

          <div className="text-center">
            {isRecording && (
              <>
                <p className="text-2xl font-mono text-foreground">{formatDuration(duration)}</p>
                {transcript && (
                  <p className="text-sm text-muted-foreground mt-2 max-w-xs line-clamp-2">
                    "{transcript.slice(-100)}..."
                  </p>
                )}
              </>
            )}
            {isProcessing && (
              <p className="text-muted-foreground">AI is processing your thoughts...</p>
            )}
            {!isRecording && !isProcessing && (
              <p className="text-muted-foreground text-sm">
                {hasRecognition ? 'Tap to start recording' : 'Tap to use demo input'}
              </p>
            )}
          </div>
        </div>

        <Button
          variant="ghost"
          className="w-full mt-8"
          onClick={onClose}
          disabled={isProcessing}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
