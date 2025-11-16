# InsurAI Platform - Setup Verification & Testing Guide ✅

## Pre-Setup Verification

### System Requirements Check
```bash
# Check Node.js version (need v18+)
node --version

# Check npm version
npm --version

# Check PostgreSQL (need v14+)
psql --version

# Check if PostgreSQL is running
sudo systemctl status postgresql
# or
pg_isready
```

## Installation Verification

### 1. Backend Installation ✅

```bash
cd backend

# Verify package.json exists
cat package.json | grep "insurai-backend"

# Check dependencies installed
ls node_modules | wc -l
# Should show 50+ packages

# Verify environment file
cat .env | grep GEMINI_API_KEY
```

### 2. Frontend Installation ✅

```bash
cd frontend

# Verify package.json
cat package.json | grep "insurai-frontend"

# Check dependencies
ls node_modules | wc -l
# Should show 100+ packages

# Verify environment
cat .env
```

### 3. Database Verification ✅

```bash
# Connect to database
psql -U postgres -d insurai_db

# Check tables exist
\dt

# Should show:
# - users
# - states
# - providers
# - plans
# - chat_history

# Check UAE states
SELECT * FROM states;

# Should show 7 emirates:
# Abu Dhabi, Dubai, Sharjah, Ajman, UAQ, RAK, Fujairah

# Check admin user
SELECT email, role FROM users WHERE role = 'admin';

# Should show: admin@insurai.com | admin

# Exit psql
\q
```

## Functional Testing Checklist

### Backend API Tests

#### Test 1: Health Check
```bash
curl http://localhost:5000/health

# Expected: {"status":"healthy", ...}
```

#### Test 2: Get States
```bash
curl http://localhost:5000/api/auth/states

# Expected: {"states": [{"id": 1, "state_name": "Abu Dhabi", ...}, ...]}
```

#### Test 3: Register User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test@123",
    "full_name": "Test User",
    "state_id": 2
  }'

# Expected: {"message":"User registered successfully", "token": "...", "user": {...}}
```

#### Test 4: Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@insurai.com",
    "password": "Admin@123"
  }'

# Expected: {"message":"Login successful", "token": "...", "user": {...}}
# Save the token for next tests
```

#### Test 5: Get Plans (Protected)
```bash
# Replace YOUR_TOKEN with actual token from login
curl http://localhost:5000/api/plans?type=Health \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: {"plans": [...], "pagination": {...}}
```

#### Test 6: Chat with AI (Protected)
```bash
curl -X POST http://localhost:5000/api/chat \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is a deductible?"
  }'

# Expected: {"reply": "...", "session_id": "...", ...}
```

### Frontend UI Tests

#### Test 1: Application Loads
1. Open http://localhost:5173
2. ✅ Should redirect to /login
3. ✅ Login page displays correctly
4. ✅ No console errors

#### Test 2: Registration Flow
1. Click "Sign Up" link
2. ✅ Registration form displays
3. ✅ State dropdown shows all 7 emirates
4. Fill in form:
   - Email: test@test.com
   - Password: Test@1234 (note requirements)
   - Full Name: Test User
   - State: Dubai
5. Click "Sign Up"
6. ✅ Redirects to home page
7. ✅ User name shown in navbar

#### Test 3: Login Flow
1. Go to /login
2. Enter:
   - Email: admin@insurai.com
   - Password: Admin@123
3. Click "Sign In"
4. ✅ Redirects to /admin (admin users)
5. ✅ Or redirects to / (regular users)

#### Test 4: Questionnaire Flow
1. Login as regular user
2. Click "Start Questionnaire"
3. ✅ Step 1: Select insurance type (e.g., Health)
4. ✅ Step 2: Select coverage type
5. ✅ Step 3: Enter budget (e.g., 1000)
6. Click "Find Plans"
7. ✅ Redirects to comparison page
8. ✅ Plans displayed (or "No plans found" message)

#### Test 5: Chatbot Flow
1. Click "Chat with AI Advisor" or navigate to /chat
2. ✅ Chat interface loads
3. ✅ Welcome message from AI displayed
4. Type: "What is insurance?"
5. Press Enter
6. ✅ Loading indicator shows
7. ✅ AI response appears (10-30 seconds)
8. ✅ Message history maintained

#### Test 6: Admin Dashboard
1. Login as admin
2. Navigate to /admin
3. ✅ Statistics cards display
4. ✅ Upload section visible
5. ✅ Plans table displays

#### Test 7: File Upload (Admin)
1. On admin dashboard
2. Select state: "Dubai"
3. Choose file: (PDF/Word/Excel with insurance info)
4. Click "Upload and Process"
5. ✅ Status message shows "Processing..."
6. ✅ Success message after completion
7. ✅ New plans appear in table
8. ✅ Stats update

#### Test 8: Plan Management (Admin)
1. Scroll to "Manage Plans" table
2. ✅ Plans listed with details
3. Click ❌ (deactivate) on a plan
4. ✅ Status changes to "Inactive"
5. ✅ Plan appears grayed out
6. Click ✅ to reactivate
7. ✅ Status back to "Active"

### Integration Tests

#### Test 1: State-Based Filtering
1. Register user in "Abu Dhabi"
2. Complete questionnaire
3. ✅ Only Abu Dhabi plans shown
4. Register another user in "Dubai"
5. ✅ Only Dubai plans shown

#### Test 2: Protected Routes
1. Logout
2. Try to access /
3. ✅ Redirects to /login
4. Try to access /admin
5. ✅ Redirects to /login
6. Login as regular user
7. Try to access /admin
8. ✅ Redirects to / (access denied)

#### Test 3: Token Expiry
1. Login and save token
2. Wait 24 hours or modify token
3. Try to access protected route
4. ✅ Redirects to /login
5. ✅ Shows "Token expired" message

## Performance Tests

### Backend Performance
```bash
# Test response time
time curl http://localhost:5000/health

# Should complete in < 100ms

# Test database query speed
time curl http://localhost:5000/api/auth/states

# Should complete in < 200ms
```

### Frontend Performance
1. Open DevTools → Network tab
2. Reload page
3. ✅ Initial load < 2 seconds
4. ✅ JS bundle < 500KB
5. ✅ No 404 errors
6. Open DevTools → Console
7. ✅ No errors or warnings

## Security Tests

### Test 1: Password Requirements
1. Try to register with weak password: "test"
2. ✅ Error: "Password must be at least 8 characters..."

### Test 2: SQL Injection Prevention
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@insurai.com",
    "password": "' OR '1'='1"
  }'

# Expected: {"error": "Invalid email or password"}
# NOT: SQL error or successful login
```

### Test 3: Unauthorized Access
```bash
# Try to access protected route without token
curl http://localhost:5000/api/plans

# Expected: {"error": "Access token required"}
```

### Test 4: Invalid Token
```bash
curl http://localhost:5000/api/plans \
  -H "Authorization: Bearer invalid_token_here"

# Expected: {"error": "Invalid or expired token"}
```

## Error Handling Tests

### Test 1: Invalid Registration Data
1. Try to register without email
2. ✅ Error message displayed
3. Try with invalid email format
4. ✅ Error message displayed

### Test 2: Wrong Credentials
1. Login with wrong password
2. ✅ "Invalid email or password" shown

### Test 3: Network Error Simulation
1. Stop backend server
2. Try to login on frontend
3. ✅ Error message displayed
4. ✅ App doesn't crash

### Test 4: File Upload Errors
1. Try to upload invalid file type
2. ✅ Error: "Invalid file type"
3. Try to upload without selecting state
4. ✅ Error: "Please select state"

## Browser Compatibility

Test on:
- ✅ Chrome/Chromium (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)

### Mobile Responsive
1. Open DevTools → Toggle device toolbar
2. Test on iPhone SE, iPad, Galaxy S20
3. ✅ Layout adjusts properly
4. ✅ All buttons accessible
5. ✅ Forms usable
6. ✅ Chat interface works

## Data Integrity Tests

### Test 1: Database Consistency
```sql
-- Connect to database
psql -U postgres -d insurai_db

-- Check referential integrity
SELECT COUNT(*) FROM plans WHERE provider_id NOT IN (SELECT id FROM providers);
-- Should return: 0

SELECT COUNT(*) FROM plans WHERE state_id NOT IN (SELECT id FROM states);
-- Should return: 0

-- Check no duplicate emails
SELECT email, COUNT(*) FROM users GROUP BY email HAVING COUNT(*) > 1;
-- Should return: 0 rows
```

### Test 2: Chat History Persistence
1. Chat with AI
2. Refresh page
3. Check database:
```sql
SELECT COUNT(*) FROM chat_history WHERE user_id = YOUR_USER_ID;
-- Should show message count
```

## Final Verification

### Complete System Check
```bash
# 1. Backend running
curl http://localhost:5000/health
# ✅ Returns healthy status

# 2. Frontend running
curl http://localhost:5173
# ✅ Returns HTML

# 3. Database accessible
psql -U postgres -d insurai_db -c "SELECT COUNT(*) FROM users;"
# ✅ Returns count

# 4. All services integrated
# ✅ Can register → login → search plans → chat → logout
```

## Common Issues & Solutions

### Issue: "Database connection failed"
```bash
# Check PostgreSQL
sudo systemctl status postgresql
sudo systemctl start postgresql

# Check credentials in .env
cat backend/.env | grep DB_
```

### Issue: "Gemini API error"
```bash
# Verify API key
cat backend/.env | grep GEMINI_API_KEY

# Test key manually at: https://makersuite.google.com/app/apikey
```

### Issue: "Cannot connect to backend"
```bash
# Check if backend is running
lsof -i :5000

# Check firewall
sudo ufw status

# Check logs
cd backend && npm run dev
```

### Issue: "Plans not showing"
```bash
# Check if plans exist in database
psql -U postgres -d insurai_db -c "SELECT COUNT(*) FROM plans WHERE is_active = true;"

# If 0, upload some plans as admin
```

## Success Criteria ✅

Your installation is successful if:
- ✅ Backend server starts without errors
- ✅ Frontend loads at localhost:5173
- ✅ Can register new user
- ✅ Can login as admin
- ✅ Can upload document as admin
- ✅ Can search for plans
- ✅ Chatbot responds to messages
- ✅ No console errors
- ✅ Database has data
- ✅ All 7 UAE states configured

## Production Readiness

Before deploying to production:
- [ ] Change JWT_SECRET to strong random value
- [ ] Use production database credentials
- [ ] Set NODE_ENV=production
- [ ] Configure HTTPS/SSL
- [ ] Set up proper CORS origins
- [ ] Configure file upload limits
- [ ] Set up database backups
- [ ] Configure logging
- [ ] Set up monitoring
- [ ] Perform security audit

---

**All Tests Passed? 🎉**

Congratulations! Your InsurAI platform is fully functional and ready to use!

For any issues, refer to:
- README.md - Full documentation
- QUICKSTART.md - Quick setup guide
- PROJECT_SUMMARY.md - Project overview
