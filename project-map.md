# Project Map
_Generated: 2026-10-20 10:16 | Git: initial_

## Directory Structure
EARIST Clinic Appointment System/ — Modernized Node.js + Express + React 19 + Vite clinic system
EARIST Clinic Appointment System/backend/ — Express REST API with zero-config SQLite (node:sqlite)
EARIST Clinic Appointment System/frontend/ — React 19 SPA with Tailwind CSS & Framer Motion
clinic-appointment-system/ — Legacy PHP/MySQL appointment booking web application
clinic-appointment-system/config/ — Database connection and environment configuration

## Key Files
EARIST Clinic Appointment System/start.bat — 1-click startup: verifies Node, seeds DB, starts API & Vite, opens browser
EARIST Clinic Appointment System/backend/src/server.js — Express server entry point with JWT auth & CORS
EARIST Clinic Appointment System/backend/src/config/db.js — Zero-config native SQLite database schema
EARIST Clinic Appointment System/backend/src/config/seed.js — Sample EARIST staff, doctor schedules, and students
EARIST Clinic Appointment System/frontend/src/App.jsx — React SPA with role-based routing (Student, Doctor, Admin)
clinic-appointment-system/config/db_connection.php — MySQL connection setup (mysqli, default: localhost, root, empty password, clinic_db)

## Critical Constraints
- EARIST Clinic system uses Node.js built-in `node:sqlite` database (`earist_clinic.db`) with zero external DB dependencies.
- Frontend runs on port 5173 (proxies `/api` to 5000), backend runs on port 5000.
- All default seed accounts use the password: `password123`.

## Hot Files
EARIST Clinic Appointment System/start.bat, EARIST Clinic Appointment System/backend/src/server.js, EARIST Clinic Appointment System/frontend/src/App.jsx
