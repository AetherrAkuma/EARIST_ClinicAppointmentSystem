require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { getDb } = require('./config/db');
const { seedDatabase } = require('./config/seed');

const authRoutes = require('./routes/auth.routes');
const doctorRoutes = require('./routes/doctor.routes');
const appointmentRoutes = require('./routes/appointment.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize SQLite database and seed initial EARIST staff/accounts
try {
  getDb();
  seedDatabase();
} catch (err) {
  console.error('[server] Database startup error:', err);
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'EARIST Manila Clinic Appointment System API',
    timestamp: new Date().toISOString()
  });
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('[error]', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` EARIST-Manila Clinic System API running on port ${PORT}`);
  console.log(` URL: http://localhost:${PORT}/api/health`);
  console.log(`====================================================`);
});

module.exports = app;
