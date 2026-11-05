# Clinical Triage, Walk-In Intake & Directorate Staff Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-optimized:subagent-driven-development (recommended) or superpowers-optimized:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement acute clinical walk-in patient intake, structured vital signs triage with clinical alert thresholds, historical patient visit tracking, and full administrative staff management CRUD.
**Architecture:** Safe SQLite schema expansion in `db.js`, new REST endpoints in `appointment.routes.js` and `admin.routes.js`, and interactive modal components in React with Tailwind CSS and Lucide React.
**Tech Stack:** Node.js, Express, `node:sqlite`, React (Vite), Tailwind CSS, Lucide React, bcryptjs.
**Spec:** `docs/specs/2026-11-03-clinical-triage-and-staff-management-design.md`
**Assumptions:** Assumes Node.js v22+ with `node:sqlite` DatabaseSync is active.

## Global Constraints

- Touch targets must be at least 44px (`py-2.5 sm:py-3 px-4`).
- Institutional color scheme: EARIST Crimson `#800020`, dark `#580016`, amber `#D97706`.
- Zero AI visual clichés (no blur orbs, no sparkles icons, no text gradient masking).
- SQLite migrations must be non-destructive (`ALTER TABLE ... ADD COLUMN` after inspecting PRAGMA table_info).
- All staff passwords hashed using `bcrypt` (or existing hashing mechanism in `auth.routes.js`).

## Review Focus

1. ID number case & spacing differences (`234-0000m` vs `234-0000M `) -> Normalized via `TRIM().toUpperCase()` so history lookups never miss past visits.
2. Walk-in patient slot saturation -> Walk-ins must bypass normal online scheduling slot caps with `is_walkin = 1`.
3. Vitals validation -> All vitals optional on intake to prevent blocking acute emergencies; parsed safely as numbers or nulls.
4. Staff deletion / deactivation -> Must not delete historical appointments; soft toggle via `is_active` / `is_on_duty`.
5. Reset password -> Securely update password hash and verify login with default `earist2026!`.

---

### Task 1: SQLite Schema Migrations for Vitals & Walk-In Flag

**Files:**

- Modify: `backend/src/config/db.js`
- Test: `test_db_vitals.js`

**Interfaces:**

- Consumes: `getDb()`, SQLite database connection.
- Produces: `appointments` table columns: `bp_systolic`, `bp_diastolic`, `temperature`, `pulse_rate`, `respiratory_rate`, `spo2`, `weight_kg`, `is_walkin`.

**Security flag:** `none`

**Does NOT cover:** Does not modify `users` or `assistants` schemas.

- [x] **Step 1: Write verification script `test_db_vitals.js`**
      Check that `appointments` table columns include the new vitals fields and `is_walkin`.
- [x] **Step 2: Update `backend/src/config/db.js`**
      Add migration logic in `initSchema` to verify column existence via `PRAGMA table_info(appointments)` and dynamically add any missing columns.
- [x] **Step 3: Run verification script**
      Run `node test_db_vitals.js` and verify output. Clean up test script.

---

### Task 2: Backend Appointment Routes — Walk-In Intake, Vitals Update & Patient History

**Files:**

- Modify: `backend/src/routes/appointment.routes.js`
- Test: `test_appointment_vitals_routes.js`

**Interfaces:**

- Consumes: `authenticateToken`, `requireRole`, `getDb()`
- Produces:
  - `POST /api/appointments/walk-in`
  - `GET /api/appointments/patient-history/:idNumber`
  - Updated `PATCH /api/appointments/:id/status` accepting vitals fields.

**Security flag:** `security` (enforces staff/admin authentication).

**Does NOT cover:** Does not alter public booking endpoint `/public-book`.

- [x] **Step 1: Write integration test `test_appointment_vitals_routes.js`**
      Test `POST /api/appointments/walk-in` (with `serve_immediately: true` and `serve_immediately: false`), `GET /api/appointments/patient-history/:idNumber`, and status PATCH.
- [x] **Step 2: Implement endpoints in `backend/src/routes/appointment.routes.js`**
  - Add `POST /walk-in`: generates walk-in reference code (`EAR-WLK-XXXX`), assigns to doctor, records vitals, sets status to `OnGoing` if `serve_immediately` is true, otherwise `Approved`.
  - Add `GET /patient-history/:idNumber`: queries appointments matching `id_number`, returns previous visit details, diagnoses, prescriptions, and attending doctor names.
  - Update `PATCH /:id/status`: updates vitals (`bp_systolic`, `bp_diastolic`, `temperature`, `pulse_rate`, `spo2`, `weight_kg`) in addition to diagnosis and prescription.
- [x] **Step 3: Run integration test**
      Run `node test_appointment_vitals_routes.js` and verify all tests pass. Clean up test file.

---

### Task 3: Backend Admin Staff Management Endpoints

**Files:**

- Modify: `backend/src/routes/admin.routes.js`
- Test: `test_admin_staff_routes.js`

**Interfaces:**

- Consumes: `authenticateToken`, `requireRole('admin')`, `getDb()`, `bcrypt`
- Produces:
  - `POST /api/admin/staff`
  - `PUT /api/admin/staff/:assistantId`
  - `POST /api/admin/staff/:assistantId/reset-password`

**Security flag:** `security` (admin role check, password hashing).

- [x] **Step 1: Write integration test `test_admin_staff_routes.js`**
      Verify that an admin can create a new doctor account, edit their room/specialization, and reset their password, while non-admins are rejected with 401/403.
- [x] **Step 2: Implement endpoints in `backend/src/routes/admin.routes.js`**
  - `POST /staff`: validates required fields, hashes password with bcrypt, inserts into `users` and `assistants` tables in a transaction, and seeds default Mon-Fri schedule.
  - `PUT /staff/:assistantId`: updates room number, specialization, is_on_duty, and is_active.
  - `POST /staff/:assistantId/reset-password`: resets password hash to bcrypt hash of `earist2026!` (or custom value).
- [x] **Step 3: Run integration test**
      Run `node test_admin_staff_routes.js` and verify. Clean up test file.

---

### Task 4: Frontend Walk-In & Patient History Modals

**Files:**

- Create: `frontend/src/components/doctor/WalkInModal.jsx`
- Create: `frontend/src/components/doctor/PatientHistoryModal.jsx`

**Interfaces:**

- Consumes: `Modal`, `token`, `onSuccess(appointment, serveImmediately)`
- Produces:
  - `WalkInModal`: Form for student/faculty/outsource walk-in registration with optional vitals and dual submit options ("Serve Immediately" vs "Add to Queue").
  - `PatientHistoryModal`: Timeline showing all prior clinic visits for the given ID number.

**Security flag:** `none`

- [x] **Step 1: Implement `frontend/src/components/doctor/WalkInModal.jsx`**
      Include inputs for Classification, Name, ID, Department, Section, Complaints, and Vitals (BP, Temp, Pulse, SpO₂, Weight).
- [x] **Step 2: Implement `frontend/src/components/doctor/PatientHistoryModal.jsx`**
      Fetch history from `/api/appointments/patient-history/:idNumber`, display chronological timeline with badges, diagnoses, and prescriptions.
- [x] **Step 3: Verify component syntax**
      Check that files export cleanly without React syntax errors.

---

### Task 5: Doctor Dashboard Integration

**Files:**

- Modify: `frontend/src/pages/DoctorDashboard.jsx`

**Interfaces:**

- Consumes: `WalkInModal`, `PatientHistoryModal`, vital signs API fields.
- Produces:
  - "+ Walk-In Patient" button in the queue header.
  - "Past Visits" icon button on each appointment card and in the modal.
  - Structured Vitals Inputs in the Consultation modal with real-time alert badges:
    - Fever Alert ($\ge 37.8^\circ\text{C}$)
    - Hypertension Warning (Systolic $\ge 140$ or Diastolic $\ge 90$)
    - Hypoxemia Warning ($\text{SpO}_2 < 95\%$)

**Security flag:** `none`

- [x] **Step 1: Add Walk-In trigger and Patient History state to `DoctorDashboard.jsx`**
- [x] **Step 2: Add vital signs inputs and live alert badges to the Consultation Modal**
- [x] **Step 3: Connect "Serve Immediately" handler to auto-open consultation for newly created walk-in**

---

### Task 6: Admin Dashboard Staff Management Panel & Walk-In Intake

**Files:**

- Modify: `frontend/src/pages/AdminDashboard.jsx`

**Interfaces:**

- Consumes: `admin.routes.js` staff endpoints, `WalkInModal`, `PatientHistoryModal`.
- Produces:
  - "+ Add Clinic Staff" button & interactive modal.
  - "Edit Station / Profile" modal for doctors.
  - "Reset Password" confirmation dialog.
  - Walk-In intake button in Admin appointments tab.

**Security flag:** `none`

- [x] **Step 1: Enhance Users tab in `AdminDashboard.jsx` with CRUD action buttons**
- [x] **Step 2: Implement Add Staff, Edit Staff, and Reset Password modals**
- [x] **Step 3: Connect Walk-in registration button in Admin Logsheet view**

---

### Task 7: Full Stack Verification & Build

**Files:**

- Run: Backend and frontend test suite and Vite build.

- [x] **Step 1: Verify frontend build**
      Run `npm --prefix frontend run build` to confirm zero compilation errors.
- [x] **Step 2: Verify backend server initialization**
      Run `node -e "require('./backend/src/server')"` check.
- [x] **Step 3: Manual flow verification test**
      Simulate walk-in intake, vitals alert triggering, past history lookup, and staff creation.
