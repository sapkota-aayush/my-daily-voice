# Fix OAuth Redirect to Localhost - Complete Guide

## The Problem
After Google OAuth, you're being redirected to `http://localhost:3000` instead of your Vercel URL.

## Root Cause
**Supabase's Redirect URLs in the dashboard override the code!** Even if your code sends the correct URL, Supabase will only redirect to URLs that are whitelisted in its dashboard.

## Solution: Two Steps Required

### Step 1: Set Environment Variable in Vercel ✅

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. Add/Verify this variable:
   - **Key**: `NEXT_PUBLIC_APP_URL`
   - **Value**: `https://your-vercel-project-name.vercel.app` (your actual Vercel URL)
   - **Environment**: **All** (Production, Preview, Development)
3. Click **"Save"**
4. **Redeploy** (or wait for next git push)

### Step 2: Update Supabase Redirect URLs (CRITICAL!) ⚠️

This is the **most important step** - Supabase will ignore your code if URLs aren't whitelisted here.

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `fuskvtzarvhkjqpqbpgd`
3. Go to **Authentication** → **URL Configuration**
4. Find **"Redirect URLs"** section
5. **Add these URLs** (one per line or comma-separated):
   ```
   https://your-vercel-project-name.vercel.app/auth/callback
   https://your-vercel-project-name.vercel.app/**
   ```
6. **Also update "Site URL"**:
   - Should be: `https://your-vercel-project-name.vercel.app`
7. **Keep localhost for development** (optional):
   ```
   http://localhost:3000/auth/callback
   ```
8. Click **"Save"**

## Important Notes

### Why Both Steps Are Needed

1. **Vercel Environment Variable** (`NEXT_PUBLIC_APP_URL`):
   - Tells your code what URL to use
   - Used in `login/page.tsx` to build redirect URL

2. **Supabase Redirect URLs**:
   - **Whitelist** of allowed redirect URLs
   - Supabase **will reject** redirects to URLs not in this list
   - This is a **security feature** - Supabase won't redirect to arbitrary URLs

### Supabase Overrides Code

Even if your code says:
```javascript
redirectTo: 'https://my-app.vercel.app/auth/callback'
```

If that URL is **not** in Supabase's Redirect URLs list, Supabase will:
- Either reject the redirect
- Or redirect to the **Site URL** (which might be localhost)

## Verification Steps

### 1. Check Environment Variable
Open browser console on your Vercel site and run:
```javascript
console.log('NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL);
console.log('Current origin:', window.location.origin);
```

Should show your Vercel URL, not localhost.

### 2. Check Supabase Settings
1. Supabase Dashboard → Authentication → URL Configuration
2. Verify Redirect URLs include your Vercel URL
3. Verify Site URL is your Vercel URL (not localhost)

### 3. Test OAuth Flow
1. Visit your Vercel URL
2. Click "Sign in"
3. Click "Continue with Google"
4. After Google auth, should redirect to: `https://your-vercel-url.vercel.app/auth/callback`
5. Then redirects to `/calendar`

## Common Mistakes

❌ **Only updating code** - Won't work, Supabase dashboard overrides it
❌ **Only updating Supabase** - Code might still use wrong URL
❌ **Using localhost in production** - Supabase Site URL set to localhost
❌ **Forgetting to redeploy** - Environment variables need new deployment

## Railway Note

**You don't need to change anything in Railway** - this is only for Vercel (frontend). Railway is for backend API, and OAuth redirects happen on the frontend.

## Still Not Working?

1. **Clear browser cache** - Old redirects might be cached
2. **Check browser console** - Look for `[OAuth]` logs
3. **Verify both steps completed**:
   - ✅ `NEXT_PUBLIC_APP_URL` set in Vercel
   - ✅ Redirect URLs updated in Supabase
4. **Wait 1-2 minutes** - Supabase changes might take a moment
5. **Try incognito window** - Rules out cache issues

## Quick Checklist

- [ ] `NEXT_PUBLIC_APP_URL` set in Vercel (with your actual Vercel URL)
- [ ] Vercel project redeployed after adding env var
- [ ] Supabase Redirect URLs include your Vercel URL
- [ ] Supabase Site URL is your Vercel URL (not localhost)
- [ ] Saved changes in Supabase dashboard
- [ ] Tested in incognito window
- [ ] Checked browser console for errors

After completing both steps, OAuth should redirect to your Vercel URL! 🎉

