# Clinic Appointment Lifecycle, Check-In, No-Show & In-Place Rescheduling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-optimized:subagent-driven-development (recommended) or superpowers-optimized:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement physical arrival check-in (`CheckedIn`), missed consultation tracking (`NoShow`), in-place appointment rescheduling without changing reference codes, and digital pass enhancements (.ics calendar generation & fast-check-in QR codes).
**Architecture:** Safe SQLite schema expansion in `db.js`, new lifecycle endpoints in `appointment.routes.js`, enhanced patient self-check-in and reschedule modal in `TrackAppointmentModal.jsx`, and real-time prioritized queue badges in `DoctorDashboard.jsx`.
**Tech Stack:** Node.js, Express, `node:sqlite`, React (Vite), Tailwind CSS, Lucide React, Canvas/SVG QR generation.
**Spec:** `docs/specs/2026-11-05-clinic-appointment-lifecycle-and-rescheduling-design.md`
**Assumptions:** Assumes Node.js v22+ with `node:sqlite` DatabaseSync is active.

## Global Constraints

- Institutional EARIST color scheme: Crimson `#800020`, dark `#580016`, amber `#D97706`.
- Touch targets must remain at least 44px (`py-2.5 sm:py-3 px-4`).
- All SQLite modifications must be non-destructive (`ALTER TABLE` and PRAGMA introspection).
- Reference codes must NEVER change when an appointment is rescheduled.
- Check-in on `CheckedIn` status can only be performed on the day of the appointment.

## Review Focus

1. **Same-day Check-in Restriction:** Attempting to check-in for an appointment date in the future or past must be rejected with an informative error message.
2. **Reschedule Slot Freeing:** When rescheduling, the previous slot must immediately become available for other students, and the destination slot must not exceed the max capacity of 5.
3. **No-Show State Transition:** An appointment marked `NoShow` must not appear in the active waiting queue, but must remain recorded in history and logsheets.
4. **Calendar Download (`.ics`):** The generated iCalendar file must parse cleanly into Google Calendar and iOS Apple Calendar with proper start/end timestamps and clinic location.
5. **QR Code Check-in Scannability:** QR code must encode a valid direct check-in route or ticket reference URL.

---

### Task 1: SQLite Database Schema Migration for Appointment Lifecycle

**Files:**

- Modify: `backend/src/config/db.js`
- Test: `test_db_lifecycle.js`

**Interfaces:**

- Consumes: `getDb()`, SQLite database connection.
- Produces:
  - New columns on `appointments`: `checked_in_at`, `cancelled_reason`, `rescheduled_at`, `reschedule_count`.
  - Expanded `status` check constraint supporting `('Pending', 'Approved', 'CheckedIn', 'OnGoing', 'Completed', 'Cancelled', 'NoShow')`.

- [ ] **Step 1: Write verification script `test_db_lifecycle.js`**
      Check that the new columns exist and that `status` values `'CheckedIn'` and `'NoShow'` can be inserted and retrieved without constraint errors.
- [ ] **Step 2: Update `backend/src/config/db.js`**
      In `initSchema()`, introspect `appointments` columns. Add missing columns (`checked_in_at`, `cancelled_reason`, `rescheduled_at`, `reschedule_count`). If the table SQL check constraint doesn't include `CheckedIn` and `NoShow`, perform a safe table migration.
- [ ] **Step 3: Run verification script**
      Run `node test_db_lifecycle.js` and verify all tests pass. Clean up test file.

---

### Task 2: Backend Appointment Routes — Check-In, No-Show, Reschedule & Reasoned Cancel

**Files:**

- Modify: `backend/src/routes/appointment.routes.js`
- Test: `test_appointment_lifecycle_routes.js`

**Interfaces:**

- Consumes: `getDb()`, `sendAppointmentConfirmationEmail`
- Produces:
  - `PATCH /api/appointments/:reference/check-in`
  - `PATCH /api/appointments/:id/no-show`
  - `PATCH /api/appointments/:reference/reschedule`
  - Updated `PATCH /api/appointments/:id/cancel` (with reason)
  - Updated `GET /api/appointments/queue` returning `checked_in_at` and prioritized ordering

- [ ] **Step 1: Write integration tests `test_appointment_lifecycle_routes.js`**
      Test checking in (same day vs future day), marking no-show, in-place rescheduling with slot capacity check and confirmation email trigger, and cancel with reason.
- [x] **Step 2: Implement lifecycle endpoints in `backend/src/routes/appointment.routes.js`**
  - Implement `PATCH /:reference/check-in` verifying local date `YYYY-MM-DD`.
  - Implement `PATCH /:id/no-show` guarded by `authenticateToken, requireRole(['assistant', 'admin'])`.
  - Implement `PATCH /:reference/reschedule`: validates new date/slot, frees previous slot, updates `rescheduled_at` and `reschedule_count`, retains `reference_code`, sends updated confirmation email.
  - Update `PATCH /:id/cancel`: record `cancelled_reason`.
  - Update `GET /queue`: sort order: `OnGoing` first, then `CheckedIn` (ordered by `checked_in_at ASC`), then `Approved` (ordered by slot time).
- [x] **Step 3: Run integration test**
  Run `node test_appointment_lifecycle_routes.js` and verify. Clean up test file.

---

### Task 3: Patient Digital Pass Utilities — Calendar (`.ics`) & Fast Check-In QR Code

**Files:**

- Create: `frontend/src/utils/calendar.js`
- Create: `frontend/src/components/common/TicketQRCode.jsx`
- Modify: `frontend/src/components/patient/TrackAppointmentModal.jsx`
- Modify: `frontend/src/components/patient/DirectBookingWizard.jsx`

**Interfaces:**

- `generateICSFile(appointment)`: Returns an `.ics` blob and triggers browser download.
- `TicketQRCode`: Renders high-contrast QR code vector encoding the ticket tracking / check-in link.

- [x] **Step 1: Implement `frontend/src/utils/calendar.js`**
      Build pure JS standard RFC 5545 `.ics` generator with clinic appointment title, doctor name, start/end time parsed from `time_slot`, location "EARIST Health Services Directorate", and alert 1 hour prior.
- [x] **Step 2: Implement lightweight QR Code component `TicketQRCode.jsx`**
      Use SVG/Canvas to generate clean, high-contrast QR code for the appointment reference URL.
- [x] **Step 3: Integrate into `DirectBookingWizard.jsx` and `TrackAppointmentModal.jsx`**
      Add "Add to Calendar" button and QR display on the final confirmation ticket slip.

---

### Task 4: In-Place Patient Self Check-In & Dedicated Rescheduling Modal

**Files:**

- Create: `frontend/src/components/patient/RescheduleModal.jsx`
- Modify: `frontend/src/components/patient/TrackAppointmentModal.jsx`
- Modify: `frontend/src/App.jsx`

**Interfaces:**

- Consumes: `/api/appointments/:reference/check-in`, `/api/appointments/:reference/reschedule`, `/api/doctors/:id/available-slots`
- Produces:
  - Self check-in flow with instant visual feedback.
  - Dedicated Reschedule Modal with calendar date picker, doctor selection, and live slot loading.

- [x] **Step 1: Implement `frontend/src/components/patient/RescheduleModal.jsx`**
      Form that displays current appointment details, lets patient choose new Date & Time slot, checks capacity, calls `PATCH /api/appointments/:reference/reschedule`, and triggers success alert with updated pass.
- [x] **Step 2: Update `TrackAppointmentModal.jsx`**
  - Add prominent **"I Have Arrived (Self Check-In)"** button if appointment is today and status is `Approved`.
  - Wire "Reschedule Date / Time" button to open `RescheduleModal`.
  - Add prompt for cancellation reason on cancel confirmation.
- [x] **Step 3: Connect handlers in `App.jsx`**
      Ensure reschedule modal opens smoothly and refreshes the tracking state upon completion.

---

### Task 5: Doctor Queue Triage with Arrival Badges & No-Show Controls

**Files:**

- Modify: `frontend/src/pages/DoctorDashboard.jsx`

**Interfaces:**

- Consumes: `/api/appointments/queue`, `/api/appointments/:reference/check-in`, `/api/appointments/:id/no-show`
- Produces:
  - Visual queue triage separating "Waiting in Lobby (`CheckedIn`)" from "Scheduled (`Approved`)".
  - "Mark Arrived" quick button for counter check-in.
  - "Mark No-Show" button for un-attended consultations.

- [x] **Step 1: Update queue card rendering in `DoctorDashboard.jsx`**
  - Add distinct green badge for `CheckedIn` patients showing arrival time (e.g. `Checked In 9:12 AM`).
  - Add Amber badge for `Approved` patients (`Awaiting Arrival`).
- [x] **Step 2: Add quick-action buttons on each patient card**
  - If status is `Approved`: Add button **"Mark Arrived"**.
  - Add button **"No-Show"** with confirmation dialog.
- [x] **Step 3: Verify Doctor Dashboard flow**
      Test checking in a patient from the doctor side, starting consultation, and marking a missed slot as no-show. Verify queue re-renders cleanly without page reload.

---

### Task 6: End-to-End System Verification & Regression Testing

**Files:**

- Test: `test_e2e_appointment_flow.js`

- [x] **Step 1: Write and run end-to-end integration test**
      Verify complete lifecycle:
  1. Book public appointment.
  2. Attempt early check-in (expect rejection).
  3. Perform check-in on valid date (expect `CheckedIn`).
  4. Reschedule appointment to another date (expect same reference, status `Approved`, slot freed).
  5. Mark as `NoShow` (expect proper status and queue exclusion).
- [x] **Step 2: Clean up test artifacts and verify build**
      Ensure frontend builds cleanly with `npm run build` and backend runs without errors.
