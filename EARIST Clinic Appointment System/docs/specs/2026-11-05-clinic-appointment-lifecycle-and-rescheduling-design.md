# Design Specification: Clinic Appointment Lifecycle, Queue Check-in, No-Show & Rescheduling

**Date:** 2026-11-05  
**Topic:** EARIST Campus Clinic Appointment Lifecycle Modernization (Phase 1)  
**Status:** Approved by User  
**Scope:** Strict Clinic Appointment & Scheduling Context  

---

## 1. Executive Summary & Goals

The EARIST Health Services Directorate system requires complete end-to-end appointment lifecycle management. Currently, appointments transition directly from `Approved` to `OnGoing` with no physical presence verification, no handling of absent patients ("No-Show"), and no true rescheduling workflow (which previously attempted to create duplicate appointments without releasing booked slots).

**Phase 1 Focus:**
1. **Physical Presence & Triage Queue:** Distinguish patients who are physically present in the clinic (`CheckedIn`) from scheduled arrivals (`Approved`), allowing doctors to call waiting patients first.
2. **Attendance Accountability:** Add `NoShow` status to track missed consultations, free up doctor schedules, and avoid inaccurate logsheet reporting.
3. **True In-Place Rescheduling:** Reschedule existing tickets via `PATCH /api/appointments/:reference/reschedule` without altering the unique Reference Code (`EAR-XXXX-XXX`), immediately releasing the old time slot and emailing an updated pass.
4. **Patient Digital Pass Utilities:** Add a one-click **"Add to Google/Apple Calendar"** (`.ics` file) and an integrated **Check-In QR Code** on the patient appointment ticket.

---

## 2. Database Schema Migrations (`backend/src/config/db.js`)

SQLite uses check constraints. To safely allow `CheckedIn` and `NoShow` statuses without breaking existing data:

```sql
-- Safe schema update for appointments table
ALTER TABLE appointments ADD COLUMN checked_in_at DATETIME;
ALTER TABLE appointments ADD COLUMN cancelled_reason TEXT;
ALTER TABLE appointments ADD COLUMN rescheduled_at DATETIME;
ALTER TABLE appointments ADD COLUMN reschedule_count INTEGER DEFAULT 0;
```

**Status Enumeration:**
- `Pending` (Initial if approval is required)
- `Approved` (Confirmed booking, awaiting appointment date)
- `CheckedIn` (Patient physically arrived in clinic waiting room)
- `OnGoing` (Currently inside doctor's room for consultation)
- `Completed` (Finished consultation & treatment log)
- `Cancelled` (Cancelled by patient or clinic with reason)
- `NoShow` (Patient missed the time slot and failed to appear)

The database migration in `initSchema()` will inspect `sqlite_master` for check constraints on `status` and apply safe table recreation if necessary, mirroring the existing non-destructive migrations in `db.js`.

---

## 3. Backend Endpoints & Logic (`backend/src/routes/appointment.routes.js`)

### 3.1 Patient Self & Staff Check-In
* **Route:** `PATCH /api/appointments/:reference/check-in`
* **Access:** Public (with verification) OR Staff/Doctor authenticated.
* **Payload:**
  ```json
  {
    "id_number": "234-0000M" // optional if authenticated staff
  }
  ```
* **Validation & Rules:**
  - Ticket reference must exist and not be `Cancelled`, `Completed`, or `NoShow`.
  - Check-in is permitted on the appointment date (or within clinic check-in window).
  - Updates status to `CheckedIn` and sets `checked_in_at = CURRENT_TIMESTAMP`.

### 3.2 Doctor / Staff Mark as No-Show
* **Route:** `PATCH /api/appointments/:id/no-show`
* **Access:** Staff/Doctor authenticated (`requireRole(['assistant', 'admin'])`).
* **Validation & Rules:**
  - Updates status to `NoShow`.
  - Re-calculates active queue numbers.

### 3.3 True In-Place Rescheduling
* **Route:** `PATCH /api/appointments/:reference/reschedule`
* **Access:** Public (with matching ID/email verification) OR Staff/Doctor authenticated.
* **Payload:**
  ```json
  {
    "appointment_date": "2026-11-10",
    "time_slot": "10:00 AM - 10:30 AM",
    "assistant_id": 1,
    "reschedule_reason": "Class exam schedule conflict"
  }
  ```
* **Validation & Rules:**
  - Validates that target date is not in the past.
  - Verifies target doctor is on duty and active.
  - Verifies slot capacity has space (< 5 patients per slot).
  - Verifies no collision with another active appointment for the same patient ID.
  - Retains the exact same `reference_code`.
  - Increments `reschedule_count`, sets `rescheduled_at = CURRENT_TIMESTAMP`.
  - Resets status to `Approved` (or `CheckedIn` if rescheduled for today with arrival).
  - Dispatches an updated appointment confirmation email via `sendAppointmentConfirmationEmail()`.

### 3.4 Enhanced Cancellation
* **Route:** `PATCH /api/appointments/:id/cancel`
* **Payload Enhancement:** Accepts `reason` / `cancelled_reason` to log why patient cancelled.

---

## 4. Frontend Components & User Flows

### 4.1 Patient Tracking Modal (`TrackAppointmentModal.jsx`)
1. **Arrival Check-In Button:**
   - Displayed when `appointment.appointment_date === today` and status is `Approved`.
   - Action triggers `PATCH /api/appointments/:reference/check-in`.
   - On success, badges update to green: `Checked In • In Waiting Room` with a friendly prompt: *"Please proceed to the Clinic Waiting Area outside Room [Room Number]. The doctor has been notified of your arrival."*
2. **In-Place Reschedule Modal:**
   - Instead of restarting the booking wizard from scratch, clicking "Reschedule" opens a dedicated reschedule view that preserves patient identity and medical history, only requiring date/doctor/slot selection.
   - Submits directly to the `/reschedule` endpoint.
3. **Digital Pass Tools:**
   - **"Add to Calendar":** Generates an `.ics` MIME file containing event title ("EARIST Clinic: Dr. [Doctor]"), start time, end time, location ("EARIST Campus Clinic Rm [Room]"), and description with Reference Code.
   - **Fast-Check-In QR Code:** Embedded SVG QR code containing the direct check-in URL for quick camera scanning at the clinic entrance.

### 4.2 Doctor Dashboard Queue Management (`DoctorDashboard.jsx`)
1. **Grouped / Prioritized Queue:**
   - Top Priority: `CheckedIn` patients (Waiting in reception), displayed with a badge indicating minutes waited (`Arrived at 9:15 AM`).
   - Secondary: `Approved` patients (Expected today, not yet checked in).
2. **One-Click Actions per Patient Card:**
   - "Start Consultation" (moves to `OnGoing`).
   - "Mark Arrived" (manual check-in by receptionist/doctor if patient forgot their phone).
   - "Mark No-Show" (flags missed slots cleanly without deleting records).

---

## 5. Adversarial Failure-Mode Check & Mitigation

1. **Failure Mode 1: Early Check-In Abuse**
   * *Scenario:* A student with an appointment scheduled 5 days from now tries to check in today.
   * *Mitigation:* The check-in endpoint strictly rejects check-ins if `appointment_date !== today` (Philippine local date `YYYY-MM-DD`).
2. **Failure Mode 2: Slot Overbooking on Concurrent Reschedule**
   * *Scenario:* Two students try to reschedule into the last remaining slot for 10:00 AM at the same second.
   * *Mitigation:* Wrap slot capacity query and update in a SQLite transaction with `PRAGMA busy_timeout = 5000` to prevent race conditions.
3. **Failure Mode 3: Repeated Infinite Rescheduling**
   * *Scenario:* A student reschedules repeatedly, holding clinic slots indefinitely.
   * *Mitigation:* Track `reschedule_count`; warn or cap rescheduling at 3 times per reference code, requiring a clinic visit for further adjustments.

---

## 6. Non-Goals for Phase 1
- Blackout dates & clinic holiday calendar management (Allocated to Phase 2).
- Congestion heatmaps and college no-show analytics (Allocated to Phase 2).
- Pharmacy inventory, dental odontograms, medical clearance generation (Excluded to maintain strict Appointment System boundaries).

