from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
import io
import csv
from datetime import datetime
from app.database.session import get_db
from app.models.entities import LeakageEvent, SensorReading, Zone, MaintenanceRecord

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/export/events.csv")
def export_events_csv(db: Session = Depends(get_db)):
    events = db.query(LeakageEvent).order_by(LeakageEvent.detection_timestamp.desc()).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Event ID", "Machine ID", "Zone ID", "Sensor ID", "Event Type", "Severity",
        "Status", "Detection Time", "Confirmation Time", "Duration (s)",
        "Acknowledged By", "Assigned Technician", "Resolution Time", "Closure Time"
    ])
    for e in events:
        writer.writerow([
            e.id, e.machine_id, e.zone_id, e.sensor_id, e.event_type, e.severity,
            e.status, e.detection_timestamp, e.confirmation_timestamp, e.detection_duration_sec,
            e.acknowledged_by, e.assigned_technician, e.resolution_timestamp, e.closure_timestamp
        ])
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=hydroguard_events_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"}
    )

@router.get("/export/readings.csv")
def export_readings_csv(db: Session = Depends(get_db)):
    readings = db.query(SensorReading).order_by(SensorReading.timestamp.desc()).limit(1000).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Reading ID", "Machine ID", "Zone ID", "Sensor ID", "Oil Signal (%)",
        "Pressure (bar)", "Temperature (C)", "Flow Rate (LPM)", "Timestamp", "Is Simulated"
    ])
    for r in readings:
        writer.writerow([
            r.id, r.machine_id, r.zone_id, r.sensor_id, r.oil_signal_pct,
            r.pressure_bar, r.temperature_c, r.flow_rate_lpm, r.timestamp, r.is_simulated
        ])
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=hydroguard_telemetry_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"}
    )

@router.get("/summary")
def get_reports_summary(db: Session = Depends(get_db)):
    total_events = db.query(LeakageEvent).count()
    total_maintenance = db.query(MaintenanceRecord).count()
    total_zones = db.query(Zone).count()
    return {
        "title": "HYDROGUARD Hydraulic Oil & Leakage Monitoring System Report",
        "generated_at": datetime.utcnow().isoformat(),
        "total_events": total_events,
        "total_maintenance_records": total_maintenance,
        "total_monitored_zones": total_zones,
        "system_status": "OPERATIONAL_SIMULATED",
        "hardware_abstraction": "Fully Software-Simulated (PS-021)"
    }

