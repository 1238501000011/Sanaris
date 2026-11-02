@echo off
setlocal
cd /d "%~dp0"
if errorlevel 1 goto failed

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js is not installed or is not on PATH.
  echo Install Node.js 24 LTS from https://nodejs.org/ and reopen this launcher.
  goto failed
)
node scripts/check-runtime.mjs
if errorlevel 1 goto failed

echo SANARIS admin: http://127.0.0.1:5173/#/admin/overview
echo Resident reporting: http://127.0.0.1:5173/resident/#/report
echo Starting SANARIS or finding its existing server...
if /I "%~1"=="--no-open" (
  node scripts/dev.mjs
) else (
  node scripts/dev.mjs --open
)
if errorlevel 1 goto failed
exit /b 0

:failed
echo.
echo SANARIS could not start. Check the message above.
echo If port 5173 is already in use by SANARIS, open http://127.0.0.1:5173/.
echo If another application owns that port, stop it before starting SANARIS.
if /I not "%~1"=="--no-open" pause
exit /b 1
