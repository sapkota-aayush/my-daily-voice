# Complete Vercel Setup Guide

## Current Structure

- **`realtime-agents/`** = Your NEW complete app (Next.js with dashboard, login, signup, AI chat)
- **`frontend/`** = OLD unused UI (can be ignored/deleted)

## Vercel Configuration

### Root Directory
Set to: `realtime-agents`

### Framework
Auto-detected as: `Next.js`

### Environment Variables Needed

Add these in Vercel → Settings → Environment Variables:

```
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://fuskvtzarvhkjqpqbpgd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1c2t2dHphcnZoa2pxcHFicGdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwNzgyMDIsImV4cCI6MjA4MDY1NDIwMn0.kXah2UuSsD3JrjMnQc8pFsxtVXhvGFveY436Xe-j7ww

# OpenAI (Required for AI features)
OPENAI_API_KEY=your-openai-api-key-here

# mem0 (Required for memory features)
MEM0_API_KEY=your-mem0-api-key-here

# Upstash Redis (Required for caching)
UPSTASH_REDIS_URL=your-upstash-redis-url
UPSTASH_REDIS_TOKEN=your-upstash-redis-token

# App URL (Set after first deployment)
NEXT_PUBLIC_APP_URL=https://your-vercel-url.vercel.app
```

## About the Old Frontend

The `frontend/` directory is old and unused. You can:

1. **Ignore it** - Vercel won't use it (Root Directory is set to `realtime-agents`)
2. **Delete it** - If you want to clean up (optional)
3. **Keep it** - It won't interfere with deployment

## Deployment Status

Your deployment shows:
- ✅ Dependencies installed (830 packages)
- ❌ Build might have failed (check full logs)

## Next Steps

1. **Add Missing Environment Variables** in Vercel:
   - `OPENAI_API_KEY` (you mentioned you need to add this)
   - `MEM0_API_KEY`
   - `UPSTASH_REDIS_URL`
   - `UPSTASH_REDIS_TOKEN`

2. **Check Build Logs** - Scroll down in the build logs to see the actual error

3. **Redeploy** after adding all environment variables

## Why Both Are in Same Repo?

This is fine! Vercel uses the Root Directory setting to know which folder to build. Since you set it to `realtime-agents`, it ignores `frontend/` completely.

