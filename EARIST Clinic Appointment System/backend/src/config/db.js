const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const dbPath = path.join(__dirname, '../../earist_clinic.db');
let db = null;

function getDb() {
  if (!db) {
    db = new DatabaseSync(dbPath);
    db.exec('PRAGMA foreign_keys = ON;');
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
      patient_type TEXT CHECK(patient_type IN ('student', 'faculty_staff')) DEFAULT 'student',
      patient_name TEXT NOT NULL,
      id_number TEXT NOT NULL,
      department TEXT NOT NULL,
      course TEXT,
      year_section TEXT,
      age INTEGER,
      gender TEXT,
      address TEXT,
      contact_number TEXT NOT NULL,
      symptoms TEXT,
      symptom_severity TEXT CHECK(symptom_severity IN ('Mild', 'Moderate', 'Severe')) DEFAULT 'Mild',
      allergies TEXT,
      medical_history TEXT,
      assistant_id INTEGER NOT NULL,
      appointment_date TEXT NOT NULL,
      time_slot TEXT NOT NULL,
      service_type TEXT NOT NULL,
      status TEXT CHECK(status IN ('Pending', 'Approved', 'OnGoing', 'Completed', 'Cancelled')) DEFAULT 'Approved',
      reason TEXT,
      diagnosis TEXT,
      prescription TEXT,
      dosage_instructions TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (assistant_id) REFERENCES assistants(assistant_id) ON DELETE CASCADE
    );
  `);
}

module.exports = { getDb };
