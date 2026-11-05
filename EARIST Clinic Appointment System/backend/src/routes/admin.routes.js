const express = require('express');
const bcrypt = require('bcryptjs');
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

  // Breakdown by visitor category (Students, Academic/Non-Academic, Outsource/Extension)
  const studentVisits = db.prepare(`SELECT COUNT(*) as count FROM appointments WHERE patient_type = 'student'`).get().count;
  const facultyVisits = db.prepare(`SELECT COUNT(*) as count FROM appointments WHERE patient_type IN ('faculty_staff', 'academic_non_academic')`).get().count;
  const outsourceVisits = db.prepare(`SELECT COUNT(*) as count FROM appointments WHERE patient_type = 'outsource_extension'`).get().count;

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
      outsourceVisits,
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

// GET /api/admin/export - CSV Export of official Daily Clinic Visit Logsheet (Medical Services)
router.get('/export', (req, res) => {
  const db = getDb();
  const { category, date } = req.query;

  let query = `
    SELECT 
      ap.appointment_id,
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
      ap.email,
      ap.symptoms,
      ap.reason,
      ap.symptom_severity,
      ap.service_type,
      ap.status,
      d_u.first_name || ' ' || d_u.last_name AS doctor_name,
      ast.specialization,
      COALESCE(ap.diagnosis, '') AS diagnosis,
      COALESCE(ap.prescription, '') AS prescription,
      COALESCE(ap.dosage_instructions, '') AS dosage_instructions
    FROM appointments ap
    JOIN assistants ast ON ap.assistant_id = ast.assistant_id
    JOIN users d_u ON ast.user_id = d_u.id
    WHERE 1=1
  `;
  const params = [];

  if (category && category !== 'all') {
    query += ` AND ap.patient_type = ?`;
    params.push(category);
  }

  if (date) {
    query += ` AND ap.appointment_date = ?`;
    params.push(date);
  }

  query += ` ORDER BY ap.appointment_date DESC, ap.time_slot ASC`;

  const rows = db.prepare(query).all(...params);

  // Exact physical logsheet header columns matching the EARIST paper forms
  // TIME | DATE | NAME | DEPT | COMPLAINTS | MANAGEMENT | SIGNATURE | ATTENDED BY:
  const header = [
    'TIME',
    'DATE',
    'NAME',
    'DEPT',
    'COMPLAINTS',
    'MANAGEMENT',
    'SIGNATURE',
    'ATTENDED BY',
    'VISITOR CATEGORY',
    'STUDENT/EMPLOYEE ID',
    'CONTACT NUMBER',
    'EMAIL',
    'COURSE / DESIGNATION',
    'REFERENCE CODE',
    'STATUS'
  ];
  const csvLines = [header.join(',')];

  const categoryLabel = (type) => {
    if (type === 'student') return 'STUDENTS';
    if (type === 'outsource_extension') return 'OUTSOURCE/EXTENSION';
    return 'ACADEMIC/NON-ACADEMIC';
  };

  const escapeCsv = (str) => `"${String(str || '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;

  for (const r of rows) {
    const timeFormatted = r.time_slot ? r.time_slot.split(' - ')[0] : 'N/A';
    const dateFormatted = r.appointment_date || '';
    const nameFormatted = (r.patient_name || '').toUpperCase();
    const deptFormatted = r.department || '';
    const complaintsFormatted = r.symptoms || r.reason || 'General Medical Consultation';

    let managementParts = [];
    if (r.prescription && r.prescription !== 'None' && r.prescription.trim() !== '') {
      managementParts.push(r.prescription.trim());
    }
    if (r.diagnosis && r.diagnosis !== 'None' && r.diagnosis.trim() !== '') {
      managementParts.push(r.diagnosis.trim());
    }
    if (r.dosage_instructions && r.dosage_instructions !== 'None' && r.dosage_instructions.trim() !== '') {
      managementParts.push(r.dosage_instructions.trim());
    }
    const managementFormatted = managementParts.length > 0 ? managementParts.join(' ; ') : 'Consultation / Evaluation Done';

    const signatureFormatted = `[Verified: ${r.reference_code}]`;
    const docClean = (r.doctor_name || '').trim();
    const attendedByFormatted = docClean.startsWith('Dr.') || docClean.startsWith('Dr ') ? docClean : `Dr. ${docClean}`;
    const categoryName = categoryLabel(r.patient_type);
    const courseYear = [r.course, r.year_section].filter(Boolean).join(' - ') || 'N/A';

    const line = [
      escapeCsv(timeFormatted),
      escapeCsv(dateFormatted),
      escapeCsv(nameFormatted),
      escapeCsv(deptFormatted),
      escapeCsv(complaintsFormatted),
      escapeCsv(managementFormatted),
      escapeCsv(signatureFormatted),
      escapeCsv(attendedByFormatted),
      escapeCsv(categoryName),
      escapeCsv(r.id_number),
      escapeCsv(r.contact_number),
      escapeCsv(r.email || ''),
      escapeCsv(courseYear),
      escapeCsv(r.reference_code),
      escapeCsv(r.status)
    ];
    csvLines.push(line.join(','));
  }

  const categoryName = category && category !== 'all' ? category.toUpperCase() : 'ALL_VISITS';
  const filename = `EARIST_Daily_Clinic_Visit_Logsheet_${categoryName}_${new Date().toISOString().split('T')[0]}.csv`;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.send(csvLines.join('\n'));
});

// POST /api/admin/staff - Register a new campus clinic doctor or medical staff
router.post('/staff', async (req, res) => {
  const {
    first_name,
    last_name,
    email,
    id_number,
    contact_number,
    specialization,
    room_number,
    initial_password
  } = req.body;

  if (!first_name || !last_name || !email) {
    return res.status(400).json({
      success: false,
      message: 'First name, last name, and institutional email are required.'
    });
  }

  const db = getDb();
  const cleanedEmail = email.trim().toLowerCase();

  const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(cleanedEmail);
  if (existing) {
    return res.status(409).json({
      success: false,
      message: 'A clinic staff account with this email already exists.'
    });
  }

  const plainPassword = initial_password || 'earist2026!';
  const passwordHash = await bcrypt.hash(plainPassword, 10);

  // Atomic insertion
  const insertUser = db.prepare(`
    INSERT INTO users (email, password_hash, role, first_name, last_name, id_number, contact_number)
    VALUES (?, ?, 'assistant', ?, ?, ?, ?)
  `);

  const userResult = insertUser.run(
    cleanedEmail,
    passwordHash,
    first_name.trim(),
    last_name.trim(),
    id_number ? id_number.trim().toUpperCase() : null,
    contact_number ? contact_number.trim() : null
  );

  const userId = userResult.lastInsertRowid;

  const insertAssistant = db.prepare(`
    INSERT INTO assistants (user_id, specialization, room_number, is_on_duty, is_active)
    VALUES (?, ?, ?, 1, 1)
  `);

  const astResult = insertAssistant.run(
    userId,
    specialization ? specialization.trim() : 'General Campus Medicine',
    room_number ? room_number.trim() : 'Clinic Rm 101'
  );

  const assistantId = astResult.lastInsertRowid;

  // Initialize standard Mon-Fri schedule
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const insertSched = db.prepare(`
    INSERT INTO doctor_schedules (assistant_id, day_of_week, start_time, end_time, max_slots, is_available)
    VALUES (?, ?, ?, ?, 15, 1)
  `);

  for (const day of days) {
    insertSched.run(assistantId, day, '08:00', '12:00');
    insertSched.run(assistantId, day, '13:00', '17:00');
  }

  return res.status(201).json({
    success: true,
    message: 'Medical officer account successfully created with standard clinic schedules.',
    user_id: userId,
    assistant_id: assistantId,
    initial_password: plainPassword
  });
});

// PUT /api/admin/staff/:assistantId - Update staff station, specialization, or status
router.put('/staff/:assistantId', (req, res) => {
  const { assistantId } = req.params;
  const {
    first_name,
    last_name,
    contact_number,
    id_number,
    specialization,
    room_number,
    is_on_duty,
    is_active
  } = req.body;

  const db = getDb();
  const assistant = db.prepare('SELECT * FROM assistants WHERE assistant_id = ?').get(assistantId);
  if (!assistant) {
    return res.status(404).json({ success: false, message: 'Medical officer not found.' });
  }

  // Update assistant station fields
  db.prepare(`
    UPDATE assistants
    SET 
      specialization = COALESCE(?, specialization),
      room_number = COALESCE(?, room_number),
      is_on_duty = COALESCE(?, is_on_duty),
      is_active = COALESCE(?, is_active)
    WHERE assistant_id = ?
  `).run(
    specialization !== undefined ? specialization.trim() : null,
    room_number !== undefined ? room_number.trim() : null,
    is_on_duty !== undefined ? (is_on_duty ? 1 : 0) : null,
    is_active !== undefined ? (is_active ? 1 : 0) : null,
    assistantId
  );

  // Update user profile fields if provided
  if (first_name || last_name || contact_number || id_number) {
    db.prepare(`
      UPDATE users
      SET
        first_name = COALESCE(?, first_name),
        last_name = COALESCE(?, last_name),
        contact_number = COALESCE(?, contact_number),
        id_number = COALESCE(?, id_number)
      WHERE id = ?
    `).run(
      first_name ? first_name.trim() : null,
      last_name ? last_name.trim() : null,
      contact_number ? contact_number.trim() : null,
      id_number ? id_number.trim().toUpperCase() : null,
      assistant.user_id
    );
  }

  return res.json({
    success: true,
    message: 'Staff station and profile successfully updated.'
  });
});

// POST /api/admin/staff/:assistantId/reset-password - Reset staff password
router.post('/staff/:assistantId/reset-password', async (req, res) => {
  const { assistantId } = req.params;
  const { new_password } = req.body;
  const db = getDb();

  const assistant = db.prepare('SELECT user_id FROM assistants WHERE assistant_id = ?').get(assistantId);
  if (!assistant) {
    return res.status(404).json({ success: false, message: 'Medical officer not found.' });
  }

  const plainPassword = new_password || 'earist2026!';
  const passwordHash = await bcrypt.hash(plainPassword, 10);

  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, assistant.user_id);

  return res.json({
    success: true,
    message: `Password has been reset to: ${plainPassword}`
  });
});

module.exports = router;
