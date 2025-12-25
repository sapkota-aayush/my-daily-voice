# Debugging Guide - Root URL and OAuth Issues

## Problem Summary
1. Root URL (`/`) is showing login page instead of dashboard
2. OAuth redirects to localhost instead of Vercel URL

## Step-by-Step Debugging

### Step 1: Verify Deployment
1. Go to Vercel Dashboard → Your Project → Deployments
2. Check the **latest deployment**:
   - Is it successful? (green checkmark)
   - What commit is it deploying? (should be latest)
   - When was it deployed? (should be recent)

### Step 2: Check Environment Variables in Vercel
Go to Vercel → Settings → Environment Variables and verify:

**REQUIRED:**
- ✅ `NEXT_PUBLIC_SUPABASE_URL` (not VITE_SUPABASE_URL)
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` (not VITE_SUPABASE_PUBLISHABLE_KEY)
- ✅ `NEXT_PUBLIC_APP_URL` = `https://my-daily-voice-icyg.vercel.app`
- ✅ `OPENAI_API_KEY`
- ✅ `UPSTASH_REDIS_URL`
- ✅ `UPSTASH_REDIS_TOKEN`
- ✅ `MEM0_API_KEY`

**DELETE THESE (wrong):**
- ❌ `VITE_SUPABASE_URL`
- ❌ `VITE_SUPABASE_PUBLISHABLE_KEY`
- ❌ `VITE_SUPABASE_PROJECT_ID`

### Step 3: Check Browser Console
1. Open your Vercel URL: `https://my-daily-voice-icyg.vercel.app`
2. Open browser DevTools (F12 or Cmd+Option+I)
3. Go to Console tab
4. Look for:
   - `[ROOT PAGE]` logs (should see "Checking auth..." and "showing dashboard")
   - Any errors (red text)
   - Supabase errors

### Step 4: Clear Everything and Test
1. **Hard refresh**: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
2. **Or use incognito/private window**
3. Visit: `https://my-daily-voice-icyg.vercel.app` (root URL, not `/login`)

### Step 5: Check Supabase Redirect URLs
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Your Project → Authentication → URL Configuration
3. **Redirect URLs** should have:
   ```
   https://my-daily-voice-icyg.vercel.app/auth/callback
   https://my-daily-voice-icyg.vercel.app/**
   ```
4. **Site URL** should be:
   ```
   https://my-daily-voice-icyg.vercel.app
   ```

### Step 6: Force Redeploy
If nothing works:
1. Go to Vercel Dashboard → Your Project
2. Click "Redeploy" on the latest deployment
3. Or make a small change and push to trigger new deployment

## What Should Happen

### Root URL (`/`)
- Should show dashboard immediately
- Should NOT redirect to login
- Should show "Sign in" button if not authenticated
- Console should show: `[ROOT PAGE] Auth check complete, showing dashboard`

### OAuth Flow
1. Click "Sign in" → Goes to `/login`
2. Click "Continue with Google" → Redirects to Google
3. After Google auth → Should redirect to: `https://my-daily-voice-icyg.vercel.app/auth/callback`
4. Then → Redirects to `/calendar`

## Common Issues

### Issue: Root shows login
**Cause**: Old deployment or browser cache
**Fix**: Clear cache, wait for deployment, check console logs

### Issue: OAuth redirects to localhost
**Cause**: Supabase Redirect URLs not updated
**Fix**: Update Supabase dashboard Redirect URLs (Step 5)

### Issue: Environment variables missing
**Cause**: Wrong variable names or not set
**Fix**: Check Step 2, use `NEXT_PUBLIC_*` not `VITE_*`

## Quick Test Commands

Open browser console on your Vercel URL and run:
```javascript
// Check environment variables (client-side)
console.log('APP URL:', process.env.NEXT_PUBLIC_APP_URL);
console.log('SUPABASE URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);

// Check current URL
console.log('Current URL:', window.location.href);
```

## Still Not Working?

1. Check Vercel build logs for errors
2. Check browser console for specific errors
3. Verify the latest commit is deployed
4. Try redeploying manually

