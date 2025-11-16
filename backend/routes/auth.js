import express from 'express';
import bcrypt from 'bcrypt';
import { query } from '../config/database.js';
import { generateToken } from '../middleware/auth.js';
import { validateRegistration, validateLogin } from '../middleware/validation.js';

const router = express.Router();

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', validateRegistration, async (req, res) => {
  try {
    const { email, password, full_name, state_id } = req.body;

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Verify state exists
    const stateCheck = await query(
      'SELECT id FROM states WHERE id = $1',
      [state_id]
    );

    if (stateCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid state ID' });
    }

    // Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Create user
    const result = await query(
      `INSERT INTO users (email, password_hash, full_name, state_id, role)
       VALUES ($1, $2, $3, $4, 'user')
       RETURNING id, email, full_name, role, state_id, created_at`,
      [email.toLowerCase(), password_hash, full_name, state_id]
    );

    const user = result.rows[0];

    // Get state info
    const stateInfo = await query(
      'SELECT state_name, state_code FROM states WHERE id = $1',
      [state_id]
    );

    // Generate token
    const token = generateToken(user.id, user.email, user.role);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        state: stateInfo.rows[0],
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

/**
 * POST /api/auth/login
 * Authenticate a user
 */
router.post('/login', validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user with state information
    const result = await query(
      `SELECT u.id, u.email, u.password_hash, u.full_name, u.role, u.state_id,
              s.state_name, s.state_code
       FROM users u
       LEFT JOIN states s ON u.state_id = s.id
       WHERE u.email = $1`,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate token
    const token = generateToken(user.id, user.email, user.role);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        state: {
          id: user.state_id,
          state_name: user.state_name,
          state_code: user.state_code
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

/**
 * GET /api/auth/states
 * Get all available states
 */
router.get('/states', async (req, res) => {
  try {
    const result = await query(
      'SELECT id, state_name, state_code FROM states ORDER BY state_name'
    );

    res.json({
      states: result.rows
    });
  } catch (error) {
    console.error('Error fetching states:', error);
    res.status(500).json({ error: 'Failed to fetch states' });
  }
});

export default router;
