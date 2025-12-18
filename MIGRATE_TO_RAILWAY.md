# Quick Migration Guide: Render → Railway

This guide will help you migrate your Football Betting app from Render to Railway in under 15 minutes.

## Why Railway?

- **Faster deployments**: 30-90 seconds vs 2-5 minutes on Render
- **Better developer experience**: Simpler configuration, better logs
- **More reliable**: Less downtime, better performance
- **Cost-effective**: Better resource allocation on paid plans

---

## Step-by-Step Migration

### 1. Prepare Environment Variables (2 minutes)

Before starting, have these ready from your Render dashboard:

```bash
MONGODB_URI=<copy-from-render>
JWT_SECRET=<copy-from-render>
JWT_EXPIRE=7d
FOOTBALL_API_KEY=3
FOOTBALL_API_URL=https://www.thesportsdb.com/api/v1/json
```

**How to get them from Render:**
1. Go to your Render dashboard
2. Click on your backend service
3. Go to **Environment** tab
4. Copy all variables

---

### 2. Create Railway Project (3 minutes)

1. **Login to Railway**
   - Go to [railway.app](https://railway.app)
   - Click **"Login"** → Sign in with GitHub

2. **Create New Project**
   - Click **"New Project"**
   - Select **"Deploy from GitHub repo"**
   - Choose your repository

3. **Configure Service**
   - Railway will create a service automatically
   - Wait for the initial detection to complete

---

### 3. Configure Backend (5 minutes)

#### Set Root Directory

**IMPORTANT:** Since your backend is in `/backend` folder:

1. Click on your service
2. Go to **Settings** tab
3. Scroll to **Build** section
4. Find **Root Directory**
5. Enter: `backend`
6. Click **Save**

#### Add Environment Variables

1. Go to **Variables** tab
2. Click **"New Variable"**
3. Add each variable:
   - `NODE_ENV` = `production`
   - `PORT` = `3000`
   - `MONGODB_URI` = `<paste-from-render>`
   - `JWT_SECRET` = `<paste-from-render>`
   - `JWT_EXPIRE` = `7d`
   - `FOOTBALL_API_KEY` = `3`
   - `FOOTBALL_API_URL` = `https://www.thesportsdb.com/api/v1/json`

4. Click **"Add"** for each variable

**Pro Tip:** Use "Raw Editor" for faster entry:
```env
NODE_ENV=production
PORT=3000
MONGODB_URI=your-mongodb-uri-here
JWT_SECRET=your-jwt-secret-here
JWT_EXPIRE=7d
FOOTBALL_API_KEY=3
FOOTBALL_API_URL=https://www.thesportsdb.com/api/v1/json
```

---

### 4. Deploy (2 minutes)

1. Railway should trigger a deployment automatically
2. If not, click **"Deploy"** button
3. Watch the build logs in real-time
4. Wait for **"Success"** status

**Build process:**
```
Building... → Installing dependencies → Starting server → Success! 🚀
```

---

### 5. Get Your New URL (1 minute)

1. Go to **Settings** tab
2. Scroll to **Networking** section
3. Click **"Generate Domain"**
4. Copy your new URL: `https://your-app.up.railway.app`

---

### 6. Test Your Backend (2 minutes)

Test the deployed API:

```bash
# Test health endpoint
curl https://your-app.up.railway.app/api/test

# Expected response:
# {"success":true,"message":"API is working"}
```

Test authentication:
```bash
curl -X POST https://your-app.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

---

### 7. Update Frontend (if deployed separately)

If your frontend is deployed separately, update the API URL:

#### Option A: Frontend on Netlify/Vercel
1. Go to your frontend hosting dashboard
2. Update environment variable:
   ```
   API_URL=https://your-app.up.railway.app
   ```
3. Redeploy frontend

#### Option B: Frontend with Backend (Monolith)
Already configured! Your backend serves the frontend from `/public`.

---

### 8. Switch Traffic to Railway (when ready)

#### If using custom domain:

**On Render:** (to avoid downtime)
1. Keep Render running for now
2. Test Railway thoroughly first

**DNS Update:**
1. Go to your DNS provider (Cloudflare, GoDaddy, etc.)
2. Find your CNAME record pointing to Render
3. Update it to point to Railway:
   ```
   Type: CNAME
   Name: @ or www or api
   Value: <railway-domain-from-settings>
   ```
4. Wait for DNS propagation (5-30 minutes)
5. Test: `curl https://yourdomain.com/api/test`

#### If using Render's subdomain:
Just update your frontend to use the new Railway URL!

---

### 9. Verify Everything Works

**Checklist:**
- [ ] Backend health check returns success
- [ ] Can register new user
- [ ] Can login
- [ ] Can create group
- [ ] Can join group
- [ ] Can place bet
- [ ] Frontend connects to backend
- [ ] Database operations work

---

### 10. Cleanup Render (after 24 hours)

**After confirming everything works on Railway:**

1. Go to Render dashboard
2. Click on your backend service
3. Go to **Settings**
4. Scroll to bottom
5. Click **"Delete Service"**
6. Type service name to confirm

**Keep Render around for 24-48 hours as backup!**

---

## Comparison: What Changed?

### Configuration Files

| Render | Railway |
|--------|---------|
| `render.yaml` | `railway.json` (optional) |
| Required | Optional, auto-detects |

### Environment Variables

✅ Same variables, just copy-paste from Render to Railway

### MongoDB

✅ Use the same MongoDB Atlas database (no migration needed!)

### Deployment

| Aspect | Render | Railway |
|--------|--------|---------|
| Speed | 2-5 min | 30-90 sec |
| Logs | Limited | Real-time, unlimited |
| Rollback | Manual | One-click |

---

## Troubleshooting

### "Build failed" error

**Check:**
1. Root directory is set to `backend`
2. All environment variables are added
3. Check build logs for specific error

### "Application failed to start"

**Check:**
1. `PORT` variable is set to `3000`
2. Start command is correct (should auto-detect from package.json)
3. MongoDB connection string is valid

### Database connection issues

**Check:**
1. MongoDB Atlas IP whitelist includes `0.0.0.0/0`
2. Connection string format: `mongodb+srv://username:password@cluster.mongodb.net/dbname`
3. Username and password don't have special characters (or are URL-encoded)

### Can't access the API

**Check:**
1. Domain is generated in Railway dashboard
2. Service is in "Active" state
3. No firewall blocking Railway's IPs
4. CORS is properly configured in your backend

---

## Railway CLI (Optional but Useful)

Install Railway CLI for advanced operations:

```bash
# Install
npm install -g @railway/cli

# Login
railway login

# Link to project
railway link

# View logs
railway logs

# Run commands in production
railway run node src/scripts/makeAdmin.js

# Open dashboard
railway open
```

---

## Cost Comparison

### Render
- Free tier: Limited hours
- Starter: $7/month per service
- Standard: $25/month per service

### Railway
- Hobby: $5/month (500 hours)
- Pro: $20/month (unlimited)

**Railway Pro is more cost-effective for production apps!**

---

## Need Help?

- **Railway Docs**: https://docs.railway.app
- **Railway Discord**: https://discord.gg/railway
- **Railway Status**: https://status.railway.app

---

## Summary

✅ **Total migration time**: 10-15 minutes
✅ **Downtime**: Can be 0 (if you test first)
✅ **Data migration**: Not needed (keep same MongoDB)
✅ **Code changes**: None required

**You're all set! Welcome to Railway! 🚂**
