const ONBOARDING_COMPLETED_KEY = 'onboarding_completed';
const ONBOARDING_IN_PROGRESS_KEY = 'onboarding_in_progress';

export function isOnboardingCompleted(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(ONBOARDING_COMPLETED_KEY) === 'true';
}

export function markOnboardingCompleted(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
  localStorage.removeItem(ONBOARDING_IN_PROGRESS_KEY);
}

export function isOnboardingInProgress(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(ONBOARDING_IN_PROGRESS_KEY) === 'true';
}

export function markOnboardingInProgress(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ONBOARDING_IN_PROGRESS_KEY, 'true');
}

import { supabase } from './supabase';

export async function saveOnboardingTranscript(transcript: Array<{ role: string; content: string; timestamp?: string }>) {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User must be authenticated to save onboarding transcript');
  }

  const { data, error } = await supabase
    .from('onboarding_transcripts')
    .insert({
      user_id: user.id,
      transcript: transcript,
      completed_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving onboarding transcript:', error);
    throw error;
  }

  return data;
}

export async function triggerMemoryExtraction(transcriptId: string, transcript: any[]) {
  try {
    const response = await fetch('/api/extract-memory', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transcriptId,
        transcript,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText };
      }
      throw new Error(errorData.error || errorData.details || `HTTP ${response.status}: Failed to extract memories`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('Error extracting memories:', error);
    throw error;
  }
}
