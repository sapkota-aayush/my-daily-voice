# Fix Supabase OAuth Redirect to Localhost

## The Problem
After OAuth login, users are being redirected to `http://localhost:3000` instead of your Vercel URL.

## The Solution

You need to add your Vercel URL to Supabase's allowed redirect URLs.

### Step 1: Get Your Vercel URL
Your Vercel deployment URL should look like:
- `https://your-app-name.vercel.app` or
- `https://your-custom-domain.com`

### Step 2: Update Supabase Redirect URLs

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project (`fuskvtzarvhkjqpqbpgd`)
3. Go to **Authentication** → **URL Configuration**
4. In the **Redirect URLs** section, add:
   ```
   https://your-vercel-url.vercel.app/auth/callback
   https://your-vercel-url.vercel.app/**
   ```
5. Also add your localhost for development:
   ```
   http://localhost:3000/auth/callback
   ```
6. Click **Save**

### Step 3: Add Environment Variable in Vercel

Add this to your Vercel environment variables:
- **Key**: `NEXT_PUBLIC_APP_URL`
- **Value**: `https://your-vercel-url.vercel.app` (your actual Vercel URL)

### Step 4: Redeploy

After updating Supabase settings and adding the environment variable, redeploy on Vercel.

## Why This Happens

Supabase needs to know which URLs are allowed for OAuth redirects. By default, it might only have `localhost` configured. Adding your production URL tells Supabase it's safe to redirect there.

## Quick Checklist

- [ ] Added Vercel URL to Supabase Redirect URLs
- [ ] Added `NEXT_PUBLIC_APP_URL` to Vercel environment variables
- [ ] Redeployed on Vercel
- [ ] Tested OAuth login

Your OAuth should now redirect correctly! 🎉

