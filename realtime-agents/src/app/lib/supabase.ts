import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (supabaseClient) {
    return supabaseClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // In production, log error but don't crash - return a mock client
    if (typeof window !== 'undefined') {
      console.error('Supabase environment variables are missing!');
    }
    // Return a minimal mock client to prevent crashes
    return {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signOut: async () => ({ error: null }),
        getUser: async () => ({ data: { user: null }, error: null }),
      },
    } as any;
  }

  // Get the site URL from environment or use current origin
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 
    (typeof window !== 'undefined' ? window.location.origin : '');

  supabaseClient = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      flowType: 'pkce',
      redirectTo: siteUrl ? `${siteUrl}/auth/callback` : undefined,
    },
  });

  return supabaseClient;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient();
    const value = (client as any)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});

// Types for our database
export interface DailyReflection {
  id: string;
  date: string;
  mood: string | null;
  reflection_summary: string | null;
  selfie_url: string | null;
  completion_rate: number;
  morning_plan_recorded: boolean;
  evening_checkin_recorded: boolean;
}

