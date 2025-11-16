# InsurAI - AI-Powered Insurance Platform 🚀

A complete full-stack web application that helps users in the United Arab Emirates find and compare insurance plans using Google Gemini AI. The platform features state-specific plan filtering, AI-powered chatbot assistance, and an admin dashboard for managing insurance plans.

## 🎯 Features

### User Features
- **User Authentication**: Secure registration and login with state/emirate selection
- **Multi-Step Questionnaire**: Interactive form to gather user requirements
- **Smart Plan Comparison**: View and compare insurance plans filtered by state and preferences
- **AI Insurance Advisor**: 24/7 chatbot powered by Google Gemini AI to answer insurance questions
- **State-Specific Results**: Plans tailored to user's emirate (Abu Dhabi, Dubai, Sharjah, etc.)

### Admin Features
- **File Upload & AI Processing**: Upload PDF, Word, or Excel files containing insurance plans
- **Automatic Data Extraction**: Gemini AI automatically extracts and structures plan data
- **Plan Management**: Activate/deactivate or delete insurance plans
- **Dashboard Analytics**: View statistics on users, plans, and conversations
- **State Assignment**: Assign plans to specific emirates

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18 or higher)
- **PostgreSQL** (v14 or higher)
- **npm** or **yarn**
- **Google Gemini API Key** ([Get it here](https://makersuite.google.com/app/apikey))

## 🛠️ Installation

### 1. Clone the Repository

```bash
cd /home/asad/insurnace_bot
```

### 2. Backend Setup

#### Install Dependencies
```bash
cd backend
npm install
```

#### Configure Environment Variables
```bash
cp .env.example .env
```

Edit `.env` file with your configurations:
```env
# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=insurai_db
DB_USER=postgres
DB_PASSWORD=your_postgres_password

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_min_32_characters_long
JWT_EXPIRY=24h

# Google Gemini AI API
GEMINI_API_KEY=your_gemini_api_key_here
```

#### Setup PostgreSQL Database

1. Create the database:
```bash
createdb insurai_db
```

Or using psql:
```bash
psql -U postgres
CREATE DATABASE insurai_db;
\q
```

2. Initialize the database schema:
```bash
npm run init-db
```

This will create all necessary tables and insert:
- UAE states/emirates
- Sample providers
- Default admin account

### 3. Frontend Setup

#### Install Dependencies
```bash
cd ../frontend
npm install
```

#### Configure Environment Variables
```bash
cp .env.example .env
```

Edit `.env` file:
```env
VITE_API_BASE_URL=http://localhost:5000
```

## 🚀 Running the Application

### Start Backend Server
```bash
cd backend
npm run dev
```

The backend will run on `http://localhost:5000`

### Start Frontend Development Server
```bash
cd frontend
npm run dev
```

The frontend will run on `http://localhost:5173`

## 👤 Default Admin Credentials

After database initialization, use these credentials to login as admin:

```
Email: admin@insurai.com
Password: Admin@123
```

## 📁 Project Structure

```
insurnace_bot/
├── backend/
│   ├── config/
│   │   ├── database.js          # Database connection
│   │   └── schema.sql            # Database schema
│   ├── middleware/
│   │   ├── auth.js               # JWT authentication
│   │   ├── errorHandler.js      # Error handling
│   │   └── validation.js        # Input validation
│   ├── routes/
│   │   ├── admin.js              # Admin routes (file upload, plan management)
│   │   ├── auth.js               # Authentication routes
│   │   ├── chat.js               # Chatbot routes
│   │   └── plans.js              # Insurance plans routes
│   ├── scripts/
│   │   └── initDatabase.js      # Database initialization
│   ├── services/
│   │   └── gemini.js            # Gemini AI integration
│   ├── uploads/                 # Uploaded files directory
│   ├── .env.example             # Environment variables template
│   ├── package.json
│   └── server.js                # Main server file
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AdminDashboard.jsx    # Admin panel
│   │   │   ├── AdminDashboard.css
│   │   │   ├── Auth.css              # Auth styles
│   │   │   ├── Chatbot.jsx           # AI chatbot interface
│   │   │   ├── Chatbot.css
│   │   │   ├── ComparisonPage.jsx    # Plans comparison
│   │   │   ├── ComparisonPage.css
│   │   │   ├── Home.jsx              # Landing page
│   │   │   ├── Home.css
│   │   │   ├── Login.jsx             # Login form
│   │   │   ├── ProtectedRoute.jsx    # Route protection
│   │   │   ├── Questionnaire.jsx     # Multi-step form
│   │   │   ├── Questionnaire.css
│   │   │   └── Register.jsx          # Registration form
│   │   ├── context/
│   │   │   └── AuthContext.jsx       # Authentication context
│   │   ├── services/
│   │   │   └── api.js                # API service layer
│   │   ├── App.jsx                   # Main app component
│   │   ├── index.css                 # Global styles
│   │   └── main.jsx                  # Entry point
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

## 🔑 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/states` - Get all UAE states

### Plans (Protected)
- `GET /api/plans` - Get insurance plans with filters
- `GET /api/plans/:id` - Get specific plan details
- `GET /api/plans/meta/types` - Get available plan types

### Chat (Protected)
- `POST /api/chat` - Send message to AI advisor
- `GET /api/chat/history` - Get chat history
- `DELETE /api/chat/history/:session_id` - Clear chat history

### Admin (Protected - Admin Only)
- `POST /api/admin/upload-plans` - Upload insurance plan documents
- `GET /api/admin/plans` - Get all plans (including inactive)
- `PUT /api/admin/plans/:id` - Update plan
- `DELETE /api/admin/plans/:id` - Delete plan
- `GET /api/admin/stats` - Get dashboard statistics

## 🤖 AI Features

### Insurance Advisor Chatbot
The chatbot uses Google Gemini AI to:
- Answer insurance terminology questions
- Explain policy details
- Provide UAE-specific insurance guidance
- Maintain conversation context

### Plan Extraction
The admin can upload documents (PDF/Word/Excel) containing insurance plans. The AI:
- Extracts plan details automatically
- Structures data (name, cost, deductible, coverage, features)
- Saves to database with state assignment
- Supports multiple plans per document

## 🌍 UAE States Supported

- Abu Dhabi (AD)
- Dubai (DU)
- Sharjah (SH)
- Ajman (AJ)
- Umm Al Quwain (UAQ)
- Ras Al Khaimah (RAK)
- Fujairah (FU)

## 🔒 Security Features

- Password hashing with bcrypt (10 rounds)
- JWT token-based authentication
- Protected routes with role-based access
- Input validation and sanitization
- SQL injection prevention with parameterized queries
- CORS configuration
- Environment variable protection

## 📊 Database Schema

### Tables
- **users** - User accounts with state association
- **states** - UAE emirates/states
- **providers** - Insurance providers
- **plans** - Insurance plans with state filtering
- **chat_history** - Conversation logs

## 🧪 Testing the Application

### 1. Register a New User
1. Navigate to `http://localhost:5173/register`
2. Fill in details and select your emirate
3. Click "Sign Up"

### 2. Upload Insurance Plans (Admin)
1. Login with admin credentials
2. Navigate to Admin Dashboard
3. Select an emirate and upload a PDF/Word/Excel file
4. AI will process and extract plan data

### 3. Find Insurance Plans
1. Click "Start Questionnaire"
2. Select insurance type and coverage
3. Set budget preferences
4. View comparison results

### 4. Chat with AI Advisor
1. Click "Chat with AI Advisor"
2. Ask insurance questions
3. Get instant AI-powered answers

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql -U postgres -d insurai_db
```

### Port Already in Use
```bash
# Change PORT in backend/.env
# Change port in frontend/vite.config.js
```

### Gemini API Errors
- Verify API key is correct in backend/.env
- Check API quota at Google AI Studio
- Ensure network connectivity

## 📝 Development

### Build for Production

Backend:
```bash
cd backend
npm start
```

Frontend:
```bash
cd frontend
npm run build
npm run preview
```

## 🤝 Contributing

This project was developed as a complete insurance platform solution.

## 📄 License

ISC

## 👨‍💻 Author

Built with ❤️ for UAE insurance seekers

## 🙏 Acknowledgments

- Google Gemini AI for intelligent chatbot and document processing
- PostgreSQL for robust data storage
- React and Vite for modern frontend development
- Express.js for powerful backend API
