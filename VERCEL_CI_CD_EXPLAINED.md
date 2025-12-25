# Vercel CI/CD - How It Works & Troubleshooting

## How Vercel CI/CD Works

### Automatic Deployment (What You Want)
1. **Git Integration**: Vercel is connected to your GitHub repo
2. **Auto-Deploy**: Every time you `git push`, Vercel automatically:
   - Detects the push
   - Starts a new build
   - Deploys to production
   - **No credentials needed** - it uses the Git connection

### Manual Deployment (What's Confusing You)
- If you click "Deploy" in Vercel dashboard, it might ask for credentials
- **You DON'T need to do this** - automatic deployment handles it
- Manual deploy is only for testing or if Git connection is broken

## Why It Works Locally But Not on Vercel

### Local Environment
- Uses `.env.local` file (in `realtime-agents/`)
- All environment variables are there
- Next.js reads them automatically

### Vercel Environment
- **Does NOT use `.env.local`** (it's in `.gitignore`)
- Uses **Environment Variables** in Vercel dashboard
- Must be set manually in Vercel Settings

## The Problem: Environment Variables

Your code works locally because `.env.local` has:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

But Vercel needs these **set in the dashboard**, not in `.env.local`.

## Solution: Set Environment Variables in Vercel

### Step 1: Go to Vercel Dashboard
1. Open: https://vercel.com/dashboard
2. Select your project: `my-daily-voice-icyg`
3. Go to **Settings** → **Environment Variables**

### Step 2: Add These Variables

Copy values from your `.env.local` file:

1. **NEXT_PUBLIC_SUPABASE_URL**
   - Value: From `.env.local` (starts with `https://`)
   - Environment: All (Production, Preview, Development)

2. **NEXT_PUBLIC_SUPABASE_ANON_KEY**
   - Value: From `.env.local` (long JWT token)
   - Environment: All

3. **NEXT_PUBLIC_APP_URL**
   - Value: `https://my-daily-voice-icyg.vercel.app`
   - Environment: All

4. **OPENAI_API_KEY**
   - Value: Your OpenAI key
   - Environment: All

5. **UPSTASH_REDIS_URL**
   - Value: Your Upstash URL
   - Environment: All

6. **UPSTASH_REDIS_TOKEN**
   - Value: Your Upstash token
   - Environment: All

7. **MEM0_API_KEY**
   - Value: Your Mem0 key
   - Environment: All

### Step 3: After Adding Variables
- **Important**: Vercel will ask "Redeploy?" - Click **Yes**
- Or wait for next `git push` - it will auto-deploy with new vars

## How to Verify CI/CD is Working

### Check 1: Git Connection
1. Vercel Dashboard → Settings → Git
2. Should show: "Connected to GitHub"
3. Repository: `sapkota-aayush/my-daily-voice`
4. Production Branch: `main`

### Check 2: Recent Deployments
1. Vercel Dashboard → Deployments tab
2. Should see deployments with:
   - Commit message
   - "Triggered by Git Push"
   - Status: Ready (green)

### Check 3: Auto-Deploy Test
1. Make a small change (add a comment in code)
2. `git add . && git commit -m "test" && git push`
3. Go to Vercel Dashboard
4. Should see new deployment starting automatically
5. **No credentials needed!**

## Why Manual Deploy Asks for Credentials

If you click "Deploy" button manually:
- It might ask for Git credentials
- This is because it's trying to clone the repo
- **Solution**: Don't use manual deploy - use Git push instead

## Root Directory Issue

Vercel needs to know where your Next.js app is:
1. Vercel Dashboard → Settings → General
2. **Root Directory**: Should be `realtime-agents`
3. If not set, Vercel looks in root and fails

## Quick Fix Checklist

- [ ] Environment variables set in Vercel (not just `.env.local`)
- [ ] Root Directory = `realtime-agents` in Vercel settings
- [ ] Git connection active in Vercel
- [ ] Latest code pushed to GitHub
- [ ] Wait 2-3 minutes for deployment to finish
- [ ] Clear browser cache and test

## Still Not Working?

1. **Check Build Logs**:
   - Vercel Dashboard → Deployments → Click latest
   - Check "Build Logs" for errors

2. **Check Function Logs**:
   - Vercel Dashboard → Your Project → Functions
   - Look for runtime errors

3. **Verify Environment Variables**:
   - Make sure they're set for "Production" environment
   - Check spelling (NEXT_PUBLIC_* not VITE_*)

## Summary

✅ **CI/CD IS WORKING** - it auto-deploys on `git push`
❌ **DON'T manually deploy** - it asks for credentials unnecessarily
✅ **Set env vars in Vercel** - `.env.local` doesn't work on Vercel
✅ **Root directory must be `realtime-agents`**

The main issue is likely **missing environment variables in Vercel dashboard**.

