# Quiz App Deployment Guide

## Step 1: Create MongoDB Atlas Database

1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up for free account
3. Create a new cluster (M0 - Free tier)
4. Create a database user (remember username and password)
5. Go to Network Access → Add IP Address → Allow Access from Anywhere (0.0.0.0/0)
6. Go to Clusters → Connect → Drivers → Node.js
7. Copy the connection string (replace `<password>` with your actual password)

Example:
```
mongodb+srv://myuser:mypassword@cluster0.xxxxx.mongodb.net/quiz-app?retryWrites=true&w=majority
```

## Step 2: Push Code to GitHub

```bash
# Initialize git (if not already done)
cd /Users/rajakumar/Desktop/quiz-app
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - Quiz App ready for deployment"

# Add remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/quiz-app.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## Step 3: Deploy Backend to Render

1. Go to https://render.com
2. Sign up with GitHub
3. Click "New" → "Web Service"
4. Connect your GitHub repository
5. Configure:
   - **Name**: `quiz-app-backend`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
6. Click "Advanced" and add Environment Variables:
   - `MONGODB_URI`: Your MongoDB Atlas connection string
   - `JWT_SECRET`: Any random string (e.g., `my-super-secret-jwt-key-12345`)
   - `FRONTEND_URL`: Leave blank for now (we'll update after frontend deploy)
   - `NODE_ENV`: `production`
7. Click "Create Web Service"
8. Wait for deployment to complete
9. Copy the deployed URL (e.g., `https://quiz-app-backend.onrender.com`)

## Step 4: Update Frontend API URL

1. Edit `frontend/index.html`
2. Find the line: `const API_BASE_URL = ...`
3. Replace `https://quiz-app-backend.onrender.com` with your actual Render URL
4. Do the same for all other HTML files (login.html, signup.html, etc.)
5. Commit and push changes:
```bash
git add .
git commit -m "Update API URL for production"
git push
```

## Step 5: Deploy Frontend to Netlify

### Option A: Using Netlify CLI
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy
cd /Users/rajakumar/Desktop/quiz-app
netlify deploy --prod --dir=frontend
```

### Option B: Using Netlify Website (Easier)
1. Go to https://app.netlify.com/drop
2. Drag and drop the `frontend` folder from your computer
3. Netlify will give you a live URL immediately
4. Copy the URL (e.g., `https://quiz-app-12345.netlify.app`)

## Step 6: Update Backend CORS

1. Go back to Render dashboard
2. Click on your service
3. Go to "Environment" tab
4. Add/Update: `FRONTEND_URL` = Your Netlify URL
5. The service will automatically redeploy

## Step 7: Test Your Live App

1. Visit your Netlify URL
2. Test signup/login
3. Test all features
4. Share the link with friends!

## Your URLs

- **Frontend**: `https://your-app-name.netlify.app` (Share this link!)
- **Backend**: `https://quiz-app-backend.onrender.com`

## Important Notes

- Render free tier sleeps after 15 minutes of inactivity (first request may take 30-60 seconds)
- MongoDB Atlas free tier has 512MB storage limit
- Netlify is always fast and doesn't sleep
- Both services are completely free for this usage

## Troubleshooting

If you get CORS errors:
1. Make sure FRONTEND_URL in Render matches your Netlify URL exactly
2. Redeploy the backend after updating environment variables

If database connection fails:
1. Check MONGODB_URI is correct
2. Make sure IP whitelist includes 0.0.0.0/0 in MongoDB Atlas
