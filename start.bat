@echo off
cd /d "%~dp0EARIST Clinic Appointment System"
if exist "start.bat" (
    call "start.bat"
) else (
    echo [FAIL] EARIST Clinic Appointment System\start.bat not found.
    pause
)
