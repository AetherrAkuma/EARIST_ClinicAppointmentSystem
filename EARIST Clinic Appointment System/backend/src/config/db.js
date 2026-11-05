const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const dbPath = path.join(__dirname, '../../earist_clinic.db');
let db = null;

function getDb() {
  if (!db) {
    db = new DatabaseSync(dbPath);
    db.exec('PRAGMA foreign_keys = ON;');
    db.exec('PRAGMA busy_timeout = 5000;');
    db.exec('PRAGMA journal_mode = WAL;');
    db.exec('PRAGMA synchronous = NORMAL;');
    initSchema(db);
  }
  return db;
}

function initSchema(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT CHECK(role IN ('assistant', 'admin')) NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      id_number TEXT,
      contact_number TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS assistants (
      assistant_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      specialization TEXT,
      room_number TEXT,
      is_on_duty INTEGER DEFAULT 1,
      is_active INTEGER DEFAULT 1,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS doctor_schedules (
      schedule_id INTEGER PRIMARY KEY AUTOINCREMENT,
      assistant_id INTEGER NOT NULL,
      day_of_week TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      max_slots INTEGER DEFAULT 15,
      is_available INTEGER DEFAULT 1,
      FOREIGN KEY (assistant_id) REFERENCES assistants(assistant_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS doctor_custom_availability (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assistant_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      is_available INTEGER DEFAULT 1,
      custom_times TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (assistant_id) REFERENCES assistants(assistant_id) ON DELETE CASCADE,
      UNIQUE(assistant_id, date)
    );

    CREATE TABLE IF NOT EXISTS appointments (
      appointment_id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference_code TEXT UNIQUE NOT NULL,
      patient_type TEXT CHECK(patient_type IN ('student', 'faculty_staff', 'academic_non_academic', 'outsource_extension')) DEFAULT 'student',
      patient_name TEXT NOT NULL,
      id_number TEXT NOT NULL,
      department TEXT NOT NULL,
      course TEXT,
      year_section TEXT,
      age INTEGER,
      gender TEXT,
      address TEXT,
      contact_number TEXT NOT NULL,
      email TEXT,
      patient_email TEXT,
      symptoms TEXT,
      symptom_severity TEXT CHECK(symptom_severity IN ('Mild', 'Moderate', 'Severe')) DEFAULT 'Mild',
      allergies TEXT,
      medical_history TEXT,
      assistant_id INTEGER NOT NULL,
      appointment_date TEXT NOT NULL,
      time_slot TEXT NOT NULL,
      service_type TEXT NOT NULL,
      status TEXT CHECK(status IN ('Pending', 'Approved', 'CheckedIn', 'OnGoing', 'Completed', 'Cancelled', 'NoShow')) DEFAULT 'Approved',
      email_status TEXT CHECK(email_status IN ('Pending', 'Sent', 'Failed')) DEFAULT 'Pending',
      email_sent_at DATETIME,
      reason TEXT,
      diagnosis TEXT,
      prescription TEXT,
      dosage_instructions TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      checked_in_at DATETIME,
      cancelled_reason TEXT,
      rescheduled_at DATETIME,
      reschedule_count INTEGER DEFAULT 0,
      bp_systolic INTEGER,
      bp_diastolic INTEGER,
      temperature REAL,
      pulse_rate INTEGER,
      respiratory_rate INTEGER,
      spo2 INTEGER,
      weight_kg REAL,
      is_walkin INTEGER DEFAULT 0,
      FOREIGN KEY (assistant_id) REFERENCES assistants(assistant_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS email_verifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      otp_code TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      attempts_left INTEGER DEFAULT 3,
      is_verified INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_email_verif_lookup ON email_verifications(email, otp_code);

    CREATE TABLE IF NOT EXISTS email_notifications (
      notification_id INTEGER PRIMARY KEY AUTOINCREMENT,
      appointment_id INTEGER NOT NULL,
      recipient_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      reference_code TEXT NOT NULL,
      template_name TEXT DEFAULT 'appointment_tracking_id',
      status TEXT CHECK(status IN ('Pending', 'Sent', 'Failed')) DEFAULT 'Pending',
      error_message TEXT,
      sent_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (appointment_id) REFERENCES appointments(appointment_id) ON DELETE CASCADE
    );
  `);

  // Ensure patient_type check constraint includes all categories and status includes CheckedIn and NoShow
  try {
    const tableSql = database.prepare("SELECT sql FROM sqlite_master WHERE name='appointments'").get()?.sql || '';
    const needsStatusMigration = tableSql && (!tableSql.includes('CheckedIn') || !tableSql.includes('NoShow'));
    const needsPatientTypeMigration = tableSql && !tableSql.includes('academic_non_academic');

    if (needsStatusMigration || needsPatientTypeMigration) {
      database.exec('PRAGMA foreign_keys = OFF;');
      database.exec(`
        CREATE TABLE IF NOT EXISTS appointments_migrated (
          appointment_id INTEGER PRIMARY KEY AUTOINCREMENT,
          reference_code TEXT UNIQUE NOT NULL,
          patient_type TEXT CHECK(patient_type IN ('student', 'faculty_staff', 'academic_non_academic', 'outsource_extension')) DEFAULT 'student',
          patient_name TEXT NOT NULL,
          id_number TEXT NOT NULL,
          department TEXT NOT NULL,
          course TEXT,
          year_section TEXT,
          age INTEGER,
          gender TEXT,
          address TEXT,
          contact_number TEXT NOT NULL,
          email TEXT,
          patient_email TEXT,
          symptoms TEXT,
          symptom_severity TEXT CHECK(symptom_severity IN ('Mild', 'Moderate', 'Severe')) DEFAULT 'Mild',
          allergies TEXT,
          medical_history TEXT,
          assistant_id INTEGER NOT NULL,
          appointment_date TEXT NOT NULL,
          time_slot TEXT NOT NULL,
          service_type TEXT NOT NULL,
          status TEXT CHECK(status IN ('Pending', 'Approved', 'CheckedIn', 'OnGoing', 'Completed', 'Cancelled', 'NoShow')) DEFAULT 'Approved',
          email_status TEXT CHECK(email_status IN ('Pending', 'Sent', 'Failed')) DEFAULT 'Pending',
          email_sent_at DATETIME,
          reason TEXT,
          diagnosis TEXT,
          prescription TEXT,
          dosage_instructions TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          bp_systolic INTEGER,
          bp_diastolic INTEGER,
          temperature REAL,
          pulse_rate INTEGER,
          respiratory_rate INTEGER,
          spo2 INTEGER,
          weight_kg REAL,
          is_walkin INTEGER DEFAULT 0,
          checked_in_at DATETIME,
          cancelled_reason TEXT,
          rescheduled_at DATETIME,
          reschedule_count INTEGER DEFAULT 0,
          FOREIGN KEY (assistant_id) REFERENCES assistants(assistant_id) ON DELETE CASCADE
        );
      `);

      const currentCols = database.prepare("PRAGMA table_info(appointments);").all().map(c => c.name);
      const targetCols = database.prepare("PRAGMA table_info(appointments_migrated);").all().map(c => c.name);
      const commonCols = currentCols.filter(col => targetCols.includes(col));
      const colsStr = commonCols.join(', ');

      database.exec(`INSERT INTO appointments_migrated (${colsStr}) SELECT ${colsStr} FROM appointments;`);
      database.exec('DROP TABLE appointments;');
      database.exec('ALTER TABLE appointments_migrated RENAME TO appointments;');
      database.exec('PRAGMA foreign_keys = ON;');
    }
  } catch (e) {
    console.error('Error during appointments schema check migration:', e);
  }

  // Ensure all columns exist dynamically in appointments table
  try {
    const cols = database.prepare("PRAGMA table_info(appointments);").all();
    const colNames = cols.map(c => c.name);

    const additionalColumns = [
      { name: 'email', type: 'TEXT' },
      { name: 'patient_email', type: 'TEXT' },
      { name: 'email_status', type: "TEXT CHECK(email_status IN ('Pending', 'Sent', 'Failed')) DEFAULT 'Pending'" },
      { name: 'email_sent_at', type: 'DATETIME' },
      { name: 'bp_systolic', type: 'INTEGER' },
      { name: 'bp_diastolic', type: 'INTEGER' },
      { name: 'temperature', type: 'REAL' },
      { name: 'pulse_rate', type: 'INTEGER' },
      { name: 'respiratory_rate', type: 'INTEGER' },
      { name: 'spo2', type: 'INTEGER' },
      { name: 'weight_kg', type: 'REAL' },
      { name: 'is_walkin', type: 'INTEGER DEFAULT 0' },
      { name: 'checked_in_at', type: 'DATETIME' },
      { name: 'cancelled_reason', type: 'TEXT' },
      { name: 'rescheduled_at', type: 'DATETIME' },
      { name: 'reschedule_count', type: 'INTEGER DEFAULT 0' }
    ];

    for (const col of additionalColumns) {
      if (!colNames.includes(col.name)) {
        database.exec(`ALTER TABLE appointments ADD COLUMN ${col.name} ${col.type};`);
      }
    }

    // Keep email and patient_email synchronized for compatibility
    database.exec("UPDATE appointments SET email = patient_email WHERE email IS NULL AND patient_email IS NOT NULL;");
    database.exec("UPDATE appointments SET patient_email = email WHERE patient_email IS NULL AND email IS NOT NULL;");
  } catch (e) {
    console.error('Error adding additional appointments columns:', e);
  }
}

module.exports = { getDb };
