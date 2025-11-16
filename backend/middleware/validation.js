// Validation middleware for common scenarios

// Validate email format
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate password strength
export const validatePassword = (password) => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special char
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
  return passwordRegex.test(password);
};

// Middleware to validate registration input
export const validateRegistration = (req, res, next) => {
  const { email, password, full_name, state_id } = req.body;

  if (!email || !password || !full_name || !state_id) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['email', 'password', 'full_name', 'state_id']
    });
  }

  if (!validateEmail(email)) {
    return res.status(400).json({
      error: 'Invalid email format'
    });
  }

  if (!validatePassword(password)) {
    return res.status(400).json({
      error: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character'
    });
  }

  next();
};

// Middleware to validate login input
export const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: 'Email and password are required'
    });
  }

  if (!validateEmail(email)) {
    return res.status(400).json({
      error: 'Invalid email format'
    });
  }

  next();
};

// Middleware to validate plan query parameters
export const validatePlanQuery = (req, res, next) => {
  const { type, state_id, max_deductible, max_cost } = req.query;

  if (type && !['Health', 'Auto', 'Life', 'Property', 'Travel'].includes(type)) {
    return res.status(400).json({
      error: 'Invalid plan type',
      validTypes: ['Health', 'Auto', 'Life', 'Property', 'Travel']
    });
  }

  if (max_deductible && isNaN(parseFloat(max_deductible))) {
    return res.status(400).json({
      error: 'max_deductible must be a number'
    });
  }

  if (max_cost && isNaN(parseFloat(max_cost))) {
    return res.status(400).json({
      error: 'max_cost must be a number'
    });
  }

  next();
};

// Sanitize input to prevent SQL injection
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.trim().replace(/[<>]/g, '');
};
