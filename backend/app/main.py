from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import hashlib
from datetime import datetime

from app.database.session import engine, Base, SessionLocal
from app.models.entities import (
    Machine, Zone, VirtualDevice, VirtualSensor, User, LeakageEvent, EventActivity,
    Notification, ZoneStatus, EventSeverity, EventStatus, DeviceStatus
)
from app.websocket.manager import ws_manager
from app.services.simulation.simulator import simulation_engine

from app.api.routes.machines import router as machines_router
from app.api.routes.zones import router as zones_router
from app.api.routes.readings import router as readings_router
from app.api.routes.events import router as events_router
from app.api.routes.simulation import router as simulation_router
from app.api.routes.connectivity import router as connectivity_router
from app.api.routes.analytics import router as analytics_router
from app.api.routes.maintenance import router as maintenance_router
from app.api.routes.notifications import router as notifications_router
from app.api.routes.reports import router as reports_router
from app.api.routes.auth import router as auth_router
from app.database.migration import run_migrations

def init_db_and_seed():
    Base.metadata.create_all(bind=engine)
    run_migrations()
    db = SessionLocal()
    try:
        # Machine MCH-001
        mch = db.query(Machine).filter(Machine.id == "MCH-001").first()
        if not mch:
            mch = Machine(
                id="MCH-001",
                name="500-Ton Hydraulic Stamping Press",
                description="Heavy industrial hydraulic power unit powering main stamping and forming cylinder.",
                location="Stamping Bay Alpha, Line 3"
            )
            db.add(mch)
            db.commit()

        # 3. Seed Virtual Edge Node
        dev = db.query(VirtualDevice).filter(VirtualDevice.id == "ESP32-EDGE-01").first()
        if not dev:
            dev = VirtualDevice(
                id="ESP32-EDGE-01",
                machine_id="MCH-001",
                connectivity_state=DeviceStatus.ONLINE.value,
                ip_address="192.168.1.101",
                wifi_ssid="FACTORY-SCADA-WLAN",
                firmware_version="v2.4.1-INNOX"
            )
            db.add(dev)
            db.commit()

        # 4. Seed Zones and Sensors
        default_zones = [
            ("ZONE-01", "Oil Reservoir", "reservoir", 65.0, 4.0, EventSeverity.HIGH.value),
            ("ZONE-02", "Hydraulic Pump", "pump", 70.0, 3.5, EventSeverity.CRITICAL.value),
            ("ZONE-03", "Pressure Pipeline", "pipeline_press", 65.0, 4.0, EventSeverity.CRITICAL.value),
            ("ZONE-04", "Control Valve", "valve", 60.0, 4.0, EventSeverity.HIGH.value),
            ("ZONE-05", "Hydraulic Cylinder", "cylinder", 65.0, 4.0, EventSeverity.HIGH.value),
            ("ZONE-06", "Oil Return Pipeline", "pipeline_return", 60.0, 5.0, EventSeverity.MEDIUM.value),
        ]

        for zid, zname, comp, thresh, pers, sev in default_zones:
            existing_zone = db.query(Zone).filter(Zone.id == zid, Zone.machine_id == "MCH-001").first()
            if not existing_zone:
                z = Zone(
                    id=zid,
                    machine_id="MCH-001",
                    name=zname,
                    component_mapping=comp,
                    detection_threshold=thresh,
                    persistence_duration=pers,
                    severity_level=sev,
                    current_status=ZoneStatus.NORMAL.value
                )
                db.add(z)
                db.commit()

                # Virtual Sensor
                sens_id = f"SENS-OIL-{zid[-2:]}"
                s = VirtualSensor(
                    id=sens_id,
                    machine_id="MCH-001",
                    zone_id=zid,
                    device_id="ESP32-EDGE-01",
                    sensor_type="Optical/Conductive Oil Leak Sensor",
                    simulated_signal_value=8.4,
                    pressure_bar=160.0,
                    temperature_c=48.2,
                    flow_rate_lpm=72.1,
                    is_connected=True
                )
                db.add(s)
                db.commit()

        # 5. Seed an Initial Sample Event for Historical Demo
        if db.query(LeakageEvent).count() == 0:
            sample_evt = LeakageEvent(
                id="EVT-001-03-09412",
                machine_id="MCH-001",
                zone_id="ZONE-03",
                sensor_id="SENS-OIL-03",
                event_type="Hydraulic Oil Leakage Confirmed",
                severity=EventSeverity.CRITICAL.value,
                status=EventStatus.ACKNOWLEDGED.value,
                detection_timestamp=datetime.utcnow(),
                confirmation_timestamp=datetime.utcnow(),
                detection_duration_sec=4.2,
                detection_reason="Continuous oil sensor signal exceeded 65% threshold for 4.2s persistence duration.",
                acknowledgement_status=True,
                acknowledged_by="John Doe (Lead Operator)",
                acknowledgement_timestamp=datetime.utcnow(),
                investigation_status="INSPECTION_PENDING",
                assigned_technician="Alex Smith (Hydraulic Tech)",
                maintenance_notes="Preliminary visual check scheduled for high-pressure flange seals."
            )
            db.add(sample_evt)
            db.commit()

            act1 = EventActivity(
                event_id=sample_evt.id,
                activity_type="CONFIRMED",
                performed_by="HYDROGUARD Detection Engine",
                notes="Persistence duration criteria (4.0s) verified. Event logged."
            )
            act2 = EventActivity(
                event_id=sample_evt.id,
                activity_type="ACKNOWLEDGED",
                performed_by="John Doe (Lead Operator)",
                notes="Alarm acknowledged. Work order dispatched to hydraulic maintenance team."
            )
            db.add_all([act1, act2])
            db.commit()

    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db_and_seed()
    # Start baseline simulation loop automatically
    await simulation_engine.start_simulation("scenario_1", "MCH-001", "ZONE-03")
    yield
    await simulation_engine.stop_simulation()

app = FastAPI(
    title="HYDROGUARD Industrial Monitoring Platform",
    description="Smart Detection and Monitoring of Hydraulic Oil and Oil Leakage (PS-021: Sakthi Hackathon 2.0)",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Attach Routers (Both v1 and root api prefix for full compatibility)
for pfx in ["/api/v1", "/api"]:
    app.include_router(auth_router, prefix=pfx)
    app.include_router(machines_router, prefix=pfx)
    app.include_router(zones_router, prefix=pfx)
    app.include_router(readings_router, prefix=pfx)
    app.include_router(events_router, prefix=pfx)
    app.include_router(simulation_router, prefix=pfx)
    app.include_router(connectivity_router, prefix=pfx)
    app.include_router(analytics_router, prefix=pfx)
    app.include_router(maintenance_router, prefix=pfx)
    app.include_router(notifications_router, prefix=pfx)
    app.include_router(reports_router, prefix=pfx)

@app.get("/health")
@app.get("/api/health")
@app.get("/api/v1/health")
@app.get("/api/v1/system/health")
@app.get("/api/system/health")
def system_health():
    return {
        "status": "HEALTHY",
        "system": "HYDROGUARD Industrial Monitoring Platform",
        "version": "v1.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "edge_node": "ESP32-EDGE-01",
        "simulation_mode": "SOFTWARE_SIMULATION_ACTIVE",
        "hardware_required": False
    }

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # client can send ping or commands if needed
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)

