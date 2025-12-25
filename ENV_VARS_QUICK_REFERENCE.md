# Environment Variables - Quick Reference

Copy these values when setting up your new Vercel project:

## Required Environment Variables

### 1. NEXT_PUBLIC_SUPABASE_URL
```
https://fuskvtzarvhkjqpqbpgd.supabase.co
```

### 2. NEXT_PUBLIC_SUPABASE_ANON_KEY
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1c2t2dHphcnZoa2pxcHFicGdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwNzgyMDIsImV4cCI6MjA4MDY1NDIwMn0.kXah2UuSsD3JrjMnQc8pFsxtVXhvGFveY436Xe-j7ww
```

### 3. NEXT_PUBLIC_APP_URL
```
https://your-new-project-name.vercel.app
```
⚠️ **Replace `your-new-project-name` with your actual Vercel project URL**

### 4. OPENAI_API_KEY
```
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
```

### 5. UPSTASH_REDIS_URL
```
https://desired-ringtail-32958.upstash.io
```

### 6. UPSTASH_REDIS_TOKEN
```
AYC-AAIncDEzZTY0MmIyMWFiN2Y0M2FhOGQ0NTJlYjZiOTU5ZmMwMXAxMzI5NTg
```

### 7. MEM0_API_KEY
```
m0-IiFInekQHhLRZBSHz7LAKNkOwm6kQWBJ1NWdlZvq
```

## Important Notes

- ✅ Set **Environment** to **"All"** for each variable (Production, Preview, Development)
- ✅ Use **exact spelling** - `NEXT_PUBLIC_*` not `VITE_*`
- ✅ **Root Directory** must be: `realtime-agents`
- ✅ After adding all variables, **redeploy** or push a new commit

## Quick Setup Steps

1. Delete all old Vercel projects
2. Create new project from GitHub
3. Set Root Directory = `realtime-agents`
4. Add all 7 variables above (copy-paste from here)
5. Redeploy
6. Update Supabase Redirect URLs with your new Vercel URL

See `FRESH_VERCEL_SETUP.md` for detailed step-by-step instructions.

