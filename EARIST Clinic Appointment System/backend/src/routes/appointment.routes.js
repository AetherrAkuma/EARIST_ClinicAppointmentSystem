const express = require('express');
const crypto = require('crypto');
const { getDb } = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Generate unique EARIST appointment reference code
function generateReferenceCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'EAR-';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  code += '-';
  for (let i = 0; i < 3; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// POST /api/appointments/public-book - Direct student/faculty booking (NO signup required!)
router.post('/public-book', (req, res) => {
  const {
    // Bot prevention
    website_hp,
    bot_challenge_token,
    bot_answer,
    
    // Stage 1: Identification
    patient_type,
    patient_name,
    id_number,
    department,
    course,
    year_section,
    age,
    gender,
    address,
    contact_number,

    // Stage 2: Symptoms & Triage
    symptoms,
    symptom_severity,
    allergies,
    medical_history,
    reason,

    // Stage 3: Doctor & Slot
    assistant_id,
    appointment_date,
    time_slot,
    service_type
  } = req.body;

  // 1. Bot check: Honeypot field must be empty
  if (website_hp) {
    return res.status(400).json({ success: false, message: 'Spam detected.' });
  }

  // 2. Simple verification check
  if (bot_challenge_token && bot_answer !== undefined) {
    const expected = parseInt(bot_challenge_token, 10);
    if (parseInt(bot_answer, 10) !== expected) {
      return res.status(400).json({ success: false, message: 'Bot verification answer was incorrect. Please retry.' });
    }
  }

  // 3. Required Fields Validation
  if (!patient_name || !id_number || !contact_number || !department || !appointment_date || !time_slot || !assistant_id) {
    return res.status(400).json({
      success: false,
      message: 'Please fill in all required fields (Name, ID number, Contact, College, Date, and Time Slot).'
    });
  }

  const db = getDb();

  // 4. Check if doctor is on duty
  const doctor = db.prepare('SELECT is_on_duty, is_active FROM assistants WHERE assistant_id = ?').get(assistant_id);
  if (!doctor || doctor.is_active === 0) {
    return res.status(400).json({ success: false, message: 'The selected clinic doctor is not currently available.' });
  }

  // 5. Conflict Check: Same Student/Staff on the same date & slot
  const existingPatientAppt = db.prepare(`
    SELECT appointment_id, reference_code FROM appointments
    WHERE id_number = ? AND appointment_date = ? AND time_slot = ? AND status NOT IN ('Cancelled')
  `).get(id_number.trim(), appointment_date, time_slot);

  if (existingPatientAppt) {
    return res.status(409).json({
      success: false,
      message: `You already have an appointment scheduled for this date and time slot (Ref: ${existingPatientAppt.reference_code}).`
    });
  }

  // 6. Capacity Check: Up to 5 patients per time slot window
  const MAX_SLOT_CAPACITY = 5;
  const currentSlotBookings = db.prepare(`
    SELECT COUNT(*) as count FROM appointments
    WHERE assistant_id = ? AND appointment_date = ? AND time_slot = ? AND status NOT IN ('Cancelled')
  `).get(assistant_id, appointment_date, time_slot);

  if (currentSlotBookings && currentSlotBookings.count >= MAX_SLOT_CAPACITY) {
    return res.status(409).json({
      success: false,
      message: `The ${time_slot.split(' - ')[0]} consultation time is fully booked (maximum capacity of ${MAX_SLOT_CAPACITY} patients reached). Please choose another time slot.`
    });
  }

  // 7. Generate Reference Code
  let referenceCode = generateReferenceCode();
  // Ensure uniqueness
  while (db.prepare('SELECT appointment_id FROM appointments WHERE reference_code = ?').get(referenceCode)) {
    referenceCode = generateReferenceCode();
  }

  const insertStmt = db.prepare(`
    INSERT INTO appointments (
      reference_code, patient_type, patient_name, id_number, department, course, year_section,
      age, gender, address, contact_number, symptoms, symptom_severity, allergies, medical_history,
      assistant_id, appointment_date, time_slot, service_type, status, reason
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Approved', ?)
  `);

  const result = insertStmt.run(
    referenceCode,
    patient_type || 'student',
    patient_name.trim(),
    id_number.trim().toUpperCase(),
    department.trim(),
    course ? course.trim() : null,
    year_section ? year_section.trim() : null,
    age ? parseInt(age, 10) : null,
    gender || 'Other',
    address ? address.trim() : null,
    contact_number.trim(),
    Array.isArray(symptoms) ? symptoms.join(', ') : symptoms || 'None specified',
    symptom_severity || 'Mild',
    allergies ? allergies.trim() : 'None',
    medical_history ? medical_history.trim() : 'None',
    parseInt(assistant_id, 10),
    appointment_date,
    time_slot,
    service_type || 'General Medical Consultation',
    reason ? reason.trim() : 'Campus Clinic Visit'
  );

  return res.status(201).json({
    success: true,
    message: 'Clinic appointment successfully confirmed!',
    reference_code: referenceCode,
    appointment_id: result.lastInsertRowid
  });
});

// GET /api/appointments/track/:reference - Look up appointment ticket by Reference Code or Student ID
router.get('/track/:reference', (req, res) => {
  const { reference } = req.params;
  const db = getDb();

  const appointment = db.prepare(`
    SELECT 
      ap.*,
      u.first_name AS doctor_first_name,
      u.last_name AS doctor_last_name,
      ast.specialization,
      ast.room_number
    FROM appointments ap
    JOIN assistants ast ON ap.assistant_id = ast.assistant_id
    JOIN users u ON ast.user_id = u.id
    WHERE ap.reference_code = ? OR ap.id_number = ?
    ORDER BY ap.created_at DESC
  `).get(reference.trim().toUpperCase(), reference.trim().toUpperCase());

  if (!appointment) {
    return res.status(404).json({
      success: false,
      message: 'No active clinic appointment found matching that Reference Code or Student Number.'
    });
  }

  return res.json({ success: true, appointment });
});

// GET /api/appointments/queue - Medical Staff queue (requires login)
router.get('/queue', authenticateToken, requireRole(['assistant', 'admin']), (req, res) => {
  const db = getDb();
  let assistantId = null;

  if (req.user.role === 'assistant') {
    assistantId = req.user.assistant_id;
  }

  let query = `
    SELECT 
      ap.*,
      doc_u.first_name AS doctor_first_name,
      doc_u.last_name AS doctor_last_name,
      ast.specialization,
      ast.room_number
    FROM appointments ap
    JOIN assistants ast ON ap.assistant_id = ast.assistant_id
    JOIN users doc_u ON ast.user_id = doc_u.id
  `;

  const params = [];
  if (assistantId) {
    query += ` WHERE ap.assistant_id = ?`;
    params.push(assistantId);
  }

  query += ` ORDER BY ap.appointment_date ASC, ap.time_slot ASC, ap.created_at ASC`;

  const queue = db.prepare(query).all(...params);
  return res.json({ success: true, queue });
});

// PATCH /api/appointments/:id/status - Update consultation status & issue Rx
router.patch('/:id/status', authenticateToken, requireRole(['assistant', 'admin']), (req, res) => {
  const { id } = req.params;
  const { status, diagnosis, prescription, dosage_instructions } = req.body;
  const db = getDb();

  const appointment = db.prepare('SELECT * FROM appointments WHERE appointment_id = ?').get(id);
  if (!appointment) {
    return res.status(404).json({ success: false, message: 'Appointment not found.' });
  }

  db.prepare(`
    UPDATE appointments 
    SET 
      status = COALESCE(?, status),
      diagnosis = COALESCE(?, diagnosis),
      prescription = COALESCE(?, prescription),
      dosage_instructions = COALESCE(?, dosage_instructions)
    WHERE appointment_id = ?
  `).run(
    status || null,
    diagnosis !== undefined ? diagnosis : null,
    prescription !== undefined ? prescription : null,
    dosage_instructions !== undefined ? dosage_instructions : null,
    id
  );

  return res.json({
    success: true,
    message: `Appointment status updated to: ${status || appointment.status}`
  });
});

// PATCH /api/appointments/:id/cancel - Cancel appointment
router.patch('/:id/cancel', (req, res) => {
  const { id } = req.params;
  const db = getDb();

  const appointment = db.prepare('SELECT * FROM appointments WHERE appointment_id = ? OR reference_code = ?').get(id, id);
  if (!appointment) {
    return res.status(404).json({ success: false, message: 'Appointment record not found.' });
  }

  db.prepare(`UPDATE appointments SET status = 'Cancelled' WHERE appointment_id = ?`).run(appointment.appointment_id);

  return res.json({ success: true, message: 'Appointment successfully cancelled.' });
});

module.exports = router;
