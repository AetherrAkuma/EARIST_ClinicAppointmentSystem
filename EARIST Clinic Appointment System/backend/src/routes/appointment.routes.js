const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { getDb } = require('../config/db');
const { authenticateToken, requireRole, JWT_SECRET } = require('../middleware/auth');
const { sendAppointmentConfirmationEmail, sendOtpVerificationEmail } = require('../services/email.service');
const { createRateLimiter } = require('../middleware/rateLimiter');
const { verifyTurnstileToken } = require('../services/turnstile.service');

const router = express.Router();
const SECURITY_HMAC_SECRET = process.env.JWT_SECRET || 'earist_clinic_sec_2026';

// Rate limiters for public endpoints
const otpLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 3,
  message: 'Too many OTP requests from this network. Please wait 10 minutes.'
});

const bookingLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'Hourly booking limit reached. Please wait before creating more appointments.'
});

const trackLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 30,
  message: 'Too many tracking requests. Please slow down.'
});

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

// GET /api/appointments/security-challenge - Server-signed HMAC challenge
router.get('/security-challenge', (req, res) => {
  const a = crypto.randomInt(3, 16);
  const b = crypto.randomInt(2, 14);
  const sum = String(a + b);
  const challenge_id = crypto.randomUUID();
  const expires_at = String(Date.now() + 10 * 60 * 1000); // 10 minutes

  const signature = crypto
    .createHmac('sha256', SECURITY_HMAC_SECRET)
    .update(`${challenge_id}:${sum}:${expires_at}`)
    .digest('hex');

  return res.json({
    success: true,
    challenge_id,
    question: `What is ${a} + ${b}?`,
    expires_at,
    signature
  });
});

// POST /api/appointments/send-otp - Dispatch 6-digit email OTP
router.post('/send-otp', otpLimiter, async (req, res) => {
  const { email, turnstile_token } = req.body || {};
  if (!email || !email.includes('@')) {
    return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
  }

  // Turnstile validation for OTP if configured and provided
  const cfToken = turnstile_token || req.body['cf-turnstile-response'];
  const hasTurnstileSecret = process.env.TURNSTILE_SECRET || process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;
  if (hasTurnstileSecret && cfToken) {
    const cfCheck = await verifyTurnstileToken(cfToken, req.ip, 'booking');
    if (!cfCheck.success) {
      return res.status(400).json({ success: false, message: cfCheck.message });
    }
  }

  const cleanEmail = email.toLowerCase().trim();
  const db = getDb();

  // Enforce 60-second cooldown per email address
  const recentVerif = db.prepare(`
    SELECT created_at FROM email_verifications 
    WHERE email = ? AND (strftime('%s', 'now') - strftime('%s', created_at)) < 60
    ORDER BY id DESC LIMIT 1
  `).get(cleanEmail);

  if (recentVerif) {
    return res.status(429).json({
      success: false,
      message: 'A verification code was recently dispatched. Please wait 60 seconds before requesting another.'
    });
  }

  // Generate 6-digit OTP
  const otpCode = String(crypto.randomInt(100000, 999999));

  db.prepare(`
    INSERT INTO email_verifications (email, otp_code, expires_at, attempts_left, is_verified)
    VALUES (?, ?, datetime('now', '+10 minutes'), 3, 0)
  `).run(cleanEmail, otpCode);

  try {
    const emailRes = await sendOtpVerificationEmail(cleanEmail, otpCode);
    if (emailRes && emailRes.success === false && emailRes.error) {
      console.error('[Email Service Error sending OTP]:', emailRes.error);
      return res.status(500).json({
        success: false,
        message: `Email dispatch failed: ${emailRes.error}. Please check the email address or try again.`
      });
    }
  } catch (err) {
    console.error('[Email Service] Error sending OTP:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to send verification email. Please check your connection and try again.'
    });
  }

  return res.json({
    success: true,
    message: `Verification code sent to ${cleanEmail}. Please enter the 6-digit code to continue.`
  });
});

// POST /api/appointments/verify-otp - Validate 6-digit OTP code before proceeding to Symptoms
router.post('/verify-otp', (req, res) => {
  const { email, otp_code } = req.body || {};
  if (!email || !otp_code) {
    return res.status(400).json({ success: false, message: 'Both email and 6-digit verification code are required.' });
  }

  const cleanEmail = email.toLowerCase().trim();
  const db = getDb();

  const verif = db.prepare(`
    SELECT * FROM email_verifications
    WHERE email = ? AND datetime('now') <= expires_at AND attempts_left > 0
    ORDER BY id DESC LIMIT 1
  `).get(cleanEmail);

  if (!verif) {
    return res.status(400).json({
      success: false,
      message: 'No active verification code found or code has expired. Please request a new code.'
    });
  }

  if (verif.otp_code !== String(otp_code).trim()) {
    db.prepare('UPDATE email_verifications SET attempts_left = attempts_left - 1 WHERE id = ?').run(verif.id);
    const remaining = verif.attempts_left - 1;
    return res.status(400).json({
      success: false,
      message: remaining > 0
        ? `Incorrect verification code. ${remaining} attempt(s) remaining.`
        : 'Too many incorrect attempts. Please request a new verification code.'
    });
  }

  // Mark as verified in database
  db.prepare('UPDATE email_verifications SET is_verified = 1 WHERE id = ?').run(verif.id);

  return res.json({
    success: true,
    message: 'Email address verified successfully!'
  });
});

// POST /api/appointments/public-book - Direct student/faculty booking (NO signup required!)
router.post('/public-book', async (req, res) => {
  const {
    // Bot prevention
    website_hp,
    turnstile_token,
    challenge_id,
    expires_at,
    signature,
    bot_challenge_token,
    bot_answer,
    otp_code,
    
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
    email,

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

  // 2. Cloudflare Turnstile Anti-Bot Verification
  const cfToken = turnstile_token || req.body['cf-turnstile-response'];
  const hasSecret = process.env.TURNSTILE_SECRET || process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;
  if (hasSecret && cfToken) {
    const cfResult = await verifyTurnstileToken(cfToken, req.ip, 'booking');
    if (!cfResult.success) {
      return res.status(400).json({ success: false, message: cfResult.message });
    }
  } else if (hasSecret && !challenge_id && !bot_answer && !cfToken) {
    return res.status(400).json({
      success: false,
      message: 'Cloudflare Turnstile verification is required. Please check the security box.'
    });
  } else if (challenge_id && signature && bot_answer !== undefined) {
    const now = Date.now();
    if (parseInt(expires_at, 10) < now) {
      return res.status(400).json({ success: false, message: 'Security verification question has expired. Please refresh the question.' });
    }
    const expectedSig = crypto
      .createHmac('sha256', SECURITY_HMAC_SECRET)
      .update(`${challenge_id}:${String(bot_answer).trim()}:${expires_at}`)
      .digest('hex');
    if (expectedSig !== signature) {
      return res.status(400).json({ success: false, message: 'Security verification answer was incorrect. Please retry.' });
    }
  } else if (bot_challenge_token && bot_answer !== undefined) {
    // Legacy fallback verification check
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

  // 4. Email OTP Verification Check
  if (email && email.trim()) {
    const cleanEmail = email.toLowerCase().trim();
    const verif = db.prepare(`
      SELECT * FROM email_verifications
      WHERE email = ? AND (is_verified = 1 OR otp_code = ?) AND datetime('now') <= datetime(expires_at, '+30 minutes')
      ORDER BY id DESC LIMIT 1
    `).get(cleanEmail, String(otp_code || '').trim());

    if (!verif) {
      return res.status(400).json({
        success: false,
        message: 'Email verification is required before confirming your booking. Please verify your email in Step 1.'
      });
    }

    // Ensure record is marked as verified
    db.prepare('UPDATE email_verifications SET is_verified = 1 WHERE id = ?').run(verif.id);
  }

  // 5. Active Appointments Cap Check (Max 3 active upcoming bookings per ID Number)
  const todayStr = new Date().toISOString().split('T')[0];
  const activeCount = db.prepare(`
    SELECT COUNT(*) as count FROM appointments
    WHERE id_number = ? AND appointment_date >= ? AND status IN ('Pending', 'Approved', 'CheckedIn', 'OnGoing')
  `).get(id_number.trim(), todayStr).count;

  if (activeCount >= 3) {
    return res.status(403).json({
      success: false,
      message: 'You currently have 3 active clinic appointments (limit: 3). Please attend or cancel an existing appointment before scheduling another.'
    });
  }

  // 6. Check if doctor is on duty
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
      age, gender, address, contact_number, email, symptoms, symptom_severity, allergies, medical_history,
      assistant_id, appointment_date, time_slot, service_type, status, reason
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Approved', ?)
  `);

  const validTypes = ['student', 'academic_non_academic', 'faculty_staff', 'outsource_extension'];
  const normalizedPatientType = validTypes.includes(patient_type) ? patient_type : 'student';

  const cleanedEmail = email && email.trim() ? email.trim().toLowerCase() : null;

  const result = insertStmt.run(
    referenceCode,
    normalizedPatientType,
    patient_name.trim(),
    id_number.trim().toUpperCase(),
    department.trim(),
    course ? course.trim() : null,
    year_section ? year_section.trim() : null,
    age ? parseInt(age, 10) : null,
    gender || 'Other',
    address ? address.trim() : null,
    contact_number.trim(),
    cleanedEmail,
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

  // Send confirmation email asynchronously
  if (cleanedEmail) {
    try {
      const doctorInfo = db.prepare(`
        SELECT u.first_name, u.last_name, ast.room_number 
        FROM assistants ast 
        JOIN users u ON ast.user_id = u.id 
        WHERE ast.assistant_id = ?
      `).get(parseInt(assistant_id, 10));

      sendAppointmentConfirmationEmail({
        email: cleanedEmail,
        reference_code: referenceCode,
        patient_name: patient_name.trim(),
        id_number: id_number.trim().toUpperCase(),
        patient_type: normalizedPatientType,
        department: department.trim(),
        appointment_date,
        time_slot,
        service_type: service_type || 'General Medical Consultation',
        doctor_name: doctorInfo ? `${doctorInfo.first_name} ${doctorInfo.last_name}` : 'Assigned Clinic Staff',
        room_number: doctorInfo?.room_number || 'Main Clinic Rm 101',
        symptoms: Array.isArray(symptoms) ? symptoms.join(', ') : symptoms || reason || 'General Consultation'
      }).catch((err) => {
        console.error('[Async Email Error]:', err.message);
      });
    } catch (emailErr) {
      console.error('[Email Dispatch Setup Error]:', emailErr.message);
    }
  }

  return res.status(201).json({
    success: true,
    message: 'Clinic appointment successfully confirmed!',
    reference_code: referenceCode,
    appointment_id: result.lastInsertRowid
  });
});

// GET /api/appointments/my - Fetch authenticated user's clinic appointments
router.get('/my', authenticateToken, (req, res) => {
  const db = getDb();
  const userEmail = req.user.email ? req.user.email.toLowerCase().trim() : '';
  const idNumber = req.user.id_number ? req.user.id_number.trim() : '';

  const appointments = db.prepare(`
    SELECT 
      a.*,
      u.first_name AS doctor_first_name,
      u.last_name AS doctor_last_name,
      ast.specialization,
      ast.room_number
    FROM appointments a
    LEFT JOIN assistants ast ON a.assistant_id = ast.assistant_id
    LEFT JOIN users u ON ast.user_id = u.id
    WHERE a.email = ? OR (a.id_number IS NOT NULL AND a.id_number != '' AND a.id_number = ?)
    ORDER BY a.appointment_date DESC, a.time_slot DESC
  `).all(userEmail, idNumber);

  return res.json({ success: true, appointments });
});

// POST /api/appointments/book - Authenticated student/staff appointment booking
router.post('/book', authenticateToken, async (req, res) => {
  const {
    assistant_id,
    appointment_date,
    time_slot,
    service_type,
    reason,
    symptoms,
    symptom_severity,
    allergies,
    medical_history
  } = req.body;

  if (!assistant_id || !appointment_date || !time_slot || !service_type) {
    return res.status(400).json({
      success: false,
      message: 'Please provide all required appointment fields (doctor, date, time slot, and service).'
    });
  }

  const db = getDb();

  // Active appointment cap check (Max 3)
  const activeCount = db.prepare(`
    SELECT COUNT(*) as count FROM appointments
    WHERE (id_number = ? OR email = ?)
      AND status IN ('Pending', 'Approved', 'CheckedIn', 'OnGoing')
      AND appointment_date >= CURRENT_DATE
  `).get(req.user.id_number || '', req.user.email || '');

  if (activeCount && activeCount.count >= 3) {
    return res.status(403).json({
      success: false,
      message: `You currently have ${activeCount.count} active clinic appointments (limit: 3). Please attend or cancel an existing appointment before scheduling another.`
    });
  }

  const doctor = db.prepare(`
    SELECT a.*, u.first_name, u.last_name, u.email as doc_email
    FROM assistants a
    JOIN users u ON a.user_id = u.id
    WHERE a.assistant_id = ?
  `).get(assistant_id);

  if (!doctor || doctor.is_active === 0) {
    return res.status(400).json({ success: false, message: 'Selected medical officer station is inactive or not found.' });
  }

  const referenceCode = generateReferenceCode();
  const patientName = `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || 'EARIST Patient';
  const idNumber = req.user.id_number || 'STU-MEMBER';
  const department = req.body.department || 'College of Computing Studies';
  const contactNumber = req.user.contact_number || req.body.contact_number || '09000000000';
  const email = (req.user.email || req.body.email || '').toLowerCase().trim();
  const patientType = req.user.role === 'student' ? 'student' : 'academic_non_academic';

  const symptomsStr = Array.isArray(symptoms) ? symptoms.join(', ') : (symptoms || '');

  const result = db.prepare(`
    INSERT INTO appointments (
      reference_code,
      patient_type,
      patient_name,
      id_number,
      department,
      contact_number,
      email,
      symptoms,
      symptom_severity,
      allergies,
      medical_history,
      assistant_id,
      appointment_date,
      time_slot,
      service_type,
      status,
      reason
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Approved', ?)
  `).run(
    referenceCode,
    patientType,
    patientName,
    idNumber,
    department,
    contactNumber,
    email,
    symptomsStr,
    symptom_severity || 'Mild',
    allergies || '',
    medical_history || '',
    parseInt(assistant_id, 10),
    appointment_date,
    time_slot,
    service_type,
    reason || 'General Clinic Visit'
  );

  sendAppointmentConfirmationEmail({
    email,
    reference_code: referenceCode,
    patient_name: patientName,
    id_number: idNumber,
    patient_type: patientType,
    department,
    appointment_date,
    time_slot,
    service_type,
    doctor_name: `${doctor.first_name} ${doctor.last_name}`,
    room_number: doctor.room_number || 'Clinic Station 1',
    symptoms: symptomsStr
  }).catch((err) => console.error('[Appointment Routes] Booking confirmation email error:', err));

  return res.status(201).json({
    success: true,
    message: 'Clinic appointment successfully confirmed!',
    reference_code: referenceCode,
    appointment_id: result.lastInsertRowid
  });
});

// GET /api/appointments/track/:reference - Look up appointment ticket by Reference Code, ID Number, or Email
router.get('/track/:reference', trackLimiter, (req, res) => {
  const { reference } = req.params;
  const db = getDb();
  const q = (reference || '').trim();

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
    WHERE UPPER(ap.reference_code) = UPPER(?) 
       OR UPPER(ap.id_number) = UPPER(?)
       OR LOWER(COALESCE(ap.email, '')) = LOWER(?)
    ORDER BY ap.created_at DESC
  `).get(q, q, q);

  if (!appointment) {
    return res.status(404).json({
      success: false,
      message: 'No active clinic appointment found matching that Reference Code, ID Number, or Email address.'
    });
  }

  // Check if request is authenticated as clinical staff
  let isStaff = false;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      if (['assistant', 'admin'].includes(decoded.role)) {
        isStaff = true;
      }
    } catch (e) {
      // Unauthenticated public requester
    }
  }

  // Calculate live queue rank if appointment is today and status is active
  const today = new Date().toISOString().slice(0, 10);
  const isToday = appointment.appointment_date === today;
  let queuePosition = null;
  let patientsAhead = 0;
  let totalInQueueToday = 0;

  if (isToday && ['Approved', 'CheckedIn', 'OnGoing'].includes(appointment.status)) {
    const countRow = db.prepare(`
      SELECT COUNT(*) as pos
      FROM appointments
      WHERE assistant_id = ?
        AND appointment_date = ?
        AND status IN ('Approved', 'CheckedIn', 'OnGoing')
        AND (
          time_slot < ? OR 
          (time_slot = ? AND appointment_id <= ?)
        )
    `).get(
      appointment.assistant_id,
      appointment.appointment_date,
      appointment.time_slot,
      appointment.time_slot,
      appointment.appointment_id
    );

    const totalRow = db.prepare(`
      SELECT COUNT(*) as total
      FROM appointments
      WHERE assistant_id = ?
        AND appointment_date = ?
        AND status IN ('Approved', 'CheckedIn', 'OnGoing')
    `).get(appointment.assistant_id, appointment.appointment_date);

    queuePosition = countRow ? countRow.pos : 1;
    patientsAhead = Math.max(0, queuePosition - 1);
    totalInQueueToday = totalRow ? totalRow.total : 1;
  }

  function maskPhone(p) {
    if (!p) return '';
    const clean = p.trim();
    if (clean.length <= 4) return '****';
    return clean.slice(0, 4) + '****' + clean.slice(-3);
  }

  function maskEmail(e) {
    if (!e || !e.includes('@')) return '';
    const [userPart, domain] = e.split('@');
    const visible = userPart.slice(0, 1) + '***' + (userPart.length > 2 ? userPart.slice(-1) : '');
    return `${visible}@${domain}`;
  }

  const sanitizedAppointment = isStaff ? appointment : {
    ...appointment,
    contact_number: maskPhone(appointment.contact_number),
    email: maskEmail(appointment.email),
    address: '[Protected for Patient Privacy]'
  };

  return res.json({
    success: true,
    appointment: {
      ...sanitizedAppointment,
      is_today: isToday,
      queue_position: queuePosition,
      patients_ahead: patientsAhead,
      total_in_queue_today: totalInQueueToday
    }
  });
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

  query += ` ORDER BY 
    ap.appointment_date ASC,
    CASE 
      WHEN ap.status = 'OnGoing' THEN 1
      WHEN ap.status = 'CheckedIn' THEN 2
      WHEN ap.status = 'Approved' THEN 3
      ELSE 4
    END ASC,
    COALESCE(ap.checked_in_at, '9999-12-31') ASC,
    ap.time_slot ASC,
    ap.created_at ASC`;

  const queue = db.prepare(query).all(...params);
  return res.json({ success: true, queue });
});

// POST /api/appointments/walk-in - Acute walk-in patient triage & intake
router.post('/walk-in', authenticateToken, requireRole(['assistant', 'admin']), (req, res) => {
  const {
    patient_type,
    patient_name,
    id_number,
    department,
    course,
    year_section,
    age,
    gender,
    contact_number,
    email,
    symptoms,
    symptom_severity,
    allergies,
    reason,
    assistant_id,
    serve_immediately,
    bp_systolic,
    bp_diastolic,
    temperature,
    pulse_rate,
    respiratory_rate,
    spo2,
    weight_kg
  } = req.body;

  if (!patient_name || !id_number || !department) {
    return res.status(400).json({
      success: false,
      message: 'Please provide patient name, ID number, and department.'
    });
  }

  const db = getDb();

  let targetAssistantId = assistant_id;
  if (!targetAssistantId && req.user.role === 'assistant') {
    targetAssistantId = req.user.assistant_id;
  }
  if (!targetAssistantId) {
    const firstDoc = db.prepare('SELECT assistant_id FROM assistants WHERE is_active = 1 LIMIT 1').get();
    targetAssistantId = firstDoc ? firstDoc.assistant_id : 1;
  }

  const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
  const referenceCode = `EAR-WLK-${randomChars}`;

  const today = new Date().toISOString().slice(0, 10);
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const currentTimeSlot = `${hours}:${minutes} - Walk-In Triage`;

  const initialStatus = serve_immediately ? 'OnGoing' : 'Approved';

  const validTypes = ['student', 'academic_non_academic', 'faculty_staff', 'outsource_extension'];
  const normalizedPatientType = validTypes.includes(patient_type) ? patient_type : 'student';

  const insertStmt = db.prepare(`
    INSERT INTO appointments (
      reference_code, patient_type, patient_name, id_number, department, course, year_section,
      age, gender, contact_number, email, symptoms, symptom_severity, allergies, reason,
      assistant_id, appointment_date, time_slot, service_type, status,
      bp_systolic, bp_diastolic, temperature, pulse_rate, respiratory_rate, spo2, weight_kg, is_walkin
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Walk-In Medical Triage', ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);

  const result = insertStmt.run(
    referenceCode,
    normalizedPatientType,
    patient_name.trim(),
    id_number.trim().toUpperCase(),
    department.trim(),
    course ? course.trim() : null,
    year_section ? year_section.trim() : null,
    age ? parseInt(age, 10) : null,
    gender || 'Other',
    contact_number ? contact_number.trim() : 'N/A',
    email ? email.trim().toLowerCase() : null,
    symptoms ? symptoms.trim() : 'Acute Walk-In Evaluation',
    symptom_severity || 'Moderate',
    allergies ? allergies.trim() : 'None',
    reason ? reason.trim() : 'Immediate Clinic Visit',
    parseInt(targetAssistantId, 10),
    today,
    currentTimeSlot,
    initialStatus,
    bp_systolic !== undefined && bp_systolic !== '' ? parseInt(bp_systolic, 10) : null,
    bp_diastolic !== undefined && bp_diastolic !== '' ? parseInt(bp_diastolic, 10) : null,
    temperature !== undefined && temperature !== '' ? parseFloat(temperature) : null,
    pulse_rate !== undefined && pulse_rate !== '' ? parseInt(pulse_rate, 10) : null,
    respiratory_rate !== undefined && respiratory_rate !== '' ? parseInt(respiratory_rate, 10) : null,
    spo2 !== undefined && spo2 !== '' ? parseInt(spo2, 10) : null,
    weight_kg !== undefined && weight_kg !== '' ? parseFloat(weight_kg) : null
  );

  return res.status(201).json({
    success: true,
    message: serve_immediately ? 'Walk-in patient admitted immediately to consultation.' : 'Walk-in patient added to today queue.',
    appointment_id: result.lastInsertRowid,
    reference_code: referenceCode,
    status: initialStatus
  });
});

// GET /api/appointments/patient-history/:idNumber - Fetch full clinic history for a student or staff member
router.get('/patient-history/:idNumber', authenticateToken, requireRole(['assistant', 'admin']), (req, res) => {
  const { idNumber } = req.params;
  const db = getDb();
  const qId = (idNumber || '').trim().toUpperCase();

  if (!qId) {
    return res.status(400).json({ success: false, message: 'Valid ID Number is required.' });
  }

  const history = db.prepare(`
    SELECT 
      ap.*,
      u.first_name AS doctor_first_name,
      u.last_name AS doctor_last_name,
      ast.specialization,
      ast.room_number
    FROM appointments ap
    LEFT JOIN assistants ast ON ap.assistant_id = ast.assistant_id
    LEFT JOIN users u ON ast.user_id = u.id
    WHERE UPPER(TRIM(ap.id_number)) = ?
    ORDER BY ap.appointment_date DESC, ap.created_at DESC
  `).all(qId);

  return res.json({
    success: true,
    id_number: qId,
    total_visits: history.length,
    history
  });
});

// PATCH /api/appointments/:id/status - Update consultation status, vitals & issue Rx
router.patch('/:id/status', authenticateToken, requireRole(['assistant', 'admin']), (req, res) => {
  const { id } = req.params;
  const {
    status,
    diagnosis,
    prescription,
    dosage_instructions,
    bp_systolic,
    bp_diastolic,
    temperature,
    pulse_rate,
    respiratory_rate,
    spo2,
    weight_kg
  } = req.body;
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
      dosage_instructions = COALESCE(?, dosage_instructions),
      bp_systolic = COALESCE(?, bp_systolic),
      bp_diastolic = COALESCE(?, bp_diastolic),
      temperature = COALESCE(?, temperature),
      pulse_rate = COALESCE(?, pulse_rate),
      respiratory_rate = COALESCE(?, respiratory_rate),
      spo2 = COALESCE(?, spo2),
      weight_kg = COALESCE(?, weight_kg)
    WHERE appointment_id = ?
  `).run(
    status || null,
    diagnosis !== undefined ? diagnosis : null,
    prescription !== undefined ? prescription : null,
    dosage_instructions !== undefined ? dosage_instructions : null,
    bp_systolic !== undefined && bp_systolic !== '' ? parseInt(bp_systolic, 10) : null,
    bp_diastolic !== undefined && bp_diastolic !== '' ? parseInt(bp_diastolic, 10) : null,
    temperature !== undefined && temperature !== '' ? parseFloat(temperature) : null,
    pulse_rate !== undefined && pulse_rate !== '' ? parseInt(pulse_rate, 10) : null,
    respiratory_rate !== undefined && respiratory_rate !== '' ? parseInt(respiratory_rate, 10) : null,
    spo2 !== undefined && spo2 !== '' ? parseInt(spo2, 10) : null,
    weight_kg !== undefined && weight_kg !== '' ? parseFloat(weight_kg) : null,
    id
  );

  return res.json({
    success: true,
    message: `Appointment status updated to: ${status || appointment.status}`
  });
});

// PATCH /api/appointments/:reference/check-in - Self or Desk Check-In
router.patch('/:reference/check-in', (req, res) => {
  const { reference } = req.params;
  const db = getDb();

  const appointment = db.prepare(`
    SELECT ap.*, ast.room_number, d_u.first_name AS doctor_first_name, d_u.last_name AS doctor_last_name
    FROM appointments ap
    JOIN assistants ast ON ap.assistant_id = ast.assistant_id
    JOIN users d_u ON ast.user_id = d_u.id
    WHERE ap.reference_code = ? OR ap.appointment_id = ?
  `).get(reference, reference);

  if (!appointment) {
    return res.status(404).json({ success: false, message: 'Appointment not found.' });
  }

  if (['Completed', 'Cancelled', 'NoShow'].includes(appointment.status)) {
    return res.status(400).json({
      success: false,
      message: `Cannot check in to an appointment that is already ${appointment.status.toLowerCase()}.`
    });
  }

  if (appointment.status === 'CheckedIn' || appointment.status === 'OnGoing') {
    return res.json({
      success: true,
      message: 'You are already checked in. Please wait outside Room ' + (appointment.room_number || '101'),
      appointment
    });
  }

  // Date validation: can only check in on the scheduled appointment date
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const today = `${year}-${month}-${day}`;

  if (appointment.appointment_date !== today) {
    return res.status(400).json({
      success: false,
      message: `Check-in is only available on the day of your appointment (${appointment.appointment_date}). Today is ${today}.`
    });
  }

  db.prepare(`
    UPDATE appointments 
    SET status = 'CheckedIn', checked_in_at = CURRENT_TIMESTAMP 
    WHERE appointment_id = ?
  `).run(appointment.appointment_id);

  const updatedAppointment = db.prepare(`
    SELECT ap.*, ast.room_number, d_u.first_name AS doctor_first_name, d_u.last_name AS doctor_last_name
    FROM appointments ap
    JOIN assistants ast ON ap.assistant_id = ast.assistant_id
    JOIN users d_u ON ast.user_id = d_u.id
    WHERE ap.appointment_id = ?
  `).get(appointment.appointment_id);

  return res.json({
    success: true,
    message: `Check-in successful! Please proceed to the waiting area outside Room ${appointment.room_number || '101'}.`,
    appointment: updatedAppointment
  });
});

// PATCH /api/appointments/:id/no-show - Mark un-attended appointment as No-Show
router.patch('/:id/no-show', authenticateToken, requireRole(['assistant', 'admin']), (req, res) => {
  const { id } = req.params;
  const db = getDb();

  const appointment = db.prepare('SELECT * FROM appointments WHERE appointment_id = ? OR reference_code = ?').get(id, id);
  if (!appointment) {
    return res.status(404).json({ success: false, message: 'Appointment not found.' });
  }

  if (appointment.status === 'Completed') {
    return res.status(400).json({ success: false, message: 'Cannot mark a completed consultation as No-Show.' });
  }

  db.prepare("UPDATE appointments SET status = 'NoShow' WHERE appointment_id = ?").run(appointment.appointment_id);

  return res.json({
    success: true,
    message: `Appointment ${appointment.reference_code} marked as No-Show.`
  });
});

// PATCH /api/appointments/:reference/reschedule - In-place reschedule keeping the same reference code
router.patch('/:reference/reschedule', async (req, res) => {
  const { reference } = req.params;
  const { appointment_date, time_slot, assistant_id, reschedule_reason, service_type } = req.body;
  const db = getDb();

  if (!appointment_date || !time_slot) {
    return res.status(400).json({
      success: false,
      message: 'Both new appointment date and time slot are required for rescheduling.'
    });
  }

  const appointment = db.prepare('SELECT * FROM appointments WHERE reference_code = ? OR appointment_id = ?').get(reference, reference);
  if (!appointment) {
    return res.status(404).json({ success: false, message: 'Appointment record not found.' });
  }

  if (['Completed', 'Cancelled', 'NoShow'].includes(appointment.status)) {
    return res.status(400).json({
      success: false,
      message: `Cannot reschedule an appointment that is already ${appointment.status.toLowerCase()}.`
    });
  }

  // Prevent rescheduling to past date
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const today = `${year}-${month}-${day}`;
  if (appointment_date < today) {
    return res.status(400).json({
      success: false,
      message: 'Cannot reschedule to a past date.'
    });
  }

  const targetAssistantId = assistant_id ? parseInt(assistant_id, 10) : appointment.assistant_id;

  // Check if target doctor is active
  const targetDoctor = db.prepare('SELECT a.assistant_id, a.room_number, a.is_on_duty, a.is_active, u.first_name, u.last_name FROM assistants a JOIN users u ON a.user_id = u.id WHERE a.assistant_id = ?').get(targetAssistantId);
  if (!targetDoctor || targetDoctor.is_active === 0) {
    return res.status(400).json({
      success: false,
      message: 'The selected doctor is currently inactive or unavailable.'
    });
  }

  // Capacity check (< 5 patients)
  const slotCount = db.prepare(`
    SELECT COUNT(*) as count FROM appointments
    WHERE assistant_id = ? AND appointment_date = ? AND time_slot = ? 
      AND status NOT IN ('Cancelled', 'NoShow')
      AND appointment_id != ?
  `).get(targetAssistantId, appointment_date, time_slot, appointment.appointment_id).count;

  if (slotCount >= 5) {
    return res.status(400).json({
      success: false,
      message: 'The selected time slot is fully booked (maximum 5 patients). Please select another time.'
    });
  }

  // Collision check for the same patient on that day & slot
  const conflict = db.prepare(`
    SELECT appointment_id, reference_code FROM appointments
    WHERE id_number = ? AND appointment_date = ? AND time_slot = ?
      AND status NOT IN ('Cancelled', 'NoShow')
      AND appointment_id != ?
  `).get(appointment.id_number.trim(), appointment_date, time_slot, appointment.appointment_id);

  if (conflict) {
    return res.status(409).json({
      success: false,
      message: `You already have another active appointment scheduled for this date and time slot (Ref: ${conflict.reference_code}).`
    });
  }

  // Update appointment record
  db.prepare(`
    UPDATE appointments
    SET
      appointment_date = ?,
      time_slot = ?,
      assistant_id = ?,
      service_type = COALESCE(?, service_type),
      status = 'Approved',
      checked_in_at = NULL,
      rescheduled_at = CURRENT_TIMESTAMP,
      reschedule_count = reschedule_count + 1,
      reason = COALESCE(?, reason)
    WHERE appointment_id = ?
  `).run(
    appointment_date,
    time_slot,
    targetAssistantId,
    service_type || null,
    reschedule_reason ? `${appointment.reason ? appointment.reason + ' | ' : ''}Rescheduled: ${reschedule_reason}` : null,
    appointment.appointment_id
  );

  const updatedAppointment = db.prepare(`
    SELECT ap.*, ast.room_number, d_u.first_name AS doctor_first_name, d_u.last_name AS doctor_last_name
    FROM appointments ap
    JOIN assistants ast ON ap.assistant_id = ast.assistant_id
    JOIN users d_u ON ast.user_id = d_u.id
    WHERE ap.appointment_id = ?
  `).get(appointment.appointment_id);

  // Send updated confirmation email if patient email is present
  if (updatedAppointment.email) {
    sendAppointmentConfirmationEmail({
      email: updatedAppointment.email,
      reference_code: updatedAppointment.reference_code,
      patient_name: updatedAppointment.patient_name,
      id_number: updatedAppointment.id_number,
      patient_type: updatedAppointment.patient_type,
      department: updatedAppointment.department,
      appointment_date: updatedAppointment.appointment_date,
      time_slot: updatedAppointment.time_slot,
      service_type: updatedAppointment.service_type,
      doctor_name: `Dr. ${targetDoctor.first_name} ${targetDoctor.last_name}`,
      room_number: targetDoctor.room_number || 'Main Clinic',
      symptoms: updatedAppointment.symptoms
    }).catch(err => console.error('Error sending rescheduled confirmation email:', err));
  }

  return res.json({
    success: true,
    message: `Appointment successfully rescheduled to ${appointment_date} (${time_slot}) with Dr. ${targetDoctor.first_name} ${targetDoctor.last_name}.`,
    appointment: updatedAppointment
  });
});

// PATCH /api/appointments/:id/cancel - Cancel appointment with optional reason
router.patch('/:id/cancel', (req, res) => {
  const { id } = req.params;
  const { cancellation_reason, reason } = req.body || {};
  const db = getDb();

  const appointment = db.prepare('SELECT * FROM appointments WHERE appointment_id = ? OR reference_code = ?').get(id, id);
  if (!appointment) {
    return res.status(404).json({ success: false, message: 'Appointment record not found.' });
  }

  const cancelReason = cancellation_reason || reason || null;

  db.prepare(`
    UPDATE appointments 
    SET status = 'Cancelled', cancelled_reason = ? 
    WHERE appointment_id = ?
  `).run(cancelReason, appointment.appointment_id);

  return res.json({ success: true, message: 'Appointment successfully cancelled.' });
});

module.exports = router;
