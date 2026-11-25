import csv
import io
import zoneinfo
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from app.database.session import get_db
from app.models.entities import LeakageEvent, Machine, Zone
from app.schemas.schemas import (
    LeakageEventResponse, DefectReportResponse, EventAcknowledgeRequest, EventInvestigateRequest,
    EventResolveRequest, EventCloseRequest, EventActivityResponse
)
from app.services.event_service import event_service
from app.services.detection.diagnostic_rules import ZONE_COMPONENT_NAMES

router = APIRouter(prefix="/events", tags=["Events & Defect Reports"])

IST_TZ = zoneinfo.ZoneInfo("Asia/Kolkata")

def to_ist_display(dt: Optional[datetime]) -> str:
    if not dt:
        return "Not yet recorded"
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(IST_TZ).strftime("%d/%m/%Y, %H:%M:%S IST")

def build_defect_report(event: LeakageEvent, db: Session) -> DefectReportResponse:
    machine = db.query(Machine).filter(Machine.id == event.machine_id).first()
    machine_name = machine.name if machine else "500-Ton Hydraulic Stamping Press"
    component_name = ZONE_COMPONENT_NAMES.get(event.zone_id, f"Component ({event.zone_id})")

    possible_causes_list = []
    if event.possible_causes:
        possible_causes_list = [c.strip() for c in event.possible_causes.split("\n") if c.strip()]
    if not possible_causes_list:
        possible_causes_list = [
            "Elastomeric hydraulic seal aging or hardening",
            "High-pressure hydraulic pulsation micro-fissure",
            "SAE flange or manifold connection bolt loosening"
        ]

    timeline_activities = [
        EventActivityResponse(
            id=a.id,
            activity_type=a.activity_type,
            performed_by=a.performed_by,
            notes=a.notes,
            timestamp=a.timestamp
        )
        for a in event.activities
    ]

    return DefectReportResponse(
        defect_id=event.defect_id or f"DEF-{event.machine_id[-3:]}-{event.zone_id[-2:]}-{event.id[-5:]}",
        event_id=event.id,
        machine_id=event.machine_id,
        machine_name=machine_name,
        zone_id=event.zone_id,
        component_name=component_name,
        sensor_id=event.sensor_id,
        defect_type=event.defect_type or event.event_type or "Hydraulic Oil Leakage",
        severity=event.severity,
        detection_timestamp=event.detection_timestamp,
        confirmation_timestamp=event.confirmation_timestamp,
        persistence_duration=event.detection_duration_sec or 0.0,
        persistence_duration_threshold=event.persistence_duration_threshold or 4.0,
        oil_signal_pct=event.oil_signal_pct or 0.0,
        pressure_bar=event.pressure_bar or 160.0,
        flow_rate_lpm=event.flow_rate_lpm or 72.0,
        temperature_c=event.temperature_c or 48.0,
        sensor_status="ONLINE" if not event.is_rejected_transient else "NORMAL",
        detection_method="Rule-Based Persistence Validation",
        detection_evidence=event.detection_evidence or event.detection_reason,
        diagnosis=event.diagnosis_summary or event.detection_reason,
        possible_causes=possible_causes_list,
        recommended_inspection=event.recommended_inspection or "Perform visual and ultrasonic leak check around component joints.",
        recommended_action=event.recommended_action or "Isolate component, replace worn elastomeric seals, retorque flange bolts to specification.",
        current_status=event.status,
        acknowledgement_status=event.acknowledgement_status,
        acknowledged_by=event.acknowledged_by,
        acknowledgement_timestamp=event.acknowledgement_timestamp,
        investigation_status=event.investigation_status or "PENDING",
        assigned_technician=event.assigned_technician,
        maintenance_notes=event.maintenance_notes,
        resolved_by=event.resolved_by,
        resolution_timestamp=event.resolution_timestamp,
        closed_by=event.closed_by,
        closure_timestamp=event.closure_timestamp,
        closure_notes=event.closure_notes,
        scenario_started_at=event.scenario_started_at,
        abnormal_detected_at=event.abnormal_detected_at or event.detection_timestamp,
        persistence_started_at=event.persistence_started_at or event.detection_timestamp,
        defect_confirmed_at=event.defect_confirmed_at or event.confirmation_timestamp,
        alert_generated_at=event.alert_generated_at or event.confirmation_timestamp,
        acknowledged_at=event.acknowledged_at or event.acknowledgement_timestamp,
        investigated_at=event.investigated_at,
        resolved_at=event.resolved_at or event.resolution_timestamp,
        closed_at=event.closed_at or event.closure_timestamp,
        timeline=timeline_activities
    )

@router.get("", response_model=List[LeakageEventResponse])
def get_events(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    machine_id: Optional[str] = None,
    zone_id: Optional[str] = None,
    defect_type: Optional[str] = None,
    status: Optional[str] = None,
    severity: Optional[str] = None,
    search: Optional[str] = None,
    include_rejected: bool = Query(True, description="Include transient rejected attempts in history"),
    db: Session = Depends(get_db)
):
    items, total = event_service.get_events_paginated(
        db=db,
        skip=skip,
        limit=limit,
        machine_id=machine_id,
        zone_id=zone_id,
        defect_type=defect_type,
        status=status,
        severity=severity,
        search=search,
        include_rejected=include_rejected
    )
    return items

@router.get("/reports/active", response_model=List[DefectReportResponse])
def get_active_defect_reports(
    machine_id: str = "MCH-001",
    db: Session = Depends(get_db)
):
    """Returns structured defect reports for all active unclosed events on the machine."""
    events = db.query(LeakageEvent).filter(
        LeakageEvent.machine_id == machine_id,
        LeakageEvent.is_rejected_transient == False,
        LeakageEvent.status.in_(["DETECTED", "ACKNOWLEDGED", "UNDER INVESTIGATION", "RESOLVED"])
    ).order_by(LeakageEvent.detection_timestamp.desc()).all()

    return [build_defect_report(e, db) for e in events]

@router.get("/export/csv")
def export_events_csv(
    machine_id: Optional[str] = None,
    zone_id: Optional[str] = None,
    defect_type: Optional[str] = None,
    status: Optional[str] = None,
    severity: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Exports filtered event history and defect records as CSV."""
    items, total = event_service.get_events_paginated(
        db=db,
        skip=0,
        limit=2000,
        machine_id=machine_id,
        zone_id=zone_id,
        defect_type=defect_type,
        status=status,
        severity=severity,
        search=search,
        include_rejected=True
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Event ID", "Defect ID", "Machine ID", "Zone ID", "Component Name", "Sensor ID",
        "Defect Type", "Severity", "Status",
        "Detection Time (IST)", "Confirmation Time (IST)",
        "Scenario Started (IST)", "Abnormal Detected (IST)", "Persistence Started (IST)", "Alert Generated (IST)",
        "Duration (s)", "Persistence Req (s)", "Oil Signal (%)", "Pressure (bar)", "Temp (C)", "Flow (LPM)",
        "Acknowledged By", "Ack Time (IST)", "Technician", "Investigated Time (IST)",
        "Resolved By", "Resolution Time (IST)",
        "Closed By", "Closure Time (IST)", "Is Transient Rejected", "Diagnosis Summary"
    ])

    for e in items:
        comp_name = ZONE_COMPONENT_NAMES.get(e.zone_id, e.zone_id)
        writer.writerow([
            e.id,
            e.defect_id or "",
            e.machine_id,
            e.zone_id,
            comp_name,
            e.sensor_id,
            e.defect_type or e.event_type,
            e.severity,
            e.status,
            to_ist_display(e.detection_timestamp),
            to_ist_display(e.confirmation_timestamp or e.defect_confirmed_at),
            to_ist_display(e.scenario_started_at),
            to_ist_display(e.abnormal_detected_at or e.detection_timestamp),
            to_ist_display(e.persistence_started_at or e.detection_timestamp),
            to_ist_display(e.alert_generated_at or e.confirmation_timestamp),
            e.detection_duration_sec,
            e.persistence_duration_threshold,
            e.oil_signal_pct,
            e.pressure_bar,
            e.temperature_c,
            e.flow_rate_lpm,
            e.acknowledged_by or "",
            to_ist_display(e.acknowledgement_timestamp or e.acknowledged_at),
            e.assigned_technician or "",
            to_ist_display(e.investigated_at),
            e.resolved_by or "",
            to_ist_display(e.resolution_timestamp or e.resolved_at),
            e.closed_by or "",
            to_ist_display(e.closure_timestamp or e.closed_at),
            "YES" if e.is_rejected_transient else "NO",
            e.diagnosis_summary or e.detection_reason or ""
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=hydroguard_defect_history_IST_{datetime.now(IST_TZ).strftime('%Y%m%d_%H%M%S')}.csv"
        }
    )

@router.get("/{event_id}", response_model=LeakageEventResponse)
def get_event(event_id: str, db: Session = Depends(get_db)):
    event = db.query(LeakageEvent).filter(LeakageEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail=f"Leakage event {event_id} not found")
    return event

@router.get("/{event_id}/report", response_model=DefectReportResponse)
def get_event_report(event_id: str, db: Session = Depends(get_db)):
    event = db.query(LeakageEvent).filter(LeakageEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail=f"Leakage event {event_id} not found")
    return build_defect_report(event, db)

@router.post("/{event_id}/acknowledge", response_model=LeakageEventResponse)
def acknowledge_event(event_id: str, payload: EventAcknowledgeRequest, db: Session = Depends(get_db)):
    return event_service.acknowledge_event(
        db=db,
        event_id=event_id,
        user_name=payload.user_name,
        notes=payload.notes
    )

@router.post("/{event_id}/investigate", response_model=LeakageEventResponse)
def investigate_event(event_id: str, payload: EventInvestigateRequest, db: Session = Depends(get_db)):
    return event_service.investigate_event(
        db=db,
        event_id=event_id,
        technician_name=payload.technician_name,
        investigation_status=payload.investigation_status,
        notes=payload.notes
    )

@router.post("/{event_id}/resolve", response_model=LeakageEventResponse)
def resolve_event(event_id: str, payload: EventResolveRequest, db: Session = Depends(get_db)):
    return event_service.resolve_event(
        db=db,
        event_id=event_id,
        resolved_by=payload.resolved_by,
        notes=payload.notes
    )

@router.post("/{event_id}/close", response_model=LeakageEventResponse)
def close_event(event_id: str, payload: EventCloseRequest, db: Session = Depends(get_db)):
    return event_service.close_event(
        db=db,
        event_id=event_id,
        closed_by=payload.closed_by,
        closure_notes=payload.closure_notes
    )
