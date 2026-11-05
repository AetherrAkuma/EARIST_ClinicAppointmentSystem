# Design Spec: Over-The-Air (OTA) System Updates

## 1. Overview & Objectives
The EARIST Clinic Appointment System requires an integrated Over-The-Air (OTA) update system allowing clinic administrators to verify, preview, and apply updates directly from the GitHub remote repository (`master` branch). In addition, all active client sessions (patient booking kiosks, doctor consultation terminals, and admin panels) must detect newly deployed versions in real time and prompt users to reload without data loss or cache lag.

## 2. Architecture & Subsystems

### A. Version Identification & State
- **Source of Truth:** Git `HEAD` commit hash, branch, and timestamp.
- **Client Metadata:** Client bundles embed a build-time version identifier (`__APP_VERSION__` or `/api/system/version`).
- **Endpoint:** `GET /api/system/version`
  - Returns: `{ version, commitHash, commitDate, branch, nodeEnv }`
  - Publicly accessible with aggressive caching prevention (`Cache-Control: no-cache, no-store, must-revalidate`).

### B. Backend Updater Service (`backend/src/services/updater.service.js`)
1. **Check For Updates (`GET /api/system/check-updates`):**
   - Protected: Admin only (`requireRole(['admin'])`).
   - Fetches remote updates: `git fetch origin master --quiet`.
   - Counts commits behind: `git rev-list --count HEAD..origin/master`.
   - Parses pending commit messages: `git log HEAD..origin/master --pretty=format:"%h%x09%an%x09%ad%x09%s" --date=short`.
   - Checks local working tree status: `git status --porcelain`.
   - Returns:
     ```json
     {
       "success": true,
       "updateAvailable": true,
       "currentCommit": "a1b2c3d",
       "targetCommit": "e4f5a6b",
       "commitsBehind": 3,
       "isDirty": false,
       "changelog": [
         { "hash": "e4f5a6b", "author": "dev", "date": "2026-11-03", "message": "feat: logsheet export" }
       ]
     }
     ```

2. **Apply Update (`POST /api/system/apply-update`):**
   - Protected: Admin only with mutual exclusion lock (`isUpdating` flag) to prevent concurrent executions.
   - **Step 1: Safety & Backup:**
     - Creates a snapshot copy of SQLite database `backend/earist_clinic.db` into `backend/backups/earist_clinic_pre_update_<timestamp>.db`.
   - **Step 2: Code Pull:**
     - Executes `git pull origin master`.
   - **Step 3: Dependency Resolution (Conditional):**
     - Checks if `package.json` was touched. If so, runs `npm install --prefix backend` or `--prefix frontend`.
   - **Step 4: Frontend Rebuild:**
     - Runs `npm --prefix frontend run build`.
   - **Step 5: Database Migration:**
     - Triggers standard schema auto-migration (`db.js`).
   - **Step 6: Completion & Reload:**
     - Sends response with success status and triggers process reload or signals readiness.

### C. Client-Side Live Version Sync (`frontend/src/hooks/useSystemVersion.js`)
- React custom hook that polls `/api/system/version` every 60 seconds (and on window focus).
- Compares initial version on page load with server version.
- When mismatch detected, sets `updateAvailable: true` and exposes `reloadApp()`.

### D. Floating Client Update Banner (`frontend/src/components/common/UpdateBanner.jsx`)
- Rendered in `App.jsx` at the top level.
- High-contrast institutional banner:
  - Text: *"A new system update (commit {shortHash}) has been deployed."*
  - Buttons: **"Reload & Update"** (executes cache-busting reload) and **"Dismiss"**.

### E. Admin Dashboard OTA Panel (`frontend/src/pages/AdminDashboard.jsx`)
- New Dedicated Tab: **"System Updates & OTA"** (or expandable card).
- Shows Current System Version, Git Commit, Branch, and Last Checked timestamp.
- **"Check for Updates" Button**: Queries `/api/system/check-updates`.
- **Changelog Modal / Box**: Lists incoming commits with date, author, and description.
- **"Apply Update Now" Action**:
  - Shows safety dialog noting DB backup and rebuild.
  - Live execution status stepper:
    - [x] Database snapshot created
    - [x] Pulling latest code from origin/master
    - [x] Building frontend assets
    - [x] System successfully updated
  - Prompts admin to refresh.

## 3. Failure Mode Analysis & Defenses
1. **Dirty Working Tree Conflict:**
   - *Failure:* Local code changes on host prevent clean `git pull`.
   - *Defense:* Pre-flight check detects changes using `git status --porcelain`. Update stops immediately with an alert to commit or stash local edits first.
2. **Build Failure During Update:**
   - *Failure:* Compilation failure leaves `frontend/dist` corrupted.
   - *Defense:* The backend serves from `dist`. If `vite build` returns non-zero, the update aborts, keeps the existing `dist`, and logs the error without taking the server down.
3. **Database Corruption:**
   - *Defense:* SQLite is backed up to `backend/backups/` *before* code pull or migration.

## 4. Isolation & Minimal Blast Radius
- The updater runs within a standalone service `backend/src/services/updater.service.js` and dedicated routes `backend/src/routes/system.routes.js`.
- It does not modify existing clinic appointment business logic.

