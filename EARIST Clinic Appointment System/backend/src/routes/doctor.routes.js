const express = require('express');
const { getDb } = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/doctors - List all doctors and clinic medical staff
router.get('/', (req, res) => {
  const db = getDb();
  const doctors = db.prepare(`
    SELECT 
      a.assistant_id,
      a.user_id,
      a.specialization,
      a.room_number,
      a.is_on_duty,
      a.is_active,
      u.first_name,
      u.last_name,
      u.email,
      u.contact_number,
      u.id_number
    FROM assistants a
    JOIN users u ON a.user_id = u.id
    WHERE a.is_active = 1
    ORDER BY a.is_on_duty DESC, u.last_name ASC
  `).all();

  return res.json({ success: true, doctors });
});

// GET /api/doctors/my/schedules - Fetch current authenticated doctor's schedule and duty status
router.get('/my/schedules', authenticateToken, requireRole(['assistant', 'admin']), (req, res) => {
  const db = getDb();
  let assistantId = req.user.assistant_id;

  if (!assistantId && req.user.role === 'assistant') {
    const ast = db.prepare('SELECT assistant_id FROM assistants WHERE user_id = ?').get(req.user.id);
    if (ast) assistantId = ast.assistant_id;
  }

  if (!assistantId) {
    // If admin is viewing, grab the first active doctor
    const firstDoc = db.prepare('SELECT assistant_id FROM assistants WHERE is_active = 1 LIMIT 1').get();
    if (firstDoc) assistantId = firstDoc.assistant_id;
  }

  if (!assistantId) {
    return res.status(404).json({ success: false, message: 'No doctor station found.' });
  }

  const doctor = db.prepare(`
    SELECT a.assistant_id, a.specialization, a.room_number, a.is_on_duty, u.first_name, u.last_name
    FROM assistants a
    JOIN users u ON a.user_id = u.id
    WHERE a.assistant_id = ?
  `).get(assistantId);

  let schedules = db.prepare(`
    SELECT * FROM doctor_schedules
    WHERE assistant_id = ?
    ORDER BY 
      CASE day_of_week
        WHEN 'Monday' THEN 1
        WHEN 'Tuesday' THEN 2
        WHEN 'Wednesday' THEN 3
        WHEN 'Thursday' THEN 4
        WHEN 'Friday' THEN 5
        WHEN 'Saturday' THEN 6
        ELSE 7
      END,
      start_time ASC
  `).all(assistantId);

  // Auto-initialize standard Mon-Fri shifts if missing
  if (schedules.length === 0) {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const insertSched = db.prepare(`
      INSERT INTO doctor_schedules (assistant_id, day_of_week, start_time, end_time, max_slots, is_available)
      VALUES (?, ?, ?, ?, ?, 1)
    `);
    for (const day of days) {
      insertSched.run(assistantId, day, '08:00', '12:00', 15);
      insertSched.run(assistantId, day, '13:00', '17:00', 15);
    }
    schedules = db.prepare(`
      SELECT * FROM doctor_schedules
      WHERE assistant_id = ?
      ORDER BY 
        CASE day_of_week
          WHEN 'Monday' THEN 1
          WHEN 'Tuesday' THEN 2
          WHEN 'Wednesday' THEN 3
          WHEN 'Thursday' THEN 4
          WHEN 'Friday' THEN 5
          WHEN 'Saturday' THEN 6
          ELSE 7
        END,
        start_time ASC
    `).all(assistantId);
  }

  return res.json({
    success: true,
    doctor,
    schedules
  });
});

// GET /api/doctors/:id/schedules - Fetch weekly availability slots by assistant_id
router.get('/:id/schedules', (req, res) => {
  const { id } = req.params;
  const db = getDb();

  const doctor = db.prepare(`
    SELECT a.assistant_id, a.specialization, a.room_number, a.is_on_duty, u.first_name, u.last_name
    FROM assistants a
    JOIN users u ON a.user_id = u.id
    WHERE a.assistant_id = ?
  `).get(id);

  if (!doctor) {
    return res.status(404).json({ success: false, message: 'Doctor or clinic staff not found.' });
  }

  let schedules = db.prepare(`
    SELECT * FROM doctor_schedules
    WHERE assistant_id = ?
    ORDER BY 
      CASE day_of_week
        WHEN 'Monday' THEN 1
        WHEN 'Tuesday' THEN 2
        WHEN 'Wednesday' THEN 3
        WHEN 'Thursday' THEN 4
        WHEN 'Friday' THEN 5
        WHEN 'Saturday' THEN 6
        ELSE 7
      END,
      start_time ASC
  `).all(id);

  if (schedules.length === 0) {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const insertSched = db.prepare(`
      INSERT INTO doctor_schedules (assistant_id, day_of_week, start_time, end_time, max_slots, is_available)
      VALUES (?, ?, ?, ?, ?, 1)
    `);
    for (const day of days) {
      insertSched.run(id, day, '08:00', '12:00', 15);
      insertSched.run(id, day, '13:00', '17:00', 15);
    }
    schedules = db.prepare(`
      SELECT * FROM doctor_schedules
      WHERE assistant_id = ?
      ORDER BY 
        CASE day_of_week
          WHEN 'Monday' THEN 1
          WHEN 'Tuesday' THEN 2
          WHEN 'Wednesday' THEN 3
          WHEN 'Thursday' THEN 4
          WHEN 'Friday' THEN 5
          WHEN 'Saturday' THEN 6
          ELSE 7
        END,
        start_time ASC
    `).all(id);
  }

  return res.json({
    success: true,
    doctor,
    schedules
  });
});

// PUT /api/doctors/duty-status - Toggle on-duty / off-duty for current logged-in doctor
router.put('/duty-status', authenticateToken, requireRole(['assistant', 'admin']), (req, res) => {
  const { is_on_duty, assistant_id } = req.body;
  const db = getDb();

  let targetAssistantId = req.user.assistant_id;
  if (!targetAssistantId && req.user.role === 'assistant') {
    const ast = db.prepare('SELECT assistant_id FROM assistants WHERE user_id = ?').get(req.user.id);
    if (ast) targetAssistantId = ast.assistant_id;
  }
  if (req.user.role === 'admin' && assistant_id) {
    targetAssistantId = assistant_id;
  }

  if (!targetAssistantId) {
    return res.status(400).json({ success: false, message: 'No assistant profile associated with this account.' });
  }

  const newDutyStatus = is_on_duty ? 1 : 0;
  db.prepare(`UPDATE assistants SET is_on_duty = ? WHERE assistant_id = ?`).run(newDutyStatus, targetAssistantId);

  return res.json({
    success: true,
    message: `Duty status updated to: ${newDutyStatus === 1 ? 'ON DUTY' : 'OFF DUTY'}`,
    is_on_duty: newDutyStatus === 1
  });
});

// PUT /api/doctors/schedules/:scheduleId - Toggle day schedule availability
router.put('/schedules/:scheduleId', authenticateToken, requireRole(['assistant', 'admin']), (req, res) => {
  const { scheduleId } = req.params;
  const { is_available, max_slots, start_time, end_time } = req.body;
  const db = getDb();

  const schedule = db.prepare('SELECT * FROM doctor_schedules WHERE schedule_id = ?').get(scheduleId);
  if (!schedule) {
    return res.status(404).json({ success: false, message: 'Schedule slot not found.' });
  }

  let userAssistantId = req.user.assistant_id;
  if (!userAssistantId && req.user.role === 'assistant') {
    const ast = db.prepare('SELECT assistant_id FROM assistants WHERE user_id = ?').get(req.user.id);
    if (ast) userAssistantId = ast.assistant_id;
  }

  // Assistant ownership check
  if (req.user.role === 'assistant' && userAssistantId && userAssistantId !== schedule.assistant_id) {
    return res.status(403).json({ success: false, message: 'You can only update your own clinic schedule.' });
  }

  db.prepare(`
    UPDATE doctor_schedules 
    SET 
      is_available = COALESCE(?, is_available),
      max_slots = COALESCE(?, max_slots),
      start_time = COALESCE(?, start_time),
      end_time = COALESCE(?, end_time)
    WHERE schedule_id = ?
  `).run(
    is_available !== undefined ? (is_available ? 1 : 0) : null,
    max_slots !== undefined ? parseInt(max_slots, 10) : null,
    start_time || null,
    end_time || null,
    scheduleId
  );

  return res.json({ success: true, message: 'Schedule slot updated successfully.' });
});

// GET /api/doctors/my/calendar - Fetch full month availability & booked appointments for doctor
router.get('/my/calendar', authenticateToken, requireRole(['assistant', 'admin']), (req, res) => {
  const db = getDb();
  let assistantId = req.user.assistant_id;

  if (!assistantId && req.user.role === 'assistant') {
    const ast = db.prepare('SELECT assistant_id FROM assistants WHERE user_id = ?').get(req.user.id);
    if (ast) assistantId = ast.assistant_id;
  }
  if (!assistantId) {
    const firstDoc = db.prepare('SELECT assistant_id FROM assistants WHERE is_active = 1 LIMIT 1').get();
    if (firstDoc) assistantId = firstDoc.assistant_id;
  }

  if (!assistantId) {
    return res.status(404).json({ success: false, message: 'Doctor station not found.' });
  }

  const doctor = db.prepare(`
    SELECT a.assistant_id, a.specialization, a.room_number, a.is_on_duty, u.first_name, u.last_name
    FROM assistants a
    JOIN users u ON a.user_id = u.id
    WHERE a.assistant_id = ?
  `).get(assistantId);

  // Month query, default to current month YYYY-MM
  const monthQuery = req.query.month || new Date().toISOString().slice(0, 7);

  // 1. Fetch Date-specific custom overrides
  const overrides = db.prepare(`
    SELECT date, is_available, custom_times, notes
    FROM doctor_custom_availability
    WHERE assistant_id = ? AND date LIKE ?
  `).all(assistantId, `${monthQuery}%`);

  // Parse custom_times JSON
  const dateOverrides = {};
  for (const o of overrides) {
    dateOverrides[o.date] = {
      is_available: o.is_available === 1,
      custom_times: o.custom_times ? JSON.parse(o.custom_times) : null,
      notes: o.notes
    };
  }

  // 2. Fetch all appointments booked for this doctor in this month
  const appointments = db.prepare(`
    SELECT 
      appointment_id, reference_code, patient_name, id_number, department, course,
      year_section, appointment_date, time_slot, service_type, status, symptoms, symptom_severity
    FROM appointments
    WHERE assistant_id = ? AND appointment_date LIKE ? AND status != 'Cancelled'
    ORDER BY appointment_date ASC, time_slot ASC
  `).all(assistantId, `${monthQuery}%`);

  // Group appointments by date
  const appointmentsByDate = {};
  for (const appt of appointments) {
    if (!appointmentsByDate[appt.appointment_date]) {
      appointmentsByDate[appt.appointment_date] = [];
    }
    appointmentsByDate[appt.appointment_date].push(appt);
  }

  // 3. Base weekly schedules
  const baseSchedules = db.prepare(`
    SELECT * FROM doctor_schedules WHERE assistant_id = ?
  `).all(assistantId);

  return res.json({
    success: true,
    month: monthQuery,
    doctor,
    overrides: dateOverrides,
    appointmentsByDate,
    baseSchedules
  });
});

// PUT /api/doctors/my/calendar-day - Set day availability and custom time slots for a specific date
router.put('/my/calendar-day', authenticateToken, requireRole(['assistant', 'admin']), (req, res) => {
  const { date, is_available, custom_times, notes } = req.body;
  const db = getDb();

  if (!date) {
    return res.status(400).json({ success: false, message: 'Date (YYYY-MM-DD) is required.' });
  }

  let assistantId = req.user.assistant_id;
  if (!assistantId && req.user.role === 'assistant') {
    const ast = db.prepare('SELECT assistant_id FROM assistants WHERE user_id = ?').get(req.user.id);
    if (ast) assistantId = ast.assistant_id;
  }
  if (!assistantId) {
    const firstDoc = db.prepare('SELECT assistant_id FROM assistants WHERE is_active = 1 LIMIT 1').get();
    if (firstDoc) assistantId = firstDoc.assistant_id;
  }

  const timesJson = custom_times ? JSON.stringify(custom_times) : null;
  const availInt = is_available ? 1 : 0;

  db.prepare(`
    INSERT INTO doctor_custom_availability (assistant_id, date, is_available, custom_times, notes)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(assistant_id, date) DO UPDATE SET
      is_available = excluded.is_available,
      custom_times = excluded.custom_times,
      notes = excluded.notes
  `).run(assistantId, date, availInt, timesJson, notes || null);

  return res.json({
    success: true,
    message: `Availability for ${date} updated successfully.`,
    date,
    is_available: is_available !== false,
    custom_times
  });
});

// GET /api/doctors/:id/available-slots - Get active slots for a specific doctor & date
router.get('/:id/available-slots', (req, res) => {
  const { id } = req.params;
  const { date } = req.query;
  const db = getDb();

  if (!date) {
    return res.status(400).json({ success: false, message: 'Query param date (YYYY-MM-DD) is required.' });
  }

  const doctor = db.prepare('SELECT * FROM assistants WHERE assistant_id = ?').get(id);
  if (!doctor || doctor.is_on_duty === 0) {
    return res.json({ success: true, is_available: false, reason: 'Doctor is currently off-duty.', slots: [] });
  }

  // Check specific date override
  const override = db.prepare('SELECT * FROM doctor_custom_availability WHERE assistant_id = ? AND date = ?').get(id, date);
  if (override && override.is_available === 0) {
    return res.json({ success: true, is_available: false, reason: 'Doctor is off-duty on this date.', slots: [] });
  }

  const defaultSlots = [
    '08:00 AM - 08:30 AM',
    '08:30 AM - 09:00 AM',
    '09:00 AM - 09:30 AM',
    '09:30 AM - 10:00 AM',
    '10:00 AM - 10:30 AM',
    '10:30 AM - 11:00 AM',
    '11:00 AM - 11:30 AM',
    '11:30 AM - 12:00 PM',
    '01:00 PM - 01:30 PM',
    '01:30 PM - 02:00 PM',
    '02:00 PM - 02:30 PM',
    '02:30 PM - 03:00 PM',
    '03:00 PM - 03:30 PM',
    '03:30 PM - 04:00 PM',
    '04:00 PM - 04:30 PM',
    '04:30 PM - 05:00 PM'
  ];

  let candidateSlots = defaultSlots;
  if (override && override.custom_times) {
    try {
      candidateSlots = JSON.parse(override.custom_times);
    } catch (e) {
      candidateSlots = defaultSlots;
    }
  }

  // Capacity: up to 5 patients per time slot window
  const MAX_SLOT_CAPACITY = 5;

  const bookedAppts = db.prepare(`
    SELECT time_slot FROM appointments
    WHERE assistant_id = ? AND appointment_date = ? AND status != 'Cancelled'
  `).all(id, date);

  const slotCounts = {};
  for (const b of bookedAppts) {
    slotCounts[b.time_slot] = (slotCounts[b.time_slot] || 0) + 1;
  }

  // Available slots are those where booked count < MAX_SLOT_CAPACITY
  const availableSlots = candidateSlots.filter((slot) => {
    const booked = slotCounts[slot] || 0;
    return booked < MAX_SLOT_CAPACITY;
  });

  const slotDetails = candidateSlots.map((slot) => {
    const booked = slotCounts[slot] || 0;
    const remaining = Math.max(0, MAX_SLOT_CAPACITY - booked);
    return {
      slot,
      booked,
      capacity: MAX_SLOT_CAPACITY,
      remaining,
      is_full: remaining <= 0
    };
  });

  return res.json({
    success: true,
    is_available: true,
    date,
    max_slot_capacity: MAX_SLOT_CAPACITY,
    total_slots: candidateSlots.length,
    available_slots: availableSlots,
    slot_details: slotDetails,
    booked_count: bookedAppts.length
  });
});

module.exports = router;
