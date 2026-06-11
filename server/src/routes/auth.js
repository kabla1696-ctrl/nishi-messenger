const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { generateToken } = require('../middleware/auth');
const db = require('../config/database');

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { phoneNumber, displayName } = req.body;
    
    // Check if user exists
    const existingUser = await db.query(
      'SELECT id FROM users WHERE phone_number = $1',
      [phoneNumber]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Phone number already registered' });
    }
    
    // Create user
    const userId = uuidv4();
    await db.query(
      `INSERT INTO users (id, phone_number, display_name) 
       VALUES ($1, $2, $3)`,
      [userId, phoneNumber, displayName]
    );
    
    // Generate token
    const token = generateToken(userId);
    
    res.status(201).json({
      success: true,
      userId,
      token,
      message: 'Registration successful'
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send OTP (simulated)
router.post('/login', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    // Check if user exists
    const user = await db.query(
      'SELECT id FROM users WHERE phone_number = $1',
      [phoneNumber]
    );
    
    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // In production, send OTP via SMS
    // For demo, we'll use a static OTP
    const otp = '123456';
    
    res.json({
      success: true,
      message: 'OTP sent',
      // Remove this in production!
      debug: { otp }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify OTP
router.post('/verify', async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;
    
    // In production, verify OTP from Redis/database
    // For demo, accept static OTP
    if (otp !== '123456') {
      return res.status(401).json({ error: 'Invalid OTP' });
    }
    
    // Get user
    const user = await db.query(
      'SELECT id FROM users WHERE phone_number = $1',
      [phoneNumber]
    );
    
    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userId = user.rows[0].id;
    
    // Update online status
    await db.query(
      'UPDATE users SET is_online = true, last_seen = NOW() WHERE id = $1',
      [userId]
    );
    
    // Generate token
    const token = generateToken(userId);
    
    res.json({
      success: true,
      userId,
      token,
      message: 'Login successful'
    });
    
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    // Verify refresh token and generate new one
    // ...
    
    res.json({
      success: true,
      token: generateToken(userId)
    });
    
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
