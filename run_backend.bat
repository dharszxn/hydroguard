@echo off
cd /d "%~dp0backend"
echo Starting HYDROGUARD Backend (FastAPI + SQLAlchemy + WebSockets)...
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
