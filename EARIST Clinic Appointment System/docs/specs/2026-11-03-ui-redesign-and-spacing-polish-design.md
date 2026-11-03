# EARIST Clinic Appointment System — UI Redesign, Spacing Polish & Logsheet Alignment

- **Date:** 2026-11-03
- **Topic:** UI Overhaul, Spacing Expansion, Elimination of AI Elements, and Alignment with the Official EARIST "Daily Clinic Visit Logsheet"
- **Status:** Approved Design Specification

---

## 1. Overview & Institutional Context

This specification establishes a clean, professional, and spacious user interface for the **EARIST Manila Campus Health Services Portal** (Eulogio "Amang" Rodriguez Institute of Science and Technology).

It directly addresses:
1. **Uncomfortable / Cramped Spacing**: Expanding header height to `h-20` (80px), increasing container paddings (`p-6` to `p-8`), expanding modal boundaries, and enlarging table cell spacing.
2. **AI Cliché Removal**: Eliminating glowing blur spheres (`blur-3xl`), generic sparkles icons (`Sparkles`), continuous pulsing badges, artificial gradient texts, and heavy glassmorphism (`glass-maroon`).
3. **Typographic Proportions**: Upgrading micro-text (`text-[10px]`, `text-[11px]`) to comfortable standard scales (`text-xs` for tags, `text-sm` for inputs/labels, `text-base` for descriptions, `text-2xl`–`text-4xl` for headers).
4. **Physical Logbook Alignment**: Digitizing the exact columns and visitor categories of the official **"Daily Clinic Visit Logsheet"** used at the EARIST campus clinic.

---

## 2. Institutional Logsheet Mapping

The EARIST clinic's physical record is the **Daily Clinic Visit Logsheet**, with three categories of visitors:
1. **Students**
2. **Outsource / Extension** (contractual, security, janitorial, maintenance, extension units, external visitors)
3. **Academic / Non-Academic** (faculty, administrative staff, campus personnel)

### Standard Logsheet Columns
| Logsheet Column | Digital System Equivalent | Meaning & Context |
| :--- | :--- | :--- |
| **Date** | `appointment_date` | Date of visit / consultation |
| **Time** | `time_slot` | Scheduled or walk-in triage time |
| **Name** | `patient_name` | Full name of patient / visitor |
| **Category** | `patient_type` | `student`, `academic_non_academic`, `outsource_extension` |
| **Department** | `department` | College, Administrative Unit, or Outsource Agency |
| **Complaints** | `symptoms` / `reason` | Symptoms felt (fever, toothache) or requests (BP check, facemask, medical clearance) |
| **Management** | `diagnosis` & `prescription` | Interventions done, vitals taken, and meds dispensed (e.g. Celecoxib, Mefenamic, BP reading) |
| **Attended By** | `doctor_name` (`first_name` + `last_name`) | Attending Medical Officer / Doctor / Clinic Nurse |
| **Signature** | `reference_code` + `status` | Verified check-in ticket & consultation completion signature |

---

## 3. Design System & Visual Architecture

### 3.1 Colors & Surfaces
- **Primary EARIST Crimson**: `#800020`
- **EARIST Dark Maroon**: `#580016`
- **EARIST Gold / Amber**: `#D97706` / `#F59E0B`
- **Card Surfaces**: Clean `#FFFFFF` with `border-slate-200` and subtle elevation (`shadow-xs` / `shadow-sm`).
- **Removed**: Neon ambient glow orbs (`blur-3xl`), heavy blurred translucent overlays, rainbow text gradients.

### 3.2 Spacing & Proportions
- **Header / Navbar**: `h-20` (80px), with generous horizontal padding (`px-4 sm:px-6 lg:px-8`).
- **Input Fields**: Standard `44px` height (`py-2.5 sm:py-3 px-3.5 sm:px-4 text-sm`), rounded-xl, high contrast border `border-slate-300 focus:border-earist-crimson focus:ring-2 focus:ring-earist-crimson/20`.
- **Buttons**: Minimum `44px` touch targets (`py-2.5 sm:py-3 px-5 sm:px-6`), bold text, clear focus rings.
- **Card & Section Padding**: Upgraded from cramped `p-4`/`p-5` to generous `p-6 sm:p-8`.

---

## 4. Component Redesign Specifications

### 4.1 Global Navigation (`Navbar.jsx`)
- Height set to `h-20` (80px).
- Solid institutional EARIST Clinic emblem (`w-12 h-12 rounded-xl earist-gradient flex items-center justify-center shadow-xs`).
- Brand title: `EARIST CLINIC` with `Manila Campus` badge and subtitle `Health & Wellness Services • Nagtahan, Sampaloc`.
- Action buttons:
  - Primary button: "Book Appointment" (solid maroon button with `CalendarCheck` icon, removing AI `Sparkles`).
  - Secondary button: "Track Ticket" (clean outline button).
  - Staff Portal: Crisp badge link.
  - Authenticated User badge: Role pill (Admin / Medical Staff / Patient), clear staff name, and spacious logout action.

### 4.2 Landing Page (`LandingPage.jsx`)
- **Hero Section**:
  - Spacious two-column layout free of background blur orbs.
  - Strong, high-contrast dark heading with EARIST Crimson accent.
  - Institutional Quick-Info Card: Solid deep maroon card (`bg-[#800020] text-white p-7 rounded-2xl`) displaying clinic operating hours, priority triage, and emergency campus hotline.
- **Services Grid**:
  - Generous card padding (`p-6 sm:p-7`).
  - Authentic clinical icons (`Stethoscope`, `HeartPulse`, `Award`, `Activity`).
  - Clear service descriptions aligned with EARIST campus operations (General Triage, Dental Care, Physical Clearances, First Aid).

### 4.3 Direct Booking Wizard (`DirectBookingWizard.jsx`)
- **Step 1: Patient Classification (Aligined with Logsheet)**
  - 🎓 **Student**: Student ID Number, College & Course, Year & Section.
  - 🏛️ **Academic / Non-Academic**: Employee ID Number, Department / Office (Faculty / Administrative Staff).
  - 🏢 **Outsource / Extension**: Personnel ID / Name, Unit / Agency (Security, Janitorial, Maintenance, Extension Campus, Guest).
- **Step 2: Complaints & Visit Type**
  - "Complaints / Reason for Visit": Clear input and categorized quick-select tags:
    - *Student Complaints*: Fever, Headache, Stomach ache, Toothache, Cough/Colds, First-aid, Clearance.
    - *Academic/Non-Academic Requests*: BP check, Facemask request, Over-the-counter medicine, Medical clearance, Routine checkup.
    - *Outsource/Extension*: First-aid treatment, Vital signs check, General medical consultation.
- **Step 3: Attending Medical Staff & Time Slot Selection**
  - Generous doctor cards with clear specialization and room number.
  - Time slot grid with 44px pill buttons and clear availability feedback.
- **Step 4: Review & Digital Confirmation**
  - Clear summary matching the logsheet entries.
  - Print/Save ticket pass with high-contrast Reference Code and QR/Barcode-style reference display.

### 4.4 Ticket Tracking Modal (`TrackAppointmentModal.jsx`)
- Spacious input for Reference Code / ID Number.
- Clean display of ticket status, scheduled time, complaints filed, and attending doctor.

### 4.5 Doctor & Admin Dashboards (`DoctorDashboard.jsx`, `AdminDashboard.jsx`)
- **Header Banners**: Solid, clean institutional header card with On-Duty / Off-Duty toggle.
- **Daily Clinic Visit Logsheet Table**:
  - Filter tabs: `All Visits` | `Students` | `Academic / Non-Academic` | `Outsource / Extension`.
  - Table columns matching the official paper sheet:
    `Time` | `Date` | `Patient Name` | `Category` | `Department` | `Complaints` | `Management` | `Attended By` | `Status / Signature`
  - High-density yet spacious row padding (`py-4 px-6`, `text-sm`).
- **Doctor Consultation Drawer / Modal**:
  - Form fields aligned with logbook:
    - **Complaints (Reported by Patient)**: Read-only summary.
    - **Management & Interventions**: Diagnosis, Treatment given, and Prescribed medications (e.g. Celecoxib, Mefenamic, BP readings, Rest instructions).
    - **Attended By**: Auto-filled with logged-in doctor/nurse name.
- **Admin CSV Export**:
  - Updates CSV export format to match the official **Daily Clinic Visit Logsheet** columns for institutional campus reporting.

---

## 5. Backend Schema & Route Support

1. **Database Schema (`appointments` table)**:
   - Ensure `patient_type` supports `'student'`, `'faculty_staff'`, `'academic_non_academic'`, `'outsource_extension'`.
2. **Export Route (`/api/admin/export`)**:
   - Update header and row columns to:
     `Date`, `Time`, `Reference Code`, `Patient Name`, `Category`, `Department`, `ID Number`, `Course/Year`, `Complaints`, `Management (Diagnosis & Prescription)`, `Attended By`, `Status`.

---

## 6. Implementation & Verification Plan
1. Update database check constraints and helper mappings for the 3 logsheet categories.
2. Update global styles in `index.css` (remove AI glows/blurs, define solid elevation classes).
3. Redesign `Navbar.jsx` with generous `h-20` spacing, improved brand typography, and clean action buttons.
4. Redesign `LandingPage.jsx` with high-contrast copy, solid quick-info card, and spacious service cards.
5. Upgrade `Modal.jsx` and `DirectBookingWizard.jsx` with the 3 logsheet categories, context-aware complaints/requests, and spacious form ergonomics.
6. Enhance `DoctorDashboard.jsx` and `AdminDashboard.jsx` to render the official **Daily Clinic Visit Logsheet** table with category filtering and management entry.
7. Update CSV export in `admin.routes.js` to match the exact logsheet format.
8. Verify Vite build (`npm run build`) and test all flows end-to-end.
