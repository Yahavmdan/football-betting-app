# Deployment Guide - Free Hosting

This guide will help you deploy your football betting app to the internet for **FREE** using:
- **MongoDB Atlas** (Database)
- **Render** (Backend API)
- **Vercel** (Frontend)

## Prerequisites

- GitHub account
- MongoDB Atlas account (free)
- Render account (free)
- Vercel account (free)

---

## Step 1: Setup MongoDB Atlas (Database)

### 1.1 Create MongoDB Atlas Account
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Sign up for a free account
3. Create a new project (e.g., "Football Betting")

### 1.2 Create Free Cluster
1. Click "Build a Database"
2. Choose **FREE** tier (M0 Sandbox - 512MB)
3. Select a cloud provider and region closest to your users
4. Click "Create Cluster"

### 1.3 Create Database User
1. Click "Database Access" in the left sidebar
2. Click "Add New Database User"
3. Choose "Password" authentication
4. Username: `betim-admin` (or your choice)
5. Click "Autogenerate Secure Password" and **SAVE IT**
6. Database User Privileges: "Atlas admin"
7. Click "Add User"

### 1.4 Whitelist IP Address
1. Click "Network Access" in the left sidebar
2. Click "Add IP Address"
3. Click "Allow Access from Anywhere" (0.0.0.0/0)
   - Note: This allows connections from any IP. For production, you should restrict this.
4. Click "Confirm"

### 1.5 Get Connection String
1. Go back to "Database" section
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Copy the connection string (looks like):
   ```
   mongodb+srv://betim-admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. Replace `<password>` with your actual password from step 1.3
6. Add database name after `.net/`:
   ```
   mongodb+srv://betim-admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/football-betting?retryWrites=true&w=majority
   ```
7. **SAVE THIS CONNECTION STRING** - you'll need it later!

---

## Step 2: Deploy Backend to Render

### 2.1 Prepare Backend for Deployment

First, create a `render.yaml` file in the backend folder:

**Create `backend/render.yaml`:**
```yaml
services:
  - type: web
    name: football-betting-api
    env: node
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
```

**Update `backend/package.json`** to ensure you have a start script:
```json
{
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js"
  }
}
```

### 2.2 Push to GitHub

1. Initialize git in your project root (if not already done):
   ```bash
   cd /mnt/c/Users/PC-YV-DN/work/ba-betim
   git init
   git add .
   git commit -m "Initial commit - Football betting app"
   ```

2. Create a new repository on GitHub:
   - Go to [github.com/new](https://github.com/new)
   - Repository name: `football-betting-app`
   - Make it **Private** (recommended for security)
   - Click "Create repository"

3. Push your code:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/football-betting-app.git
   git branch -M main
   git push -u origin main
   ```

### 2.3 Deploy on Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New +" → "Web Service"
3. Connect your GitHub account
4. Select your `football-betting-app` repository
5. Configure the service:
   - **Name**: `football-betting-api`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Free`

6. Add Environment Variables (click "Advanced" → "Add Environment Variable"):
   ```
   NODE_ENV=production
   PORT=10000
   MONGODB_URI=mongodb+srv://betim-admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/football-betting?retryWrites=true&w=majority
   JWT_SECRET=change_this_to_a_very_long_random_string_in_production_at_least_32_characters_long
   JWT_EXPIRE=7d
   FOOTBALL_API_KEY=3
   FOOTBALL_API_URL=https://www.thesportsdb.com/api/v1/json
   ```

   **Important**:
   - Replace `MONGODB_URI` with your actual MongoDB connection string from Step 1.5
   - Change `JWT_SECRET` to a strong random string (you can generate one at [randomkeygen.com](https://randomkeygen.com/))

7. Click "Create Web Service"
8. Wait 5-10 minutes for deployment to complete
9. **SAVE YOUR API URL** (will look like: `https://football-betting-api.onrender.com`)

---

## Step 3: Deploy Frontend to Vercel

### 3.1 Update Frontend Environment

**Update `frontend/src/environments/environment.ts`:**
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api'
};
```

**Update `frontend/src/environments/environment.prod.ts`:**
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://football-betting-api.onrender.com/api'  // Replace with your Render API URL
};
```

**Create `frontend/vercel.json`:**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist/frontend/browser",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### 3.2 Push Changes to GitHub

```bash
git add .
git commit -m "Add production environment configuration"
git push origin main
```

### 3.3 Deploy on Vercel

1. Go to [Vercel](https://vercel.com/signup)
2. Sign up with GitHub
3. Click "Add New..." → "Project"
4. Import your `football-betting-app` repository
5. Configure project:
   - **Framework Preset**: Angular
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist/frontend/browser`
6. Click "Deploy"
7. Wait 2-5 minutes for deployment
8. Your frontend is now live! (URL will be like: `https://football-betting-app.vercel.app`)

---

## Step 4: Update CORS Settings

After deploying, you need to update your backend to allow requests from your Vercel domain.

**Update `backend/src/server.js`:**

```javascript
const cors = require('cors');

// Update CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:4200',
    'https://football-betting-app.vercel.app',  // Replace with your actual Vercel URL
    'https://*.vercel.app'  // Allow all Vercel preview deployments
  ],
  credentials: true
};

app.use(cors(corsOptions));
```

Push this change:
```bash
git add backend/src/server.js
git commit -m "Update CORS for production"
git push origin main
```

Render will automatically redeploy your backend with the new CORS settings.

---

## Step 5: Test Your Deployment

1. Visit your Vercel URL: `https://football-betting-app.vercel.app`
2. Create an account
3. Create a group
4. Try fetching Israeli league matches
5. Test betting functionality

---

## Important Notes

### Free Tier Limitations

**Render (Backend):**
- ⏰ Sleeps after 15 minutes of inactivity
- 🐌 First request after sleep takes 30-60 seconds (cold start)
- 💾 750 hours/month of runtime (enough for most use cases)
- 🔄 Automatically wakes up on incoming requests

**MongoDB Atlas:**
- 💾 512MB storage (sufficient for thousands of users)
- 🔢 Limited to 100 connections

**Vercel (Frontend):**
- ✅ Always fast and available
- 🚀 Unlimited deployments
- 🌍 Global CDN

### Keeping Backend Awake (Optional)

If you want to avoid cold starts, you can use a free service like [UptimeRobot](https://uptimerobot.com/) to ping your backend every 5 minutes:

1. Sign up at UptimeRobot
2. Add new monitor
3. URL: `https://football-betting-api.onrender.com/api/health`
4. Interval: 5 minutes

This keeps your backend from sleeping but uses your 750 hours faster.

---

## Alternative Free Options

### Option 2: All-in-One with Railway
- Deploy both frontend and backend on [Railway.dev](https://railway.app/)
- Includes database
- Free tier: $5 credit/month (usually enough)
- Easier setup but credit-based

### Option 3: Netlify for Frontend
- Alternative to Vercel: [Netlify](https://www.netlify.com/)
- Very similar features
- Also has unlimited free deployments

---

## Environment Variables Summary

### Backend Environment Variables (Render):
```
NODE_ENV=production
PORT=10000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/football-betting
JWT_SECRET=your-very-long-random-secret-string-here
JWT_EXPIRE=7d
FOOTBALL_API_KEY=3
FOOTBALL_API_URL=https://www.thesportsdb.com/api/v1/json
```

### Frontend Environment (Update environment.prod.ts):
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://your-backend-url.onrender.com/api'
};
```

---

## Troubleshooting

### Backend won't deploy:
- Check Render logs for errors
- Ensure all environment variables are set correctly
- Verify MongoDB connection string is correct

### Frontend can't connect to backend:
- Check CORS settings in `server.js`
- Verify `environment.prod.ts` has correct API URL
- Check browser console for CORS errors

### Database connection fails:
- Verify MongoDB Atlas IP whitelist includes 0.0.0.0/0
- Check connection string format
- Ensure database user has correct permissions

### Cold start issues:
- This is normal for Render free tier
- Consider using UptimeRobot to keep it awake
- Or upgrade to Render paid tier ($7/month)

---

## Cost to Upgrade (Optional)

If you want better performance:

- **Render Pro**: $7/month (no sleep, better performance)
- **MongoDB Atlas M10**: $0.08/hour (~$57/month) for 2GB storage
- **Vercel Pro**: $20/month (better analytics, more bandwidth)

But the free tier should work perfectly fine for personal use and small groups!

---

## Security Recommendations for Production

1. **Change JWT_SECRET** to a strong random string
2. **Enable HTTPS only** in production
3. **Restrict MongoDB IP whitelist** to Render's IPs
4. **Set up proper error logging** (e.g., Sentry)
5. **Add rate limiting** to prevent abuse
6. **Regular backups** of MongoDB database

---

## Next Steps

After successful deployment:
1. Share your app URL with friends
2. Monitor your app on Render dashboard
3. Check MongoDB Atlas for database usage
4. Set up monitoring/alerting (optional)

Enjoy your deployed football betting app! 🎉⚽
