# Deployment Guide - InsurAI Platform

This guide will help you deploy the InsurAI platform to production using Vercel (frontend) and Render (backend).

## Prerequisites

- GitHub account with your code repository
- Vercel account (sign up at https://vercel.com)
- Render account (sign up at https://render.com)
- PostgreSQL database on Render

---

## Part 1: Backend Deployment on Render

### Step 1: Create PostgreSQL Database

1. Log in to your Render dashboard
2. Click **"New +"** → **"PostgreSQL"**
3. Configure your database:
   - **Name**: `insurai-db`
   - **Database**: `insurai_db`
   - **User**: Will be auto-generated
   - **Region**: Choose closest to your users
   - **Plan**: Free tier is fine for testing
4. Click **"Create Database"**
5. Wait for database to be provisioned (~2 minutes)
6. **Important**: Copy the **"Internal Database URL"** from the database dashboard

### Step 2: Initialize Database Schema

You need to run the database initialization script. You have two options:

**Option A: Run locally then migrate**
```bash
# Set DATABASE_URL temporarily
export DATABASE_URL="your-render-database-url-here"

# Run init script
cd backend
npm run init-db
```

**Option B: Use Render Shell** (after deploying the backend)
```bash
# In Render web service shell
cd backend
npm run init-db
```

### Step 3: Deploy Backend to Render

1. In Render dashboard, click **"New +"** → **"Web Service"**
2. Connect your GitHub repository: `Asad1914/insurnace-demo`
3. Configure the service:
   - **Name**: `insurai-backend` (or `insurai-demo`)
   - **Region**: Same as your database
   - **Branch**: `master`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: Free tier

4. **Environment Variables** - Add these in the "Environment" section:

```bash
# Database (REQUIRED)
DATABASE_URL=<paste-internal-database-url-from-step-1>

# Frontend URL (REQUIRED)
FRONTEND_URL=<your-vercel-url>  # You'll update this after deploying frontend
# Example: FRONTEND_URL=https://insurai.vercel.app

# JWT Secret (REQUIRED - generate a secure random string)
JWT_SECRET=<generate-random-string>
# Generate with: openssl rand -base64 32

# Google Gemini API (REQUIRED)
GEMINI_API_KEY=<your-gemini-api-key>
# Get key from: https://makersuite.google.com/app/apikey

# Optional - Node Environment
NODE_ENV=production

# Optional - JWT Expiry
JWT_EXPIRY=24h
```

5. Click **"Create Web Service"**
6. Wait for deployment to complete (~3-5 minutes)
7. Your backend will be live at: `https://insurai-demo.onrender.com` (or your chosen name)

### Step 4: Verify Backend Deployment

Visit: `https://insurai-demo.onrender.com/health`

You should see:
```json
{
  "status": "healthy",
  "timestamp": "2024-11-16T...",
  "uptime": 123.456,
  "environment": "production"
}
```

If you see "Database connection failed" in the logs:
- Double-check DATABASE_URL is correct
- Ensure database is in the same region
- Check database credentials haven't expired

---

## Part 2: Frontend Deployment on Vercel

### Step 1: Update Frontend Environment Variable

**Important**: You need to set the backend URL in Vercel's environment variables.

1. Log in to your Vercel dashboard
2. Click **"Add New"** → **"Project"**
3. Import your GitHub repository: `Asad1914/insurnace-demo`
4. Configure the project:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

5. **Environment Variables** - Add this variable:

```bash
VITE_API_BASE_URL=https://insurai-demo.onrender.com
```

6. Click **"Deploy"**
7. Wait for deployment (~2-3 minutes)
8. Your frontend will be live at: `https://insurai.vercel.app` (or your custom domain)

### Step 2: Update Backend with Frontend URL

1. Go back to Render backend dashboard
2. Navigate to **"Environment"** tab
3. Update the `FRONTEND_URL` variable:
   ```
   FRONTEND_URL=https://insurai.vercel.app
   ```
   (Replace with your actual Vercel URL)
4. Click **"Save Changes"**
5. Render will automatically redeploy your backend

---

## Part 3: Verification & Testing

### 1. Test Backend API

```bash
# Health check
curl https://insurai-demo.onrender.com/health

# Get states (should work without auth)
curl https://insurai-demo.onrender.com/api/auth/states
```

### 2. Test Frontend

1. Open your Vercel URL in a browser
2. Try to register a new account
3. Check browser console for any errors
4. Try logging in with admin credentials:
   - Email: `admin@insurai.com`
   - Password: `Admin@123456`

### 3. Common Issues

**Issue**: "Failed to load states" on frontend
- **Solution**: Check VITE_API_BASE_URL in Vercel environment variables
- Verify backend is running: visit backend /health endpoint
- Check CORS settings allow your Vercel domain

**Issue**: Database connection failed
- **Solution**: Verify DATABASE_URL in Render environment
- Check database is running and in same region
- Ensure SSL is enabled for database connection

**Issue**: CORS errors in browser console
- **Solution**: Verify FRONTEND_URL in Render matches your Vercel URL exactly
- Check that Vercel URL is in the allowed origins

**Issue**: "Gemini API key not configured"
- **Solution**: Add GEMINI_API_KEY to Render environment variables
- Restart the service after adding the key

---

## Part 4: Ongoing Maintenance

### Redeploying Changes

**Backend**: Push to GitHub, Render auto-deploys from `master` branch

**Frontend**: Push to GitHub, Vercel auto-deploys from `master` branch

### Updating Environment Variables

**Render**:
1. Dashboard → Your Service → Environment
2. Update variable
3. Click "Save Changes" (triggers redeploy)

**Vercel**:
1. Dashboard → Your Project → Settings → Environment Variables
2. Update variable
3. Redeploy from Deployments tab

### Monitoring

**Render**:
- View logs: Dashboard → Your Service → Logs
- Check metrics: Dashboard → Your Service → Metrics

**Vercel**:
- View logs: Dashboard → Your Project → Deployments → [deployment] → Logs
- Analytics: Dashboard → Your Project → Analytics

---

## Environment Variables Reference

### Backend (Render)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string | `postgresql://user:pass@host/db` |
| `FRONTEND_URL` | Yes | Your Vercel frontend URL | `https://insurai.vercel.app` |
| `GEMINI_API_KEY` | Yes | Google Gemini API key | `AIza...` |
| `JWT_SECRET` | Yes | Secret for JWT tokens | Random 32+ char string |
| `NODE_ENV` | No | Environment mode | `production` |
| `JWT_EXPIRY` | No | Token expiration time | `24h` |

### Frontend (Vercel)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_API_BASE_URL` | Yes | Backend API URL | `https://insurai-demo.onrender.com` |

---

## Troubleshooting

### Backend won't start
1. Check Render logs for errors
2. Verify all required environment variables are set
3. Ensure database URL is correct and database is running
4. Check Node.js version compatibility

### Frontend can't connect to backend
1. Verify VITE_API_BASE_URL is correct
2. Test backend /health endpoint directly
3. Check browser console for CORS errors
4. Ensure backend FRONTEND_URL matches Vercel URL

### Database connection issues
1. Verify DATABASE_URL includes all parts: `postgresql://user:password@host:port/database`
2. Check database is in "Available" status on Render
3. Ensure SSL is properly configured
4. Try connecting from local machine with same DATABASE_URL

---

## Security Checklist

- ✅ Generated strong JWT_SECRET (32+ random characters)
- ✅ Database credentials are secure (auto-generated by Render)
- ✅ Environment variables never committed to Git
- ✅ CORS properly configured for your domain only
- ✅ HTTPS enabled on both frontend and backend
- ✅ API keys stored in environment variables

---

## Success Checklist

After following this guide, you should have:

- ✅ PostgreSQL database running on Render
- ✅ Backend API deployed and accessible
- ✅ Frontend deployed on Vercel
- ✅ Frontend can communicate with backend
- ✅ User registration and login working
- ✅ AI chat functionality working
- ✅ Admin dashboard accessible

---

## Need Help?

If you encounter issues not covered in this guide:

1. Check the logs on Render and Vercel
2. Review the README.md for additional documentation
3. Verify all environment variables are set correctly
4. Test each component individually (database → backend → frontend)

---

**Current URLs** (update with your actual URLs):
- Backend: https://insurai-demo.onrender.com
- Frontend: https://<your-app>.vercel.app
- Database: Internal URL from Render PostgreSQL dashboard
