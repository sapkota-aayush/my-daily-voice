# Fresh Vercel Setup - Step by Step Guide

## Before You Start

✅ Make sure your code is pushed to GitHub:
```bash
git status  # Check if everything is committed
git push    # Push latest code
```

## Step 1: Delete Old Projects

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. For each `my-daily-voice-*` project:
   - Click on the project
   - Go to **Settings** → **General**
   - Scroll to bottom → Click **"Delete Project"**
   - Type project name to confirm
   - Click **"Delete"**

## Step 2: Create New Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. **Import Git Repository**:
   - Select: `sapkota-aayush/my-daily-voice`
   - Click **"Import"**

## Step 3: Configure Project

### Framework Preset
- **Framework Preset**: Next.js (should auto-detect)
- If not, select **"Next.js"**

### Root Directory (CRITICAL!)
- **Root Directory**: `realtime-agents`
- ⚠️ **This is the most important setting!**
- Click **"Edit"** next to Root Directory
- Enter: `realtime-agents`
- Click **"Continue"**

### Build and Output Settings
- **Build Command**: `npm run build` (auto-filled)
- **Output Directory**: `.next` (auto-filled)
- **Install Command**: `npm install` (auto-filled)
- Click **"Deploy"**

## Step 4: Wait for First Deployment

- Vercel will start building
- Wait 1-2 minutes
- It will likely **fail** (because env vars aren't set yet)
- **That's OK!** We'll fix it next

## Step 5: Add Environment Variables

1. Go to your new project → **Settings** → **Environment Variables**
2. Click **"Add New"**
3. Add these **ONE BY ONE**:

### Variable 1:
- **Key**: `NEXT_PUBLIC_SUPABASE_URL`
- **Value**: `https://fuskvtzarvhkjqpqbpgd.supabase.co` (from your .env.local)
- **Environment**: Select **All** (Production, Preview, Development)
- Click **"Save"**

### Variable 2:
- **Key**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (full JWT token from .env.local)
- **Environment**: **All**
- Click **"Save"**

### Variable 3:
- **Key**: `NEXT_PUBLIC_APP_URL`
- **Value**: `https://your-project-name.vercel.app` (use the URL Vercel gives you)
- **Environment**: **All**
- Click **"Save"**

### Variable 4:
- **Key**: `OPENAI_API_KEY`
- **Value**: Your OpenAI API key (from .env.local)
- **Environment**: **All**
- Click **"Save"**

### Variable 5:
- **Key**: `UPSTASH_REDIS_URL`
- **Value**: Your Upstash Redis URL (from .env.local)
- **Environment**: **All**
- Click **"Save"**

### Variable 6:
- **Key**: `UPSTASH_REDIS_TOKEN`
- **Value**: Your Upstash Redis token (from .env.local)
- **Environment**: **All**
- Click **"Save"**

### Variable 7:
- **Key**: `MEM0_API_KEY`
- **Value**: Your Mem0 API key (from .env.local)
- **Environment**: **All**
- Click **"Save"**

## Step 6: Redeploy

After adding all environment variables:

1. Go to **Deployments** tab
2. Click the **three dots** (⋯) on the latest deployment
3. Click **"Redeploy"**
4. Or just **push a new commit** to trigger auto-deploy:
   ```bash
   git commit --allow-empty -m "Trigger redeploy"
   git push
   ```

## Step 7: Verify

1. Wait 2-3 minutes for deployment
2. Check **Deployments** tab → Should show **"Ready"** (green)
3. Click **"Visit"** or use the URL
4. Should see your dashboard!

## Step 8: Update Supabase Redirect URLs

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Your Project → **Authentication** → **URL Configuration**
3. In **Redirect URLs**, add:
   ```
   https://your-vercel-url.vercel.app/auth/callback
   https://your-vercel-url.vercel.app/**
   ```
4. **Site URL** should be:
   ```
   https://your-vercel-url.vercel.app
   ```
5. Click **"Save"**

## Common Mistakes to Avoid

❌ **Don't set Root Directory to `./`** - Must be `realtime-agents`
❌ **Don't use `VITE_*` variables** - Use `NEXT_PUBLIC_*`
❌ **Don't forget to set environment for "All"** - Not just Production
❌ **Don't skip Root Directory** - This is the #1 cause of failures

## Checklist

- [ ] Deleted all old projects
- [ ] Created new project from GitHub repo
- [ ] Set Root Directory = `realtime-agents`
- [ ] Added all 7 environment variables
- [ ] Redeployed (or pushed new commit)
- [ ] Deployment shows "Ready"
- [ ] Updated Supabase Redirect URLs
- [ ] Tested the URL - dashboard shows!

## If Something Goes Wrong

1. **Check Build Logs**:
   - Deployments → Click failed deployment → "Build Logs"
   - Look for error messages

2. **Check Root Directory**:
   - Settings → General → Root Directory = `realtime-agents`

3. **Check Environment Variables**:
   - Settings → Environment Variables
   - Make sure all 7 are there
   - Check spelling (NEXT_PUBLIC_* not VITE_*)

4. **Check Git Connection**:
   - Settings → Git
   - Should show "Connected to GitHub"

## You're Done!

Once deployment is successful:
- ✅ Every `git push` will auto-deploy
- ✅ No manual deployment needed
- ✅ Environment variables are saved
- ✅ Root directory is set correctly

Good luck! 🚀

