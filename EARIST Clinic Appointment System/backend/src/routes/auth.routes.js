const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../config/db');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login - Restricted to Medical Staff (Doctors/Nurses) and Administrators
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Please provide both staff email and password.' });
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ success: false, message: 'Invalid staff email or password.' });
  }

  // Fetch role-specific details
  let profile = {};
  if (user.role === 'assistant') {
    profile = db.prepare('SELECT * FROM assistants WHERE user_id = ?').get(user.id) || {};
  }

  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    first_name: user.first_name,
    last_name: user.last_name,
    id_number: user.id_number,
    assistant_id: profile.assistant_id || null
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

  return res.json({
    success: true,
    message: `Welcome back, ${user.first_name}!`,
    token,
    user: {
      ...payload,
      contact_number: user.contact_number,
      profile
    }
  });
});

// GET /api/auth/me - Verify current session
router.get('/me', authenticateToken, (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id, email, role, first_name, last_name, id_number, contact_number, created_at FROM users WHERE id = ?').get(req.user.id);

  if (!user) {
    return res.status(404).json({ success: false, message: 'User record not found.' });
  }

  let profile = {};
  let assistant_id = null;
  if (user.role === 'assistant') {
    profile = db.prepare('SELECT * FROM assistants WHERE user_id = ?').get(user.id) || {};
    assistant_id = profile.assistant_id || null;
  }

  return res.json({
    success: true,
    user: {
      ...user,
      assistant_id,
      profile
    }
  });
});

module.exports = router;
