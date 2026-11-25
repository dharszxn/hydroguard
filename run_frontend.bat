@echo off
cd /d "%~dp0frontend"
echo Starting HYDROGUARD Frontend (React 19 + TypeScript + Vite + Three.js)...
cmd /c npm.cmd run dev -- --host 0.0.0.0 --port 5173
