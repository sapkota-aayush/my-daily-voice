# Final Fix: Supabase OAuth Redirect to Localhost

## The Problem
After OAuth login, users are being redirected to `http://localhost:3000` instead of your Vercel URL.

## Root Cause
Supabase needs your production URL in its **Redirect URLs** configuration. Even though the code uses `NEXT_PUBLIC_APP_URL`, Supabase's dashboard settings override this.

## Solution

### Step 1: Update Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Authentication** → **URL Configuration**
4. In **Redirect URLs**, make sure you have:
   ```
   https://my-daily-voice-icyg.vercel.app/auth/callback
   https://my-daily-voice-icyg.vercel.app/**
   ```
5. **Remove or keep** localhost (for development):
   ```
   http://localhost:3000/auth/callback
   ```
6. Click **Save**

### Step 2: Verify Vercel Environment Variables

Make sure you have in Vercel:
- ✅ `NEXT_PUBLIC_APP_URL` = `https://my-daily-voice-icyg.vercel.app`
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Step 3: Why Root URL Shows Login

If the root URL is showing login instead of dashboard, it might be:
1. **Browser cache** - Clear cache or use incognito
2. **Old deployment** - Wait for new deployment to finish
3. **Direct link** - Make sure you're visiting the root URL, not `/login`

## Code Changes Made

✅ Updated login page to use `NEXT_PUBLIC_APP_URL` for OAuth redirect
✅ Fixed branding consistency (Muse instead of vojur)
✅ Supabase client already uses `NEXT_PUBLIC_APP_URL`

## Test

1. Visit: `https://my-daily-voice-icyg.vercel.app`
2. Should see dashboard (not login)
3. Click "Sign in" → Should go to login page
4. After Google OAuth → Should redirect to Vercel URL (not localhost)

