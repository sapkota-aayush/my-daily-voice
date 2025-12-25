import { supabase } from './supabase';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function getCurrentUser(): Promise<User | null> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error('Error getting current user:', error);
    return null;
  }
  return user;
}

export async function getSession() {
  return await supabase.auth.getSession();
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}

/**
 * Get authenticated user ID from request (server-side)
 * Returns null if not authenticated
 * 
 * Note: This function reads the session from cookies in the request.
 * The userId should ideally be passed from the client, but this provides a fallback.
 */
export async function getAuthenticatedUserId(): Promise<string | null> {
  try {
    // Create a server-side Supabase client with cookies
    const cookieStore = await cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase env vars not set, cannot get authenticated user');
      return null;
    }

    const serverSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storage: {
          getItem: (key: string) => {
            const cookie = cookieStore.get(key);
            return cookie?.value || null;
          },
          setItem: (key: string, value: string) => {
            // Don't set cookies in server-side context
          },
          removeItem: (key: string) => {
            // Don't remove cookies in server-side context
          },
        },
      },
    });

    const { data: { user }, error } = await serverSupabase.auth.getUser();
    
    if (error || !user) {
      return null;
    }

    return user.id;
  } catch (error) {
    console.error('Error getting authenticated user ID:', error);
    return null;
  }
}
