@echo off
title TrustVault All-in-One Launcher
color 0A

echo ====================================================
echo        TrustVault - Secure Document Platform
echo ====================================================
echo.

cd /d "%~dp0"

echo [1/3] Checking requirements...
if not exist ".venv\Scripts\python.exe" (
    color 0C
    echo [ERROR] Python environment not found at .venv\Scripts\python.exe
    pause
    exit /b 1
)

if not exist "frontend\node_modules" (
    color 0C
    echo [ERROR] frontend\node_modules not found.
    pause
    exit /b 1
)

echo [2/3] Launching Backend server in a separate window...
start "TrustVault Backend" cmd /k "title TrustVault Backend ^& cd /d "%~dp0" ^& .venv\Scripts\python.exe run_backend.py"

powershell -NoProfile -Command "Start-Sleep -Seconds 3"

echo [3/3] Launching Frontend server in a separate window...
start "TrustVault Frontend" cmd /k "title TrustVault Frontend ^& cd /d "%~dp0frontend" ^& npm run dev"

powershell -NoProfile -Command "Start-Sleep -Seconds 4"

echo Opening browser at http://localhost:5173/login ...
start http://localhost:5173/login

echo.
echo ====================================================
echo   SUCCESS! TrustVault servers have been started.
echo ====================================================
echo.
echo   Frontend: http://localhost:5173/login
echo   Backend:  http://localhost:8000
echo   API Docs: http://localhost:8000/docs
echo.
echo   Demo Logins:
echo     Admin:  admin@trustvault.com       / AdminPass123!
echo     Owner:  alice.owner@trustvault.com / AlicePass123!
echo     Viewer: bob.viewer@trustvault.com  / BobPass123!
echo.
echo   KEEP THE TWO BLACK SERVER WINDOWS OPEN!
echo ====================================================
echo.
pause
