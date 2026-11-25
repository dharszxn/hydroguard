# HYDROGUARD
## Smart Detection and Monitoring of Hydraulic Oil and Oil Leakage
### Official Problem Statement: PS-021 (Sakthi Hackathon 2.0)
**Team Name:** InnoX  
**Theme:** Predictive Maintenance & Asset Reliability  
**Institution:** Sri Eshwar College of Engineering, Coimbatore

---

## 1. Executive Summary

**HYDROGUARD** is a software-only industrial monitoring platform that digitally simulates a zone-wise hydraulic oil and coolant leakage detection system. It provides an end-to-end industrial digital twin integrating:
- **Deterministic Rule-Based Persistence Detection Engine**: Rejects transient splashing, validates signal persistence (default 4.0s), and confirms real leaks.
- **Virtual Sensor & ESP32 Edge Node Simulation**: Simulates oil-compatible leak sensors, pressure gauges, temperature and flow transmitters, including Wi-Fi failure and local event buffering with sync.
- **Interactive 3D Hydraulic Machinery (Three.js / React Three Fiber)**: CAD-style digital twin with dynamic component highlighting for 6 monitoring zones.
- **SCADA Event Lifecycle Management**: Detected &rarr; Acknowledged &rarr; Under Investigation &rarr; Resolved &rarr; Closed.
- **Historical Telemetry, Detection Analytics, and Work Order Maintenance Management**.

*Important Note:* Throughout the platform, all sensor signals are software-simulated to fulfill the PS-021 digital twin objective without requiring physical PLCs or hardware test benches.

---

## 2. Monitored Machine & Zones Mapping (MCH-001)

| Zone ID | Zone Name | 3D CAD Component | Detection Threshold | Persistence Window | Severity |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ZONE-01** | Oil Reservoir | Hydraulic Fluid Tank & Sight Glass | 65.0% | 4.0s | HIGH |
| **ZONE-02** | Hydraulic Pump | Axial Piston Pump & Electric Drive Motor | 70.0% | 3.5s | CRITICAL |
| **ZONE-03** | Pressure Pipeline | High-Pressure Delivery Line & Flange Joint | 65.0% | 4.0s | CRITICAL |
| **ZONE-04** | Control Valve | Directional Subplate Valve Block & Solenoids | 60.0% | 4.0s | HIGH |
| **ZONE-05** | Hydraulic Cylinder | 500-Ton Press Actuator Cylinder & Piston | 65.0% | 4.0s | HIGH |
| **ZONE-06** | Oil Return Pipeline | Low-Pressure Return Line & Spin-on Filter | 60.0% | 5.0s | MEDIUM |

---

## 3. Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Ant Design (SCADA Enterprise UI), Tailwind CSS tokens, Lucide React, Three.js, React Three Fiber (`@react-three/fiber`), Drei (`@react-three/drei`), Axios.
- **Backend**: Python 3.10+, FastAPI, Pydantic, SQLAlchemy 2.0, WebSockets (`/ws`), Pandas, NumPy.
- **Database**: SQLite / PostgreSQL compatible SQLAlchemy ORM storing machines, zones, sensors, telemetry readings, leakage events, audit logs, and maintenance work orders.

---

## 4. Quick Start & Execution

### 1. Launch Services Automatically
Double-click `start_all.bat` or run:
```bash
start_all.bat
```

### 2. Manual Start (Separate Terminals)
**Backend (FastAPI on Port 8000):**
```bash
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
API Documentation available at: `http://localhost:8000/docs`

**Frontend (Vite on Port 5173):**
```bash
cd frontend
cmd /c npm.cmd run dev -- --host 0.0.0.0 --port 5173
```
Frontend Web Console available at: `http://localhost:5173`

---

## 5. Demonstration Evaluation Sequence (20-Step Guide)

For hackathon reviews and project evaluation, follow this sequence:

1. **Open Overview**: View fleet health summary, zone status indicators, and operational KPI panels.
2. **Navigate to 3D Machine View**: Examine the CAD digital twin with 6 distinct physical hydraulic components.
3. **Orbit & Pan**: Use left-click drag to orbit, right-click drag to pan, scroll wheel to zoom into pipe flanges and cylinder glands.
4. **Select Component**: Click on **ZONE-03: Pressure Pipeline** in 3D or in the zone selector.
5. **Open Simulation Control Panel**: Locate the virtual sensor control bar at the top of the screen.
6. **Select Scenario 2 (Gradual Leakage)**: Choose *Scenario 2: Gradual Leakage* with 4.0s persistence.
7. **Click Start Scenario**: Observe the simulated oil sensor signal progressively climb above 65%.
8. **Watch Persistence Timer**: The real-time persistence validation bar counts down continuously (`X.X / 4.0s`).
9. **Confirm Leakage**: After 4.0 seconds continuous signal, the engine confirms persistent leakage.
10. **3D Alert Highlighting**: ZONE-03 turns hazard red (`#DC3545`) with a pulsing 3D marker.
11. **Alert Notification**: An operational alert is broadcast across WebSockets and appears in the top bell indicator.
12. **Navigate to Event Management**: Inspect the newly generated event record (`EVT-001-03-XXXXX`).
13. **Acknowledge Event**: Click *Acknowledge*, enter operator notes, and verify status moves to `ACKNOWLEDGED`.
14. **Investigate**: Click *Investigate*, assign a technician (`Alex Smith`), record inspection finding (e.g. *Flange Seal Failure*).
15. **Inspect Audit Log**: Open *Audit Log* drawer to see full historical timestamped trail of actions.
16. **Clear Leakage Simulation**: In the control panel, click *Reset System* or select *Scenario 1 (Normal Operation)*.
17. **Resolve Event**: Click *Resolve* &rarr; input seal replacement notes. Status updates to `RESOLVED`.
18. **Close Event**: Click *Close Event* &rarr; sign-off ticket. Status updates to `CLOSED`.
19. **Test Transient Rejection**: Select *Scenario 4: Transient Splash* &rarr; verify that temporary signal spikes under 4 seconds are automatically suppressed without raising false alarms!
20. **Test Wi-Fi Failure & Sync**: Click *Wi-Fi Toggle* &rarr; verify the virtual edge node buffers telemetry locally and synchronizes upon reconnection.

---

## 6. Default Demo Credentials

- **Operator**: `operator@hydroguard.io` / `Operator@123`
- **Maintenance Technician**: `tech@hydroguard.io` / `Tech@123`
- **Administrator**: `admin@hydroguard.io` / `Admin@123`

---

## 7. Verification and Automated Tests

Run backend automated tests:
```bash
cd backend
python tests\run_tests.py
```
Test results verify health check, multi-zone persistence validation, transient splash rejection, event lifecycle transitions, and Wi-Fi failure buffering.
