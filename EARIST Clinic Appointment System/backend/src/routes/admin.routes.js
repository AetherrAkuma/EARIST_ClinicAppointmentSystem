const express = require('express');
const { getDb } = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Apply admin guard to all admin routes
router.use(authenticateToken, requireRole('admin'));

// GET /api/admin/metrics - Campus health and clinic analytics
router.get('/metrics', (req, res) => {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];

  const totalDoctors = db.prepare(`SELECT COUNT(*) as count FROM assistants WHERE is_active = 1`).get().count;
  const onDutyDoctors = db.prepare(`SELECT COUNT(*) as count FROM assistants WHERE is_on_duty = 1 AND is_active = 1`).get().count;
  const totalAppointments = db.prepare(`SELECT COUNT(*) as count FROM appointments`).get().count;
  const todayVisits = db.prepare(`SELECT COUNT(*) as count FROM appointments WHERE appointment_date = ?`).get(today).count;

  // Breakdown by student vs faculty
  const studentVisits = db.prepare(`SELECT COUNT(*) as count FROM appointments WHERE patient_type = 'student'`).get().count;
  const facultyVisits = db.prepare(`SELECT COUNT(*) as count FROM appointments WHERE patient_type = 'faculty_staff'`).get().count;

  // Status breakdown
  const statusRows = db.prepare(`
    SELECT status, COUNT(*) as count FROM appointments GROUP BY status
  `).all();
  const statusBreakdown = {
    Pending: 0,
    Approved: 0,
    OnGoing: 0,
    Completed: 0,
    Cancelled: 0
  };
  for (const row of statusRows) {
    statusBreakdown[row.status] = row.count;
  }

  return res.json({
    success: true,
    metrics: {
      totalDoctors,
      onDutyDoctors,
      totalAppointments,
      todayVisits,
      studentVisits,
      facultyVisits,
      statusBreakdown
    }
  });
});

// GET /api/admin/users - Directory of campus clinic staff (Doctors & Admins)
router.get('/users', (req, res) => {
  const db = getDb();
  const users = db.prepare(`
    SELECT 
      u.id,
      u.email,
      u.role,
      u.first_name,
      u.last_name,
      u.id_number,
      u.contact_number,
      u.created_at,
      a.assistant_id,
      a.specialization,
      a.room_number,
      a.is_on_duty,
      a.is_active
    FROM users u
    LEFT JOIN assistants a ON u.id = a.user_id
    ORDER BY u.role ASC, u.last_name ASC
  `).all();

  return res.json({ success: true, users });
});

// GET /api/admin/appointments - Complete clinic consultation log
router.get('/appointments', (req, res) => {
  const db = getDb();
  const appointments = db.prepare(`
    SELECT 
      ap.*,
      d_u.first_name AS doctor_first_name,
      d_u.last_name AS doctor_last_name,
      ast.specialization,
      ast.room_number
    FROM appointments ap
    JOIN assistants ast ON ap.assistant_id = ast.assistant_id
    JOIN users d_u ON ast.user_id = d_u.id
    ORDER BY ap.appointment_date DESC, ap.created_at DESC
  `).all();

  return res.json({ success: true, appointments });
});

// GET /api/admin/export - CSV Export of clinic appointments
router.get('/export', (req, res) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT 
      ap.reference_code,
      ap.appointment_date,
      ap.time_slot,
      ap.patient_type,
      ap.patient_name,
      ap.id_number,
      ap.department,
      ap.course,
      ap.year_section,
      ap.contact_number,
      ap.symptoms,
      ap.symptom_severity,
      ap.service_type,
      ap.status,
      d_u.first_name || ' ' || d_u.last_name AS doctor_name,
      ast.specialization,
      COALESCE(ap.diagnosis, 'None') AS diagnosis,
      COALESCE(ap.prescription, 'None') AS prescription
    FROM appointments ap
    JOIN assistants ast ON ap.assistant_id = ast.assistant_id
    JOIN users d_u ON ast.user_id = d_u.id
    ORDER BY ap.appointment_date DESC
  `).all();

  const header = [
    'Ref Code', 'Date', 'Time Slot', 'Type', 'Name', 'ID Number', 'College/Dept',
    'Course', 'Year & Sec', 'Contact', 'Symptoms', 'Severity', 'Service', 'Status', 'Doctor', 'Specialization', 'Diagnosis', 'Prescription'
  ];
  const csvLines = [header.join(',')];

  for (const r of rows) {
    const line = [
      `"${r.reference_code}"`,
      `"${r.appointment_date}"`,
      `"${r.time_slot}"`,
      `"${r.patient_type}"`,
      `"${r.patient_name}"`,
      `"${r.id_number}"`,
      `"${r.department}"`,
      `"${r.course || ''}"`,
      `"${r.year_section || ''}"`,
      `"${r.contact_number}"`,
      `"${(r.symptoms || '').replace(/"/g, '""')}"`,
      `"${r.symptom_severity}"`,
      `"${r.service_type}"`,
      `"${r.status}"`,
      `"${r.doctor_name}"`,
      `"${r.specialization}"`,
      `"${(r.diagnosis || '').replace(/"/g, '""')}"`,
      `"${(r.prescription || '').replace(/"/g, '""')}"`
    ];
    csvLines.push(line.join(','));
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="earist_clinic_consultation_logs.csv"');
  return res.send(csvLines.join('\n'));
});

module.exports = router;
