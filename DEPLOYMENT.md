# Deployment Guide

This guide covers deploying the My Daily Voice application to Railway (backend) and Vercel (frontend).

## Architecture Overview

- **Backend**: Next.js app in `realtime-agents/` → Deploy to Railway
- **Frontend**: React/Vite app in `frontend/` → Deploy to Vercel
- **Database**: Supabase (already hosted)
- **Redis**: Upstash Redis (already hosted, serverless)

## Prerequisites

1. GitHub account with repository pushed
2. Railway account (sign up at railway.app - get $5 free credit)
3. Vercel account (sign up at vercel.com - free tier available)
4. All API keys and credentials ready

## Environment Variables

### Backend (Railway) - Required Variables

Add these in Railway's environment variables section:

```bash
# OpenAI API Key
OPENAI_API_KEY=your-openai-api-key

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# mem0 Memory Service
MEM0_API_KEY=your-mem0-api-key

# Upstash Redis
UPSTASH_REDIS_URL=your-upstash-redis-url
UPSTASH_REDIS_TOKEN=your-upstash-redis-token

# Node Environment (Railway sets this automatically)
NODE_ENV=production

# Backend URL (for internal API calls - set to your Railway URL after deployment)
NEXT_PUBLIC_APP_URL=https://your-app.railway.app
```

### Frontend (Vercel) - Required Variables

Add these in Vercel's environment variables section:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key

# Optional: Backend API URL (if frontend needs to call backend APIs)
# VITE_API_URL=https://your-backend-url.railway.app
```

## Deployment Steps

### Step 1: Deploy Backend to Railway

1. **Sign up/Login to Railway**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub (get $5 free credit)

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Configure Service**
   - Railway will auto-detect Next.js
   - **IMPORTANT**: Click on "Settings" tab in your service
   - Find "Root Directory" setting
   - Set it to: `realtime-agents` (without trailing slash)
   - Railway will use the `nixpacks.toml` configuration
   - Save the settings

4. **Add Environment Variables**
   - Go to your service → Variables tab
   - Add all backend environment variables listed above
   - Railway will automatically redeploy

5. **Get Your Backend URL**
   - Railway will provide a URL like: `your-app.railway.app`
   - Note this URL for frontend configuration (if needed)

### Step 2: Deploy Frontend to Vercel

1. **Sign up/Login to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Sign up with GitHub

2. **Import Project**
   - Click "Add New Project"
   - Import your GitHub repository
   - Select the repository

3. **Configure Project**
   - **Framework Preset**: Select "Vite" from dropdown
   - **Root Directory**: Click "Edit" and set to: `frontend` (without trailing slash)
   - **Build Command**: `npm run build` (auto-detected, but verify)
   - **Output Directory**: `dist` (auto-detected, but verify)
   - **Install Command**: `npm install` (auto-detected)
   - Click "Deploy" button

4. **Add Environment Variables**
   - Go to Project Settings → Environment Variables
   - Add all frontend environment variables listed above
   - Redeploy after adding variables

5. **Deploy**
   - Click "Deploy"
   - Vercel will build and deploy your frontend
   - You'll get a URL like: `your-app.vercel.app`

## Post-Deployment Configuration

### Update CORS (if needed)

If your frontend needs to call backend APIs directly, you may need to configure CORS in your Next.js backend. The current setup uses Supabase directly, so this may not be necessary.

### Custom Domains (Optional)

1. **Railway**: Add custom domain in Railway dashboard
2. **Vercel**: Add custom domain in Vercel project settings

## Monitoring & Logs

### Railway
- View logs in Railway dashboard
- Monitor resource usage
- Check deployment status

### Vercel
- View build logs in Vercel dashboard
- Monitor analytics
- Check function logs

## Troubleshooting

### Backend Issues

1. **Build Fails**
   - Check Railway logs
   - Verify all environment variables are set
   - Ensure `package.json` has correct scripts

2. **Runtime Errors**
   - Check Railway logs
   - Verify API keys are correct
   - Check Redis and Supabase connections

3. **Timeout Issues**
   - Railway has no timeout limits (good for AI processing)
   - If issues persist, check API response times

### Frontend Issues

1. **Build Fails**
   - Check Vercel build logs
   - Verify environment variables are set
   - Check for TypeScript errors

2. **Runtime Errors**
   - Check browser console
   - Verify Supabase credentials
   - Check network requests

## Cost Estimates (Beta - 10-15 users)

### Railway (Backend)
- **Estimated**: $5-20/month
- Pay-as-you-go pricing
- Scales with usage

### Vercel (Frontend)
- **Free tier**: Usually sufficient for beta
- Paid plans start at $20/month if needed

### Total Estimated Cost
- **Beta phase**: $5-20/month (mostly Railway)
- Scales as you grow

## Next Steps

1. Test all features after deployment
2. Monitor logs for errors
3. Set up error tracking (optional)
4. Configure custom domains (optional)
5. Set up CI/CD (already done via GitHub integration)

## Support

- Railway Docs: https://docs.railway.app
- Vercel Docs: https://vercel.com/docs
- Project Issues: Check GitHub issues

