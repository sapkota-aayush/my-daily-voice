# Railway Root Directory Setup - Step by Step

Railway needs the root directory to be set in the **Service Settings**, not just in a config file.

## 🔧 How to Set Root Directory in Railway UI

### Method 1: Service Settings (Recommended)

1. **Go to your Railway project**
   - Open your project: `my-daily-voice`

2. **Click on your Service**
   - Click on the service name (the one that's failing)

3. **Go to Settings Tab**
   - Click the **"Settings"** tab at the top
   - Scroll down to find build/deploy settings

4. **Find "Root Directory" or "Source"**
   - Look for a field labeled:
     - "Root Directory"
     - "Working Directory" 
     - "Source Directory"
     - Or under "Source" section
   
5. **Enter the directory**
   - Clear any existing value (might be `./` or empty)
   - Type exactly: `realtime-agents`
   - **No leading slash, no trailing slash**
   - Just: `realtime-agents`

6. **Save**
   - Click "Save" or "Update" button
   - Railway will automatically trigger a new deployment

### Method 2: If You Can't Find the Setting

If you don't see a "Root Directory" field:

1. **Check Service → Settings → General**
   - Look in the "General" section
   - There might be a "Source" subsection

2. **Check Service → Settings → Build**
   - Look for build-related settings
   - Root directory might be here

3. **Alternative: Delete and Recreate Service**
   - Delete the current service
   - Create a new service
   - When connecting the repo, Railway might ask for root directory
   - Or set it immediately in settings after creation

### Method 3: Use Railway CLI (Advanced)

If UI doesn't work, you can use Railway CLI:

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Set root directory
railway variables set RAILWAY_SOURCE_DIR=realtime-agents
```

## ✅ Verification

After setting the root directory:

1. **Check Build Logs**
   - Go to Deployments → Latest deployment → Build Logs
   - You should see it building from `realtime-agents/`
   - Should see: `Installing dependencies...` from the correct directory

2. **What Success Looks Like**
   ```
   Building from directory: realtime-agents
   Installing dependencies...
   Running: npm install (in realtime-agents/)
   Running: npm run build (in realtime-agents/)
   ```

## 🆘 Still Can't Find It?

If you absolutely cannot find the root directory setting:

1. **Take a screenshot** of your Railway Settings page
2. **Check Railway Docs**: https://docs.railway.app/develop/variables#root-directory
3. **Contact Railway Support** - they can help you set it

## 📸 Where to Look (Visual Guide)

```
Railway Dashboard
└── Your Project (my-daily-voice)
    └── Your Service
        ├── Deployments
        ├── Metrics  
        ├── Logs
        └── Settings ← CLICK HERE
            ├── General
            │   └── [Look for Root Directory here]
            ├── Variables
            └── Build & Deploy
                └── [Or Root Directory might be here]
```

## 🎯 Quick Fix

**The fastest way:**
1. Service → Settings
2. Look for any field that says "Directory" or "Source"
3. Type: `realtime-agents`
4. Save
5. Wait for auto-redeploy

