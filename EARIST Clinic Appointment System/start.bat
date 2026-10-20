@echo off
setlocal EnableDelayedExpansion

title EARIST-Manila Clinic Appointment System - Startup Launcher
chcp 65001 >nul 2>&1
cd /d "%~dp0"

cls
echo ==============================================================================
echo       EULOGIO AMANG RODRIGUEZ INSTITUTE OF SCIENCE AND TECHNOLOGY
echo               EARIST-MANILA CAMPUS HEALTH SERVICES PORTAL
echo                   Full-Stack Automated Startup Script
echo ==============================================================================
echo.

:: 1. Verify Node.js Prerequisite
echo [i] Checking Node.js environment...
where node >nul 2>&1
if !ERRORLEVEL! NEQ 0 (
    echo [FAIL] Node.js is not found on your system!
    echo Please install Node.js v18 or higher from https://nodejs.org
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do set "NODE_VER=%%v"
echo [OK] Node.js detected: !NODE_VER!

:: 2. Verify npm Prerequisite
where npm >nul 2>&1
if !ERRORLEVEL! NEQ 0 (
    echo [FAIL] npm is not found on your system!
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('npm -v') do set "NPM_VER=%%v"
echo [OK] npm detected: v!NPM_VER!

:: 3. Check and Auto-Install Backend Dependencies
echo.
echo [i] Checking backend dependencies...
if not exist "backend\node_modules" (
    echo [!] Backend node_modules not found. Installing dependencies...
    cd backend
    call npm install
    cd ..
) else (
    echo [OK] Backend dependencies verified.
)

:: 4. Check and Auto-Install Frontend Dependencies
echo [i] Checking frontend dependencies...
if not exist "frontend\node_modules" (
    echo [!] Frontend node_modules not found. Installing dependencies...
    cd frontend
    call npm install
    cd ..
) else (
    echo [OK] Frontend dependencies verified.
)

:: 5. Initialize / Seed SQLite Database
echo.
echo [i] Checking EARIST clinic database...
cd backend
call node src/config/seed.js
cd ..

:: 6. Display Credentials Cheat Sheet
echo.
echo +----------------------------------------------------------------------------+
echo ^|                     EARIST CLINIC ACCESS CHEAT SHEET                       ^|
echo +----------------------------------------------------------------------------+
echo ^|  STUDENTS, FACULTY ^& STAFF:                                                ^|
echo ^|    * No account or login required!                                         ^|
echo ^|    * Direct booking wizard with multi-stage triage ^& anti-bot filter        ^|
echo ^|    * Instant printable ticket pass ^& reference tracking code              ^|
echo ^|                                                                            ^|
echo ^|  STAFF PORTAL LOGIN (Password: password123):                               ^|
echo ^|    * Doctor (General Physician): dr.bob@earist.edu.ph                      ^|
echo ^|    * Dentist (Dental Wing):      dr.alice@earist.edu.ph                    ^|
echo ^|    * Clinic Administrator:       admin@earist.edu.ph                       ^|
echo +----------------------------------------------------------------------------+
echo.

:: 7. Launch Backend Server in Separate Window (with Nodemon Live Watch)
echo [i] Starting Backend REST API Server with Nodemon auto-reload on port 5000...
start "EARIST Clinic - Backend API (Nodemon Auto-Reload)" cmd /k "cd /d "%~dp0backend" && npm run dev"

:: 8. Launch Frontend Vite Server in Separate Window
echo [i] Starting Frontend Vite Web App on port 5173...
start "EARIST Clinic - Frontend Vite" cmd /k "cd /d "%~dp0frontend" && npm run dev"

:: 9. Open Browser after brief initialization
echo [i] Launching browser: http://localhost:5173
start "" powershell -NoProfile -Command "Start-Sleep -Seconds 2; Start-Process 'http://localhost:5173'"

echo.
echo ==============================================================================
echo   APPLICATION RUNNING!
echo   Frontend Web Portal:  http://localhost:5173
echo   Backend REST API:     http://localhost:5000/api/health
echo ==============================================================================
echo.
echo Keep the backend and frontend terminal windows open while using the system.
echo Press any key to close this launcher window.
pause >nul
