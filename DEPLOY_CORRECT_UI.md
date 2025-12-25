# Deploy the Correct UI (realtime-agents) to Vercel

## The Problem

You have TWO frontends:
1. **`frontend/`** = Old simple UI (just calendar, no signup/dashboard)
2. **`realtime-agents/`** = New complete UI (dashboard, login, signup, onboarding, AI chat)

Vercel is currently deploying the OLD `frontend/` directory.

## Solution: Deploy `realtime-agents` to Vercel

### Step 1: Update Vercel Project Settings

1. Go to **Vercel Dashboard** → Your Project
2. Go to **Settings** → **General**
3. Find **"Root Directory"**
4. Change it from `frontend` to: `realtime-agents`
5. **Save**

### Step 2: Update Framework Settings

In the same Settings page:
- **Framework Preset**: Should auto-detect as `Next.js`
- **Build Command**: `npm run build` (auto-detected)
- **Output Directory**: `.next` (auto-detected for Next.js)
- **Install Command**: `npm install` (auto-detected)

### Step 3: Add Environment Variables

Go to **Settings** → **Environment Variables** and add:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-key
OPENAI_API_KEY=your-openai-key
MEM0_API_KEY=your-mem0-key
UPSTASH_REDIS_URL=your-redis-url
UPSTASH_REDIS_TOKEN=your-redis-token
NEXT_PUBLIC_APP_URL=https://your-vercel-url.vercel.app (set after first deploy)
```

### Step 4: Redeploy

1. Go to **Deployments**
2. Click **"..."** on latest deployment
3. Click **"Redeploy"**

## What Happens

- Vercel will now build from `realtime-agents/` directory
- You'll get the NEW UI with dashboard, login, signup
- The old `frontend/` directory will be ignored

## About the Old Frontend

You can:
- **Delete it** (if you don't need it)
- **Keep it** (it won't be deployed, just ignored)
- **Archive it** (rename to `frontend-old/`)

## Architecture After This

- **Vercel**: `realtime-agents/` (Next.js app with full UI + API routes)
- **Railway**: Can be removed OR kept for separate backend (your choice)

Since `realtime-agents` is a Next.js app, it can serve both frontend and backend on Vercel!

