# Over-The-Air (OTA) System Updates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-optimized:subagent-driven-development (recommended) or superpowers-optimized:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a complete Over-The-Air (OTA) update system allowing administrators to check, preview, and apply updates from the GitHub remote repository with automatic SQLite backup, plus real-time client-side update notifications across all active user sessions.  
**Architecture:** A backend updater service executes git remote operations, working-tree safety checks, timestamped SQLite database backups, and frontend asset builds. Express system routes expose public version polling and protected admin update endpoints. A React hook monitors server version changes and presents a floating reload banner, while the Admin Dashboard features an interactive update management panel with commit changelog previews.  
**Tech Stack:** Node.js, Express, child_process (`git`), SQLite (`node:sqlite`), React, Tailwind CSS, Lucide Icons, Vite.  
**Spec:** `docs/specs/2026-11-03-ota-updates-design.md`  
**Assumptions:** Assumes the host environment has Git installed and connected to remote `origin/master`. Will NOT force-overwrite if local tracked files have uncommitted merge conflicts.

## Global Constraints
- Database backups must always occur *before* executing git pulls or migrations.
- Working tree must be verified for uncommitted changes (`git status --porcelain`) prior to pulling.
- Public endpoint `/api/system/version` must set `Cache-Control: no-cache, no-store, must-revalidate`.
- Admin update operations must be guarded with an in-memory concurrency lock (`isUpdating = true`).
- Institutional styling (#800020 maroon, slate borders, no AI glow orbs) must be maintained.

## Review Focus
1. `git fetch origin master` fails due to network outage -> Gracefully returns offline error without crashing.
2. Concurrent clicks on "Apply Update" -> Mutex lock returns 409 Conflict for secondary requests.
3. Database backup directory `backend/backups` does not exist -> Automatically created with recursive directory creation.
4. Active client consultation in progress when update banner appears -> Banner remains non-modal and dismissable so doctor/patient flow is never interrupted.

---

### Task 1: Backend System Version & Updater Service

**Files:**
- Create: `backend/src/services/updater.service.js`
- Test: `test_updater_service.js`

**Interfaces:**
- Consumes: `child_process.exec`, `fs`, `path`, SQLite database path.
- Produces:
  - `getCurrentVersion(): Promise<{ commitHash: string, shortHash: string, commitDate: string, branch: string, version: string }>`
  - `checkForUpdates(): Promise<{ updateAvailable: boolean, commitsBehind: number, currentCommit: string, remoteCommit: string, isDirty: boolean, changelog: Array<{ hash: string, author: string, date: string, message: string }> }>`
  - `applyUpdate(): Promise<{ success: boolean, backupPath: string, output: string }>`

**Security flag:** `security` (executes controlled system commands and database backups).

- [ ] **Step 1: Write test for Updater Service**
  Create `test_updater_service.js` testing `getCurrentVersion` and `checkForUpdates` parsing.
- [ ] **Step 2: Implement `backend/src/services/updater.service.js`**
  Implement git command wrappers, safety checks, automatic backup directory creation (`backend/backups`), and update orchestrator with mutex locking.
- [ ] **Step 3: Run test script and verify**
  Run `node test_updater_service.js` and verify output. Clean up test file.

---

### Task 2: Backend System API Routes

**Files:**
- Create: `backend/src/routes/system.routes.js`
- Modify: `backend/src/server.js`
- Test: `test_system_routes.js`

**Interfaces:**
- Consumes: `updater.service.js`, `authenticateToken`, `requireRole(['admin'])`.
- Produces:
  - `GET /api/system/version` -> Public, returns version & commit.
  - `GET /api/system/check-updates` -> Admin only, returns update status & changelog.
  - `POST /api/system/apply-update` -> Admin only, executes update with backup.

**Security flag:** `security` (enforces admin token for update checks and executions).

- [ ] **Step 1: Write route integration test**
  Verify public access for `/version` and role restriction (401/403 for non-admin) on `/check-updates` and `/apply-update`.
- [ ] **Step 2: Implement `backend/src/routes/system.routes.js`**
  Add endpoints and register with Express in `backend/src/server.js` under `/api/system`.
- [ ] **Step 3: Run integration test and verify**
  Run `node test_system_routes.js` and verify status codes and responses. Clean up test file.

---

### Task 3: Client Version Monitor Hook & Floating Update Banner

**Files:**
- Create: `frontend/src/hooks/useSystemVersion.js`
- Create: `frontend/src/components/common/UpdateBanner.jsx`
- Modify: `frontend/src/App.jsx`

**Interfaces:**
- Consumes: `/api/system/version`.
- Produces: `UpdateBanner` component mounted globally in `App.jsx`.

**Security flag:** `none`.

- [ ] **Step 1: Implement `useSystemVersion` hook**
  Queries `/api/system/version` on mount and every 60 seconds. Compares initial commit hash with current server hash.
- [ ] **Step 2: Implement `UpdateBanner` component**
  Fixed high-contrast top banner with "Reload Now" (cache-busting `window.location.reload(true)`) and "Dismiss" buttons.
- [ ] **Step 3: Mount `UpdateBanner` in `App.jsx`**
  Ensure it renders smoothly across all pages without clipping navigation headers.

---

### Task 4: Admin Dashboard System Updates & OTA Panel

**Files:**
- Modify: `frontend/src/pages/AdminDashboard.jsx`

**Interfaces:**
- Consumes: `/api/system/check-updates`, `/api/system/apply-update`, `useAuth`.
- Produces: System Updates card & modal in Admin Dashboard.

**Security flag:** `none`.

- [ ] **Step 1: Add Updates & Maintenance state in `AdminDashboard.jsx`**
  Add state for update checking status, pending changelog, update execution progress, and error handling.
- [ ] **Step 2: Build System Updates & Maintenance Card / Section**
  Display current version badge, commit hash, branch, last checked time, and "Check for Updates" button.
- [ ] **Step 3: Build Update Preview & Execution Modal**
  Show incoming commit changelog, pre-update backup reassurance, "Apply Update Now" trigger, and live stepper for update execution.

---

### Task 5: End-to-End Build & Verification

**Files:**
- All modified files.

**Interfaces:**
- Full system execution.

- [ ] **Step 1: Run Backend Verification**
  Test `/api/system/version` and `/api/system/check-updates` using authenticated test script.
- [ ] **Step 2: Run Frontend Production Build**
  Run `npm --prefix frontend run build` to confirm zero JSX/bundle errors.
- [ ] **Step 3: Verify clean working directory**
  Check `git status` and ensure all test scripts are cleaned up.

