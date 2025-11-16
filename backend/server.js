import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fileUpload from 'express-fileupload';
import pool from './config/database.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

// Import routes
import authRoutes from './routes/auth.js';
import plansRoutes from './routes/plans.js';
import chatRoutes from './routes/chat.js';
import adminRoutes from './routes/admin.js';
import testRoutes from './routes/test.js';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
// CORS configuration - allow frontend URLs
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:8080'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    // Check if origin is in allowed list or matches Vercel preview URLs
    if (allowedOrigins.includes(origin) || origin.includes('vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// File upload middleware
app.use(fileUpload({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max file size
  abortOnLimit: true,
  responseOnLimit: 'File size exceeds the 10MB limit',
  useTempFiles: false,
  debug: process.env.NODE_ENV === 'development'
}));

// Request logging middleware (development)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/plans', plansRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/test', testRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'InsurAI API',
    version: '1.0.0',
    description: 'AI-powered insurance platform backend',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      plans: '/api/plans',
      chat: '/api/chat',
      admin: '/api/admin'
    }
  });
});

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Start server
const server = app.listen(PORT, async () => {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║                                                   ║');
  console.log('║           🚀 InsurAI Backend Server 🚀           ║');
  console.log('║                                                   ║');
  console.log('╚═══════════════════════════════════════════════════╝');
  console.log('');
  console.log(`🌐 Server running on: http://localhost:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log('');
  console.log('📡 Available endpoints:');
  console.log('   - GET  /health          (Health check)');
  console.log('   - POST /api/auth/register');
  console.log('   - POST /api/auth/login');
  console.log('   - GET  /api/auth/states');
  console.log('   - GET  /api/plans       (Protected)');
  console.log('   - GET  /api/plans/:id   (Protected)');
  console.log('   - POST /api/chat        (Protected)');
  console.log('   - GET  /api/chat/history (Protected)');
  console.log('   - POST /api/admin/upload-plans (Admin only)');
  console.log('   - GET  /api/admin/plans (Admin only)');
  console.log('   - GET  /api/admin/stats (Admin only)');
  console.log('');
  
  // Test database connection
  try {
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  }
  
  // Check if Gemini API key is set
  if (process.env.GEMINI_API_KEY) {
    console.log('✅ Gemini API key configured');
  } else {
    console.warn('⚠️  Warning: GEMINI_API_KEY not set in environment variables');
  }
  
  console.log('');
  console.log('Press Ctrl+C to stop the server');
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(async () => {
    console.log('HTTP server closed');
    await pool.end();
    console.log('Database connection pool closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(async () => {
    console.log('HTTP server closed');
    await pool.end();
    console.log('Database connection pool closed');
    process.exit(0);
  });
});

export default app;
