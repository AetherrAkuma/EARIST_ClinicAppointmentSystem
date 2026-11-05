# EARIST Clinic Portal — UI Redesign, Spacing Polish & Logsheet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-optimized:subagent-driven-development (recommended) or superpowers-optimized:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the EARIST Clinic Appointment System into a spacious, institutional academic healthcare portal free of AI design clichés, proportioned for high legibility, and aligned with the physical EARIST "Daily Clinic Visit Logsheet".
**Architecture:** Full-stack refinement across SQLite schema constraints, backend consultation/export routes, global CSS tokens, navigation header, patient booking wizard, ticket tracker, and doctor/admin dashboard logsheets.
**Tech Stack:** React (Vite, Tailwind CSS, Framer Motion, Lucide React), Node.js (Express, Node.js built-in `node:sqlite`).
**Spec:** `docs/specs/2026-11-03-ui-redesign-and-spacing-polish-design.md`
**Assumptions:** Assumes Node.js v22+ with `node:sqlite` DatabaseSync is active. Will NOT work if custom SQLite extensions are required.

## Global Constraints
- Navbar height must be standard 80px (`h-20`).
- Touch targets and input field heights must be at least 44px (`py-2.5 sm:py-3 px-4`).
- No AI visual clichés: zero background blur orbs (`blur-3xl`), zero sparkles icons (`Sparkles`), zero text gradient masking.
- Typography minimums: labels and body copy must not drop below 14px (`text-sm`), badges at least 12px (`text-xs`).
- Logsheet alignment: Support 3 visitor categories (`student`, `academic_non_academic`, `outsource_extension`) and standard logsheet columns (`Date`, `Time`, `Name`, `Category`, `Department`, `Complaints`, `Management`, `Attended By`, `Signature`).

## Review Focus
1. **Patient Type Compatibility**: Existing database records with `faculty_staff` must be gracefully treated as `academic_non_academic` without database crashes or missing records.
2. **Modal Viewport Boundaries**: Multi-step wizard on lower resolution displays (e.g. 1366x768) must remain fully reachable via internal scroll without clipping action buttons.
3. **CSV Export Encoding**: Special characters or commas in complaints/management fields must be properly escaped in quotes to prevent column shifting.
4. **Doctor Consultation Save**: Completing a consultation with diagnosis/prescription must correctly update management fields and show up in the Daily Clinic Visit Logsheet immediately.

---

### Task 1: Backend Schema & Logsheet Route Compatibility

**Files:**
- Modify: `backend/src/config/db.js`
- Modify: `backend/src/routes/appointment.routes.js`
- Modify: `backend/src/routes/admin.routes.js`

**Interfaces:**
- Consumes: Existing SQLite tables `appointments`, `users`, `assistants`.
- Produces: Updated database constraints accepting `academic_non_academic` and `outsource_extension`; updated CSV export matching the official Daily Clinic Visit Logsheet format.

**Security flag:** `none`

**Does NOT cover:** Does not alter user authentication roles (`admin`, `assistant`).

- [ ] **Step 1: Update SQLite schema in `backend/src/config/db.js`**
  Allow `patient_type` to accept `'student'`, `'faculty_staff'`, `'academic_non_academic'`, and `'outsource_extension'`.
- [ ] **Step 2: Update `backend/src/routes/appointment.routes.js`**
  Ensure appointment creation normalizes and validates patient types, maps complaints properly into symptoms/reason, and handles category queries.
- [ ] **Step 3: Update `backend/src/routes/admin.routes.js` export & metrics**
  Update `/api/admin/export` to format CSV header and rows according to the official EARIST **Daily Clinic Visit Logsheet**:
  `Ref Code`, `Date`, `Time`, `Patient Name`, `Category`, `Department`, `ID Number`, `Course/Year`, `Complaints`, `Management (Meds & Interventions)`, `Attended By`, `Status`.
- [ ] **Step 4: Verify backend syntax & database initialization**
  Run `node -e "require('./backend/src/config/db').getDb()"` to verify SQLite table integrity.

---

### Task 2: Global CSS & Tailwind Design Token Polish

**Files:**
- Modify: `frontend/src/index.css`
- Modify: `frontend/tailwind.config.js`

**Interfaces:**
- Consumes: Tailwind base, components, and utilities.
- Produces: Clean institutional color tokens (`earist-crimson: #800020`, `earist-dark: #580016`, `earist-gold: #F59E0B`, `earist-amber: #D97706`), solid elevation utilities (`institution-card`, `logsheet-table`), and removed glass/blur AI relics.

**Security flag:** `none`

- [ ] **Step 1: Clean `frontend/src/index.css`**
  Remove heavy translucent `glass-maroon` and `glass-panel` blur overlays and replace with clean, solid white card styles (`bg-white border border-slate-200 shadow-xs`), clean institutional maroon headers, and styled scrollbars.
- [ ] **Step 2: Update `frontend/tailwind.config.js`**
  Ensure spacing and height utilities include `h-20` (5rem / 80px) and clean border radiuses.
- [ ] **Step 3: Verify build**
  Run `npm --prefix frontend run build` to confirm no CSS compilation errors.

---

### Task 3: Header & Navigation Redesign (`Navbar.jsx`)

**Files:**
- Modify: `frontend/src/components/common/Navbar.jsx`

**Interfaces:**
- Consumes: `useAuth()`, `onNavigate`, `onOpenBooking`, `onOpenTrack`.
- Produces: 80px (`h-20`) spacious header with EARIST emblem, campus location subtitle, clean "Book Appointment" button with `CalendarCheck` icon (no sparkles), outline "Track Ticket" button, and user/doctor role pill.

**Security flag:** `none`

- [ ] **Step 1: Update container height & horizontal padding**
  Change navbar wrapper to `h-20` (80px) with `px-4 sm:px-6 lg:px-8`.
- [ ] **Step 2: Refine Brand Logo and Typography**
  Create solid EARIST emblem container (`w-12 h-12 rounded-xl earist-gradient flex items-center justify-center shadow-xs`).
  Set clear typography for `EARIST CLINIC` with `Manila Campus` badge and `Health & Wellness Services • Nagtahan, Sampaloc`.
- [ ] **Step 3: Remove AI Sparkles and Polish Action Buttons**
  Replace `Sparkles` icon with `CalendarCheck` on "Book Appointment".
  Style buttons with 44px touch targets (`py-2.5 px-4 sm:px-5`).
- [ ] **Step 4: Verify component in build**
  Run `npm --prefix frontend run build`.

---

### Task 4: Landing Page Redesign (`LandingPage.jsx` & `App.jsx`)

**Files:**
- Modify: `frontend/src/pages/LandingPage.jsx`
- Modify: `frontend/src/App.jsx`

**Interfaces:**
- Consumes: Navigation callbacks and booking/track modal triggers.
- Produces: Spacious, high-contrast institutional landing page with solid Quick-Info card, clean 4-service grid, and professional university footer.

**Security flag:** `none`

- [ ] **Step 1: Clean Hero Section in `LandingPage.jsx`**
  Remove background blur glow circles (`blur-3xl`).
  Use solid high-contrast dark text (`text-slate-900`) and EARIST Crimson accent.
  Increase spacing (`pt-16 pb-20 sm:pt-20 sm:pb-28`).
- [ ] **Step 2: Redesign Institutional Quick-Info Card**
  Replace blurry glass card with solid deep maroon card (`bg-[#800020] text-white p-7 sm:p-8 rounded-2xl shadow-md`).
  Display clear operating hours (8:00 AM – 5:00 PM), dental hours, and emergency campus hotline with high contrast.
- [ ] **Step 3: Redesign Clinical Services Grid**
  Expand card padding to `p-7`, use authentic healthcare icons (`Stethoscope`, `HeartPulse`, `Award`, `Activity`), and remove micro-badges.
- [ ] **Step 4: Refine Campus Footer in `App.jsx`**
  Ensure clean spacing, clear campus address in Nagtahan, Sampaloc, and official clinic trunkline.
- [ ] **Step 5: Verify build**
  Run `npm --prefix frontend run build`.

---

### Task 5: Modal Framing & Direct Booking Wizard with Daily Logsheet Alignment

**Files:**
- Modify: `frontend/src/components/common/Modal.jsx`
- Modify: `frontend/src/components/patient/DirectBookingWizard.jsx`
- Modify: `frontend/src/components/patient/TrackAppointmentModal.jsx`

**Interfaces:**
- Consumes: Doctor schedule APIs, booking creation endpoint.
- Produces: Ergonomic multi-step booking wizard with 3 logsheet categories (Students, Academic/Non-Academic, Outsource/Extension), context-aware complaints/requests, 44px input fields, and printable official consultation slip.

**Security flag:** `none`

- [ ] **Step 1: Upgrade `Modal.jsx` Framing**
  Expand modal header padding to `px-8 py-5`, body padding to `p-8 max-h-[78vh] overflow-y-auto`.
- [ ] **Step 2: Update Step 1 Classification in `DirectBookingWizard.jsx`**
  Provide 3 clear category cards:
  - 🎓 **Student** (Student ID, College & Course, Year/Section)
  - 🏛️ **Academic / Non-Academic** (Employee ID, Department/College Office)
  - 🏢 **Outsource / Extension** (Personnel ID/Name, Unit or Agency)
- [ ] **Step 3: Update Step 2 Complaints & Request Selection**
  Tailor quick-select tags by visitor category:
  - *Students*: Fever, Headache, Stomach ache, Toothache, Cough/Colds, First-Aid, Medical Clearance.
  - *Academic/Non-Academic*: Blood Pressure (BP) Monitoring, Facemask Request, OTC Medicine, Physical Exam Clearance.
  - *Outsource/Extension*: First-Aid Treatment, Vital Signs Check, General Consultation.
- [ ] **Step 4: Upgrade Form Ergonomics**
  Ensure all text inputs are minimum 44px (`py-3 px-4 text-sm rounded-xl border-slate-300`).
  Doctor selection and time slot pills sized with comfortable padding.
- [ ] **Step 5: Official Ticket Pass & Track Modal Polish**
  Design printable consultation slip with high-contrast Reference Code, full visitor details, and clear "Print Slip" / "Copy Code" actions.
  Update `TrackAppointmentModal.jsx` with generous spacing and logsheet alignment.
- [ ] **Step 6: Verify build**
  Run `npm --prefix frontend run build`.

---

### Task 6: Medical Staff & Admin Daily Clinic Visit Logsheets

**Files:**
- Modify: `frontend/src/pages/DoctorDashboard.jsx`
- Modify: `frontend/src/pages/AdminDashboard.jsx`

**Interfaces:**
- Consumes: `/api/appointments/queue`, `/api/admin/appointments`, `/api/admin/metrics`, `/api/admin/export`.
- Produces: Interactive **Daily Clinic Visit Logsheet** table with category tabs (All, Students, Academic/Non-Academic, Outsource/Extension), expanded row spacing (`py-4 px-6`), doctor consultation drawer with explicit Complaints summary and Management entry (medications dispensed, vitals), and CSV export.

**Security flag:** `none`

- [ ] **Step 1: Redesign Doctor Header & Queue in `DoctorDashboard.jsx`**
  Replace glass banner with solid institutional header and prominent Duty toggle.
  Render the **Daily Clinic Visit Logsheet** table view with filter tabs:
  `All Visits` | `Students` | `Academic / Non-Academic` | `Outsource / Extension`.
  Table columns: `Time` | `Date` | `Patient Name` | `Category` | `Department` | `Complaints` | `Management` | `Attended By` | `Status`.
- [ ] **Step 2: Enhance Doctor Consultation Drawer**
  Explicitly structure consultation inputs around logsheet management:
  - Patient Complaints (read-only)
  - Clinical Management & Intervention (e.g. "Celecoxib 200mg given, BP 120/80, 20 mins rest in clinic")
  - Prescription & Instructions
- [ ] **Step 3: Redesign Admin Consultation Logsheet & Export in `AdminDashboard.jsx`**
  Spacious metrics cards without blur glow effects.
  Daily Clinic Visit Logsheet table with category filtering and search.
  "Export Logsheet (CSV)" button generating the official EARIST clinic report format.
- [ ] **Step 4: Verify build**
  Run `npm --prefix frontend run build`.

---

### Task 7: Full System Verification & Regression Testing

**Files:**
- All modified files

**Security flag:** `none`

- [ ] **Step 1: Execute full production build**
  Run `npm --prefix frontend run build` to confirm zero lint or compilation errors.
- [ ] **Step 2: Verify responsive viewport layouts**
  Verify layout on mobile (375px), tablet (768px), and desktop (1280px+).
- [ ] **Step 3: Test direct booking & tracking end-to-end**
  Submit a test booking across each of the 3 visitor categories (Student, Academic/Non-Academic, Outsource/Extension) and verify that the ticket code tracks properly and appears in the Daily Clinic Visit Logsheet.

