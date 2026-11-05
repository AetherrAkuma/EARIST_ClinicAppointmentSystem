# Clinic Appointment Security, Anti-Spam & Outsider Mitigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-optimized:subagent-driven-development (recommended) or superpowers-optimized:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the public clinic appointment system against bots, non-campus outsiders, slot hoarding, and PII scraping via 6-digit Email OTP verification, max 3 active booking limits per ID, server-signed HMAC challenges, rate limiting, and privacy masking.
**Architecture:** New SQLite table `email_verifications` in `db.js`, new security endpoints in `appointment.routes.js`, email OTP generator in `email.service.js`, rate limiting middleware in `server.js`, and an interactive verification step in `DirectBookingWizard.jsx`.
**Tech Stack:** Node.js, Express, `node:sqlite`, crypto, Nodemailer, React (Vite), Tailwind CSS.
**Spec:** `docs/specs/2026-11-05-clinic-security-and-anti-spam-design.md`
**Assumptions:** Assumes Node.js v22+ with `node:sqlite` DatabaseSync is active.

## Global Constraints

- Institutional EARIST color scheme: Crimson `#800020`, dark `#580016`, amber `#D97706`.
- Touch targets must remain at least 44px (`py-2.5 sm:py-3 px-4`).
- All SQLite modifications must be non-destructive.
- Max 3 active appointments per student/personnel ID number.
- OTP valid for 10 minutes; max 3 verification attempts per OTP.

## Review Focus

1. **OTP Email Bombing:** Ensure an IP or email address cannot request more than 3 OTPs within 10 minutes.
2. **Expired OTP Usage:** Ensure expired or already-used OTP codes cannot be reused to commit an appointment.
3. **Active Booking Cap:** Ensure attempting a 4th active appointment for the same ID number returns a clear, user-friendly 403 error.
4. **Data Privacy Masking:** Ensure public queries to `/track/:reference` never leak full phone numbers or email addresses unless requested with a valid doctor/admin JWT token.
5. **HMAC Anti-Bot Challenge:** Ensure altering challenge parameters or submitting random answers fails with 400 spam rejection.

---

### Task 1: Database Migration for Email Verifications Table

**Files:**

- Modify: `backend/src/config/db.js`
- Test: `test_db_security.js`

**Interfaces:**

- Consumes: `getDb()`
- Produces: `email_verifications` table with indexes

- [x] **Step 1: Write verification script `test_db_security.js`**
      Verify table creation, insert of test OTP record, expiration queries, and cleanup.
- [x] **Step 2: Update `backend/src/config/db.js`**
      Add `CREATE TABLE IF NOT EXISTS email_verifications` with indexes.
- [x] **Step 3: Run verification script**
      Run `node test_db_security.js` and verify all tests pass. Clean up test file.

---

### Task 2: Backend Security Endpoints — OTP Dispatch, Active Booking Cap & Server-Signed Challenge

**Files:**

- Modify: `backend/src/services/email.service.js`
- Modify: `backend/src/routes/appointment.routes.js`
- Test: `test_appointment_security_routes.js`

**Interfaces:**

- Consumes: `getDb()`, `nodemailer`, `crypto`
- Produces:
  - `sendOtpVerificationEmail(email, otpCode)`
  - `POST /api/appointments/send-otp`
  - `GET /api/appointments/security-challenge`
  - Enforced max-3 active appointments in `POST /public-book`
  - Enforced OTP verification check in `POST /public-book`
  - PII masking in `GET /api/appointments/track/:reference`

- [x] **Step 1: Write integration tests `test_appointment_security_routes.js`**
      Test sending OTP, verifying OTP, blocking 4th active appointment, and verifying PII masking for unauthenticated users.
- [x] **Step 2: Implement `sendOtpVerificationEmail` in `email.service.js`**
      Create official EARIST template with security notice and 6-digit code.
- [x] **Step 3: Implement endpoints in `appointment.routes.js`**
      Implement `/send-otp`, `/security-challenge`, PII masking in `/track/:reference`, and enforce OTP and active appointment caps in `/public-book`.
- [x] **Step 4: Run integration test**
      Run `node test_appointment_security_routes.js` and verify. Clean up test file.

---

### Task 3: In-Memory Sliding-Window Rate Limiter Middleware

**Files:**

- Create: `backend/src/middleware/rateLimiter.js`
- Modify: `backend/src/server.js`

**Interfaces:**

- Produces: Flexible Express middleware `createRateLimiter({ windowMs, maxRequests, message })`

- [x] **Step 1: Implement `rateLimiter.js`**
      Build in-memory sliding window rate limiter without external dependencies.
- [x] **Step 2: Attach to sensitive endpoints in `server.js` or `appointment.routes.js`**
      Apply 3/10min on `/send-otp`, 5/hour on `/public-book`, and 20/5min on `/track`.

---

### Task 4: Frontend OTP Verification & Bot Challenge in Direct Booking Wizard

**Files:**

- Modify: `frontend/src/components/patient/DirectBookingWizard.jsx`

**Interfaces:**

- Consumes: `/api/appointments/send-otp`, `/api/appointments/security-challenge`
- Produces:
  - Email verification step with 6-digit code entry, countdown timer, and "Resend Code" button.
  - Server-signed HMAC challenge fetching.

- [x] **Step 1: Update `DirectBookingWizard.jsx`**
      Add OTP verification interface before final booking submission. Show clean countdown timer (60s cooldown for resend) and verification status checkmark.
- [x] **Step 2: Verify component in browser / test harness**
      Verify that booking without OTP is rejected, and with valid OTP proceeds to confirmation pass.

---

### Task 5: End-to-End Security Verification & Build

**Files:**

- Test: `test_e2e_security_verification.js`

- [x] **Step 1: Run comprehensive security verification**
      Verify OTP generation, OTP expiry, invalid OTP rejection, cap at 3 active appointments, rate limiting, and PII masking.
- [x] **Step 2: Run frontend build**
      Ensure `npm run build` passes with zero errors.
