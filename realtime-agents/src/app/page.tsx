'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabase';

export default function HomePage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  
  // Check authentication - but don't redirect, just track state
  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setIsAuthenticated(!!session);
      } catch (error) {
        console.error('Error checking auth:', error);
        setIsAuthenticated(false);
      } finally {
        setCheckingAuth(false);
      }
    }
    checkAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  const rotatingRealizedTexts = [
    "Today I realized...",
    "I'm grateful for...",
    "What I learned today...",
    "I'm feeling...",
    "Something that surprised me...",
    "I want to remember...",
  ];
  
  const [currentRealizedIndex, setCurrentRealizedIndex] = useState(0);
  const [isRealizedAnimating, setIsRealizedAnimating] = useState(false);
  
  useEffect(() => {
    const realizedInterval = setInterval(() => {
      setIsRealizedAnimating(true);
      setTimeout(() => {
        setCurrentRealizedIndex((prev) => (prev + 1) % rotatingRealizedTexts.length);
        setIsRealizedAnimating(false);
      }, 500);
    }, 3000);
    
    return () => clearInterval(realizedInterval);
  }, [rotatingRealizedTexts.length]);

  const handleGetStarted = async () => {
    if (isAuthenticated) {
      router.push('/calendar');
    } else {
      // Redirect to login if not authenticated
      router.push('/login');
    }
  };

  const handleSignIn = () => {
    router.push('/login');
  };
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
  };

  // Show loading while checking auth
  if (checkingAuth) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-400/30 border-t-amber-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-white text-amber-900/80 font-sans antialiased selection:bg-amber-200 selection:text-amber-900 overflow-x-hidden min-h-screen flex flex-col">
      {/* Animated Background Blobs - brighter and more vibrant */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white via-amber-50/50 to-yellow-50/40"></div>
        <div className="absolute top-0 left-0 w-full h-full aurora-bg opacity-100"></div>
        <div className="absolute -top-[10%] -left-[10%] w-[60vw] h-[60vw] bg-amber-200/70 rounded-full mix-blend-multiply filter blur-[90px] opacity-80 animate-blob"></div>
        <div className="absolute top-[15%] -right-[15%] w-[55vw] h-[55vw] bg-yellow-200/70 rounded-full mix-blend-multiply filter blur-[90px] opacity-80 animate-blob" style={{ animationDelay: '2s' }}></div>
        <div className="absolute -bottom-[20%] left-[20%] w-[60vw] h-[60vw] bg-orange-100/60 rounded-full mix-blend-multiply filter blur-[100px] opacity-70 animate-blob" style={{ animationDelay: '4s' }}></div>
      </div>

      {/* Header */}
      <nav className="w-full py-4 px-6 md:px-12 flex justify-between items-center z-50 relative">
        {/* Bright overlay for navbar */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-amber-50/20 to-transparent pointer-events-none"></div>
        <Link href="/" className="flex items-center gap-2 group cursor-pointer relative z-10">
          <span className="material-symbols-outlined text-3xl text-amber-600 group-hover:text-amber-800 transition-colors duration-500">spa</span>
          <span className="font-serif italic text-2xl font-medium tracking-tight text-amber-900/90">Muse</span>
          <span className="px-2 py-0.5 text-xs font-semibold text-amber-700 bg-amber-100 rounded-full border border-amber-200">
            BETA
          </span>
        </Link>
        <div className="hidden md:flex items-center gap-10 text-sm font-medium text-amber-800/80 relative z-10">
          <Link href="/metrics" className="hover:text-amber-900 transition-colors relative group">
            Metrics
            <span className="absolute -bottom-1 left-0 w-0 h-px bg-amber-500 transition-all duration-300 group-hover:w-full"></span>
          </Link>
          <Link href="/calendar" className="hover:text-amber-900 transition-colors relative group">
            Calendar
            <span className="absolute -bottom-1 left-0 w-0 h-px bg-amber-500 transition-all duration-300 group-hover:w-full"></span>
          </Link>
          <Link href="#" className="hover:text-amber-900 transition-colors relative group">
            Manifesto
            <span className="absolute -bottom-1 left-0 w-0 h-px bg-amber-500 transition-all duration-300 group-hover:w-full"></span>
          </Link>
          <Link href="#" className="hover:text-amber-900 transition-colors relative group">
            Pricing
            <span className="absolute -bottom-1 left-0 w-0 h-px bg-amber-500 transition-all duration-300 group-hover:w-full"></span>
          </Link>
          {isAuthenticated ? (
            <button 
              onClick={handleLogout}
              className="px-6 py-2.5 rounded-full border border-amber-200/60 hover:border-amber-300 hover:bg-amber-50/80 text-amber-800/90 hover:text-amber-900 transition-all duration-300 backdrop-blur-sm bg-white/60"
            >
              Sign out
            </button>
          ) : (
            <button 
              onClick={handleSignIn}
              className="px-6 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 transition-all duration-300 shadow-md hover:shadow-lg"
            >
              Sign in
            </button>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="w-full max-w-[1400px] mx-auto px-6 md:px-12 flex-1 flex flex-col items-center">
        {/* Hero Section */}
        <section className="w-full flex flex-col items-center justify-center pt-8 pb-12 md:pt-12 md:pb-16 text-center relative z-10">
          {/* Bright golden background overlay */}
          <div className="absolute inset-0 top-0 bottom-1/2 pointer-events-none" style={{ background: 'radial-gradient(ellipse 120% 80% at 50% 0%, rgba(251, 191, 36, 0.12) 0%, rgba(251, 191, 36, 0.08) 25%, rgba(251, 191, 36, 0.04) 50%, transparent 80%)' }}></div>
          <div className="absolute inset-0 top-0 bottom-1/2 pointer-events-none" style={{ background: 'radial-gradient(ellipse 100% 60% at 50% 10%, rgba(251, 191, 36, 0.10) 0%, rgba(251, 191, 36, 0.06) 40%, transparent 70%)' }}></div>
          {/* Bright overlay */}
          <div className="absolute inset-0 top-0 bottom-1/2 bg-gradient-to-b from-white/50 via-amber-50/30 to-transparent pointer-events-none"></div>
          
          <div className="animate-fade-up opacity-0 flex flex-col items-center gap-4 max-w-4xl mx-auto relative z-10">
            <div className="inline-flex items-center gap-2.5 py-1.5 px-4 rounded-full border border-amber-300/70 bg-gradient-to-r from-amber-50 to-orange-50 backdrop-blur-md shadow-sm mb-2 hover:from-amber-100 hover:to-orange-100 transition-all duration-500 group cursor-default relative overflow-hidden animate-badge-pulse">
              <span className="absolute inset-0 animate-shimmer"></span>
              <span className="relative z-10 w-2 h-2 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 group-hover:from-amber-600 group-hover:to-orange-600 transition-colors animate-dot-pulse"></span>
              <span className="relative z-10 text-xs font-bold tracking-widest uppercase text-amber-800 group-hover:text-orange-900 transition-colors">
                Voice-First Journaling
              </span>
            </div>
            <h1 className="text-5xl md:text-7xl lg:text-[6rem] font-serif leading-[0.95] text-balance text-amber-900/90 tracking-tight drop-shadow-sm">
              A quiet place to <br className="hidden md:block"/>
              <span className="relative inline-block italic text-amber-800/70">
                <span className="absolute inset-0 translate-x-[4px] translate-y-[12px] blur-[14px] opacity-20" style={{ color: 'rgba(180, 83, 9, 0.3)' }}>
                  Reflect
                </span>
                <span className="relative z-10">Reflect</span>
              </span>
            </h1>
            <p className="text-lg md:text-2xl text-amber-900/75 max-w-xl leading-relaxed font-serif font-normal mt-2 text-balance animate-fade-up opacity-0" style={{ animationDelay: '0.3s' }}>
              Talk freely. Reflect gently. Muse is your private sanctuary to untangle your thoughts without judgment.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4 mt-6">
              <button 
                onClick={handleGetStarted}
                className="group relative overflow-hidden rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 px-10 py-4 text-white transition-all duration-300 hover:shadow-2xl hover:shadow-amber-400/60 hover:-translate-y-1 active:translate-y-0"
              >
                {/* Animated gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-amber-600/20 via-transparent to-amber-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                <span className="relative z-10 flex items-center gap-3 text-lg font-semibold">
                  <span className="material-symbols-outlined text-xl group-hover:scale-110 transition-transform duration-300">mic</span>
                  <span>Start Journaling</span>
                  <span className="material-symbols-outlined text-xl group-hover:translate-x-1 transition-transform duration-300">arrow_forward</span>
                </span>
              </button>
              <button className="group relative flex items-center gap-3 px-8 py-4 rounded-full bg-white/90 border-2 border-amber-300/70 hover:bg-white hover:border-amber-400 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 overflow-hidden">
                {/* Ripple effect background */}
                <div className="absolute inset-0 bg-gradient-to-br from-amber-200/60 to-orange-200/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <span className="relative z-10 w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center text-amber-900 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 shadow-md group-hover:shadow-lg">
                  <span className="material-symbols-outlined text-[22px] ml-0.5 text-amber-900">play_arrow</span>
                </span>
                <span className="relative z-10 text-base font-semibold text-amber-900 group-hover:text-amber-900 transition-colors">Listen to a sample</span>
              </button>
            </div>
          </div>
        </section>

        {/* Central Animation Section - Popping Up */}
        <section className="w-full mb-16 animate-fade-up opacity-0 delay-[200ms] relative">
          {/* Balanced background overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-slate-50/40 via-purple-50/30 to-amber-50/25 pointer-events-none rounded-[2rem] md:rounded-[3rem]"></div>
          
          <div className="relative w-full aspect-[16/9] md:aspect-[2.8/1] overflow-hidden rounded-[2rem] md:rounded-[3rem] shadow-2xl shadow-slate-200/40 group border border-slate-200/60 bg-white">
            {/* Balanced gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-white via-slate-50/50 to-purple-50/40">
              {/* Balanced blobs - mix of neutrals and warm accents */}
              <div className="absolute inset-0 opacity-65 mix-blend-multiply filter blur-[60px]">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-tr from-slate-100/50 via-purple-100/40 to-amber-100/30 animate-float-slow"></div>
                <div className="absolute top-[20%] left-[25%] w-[45%] h-[45%] bg-purple-200/60 rounded-full animate-blob"></div>
                <div className="absolute bottom-[10%] right-[15%] w-[40%] h-[40%] bg-slate-200/50 rounded-full animate-blob" style={{ animationDelay: '2s' }}></div>
                <div className="absolute top-[40%] right-[40%] w-[30%] h-[30%] bg-amber-200/40 rounded-full animate-blob" style={{ animationDelay: '4s' }}></div>
              </div>
              
              {/* Subtle paper texture pattern */}
              <div className="absolute inset-0 opacity-[0.02] bg-[radial-gradient(circle_at_1px_1px,_rgba(0,0,0,0.1)_1px,_transparent_0)] bg-[length:20px_20px]"></div>
              
              {/* Balanced light rays */}
              <div className="absolute inset-0 opacity-25">
                <div className="absolute top-0 left-[20%] w-px h-full bg-gradient-to-b from-transparent via-purple-200/40 to-transparent transform rotate-12"></div>
                <div className="absolute top-0 right-[30%] w-px h-full bg-gradient-to-b from-transparent via-amber-200/30 to-transparent transform -rotate-12"></div>
              </div>
              
              {/* Floating particles */}
              <div className="absolute inset-0 overflow-hidden">
                {[0.1, 0.3, 0.5, 0.7, 0.9, 0.2, 0.4, 0.6, 0.8, 0.15, 0.45, 0.75].map((seed, i) => (
                  <div
                    key={i}
                    className="absolute w-1.5 h-1.5 rounded-full bg-purple-300/40 animate-float-slow"
                    style={{
                      left: `${seed * 100}%`,
                      top: `${(seed * 0.7 + 0.1) * 100}%`,
                      animationDelay: `${seed * 5}s`,
                      animationDuration: `${8 + seed * 4}s`,
                    }}
                  />
                ))}
              </div>
            </div>
            
            {/* Popping Animation Card */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-[85%] md:w-[55%] h-[60%] glass-panel rounded-2xl md:rounded-3xl overflow-hidden flex flex-col items-center justify-center p-6 md:p-8 transition-transform duration-700 hover:scale-[1.02] animate-pop bg-white/95 backdrop-blur-xl border border-white/80 shadow-2xl">
                {/* Decorative corner elements */}
                <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-purple-200/40 rounded-tl-lg"></div>
                <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-amber-200/40 rounded-tr-lg"></div>
                <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-purple-200/40 rounded-bl-lg"></div>
                <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-amber-200/40 rounded-br-lg"></div>
                
                {/* Audio Waveform Visualization */}
                <div className="flex items-center justify-center gap-2 md:gap-3 h-16 md:h-24 w-full relative z-10">
                  <div className="w-1.5 md:w-2.5 bg-gradient-to-t from-purple-400 to-pink-400 rounded-full animate-[pulse_1.5s_ease-in-out_infinite] h-8"></div>
                  <div className="w-1.5 md:w-2.5 bg-gradient-to-t from-emerald-400 to-teal-400 rounded-full animate-[pulse_1.2s_ease-in-out_infinite] h-12"></div>
                  <div className="w-1.5 md:w-2.5 bg-gradient-to-t from-amber-400 to-orange-400 rounded-full animate-[pulse_1.8s_ease-in-out_infinite] h-20"></div>
                  <div className="w-1.5 md:w-2.5 bg-gradient-to-t from-slate-400 to-gray-400 rounded-full animate-[pulse_2s_ease-in-out_infinite] h-14"></div>
                  <div className="w-1.5 md:w-2.5 bg-gradient-to-t from-purple-500 to-pink-500 rounded-full animate-[pulse_1.6s_ease-in-out_infinite] h-24"></div>
                  <div className="w-1.5 md:w-2.5 bg-gradient-to-t from-emerald-500 to-teal-500 rounded-full animate-[pulse_1.3s_ease-in-out_infinite] h-16"></div>
                  <div className="w-1.5 md:w-2.5 bg-gradient-to-t from-amber-500 to-orange-500 rounded-full animate-[pulse_1.5s_ease-in-out_infinite] h-10"></div>
                  <div className="w-1.5 md:w-2.5 bg-gradient-to-t from-slate-500 to-gray-500 rounded-full animate-[pulse_1.9s_ease-in-out_infinite] h-6"></div>
                </div>
                
                {/* Text Below Waveform */}
                <div className="mt-6 text-center opacity-0 animate-[fadeUp_1s_ease-out_1s_forwards] h-12 md:h-16 flex items-center justify-center overflow-hidden relative z-10">
                  <p 
                    className={`font-serif italic text-2xl md:text-3xl text-slate-800 transition-all duration-500 ${
                      isRealizedAnimating 
                        ? 'opacity-0 -translate-y-4 scale-95' 
                        : 'opacity-100 translate-y-0 scale-100'
                    }`}
                    key={currentRealizedIndex}
                  >
                    "{rotatingRealizedTexts[currentRealizedIndex]}"
                  </p>
                </div>
              </div>
            </div>
            
            {/* Balanced top gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-50/40 to-transparent pointer-events-none"></div>
          </div>
        </section>

        {/* Feature Cards Section */}
        <section className="w-full max-w-5xl mx-auto pb-16 relative">
          {/* Bright overlay for feature cards */}
          <div className="absolute inset-0 bg-gradient-to-b from-amber-50/30 via-transparent to-transparent pointer-events-none"></div>
          
          <div className="grid md:grid-cols-3 gap-6 md:gap-8 relative z-10">
            {/* Speak Freely */}
            <div className="flex flex-col gap-4 group cursor-default p-6 rounded-2xl bg-gradient-to-br from-blue-50/60 to-indigo-50/40 border border-blue-200/50 hover:from-blue-50/80 hover:to-indigo-50/60 hover:border-blue-300/70 transition-all duration-500 shadow-lg hover:shadow-xl hover:shadow-blue-200/30">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center relative overflow-hidden group-hover:scale-110 transition-transform duration-500 border border-blue-200/50">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-300/40 to-indigo-300/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <span className="material-symbols-outlined text-3xl text-blue-600 relative z-10">mic</span>
              </div>
              <div className="flex flex-col gap-2.5">
                <h3 className="text-xl md:text-2xl font-serif text-amber-900/90 group-hover:text-amber-900 transition-colors">Speak Freely</h3>
                <p className="text-amber-900/70 text-sm leading-relaxed">
                  No typing needed. Just press record and let your stream of consciousness flow naturally.
                </p>
              </div>
            </div>

            {/* Reflect Gently */}
            <div className="flex flex-col gap-4 group cursor-default md:mt-8 p-6 rounded-2xl bg-gradient-to-br from-purple-50/60 to-pink-50/40 border border-purple-200/50 hover:from-purple-50/80 hover:to-pink-50/60 hover:border-purple-300/70 transition-all duration-500 shadow-lg hover:shadow-xl hover:shadow-purple-200/30">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center relative overflow-hidden group-hover:scale-110 transition-transform duration-500 border border-purple-200/50">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-300/40 to-pink-300/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <span className="material-symbols-outlined text-3xl text-purple-600 relative z-10">auto_awesome</span>
              </div>
              <div className="flex flex-col gap-2.5">
                <h3 className="text-xl md:text-2xl font-serif text-amber-900/90 group-hover:text-amber-900 transition-colors">Reflect Gently</h3>
                <p className="text-amber-900/70 text-sm leading-relaxed">
                  We organize your chaotic thoughts into clear, summarized insights you can look back on.
                </p>
              </div>
            </div>

            {/* Private Forever */}
            <div className="flex flex-col gap-4 group cursor-default p-6 rounded-2xl bg-gradient-to-br from-emerald-50/60 to-teal-50/40 border border-emerald-200/50 hover:from-emerald-50/80 hover:to-teal-50/60 hover:border-emerald-300/70 transition-all duration-500 shadow-lg hover:shadow-xl hover:shadow-emerald-200/30">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center relative overflow-hidden group-hover:scale-110 transition-transform duration-500 border border-emerald-200/50">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-300/40 to-teal-300/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <span className="material-symbols-outlined text-3xl text-emerald-600 relative z-10">lock</span>
              </div>
              <div className="flex flex-col gap-2.5">
                <h3 className="text-xl md:text-2xl font-serif text-amber-900/90 group-hover:text-amber-900 transition-colors">Private Forever</h3>
                <p className="text-amber-900/70 text-sm leading-relaxed">
                  Your mind is your own. Your data is fully encrypted and private by design.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-amber-100/50 py-8 bg-white/60 backdrop-blur-md mt-auto">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 flex flex-col md:flex-row justify-between items-center gap-6">
          <Link href="/" className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-all duration-500 cursor-pointer">
            <span className="material-symbols-outlined text-xl text-amber-600">spa</span>
            <span className="font-serif italic text-lg tracking-wide text-amber-900/90">Muse</span>
          </Link>
          <div className="flex gap-8 text-xs text-amber-800/70 font-medium">
            <a href="#" className="hover:text-amber-900 transition-colors">Privacy</a>
            <a href="#" className="hover:text-amber-900 transition-colors">Terms</a>
            <a href="#" className="hover:text-amber-900 transition-colors">Twitter</a>
          </div>
          <p className="text-xs text-amber-800/60 font-medium tracking-wide">
            © 2024 Muse Inc.
          </p>
        </div>
      </footer>
    </div>
  );
}
