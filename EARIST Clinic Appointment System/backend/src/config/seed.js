const bcrypt = require('bcryptjs');
const { getDb } = require('./db');

function seedDatabase() {
  const db = getDb();
  const passwordHash = bcrypt.hashSync('password123', 10);

  // Check if admin already exists
  const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@earist.edu.ph');
  if (existingAdmin) {
    console.log('[seed] Database already contains initial staff data. Skipping seed.');
    return;
  }

  console.log('[seed] Seeding initial EARIST clinic staff, schedules, and active student queues...');

  const insertUser = db.prepare(`
    INSERT INTO users (email, password_hash, role, first_name, last_name, id_number, contact_number)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertAssistant = db.prepare(`
    INSERT INTO assistants (user_id, specialization, room_number, is_on_duty, is_active)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertSchedule = db.prepare(`
    INSERT INTO doctor_schedules (assistant_id, day_of_week, start_time, end_time, max_slots, is_available)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertAppointment = db.prepare(`
    INSERT INTO appointments (
      reference_code, patient_type, patient_name, id_number, department, course, year_section,
      age, gender, address, contact_number, symptoms, symptom_severity, allergies, medical_history,
      assistant_id, appointment_date, time_slot, service_type, status, reason, diagnosis, prescription, dosage_instructions
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  db.exec('BEGIN TRANSACTION');
  try {
    // 1. Admin (Health Services Director)
    insertUser.run(
      'admin@earist.edu.ph',
      passwordHash,
      'admin',
      'Director',
      'Administrator',
      'ADM-2026-001',
      '0917-100-2000'
    );

    // 2. Doctor: Dr. Bob (General Physician & Triage)
    const bobRes = insertUser.run(
      'dr.bob@earist.edu.ph',
      passwordHash,
      'assistant',
      'Dr. Roberto',
      'Williams',
      'MED-2026-008',
      '0919-444-5566'
    );
    const bobAssistant = insertAssistant.run(
      bobRes.lastInsertRowid,
      'General Physician & Campus Triage',
      'Main Clinic Rm 101',
      1,
      1
    );

    // 3. Doctor: Dr. Alice (Dental Medicine)
    const aliceRes = insertUser.run(
      'dr.alice@earist.edu.ph',
      passwordHash,
      'assistant',
      'Dr. Alice',
      'Johnson',
      'MED-2026-012',
      '0918-222-3344'
    );
    const aliceAssistant = insertAssistant.run(
      aliceRes.lastInsertRowid,
      'Dental Health & Oral Surgery',
      'Clinic Dental Wing Rm 102',
      1,
      1
    );

    // 4. Doctor Schedules (Monday to Friday)
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    for (const day of days) {
      insertSchedule.run(bobAssistant.lastInsertRowid, day, '08:00', '12:00', 15, 1);
      insertSchedule.run(bobAssistant.lastInsertRowid, day, '13:00', '17:00', 15, 1);

      insertSchedule.run(aliceAssistant.lastInsertRowid, day, '08:30', '12:00', 10, 1);
      insertSchedule.run(aliceAssistant.lastInsertRowid, day, '13:00', '16:00', 10, 1);
    }

    // 5. Sample Initial Queue & Patient Records
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Student Appointment (Ongoing right now)
    insertAppointment.run(
      'EAR-2026-A109',
      'student',
      'John Christian Doe',
      '234-0000M',
      'College of Engineering (CEN)',
      'BS Computer Engineering',
      '3-B',
      20,
      'Male',
      '123 Pureza St., Sampaloc, Manila',
      '0920-555-7788',
      'Severe headache, Dizziness, High fever',
      'Moderate',
      'Penicillin',
      'History of migraines during exam periods',
      bobAssistant.lastInsertRowid,
      today,
      '09:00 AM - 09:30 AM',
      'General Medical Consultation',
      'OnGoing',
      'Feeling dizzy and high temperature since morning lecture',
      'Tension headache secondary to dehydration & acute febrile illness',
      'Paracetamol 500mg, Oral Rehydration Salts',
      'Take 1 tab every 6 hours as needed for fever/headache. Complete bed rest today.'
    );

    // Student Appointment (Approved for tomorrow)
    insertAppointment.run(
      'EAR-2026-B244',
      'student',
      'Jane Kimberly Smith',
      '231-1042M',
      'College of Arts and Sciences (CAS)',
      'BS Applied Physics',
      '2-A',
      19,
      'Female',
      '456 Nagtahan St., Manila',
      '0921-888-9900',
      'Toothache, Gum swelling, Sensitivity to cold drinks',
      'Moderate',
      'None',
      'None',
      aliceAssistant.lastInsertRowid,
      tomorrow,
      '10:00 AM - 10:30 AM',
      'Annual Dental Cleaning & Oral Checkup',
      'Approved',
      'Severe throbbing pain in lower molar',
      null,
      null,
      null
    );

    // Faculty Appointment (Completed yesterday)
    insertAppointment.run(
      'EAR-2026-C881',
      'faculty_staff',
      'Prof. Marcus Reyes',
      'FAC-2019-082',
      'College of Business Administration (CBA)',
      'Department of Accountancy',
      'Faculty Member',
      45,
      'Male',
      'Mendiola St., San Miguel, Manila',
      '0917-333-4455',
      'Blood pressure monitoring, Mild chest tightness',
      'Mild',
      'Aspirin',
      'Hypertension stage 1',
      bobAssistant.lastInsertRowid,
      yesterday,
      '02:00 PM - 02:30 PM',
      'Medical Physical Clearance',
      'Completed',
      'Annual faculty medical clearance renewal',
      'Blood pressure stabilized at 125/82. Cleared for academic teaching duties.',
      'Amlodipine 5mg (continue maintenance), B-Complex vitamins',
      'Take maintenance medication daily at morning. Recheck BP next month.'
    );

    db.exec('COMMIT');
    console.log('[seed] EARIST clinic database successfully initialized and seeded!');
  } catch (err) {
    db.exec('ROLLBACK');
    console.error('[seed] Error seeding database:', err);
    throw err;
  }
}

if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
