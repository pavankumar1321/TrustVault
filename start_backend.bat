@echo off
title TrustVault Backend (Port 8000)
color 0B
cd /d "%~dp0"
echo ====================================================
echo   TrustVault Backend Server
echo   Running on: http://127.0.0.1:8000
echo   API Docs:   http://127.0.0.1:8000/docs
echo ====================================================
echo.
.venv\Scripts\python.exe run_backend.py
echo.
echo Backend stopped.
pause
