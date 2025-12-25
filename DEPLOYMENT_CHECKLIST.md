# Deployment Checklist

Quick reference checklist for deploying My Daily Voice.

## Pre-Deployment

- [ ] All code committed and pushed to GitHub
- [ ] All API keys and credentials ready
- [ ] Railway account created (railway.app)
- [ ] Vercel account created (vercel.com)
- [ ] Supabase project ready
- [ ] Upstash Redis instance ready

## Backend Deployment (Railway)

### Setup
- [ ] Connect GitHub repo to Railway (entire repo is fine!)
- [ ] Create new project in Railway
- [ ] Go to Service → Settings → Root Directory
- [ ] Set root directory to: `realtime-agents` (no trailing slash)
- [ ] Save settings

### Environment Variables
- [ ] `OPENAI_API_KEY` - Your OpenAI API key
- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- [ ] `MEM0_API_KEY` - mem0 API key
- [ ] `UPSTASH_REDIS_URL` - Upstash Redis URL
- [ ] `UPSTASH_REDIS_TOKEN` - Upstash Redis token
- [ ] `NEXT_PUBLIC_APP_URL` - Set after deployment (your Railway URL)

### Deploy
- [ ] Railway auto-detects Next.js
- [ ] Build completes successfully
- [ ] Service starts without errors
- [ ] Note your Railway URL (e.g., `your-app.railway.app`)
- [ ] Update `NEXT_PUBLIC_APP_URL` with Railway URL
- [ ] Redeploy after setting `NEXT_PUBLIC_APP_URL`

### Verify
- [ ] Check Railway logs - no errors
- [ ] Test API endpoint: `https://your-app.railway.app/api/chat` (should return error without auth, but confirms it's working)
- [ ] Monitor resource usage

## Frontend Deployment (Vercel)

### Setup
- [ ] Import GitHub repo to Vercel (entire repo is fine!)
- [ ] In project configuration, find "Root Directory"
- [ ] Set root directory to: `frontend` (no trailing slash)
- [ ] Set framework to: Vite (auto-detected)
- [ ] Verify build settings

### Environment Variables
- [ ] `VITE_SUPABASE_URL` - Supabase project URL
- [ ] `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon key
- [ ] `VITE_API_URL` - (Optional) Your Railway backend URL

### Deploy
- [ ] Build completes successfully
- [ ] Deployment succeeds
- [ ] Note your Vercel URL (e.g., `your-app.vercel.app`)

### Verify
- [ ] Frontend loads without errors
- [ ] Supabase connection works
- [ ] All pages accessible
- [ ] Check browser console for errors

## Post-Deployment

### Testing
- [ ] Test user authentication
- [ ] Test journal entry creation
- [ ] Test voice features (if applicable)
- [ ] Test calendar view
- [ ] Test all major features

### Monitoring
- [ ] Set up Railway monitoring/alerts
- [ ] Set up Vercel analytics (optional)
- [ ] Monitor error logs
- [ ] Check API response times

### Documentation
- [ ] Document production URLs
- [ ] Share URLs with team
- [ ] Update any hardcoded references

## Troubleshooting

### If Backend Build Fails
1. Check Railway logs
2. Verify all environment variables are set
3. Check `package.json` scripts
4. Verify Node.js version compatibility

### If Frontend Build Fails
1. Check Vercel build logs
2. Verify environment variables
3. Check for TypeScript errors
4. Verify Vite configuration

### If Runtime Errors
1. Check Railway/Vercel logs
2. Verify API keys are correct
3. Check Supabase/Redis connections
4. Verify CORS settings (if needed)

## Quick Commands

### Railway
- View logs: Railway dashboard → Service → Logs
- Redeploy: Railway dashboard → Service → Deploy → Redeploy
- Update env vars: Railway dashboard → Service → Variables

### Vercel
- View logs: Vercel dashboard → Project → Deployments → View logs
- Redeploy: Vercel dashboard → Project → Deployments → Redeploy
- Update env vars: Vercel dashboard → Project → Settings → Environment Variables

## Cost Monitoring

- [ ] Monitor Railway usage (pay-as-you-go)
- [ ] Monitor Vercel usage (free tier usually sufficient)
- [ ] Set up budget alerts (optional)

