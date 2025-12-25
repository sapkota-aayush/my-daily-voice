# How to Select Specific Directory for Deployment

Yes, it's **perfectly okay** to upload the entire project! Both Railway and Vercel allow you to specify which directory to use as the root.

## ✅ Upload Entire Project

When you connect your GitHub repository, you're connecting the **entire repository**. This is fine! You just need to tell each platform which subdirectory to use.

---

## 🚂 Railway (Backend) - Setting Root Directory

### Step-by-Step:

1. **Connect Repository**
   - Go to Railway → New Project
   - Select "Deploy from GitHub repo"
   - Choose your repository (the entire repo)

2. **After Railway Creates the Service**
   - Railway will auto-detect it's a Next.js project
   - But it might be looking at the root directory

3. **Set Root Directory**
   - Click on your **service** (the service name)
   - Go to the **"Settings"** tab
   - Scroll down to find **"Root Directory"**
   - Click the input field
   - Type: `realtime-agents` (exactly this, no slash at start/end)
   - Click **"Save"** or press Enter

4. **Redeploy**
   - Railway will automatically detect the change
   - It will redeploy using the `realtime-agents` directory
   - Check the logs to confirm it's building from the right directory

### Visual Guide:
```
Railway Dashboard
├── Your Project
    └── Your Service
        ├── Deployments
        ├── Metrics
        ├── Logs
        └── Settings ← Click here
            ├── General
            ├── Root Directory: [realtime-agents] ← Set this!
            ├── Build Command
            └── Start Command
```

---

## ▲ Vercel (Frontend) - Setting Root Directory

### Step-by-Step:

1. **Import Repository**
   - Go to Vercel → Add New Project
   - Import your GitHub repository
   - Select your repository (the entire repo)

2. **Configure Project Settings**
   - You'll see a configuration screen
   - Look for **"Root Directory"** field
   - It might show as "Root Directory" or you might need to click "Edit" next to it
   - Click on it or click "Edit"

3. **Set Root Directory**
   - Type: `frontend` (exactly this, no slash at start/end)
   - Vercel will auto-detect Vite framework
   - Verify these settings:
     - **Framework Preset**: Vite
     - **Root Directory**: `frontend`
     - **Build Command**: `npm run build`
     - **Output Directory**: `dist`
     - **Install Command**: `npm install`

4. **Deploy**
   - Click "Deploy" button
   - Vercel will build from the `frontend` directory

### If You Need to Change Later:

1. Go to your project in Vercel
2. Click **"Settings"** tab
3. Go to **"General"** section
4. Find **"Root Directory"**
5. Click "Edit" and change to `frontend`
6. Save and redeploy

### Visual Guide:
```
Vercel Dashboard
├── Your Project
    ├── Deployments
    ├── Analytics
    └── Settings ← Click here
        ├── General
        │   └── Root Directory: [frontend] ← Set this!
        ├── Environment Variables
        └── Build & Development Settings
```

---

## 📁 Directory Structure Reference

Your project structure:
```
my-daily-voice/                    ← Entire repo (what you connect)
├── frontend/                       ← Vercel uses this
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
├── realtime-agents/                ← Railway uses this
│   ├── package.json
│   ├── next.config.ts
│   └── src/
├── supabase/
└── DEPLOYMENT.md
```

---

## ✅ Verification

### Railway:
- Check build logs - should show:
  ```
  Building from directory: realtime-agents
  Running: npm install (in realtime-agents/)
  Running: npm run build (in realtime-agents/)
  ```

### Vercel:
- Check build logs - should show:
  ```
  Installing dependencies from frontend/package.json
  Building from frontend/
  Output: frontend/dist/
  ```

---

## 🎯 Quick Answer

**Yes, upload the entire project!** Just set:
- **Railway**: Root Directory = `realtime-agents`
- **Vercel**: Root Directory = `frontend`

Both platforms will only use those directories for building and deployment, even though the entire repo is connected.

---

## ❓ Troubleshooting

### Railway can't find package.json
- Make sure Root Directory is set to `realtime-agents` (not `realtime-agents/`)
- Check Settings → Root Directory

### Vercel build fails
- Verify Root Directory is `frontend` (not `frontend/`)
- Check Project Settings → General → Root Directory

### Still having issues?
- Make sure you saved the settings
- Trigger a new deployment after changing root directory
- Check the build logs to see which directory it's using

