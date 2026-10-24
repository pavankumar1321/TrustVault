@echo off
title TrustVault Frontend (Port 5173)
color 0A
cd /d "%~dp0frontend"
echo ====================================================
echo   TrustVault Frontend Dev Server
echo   Running on: http://localhost:5173
echo ====================================================
echo.
npm run dev
echo.
echo Frontend stopped.
pause
