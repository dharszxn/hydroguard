@echo off
echo ====================================================================
echo        HYDROGUARD: Industrial Hydraulic Oil Monitoring Platform
echo            Sakthi Hackathon 2.0 (Team InnoX - PS-021)
echo ====================================================================
echo.
echo Launching Backend server at http://localhost:8000 ...
start "HYDROGUARD Backend" cmd /k "%~dp0run_backend.bat"
timeout /t 3 /nobreak >nul
echo Launching Frontend application at http://localhost:5173 ...
start "HYDROGUARD Frontend" cmd /k "%~dp0run_frontend.bat"
echo.
echo Both services launched!
echo Open http://localhost:5173 in your browser.
pause
