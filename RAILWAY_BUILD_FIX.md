# Railway Build Fix - Set OPENAI_API_KEY During Build

The build is failing because Next.js analyzes API routes during build and needs OPENAI_API_KEY.

## Quick Fix: Add OPENAI_API_KEY to Railway

1. **Go to Railway Dashboard**
   - Open your service: `my-daily-voice`
   - Click **"Variables"** tab

2. **Add Environment Variable**
   - Click **"New Variable"**
   - Name: `OPENAI_API_KEY`
   - Value: `dummy-key-for-build-only` (or any dummy value)
   - Click **"Add"**

3. **Redeploy**
   - Railway will automatically redeploy
   - The build should now succeed

## After Build Succeeds

Once the build completes, update the `OPENAI_API_KEY` with your **real** OpenAI API key:
- Go back to Variables
- Edit `OPENAI_API_KEY`
- Replace with your actual OpenAI API key
- Save (will auto-redeploy)

## Why This Works

- During build: Next.js needs the env var to analyze routes (uses dummy value)
- At runtime: Your real API key will be used for actual API calls

## All Required Environment Variables

Make sure you have ALL of these in Railway Variables:

```
OPENAI_API_KEY=dummy-key-for-build-only (then replace with real key)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-key
MEM0_API_KEY=your-mem0-key
UPSTASH_REDIS_URL=your-redis-url
UPSTASH_REDIS_TOKEN=your-redis-token
NEXT_PUBLIC_APP_URL=https://your-app.railway.app (after deployment)
```

