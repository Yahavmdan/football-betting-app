# Railway Deployment Guide

Complete guide to deploy your Football Betting application to Railway.

## Prerequisites

- Railway account (paid account for production features)
- MongoDB Atlas account (or Railway MongoDB addon)
- GitHub account (recommended for CI/CD)

## Part 1: Deploy Backend to Railway

### Step 1: Create New Railway Project

1. Go to [Railway.app](https://railway.app)
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Authorize Railway to access your GitHub
5. Select your repository: `ba-betim`

### Step 2: Configure Backend Service

1. After selecting the repo, Railway will auto-detect your project
2. Click **"Add variables"** to add environment variables
3. Add the following environment variables:

```
NODE_ENV=production
PORT=3000
MONGODB_URI=<your-mongodb-connection-string>
JWT_SECRET=<generate-strong-random-string-min-32-chars>
JWT_EXPIRE=7d
FOOTBALL_API_KEY=3
FOOTBALL_API_URL=https://www.thesportsdb.com/api/v1/json
```

### Step 3: Set Root Directory (Important!)

Since your backend is in a subdirectory:

1. Go to **Settings** tab
2. Under **Build**, find **Root Directory**
3. Set it to: `backend`
4. Click **"Save Changes"**

### Step 4: Configure Start Command (Optional)

Railway should auto-detect from package.json, but you can verify:

1. Go to **Settings** tab
2. Under **Deploy**, find **Start Command**
3. It should be: `npm start`
4. If not set, add it

### Step 5: Deploy

1. Click **"Deploy"** button
2. Railway will:
   - Install dependencies (`npm install`)
   - Start your server (`npm start`)
3. Wait for deployment to complete (usually 1-2 minutes)

### Step 6: Get Your Backend URL

1. Once deployed, go to **Settings** tab
2. Under **Networking**, click **"Generate Domain"**
3. Railway will assign a URL like: `https://your-app-name.up.railway.app`
4. **Save this URL** - you'll need it for the frontend

### Step 7: Test Your Backend

Test your deployed backend:
```bash
curl https://your-app-name.up.railway.app/api/test
```

You should get a JSON response confirming the API is running.

---

## Part 2: Setup MongoDB (if needed)

### Option A: Use MongoDB Atlas (Recommended)

1. Already using MongoDB Atlas? Great! Just update the `MONGODB_URI` in Railway
2. Make sure to whitelist Railway's IP: `0.0.0.0/0` (or use MongoDB Atlas IP access list)

### Option B: Use Railway MongoDB Addon

1. In your Railway project, click **"New"**
2. Select **"Database"** → **"Add MongoDB"**
3. Railway will create a MongoDB instance
4. Copy the connection string from the addon
5. Update your `MONGODB_URI` variable

---

## Part 3: Deploy Frontend

### Option 1: Deploy Frontend to Railway (Separate Service)

1. In the same Railway project, click **"New"** → **"GitHub Repo"**
2. Select the same repository
3. Add environment variables:
```
NODE_ENV=production
```
4. Set **Root Directory** to: `frontend`
5. Railway will auto-detect Angular and build it
6. Generate domain for frontend

### Option 2: Build Frontend and Serve from Backend

This is more efficient and what I recommend:

#### Update Backend to Serve Frontend

1. First, build your frontend locally:
```bash
cd frontend
npm run build
```

2. Copy the build output to backend:
```bash
# Create public directory in backend
mkdir -p ../backend/public

# Copy Angular build to backend public folder
cp -r dist/football-betting-frontend/* ../backend/public/
```

3. Update backend to serve static files (already configured in your code)

4. Commit and push:
```bash
git add .
git commit -m "Add frontend build for Railway deployment"
git push
```

5. Railway will automatically redeploy with the frontend

---

## Part 4: Configure Custom Domain (Optional)

1. In Railway project, go to **Settings** → **Networking**
2. Click **"Add Custom Domain"**
3. Enter your domain: `yourdomain.com`
4. Add the CNAME record to your DNS provider:
   - Type: `CNAME`
   - Name: `@` or `www`
   - Value: `<railway-provided-value>`
5. Wait for DNS propagation (can take up to 48 hours)

---

## Part 5: Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Server port | `3000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/dbname` |
| `JWT_SECRET` | Secret for JWT tokens (32+ chars) | `your-very-secure-random-string-here` |
| `JWT_EXPIRE` | JWT expiration time | `7d` |

### Optional Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `FOOTBALL_API_KEY` | TheSportsDB API key | `3` |
| `FOOTBALL_API_URL` | TheSportsDB API URL | `https://www.thesportsdb.com/api/v1/json` |

---

## Part 6: Monitoring and Logs

### View Logs

1. In Railway dashboard, click on your service
2. Go to **"Deployments"** tab
3. Click on the latest deployment
4. View real-time logs in the **"Logs"** section

### Monitor Performance

1. Go to **"Metrics"** tab
2. View CPU, Memory, and Network usage
3. Set up alerts if needed (available in paid plans)

---

## Part 7: CI/CD with GitHub

Railway automatically sets up CI/CD:

1. Every push to `main` branch triggers a deployment
2. Railway builds and deploys automatically
3. View deployment status in Railway dashboard

### Deploy Specific Branch

1. Go to **Settings** → **Build**
2. Under **Watch Paths**, you can specify which branch to deploy from
3. Change **Branch** from `main` to your desired branch

---

## Part 8: Database Migrations

### Make a User Admin

SSH into Railway or use Railway CLI:

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Run admin script
railway run npm run make-admin
```

Or update the script to connect to production MongoDB directly.

---

## Part 9: Rollback Deployment

If something goes wrong:

1. Go to **"Deployments"** tab
2. Find a previous successful deployment
3. Click the **"⋯"** menu
4. Select **"Redeploy"**

---

## Part 10: Cost Optimization

### Railway Pricing

- **Starter Plan**: $5/month (500 execution hours)
- **Pro Plan**: $20/month (better for production)

### Tips to Reduce Costs

1. Use MongoDB Atlas Free Tier (512 MB)
2. Optimize your code to use less CPU
3. Use Railway's sleep mode for non-critical services
4. Monitor usage in Railway dashboard

---

## Troubleshooting

### Backend won't start

**Check:**
1. Environment variables are set correctly
2. Root directory is set to `backend`
3. MongoDB connection string is correct
4. Start command is `npm start`

**View logs:**
```bash
railway logs
```

### Database connection issues

**Check:**
1. MongoDB Atlas IP whitelist includes `0.0.0.0/0`
2. Connection string includes username and password
3. Database name is correct
4. Network access is enabled

### Environment variables not working

**Verify:**
1. Variables are set in Railway dashboard (not just .env file)
2. No typos in variable names
3. Restart deployment after adding variables

---

## Migration from Render

### What to Update

1. **Environment Variables**: Copy from Render to Railway
2. **MongoDB**: Keep same database or migrate
3. **Domain**: Update DNS records to point to Railway
4. **Frontend API URL**: Update to new Railway URL

### Differences from Render

| Feature | Render | Railway |
|---------|--------|---------|
| Configuration | render.yaml | railway.json (optional) |
| Build time | Slower | Faster |
| Free tier | Limited | 500 hours/month on paid plan |
| Logs | 7 days | Unlimited (paid plan) |
| Deploy speed | 2-5 min | 30-90 sec |
| Custom domains | ✅ | ✅ |
| Auto-scaling | ✅ (paid) | ✅ (pro plan) |

---

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Railway Status: https://status.railway.app

---

## Quick Deploy Checklist

- [ ] Create Railway project
- [ ] Connect GitHub repository
- [ ] Set root directory to `backend`
- [ ] Add all environment variables
- [ ] Configure MongoDB connection
- [ ] Deploy backend
- [ ] Generate domain
- [ ] Test API endpoints
- [ ] Update frontend API URL (if separate)
- [ ] Configure custom domain (optional)
- [ ] Set up monitoring
- [ ] Test production app

---

**Your backend is now deployed to Railway! 🚂🎉**
