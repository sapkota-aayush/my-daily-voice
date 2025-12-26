'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated
    async function checkAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // If already logged in, redirect to dashboard
          router.push('/');
          return;
        }
        setCheckingAuth(false);
      } catch (error) {
        console.error('Error checking auth:', error);
        setCheckingAuth(false);
      }
    }
    checkAuth();
  }, [router]);

  const handleOAuthLogin = async (provider: 'google' | 'apple' | 'facebook') => {
    setLoading(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
        (typeof window !== 'undefined' ? window.location.origin : '');
      const redirectUrl = `${baseUrl}/auth/callback`;
      
      // Only enable Google for now
      if (provider === 'google') {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUrl,
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            },
          },
        });
        
        if (error) {
          console.error('OAuth error:', error);
          setLoading(false);
          // Show error to user (you can add a toast/alert here)
          alert('Failed to sign in with Google. Please try again.');
        }
        // If successful, user will be redirected to Google, then back to callback
      } else {
        // Apple and Facebook not implemented yet
        alert(`${provider.charAt(0).toUpperCase() + provider.slice(1)} authentication is coming soon!`);
        setLoading(false);
      }
    } catch (error: any) {
      console.error('OAuth login error:', error);
      setLoading(false);
      alert('An error occurred during sign in. Please try again.');
    }
  };

  if (checkingAuth) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-400/30 border-t-amber-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-white text-amber-900/80 font-sans min-h-screen overflow-x-hidden selection:bg-amber-200 selection:text-amber-900 flex flex-col">
      {/* Animated Background Blobs */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white via-amber-50/30 to-yellow-50/20"></div>
        <div className="absolute -top-[10%] -left-[10%] w-[60vw] h-[60vw] bg-amber-100/50 rounded-full mix-blend-multiply filter blur-[90px] opacity-60 animate-blob"></div>
        <div className="absolute top-[15%] -right-[15%] w-[55vw] h-[55vw] bg-yellow-100/50 rounded-full mix-blend-multiply filter blur-[90px] opacity-60 animate-blob" style={{ animationDelay: '2s' }}></div>
        <div className="absolute -bottom-[20%] left-[20%] w-[60vw] h-[60vw] bg-orange-50/40 rounded-full mix-blend-multiply filter blur-[100px] opacity-50 animate-blob" style={{ animationDelay: '4s' }}></div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 md:px-12 py-20">
        <div className="w-full max-w-md">
          {/* Logo/Title */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2 mb-6">
              <span className="material-symbols-outlined text-4xl text-amber-600">spa</span>
              <span className="font-serif italic text-4xl font-medium tracking-tight text-amber-900/90">Vojur</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-serif text-amber-900/90 mb-3">
              Welcome back
            </h1>
            <p className="text-amber-900/70 text-lg">
              Sign in to continue your journaling journey
            </p>
          </div>

          {/* OAuth Buttons */}
          <div className="space-y-4">
            {/* Google - Primary */}
            <button
              onClick={() => handleOAuthLogin('google')}
              disabled={loading}
              className="w-full group relative overflow-hidden rounded-full bg-white border-2 border-amber-200/60 hover:border-amber-300 px-6 py-4 text-amber-900/80 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="text-base font-semibold">Continue with Google</span>
            </button>

            {/* Apple - Secondary */}
            <button
              onClick={() => handleOAuthLogin('apple')}
              disabled={loading}
              className="w-full group relative overflow-hidden rounded-full bg-white border-2 border-amber-200/60 hover:border-amber-300 px-6 py-4 text-amber-900/80 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              <span className="text-base font-semibold">Continue with Apple</span>
            </button>

            {/* Facebook - Secondary */}
            <button
              onClick={() => handleOAuthLogin('facebook')}
              disabled={loading}
              className="w-full group relative overflow-hidden rounded-full bg-white border-2 border-amber-200/60 hover:border-amber-300 px-6 py-4 text-amber-900/80 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <span className="text-base font-semibold">Continue with Facebook</span>
            </button>
          </div>

          {/* Footer */}
          <p className="text-center text-sm text-amber-800/60 mt-8">
            By continuing, you agree to Vojur's Terms of Service and Privacy Policy
          </p>
        </div>
      </main>
    </div>
  );
}
