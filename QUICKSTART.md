# 🚀 Quick Start Guide - InsurAI Platform

This guide will help you get the InsurAI platform up and running in minutes.

## Prerequisites Check

Before starting, ensure you have:
- [ ] Node.js v18+ installed (`node --version`)
- [ ] PostgreSQL v14+ installed (`psql --version`)
- [ ] Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))

## Step-by-Step Setup

### 1️⃣ Database Setup (5 minutes)

```bash
# Start PostgreSQL service
sudo service postgresql start

# Create database
psql -U postgres -c "CREATE DATABASE insurai_db;"

# Verify database created
psql -U postgres -l | grep insurai
```

### 2️⃣ Backend Setup (5 minutes)

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env

# Edit .env file - REQUIRED CHANGES:
# 1. DB_PASSWORD: Your PostgreSQL password
# 2. GEMINI_API_KEY: Your Google Gemini API key
# 3. JWT_SECRET: Generate a random string (e.g., use: openssl rand -base64 32)
nano .env

# Initialize database (creates tables, admin user, sample data)
npm run init-db

# Start backend server
npm run dev
```

✅ Backend should now be running on http://localhost:5000

### 3️⃣ Frontend Setup (3 minutes)

```bash
# Open new terminal
cd ../frontend

# Install dependencies
npm install

# Setup environment (default values work for local development)
cp .env.example .env

# Start frontend server
npm run dev
```

✅ Frontend should now be running on http://localhost:5173

### 4️⃣ Test the Application

**Option A: Login as Admin**
1. Open http://localhost:5173
2. Click "Sign In"
3. Use credentials:
   - Email: `admin@insurai.com`
   - Password: `Admin@123456`
4. You'll be redirected to admin dashboard

**Option B: Register as User**
1. Open http://localhost:5173
2. Click "Sign Up"
3. Fill in:
   - Email: your@email.com
   - Select your state (e.g., Dubai)
   - Password: Min 8 chars with uppercase, lowercase, number, special char
4. Complete registration and explore!

## 🎯 Quick Feature Test

### Test User Flow (3 minutes)
1. ✅ Click "Get Started" on home page
2. ✅ Answer questionnaire (select any options)
3. ✅ View insurance plans filtered by your state
4. ✅ Click chat icon to talk to AI advisor

### Test Admin Flow (5 minutes)
1. ✅ Login as admin
2. ✅ Go to "Upload Files" tab
3. ✅ Download a [sample insurance file](https://drive.google.com/drive/folders/11HCI4aG4B5QbnfpfGsfrWDMF8b1qyLQe?usp=drive_link)
4. ✅ Upload file, select state (e.g., Dubai)
5. ✅ Wait for AI to process (~10-30 seconds)
6. ✅ Check "Manage Plans" to see newly created plans

## 🔧 Common Issues & Solutions

### Issue: Database connection error
```bash
# Solution: Check if PostgreSQL is running
sudo service postgresql status
sudo service postgresql start

# Verify credentials
psql -U postgres -d insurai_db
```

### Issue: Port already in use
```bash
# Kill process on port 5000 (backend)
sudo lsof -ti:5000 | xargs kill -9

# Kill process on port 5173 (frontend)
sudo lsof -ti:5173 | xargs kill -9
```

### Issue: Gemini API errors
- Verify API key is correct in backend/.env
- Check API key at https://makersuite.google.com/app/apikey
- Ensure no extra spaces or quotes around the key

### Issue: Frontend can't reach backend
- Ensure backend is running on port 5000
- Check backend logs for errors
- Verify VITE_API_BASE_URL in frontend/.env

## 📊 Verify Setup

Run these commands to verify everything is working:

```bash
# Check backend health
curl http://localhost:5000/health

# Should return: {"status":"ok", ...}

# Check frontend
curl http://localhost:5173

# Should return HTML content
```

## 🎓 Next Steps

1. **Explore the UI**: Navigate through different pages
2. **Test AI Chat**: Ask insurance-related questions
3. **Upload Documents**: Try uploading insurance files as admin
4. **Check Database**: View created records with `psql -U postgres -d insurai_db`

## 📚 Additional Resources

- **Full Documentation**: See README.md
- **API Documentation**: Check API endpoints section in README.md
- **Sample Files**: [Insurance documents for testing](https://drive.google.com/drive/folders/11HCI4aG4B5QbnfpfGsfrWDMF8b1qyLQe?usp=drive_link)

## 🆘 Getting Help

If you encounter issues:
1. Check the "Troubleshooting" section in README.md
2. Review backend logs in the terminal
3. Check browser console for frontend errors
4. Verify all environment variables are set correctly

---

**Congratulations! 🎉** Your InsurAI platform is now ready to use!

Total setup time: ~15 minutes
