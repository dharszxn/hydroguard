import json
import time
from datetime import datetime, timezone
from typing import Optional, List, Tuple, Dict
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_
from fastapi import HTTPException

from app.models.entities import (
    LeakageEvent, EventActivity, Notification, VirtualSensor, Zone,
    EventSeverity, EventStatus, ZoneStatus
)

class EventStateMachine:
    VALID_TRANSITIONS = {
        EventStatus.DETECTED.value: [EventStatus.ACKNOWLEDGED.value],
        EventStatus.ACKNOWLEDGED.value: [EventStatus.UNDER_INVESTIGATION.value],
        EventStatus.UNDER_INVESTIGATION.value: [EventStatus.RESOLVED.value],
        EventStatus.RESOLVED.value: [EventStatus.CLOSED.value],
        EventStatus.CLOSED.value: []
    }

    @classmethod
    def validate_transition(cls, current_status: str, next_status: str) -> bool:
        if current_status == next_status:
            return True
        allowed = cls.VALID_TRANSITIONS.get(current_status, [])
        return next_status in allowed

class EventService:
    @staticmethod
    def get_active_event_for_zone(db: Session, machine_id: str, zone_id: str) -> Optional[LeakageEvent]:
        """Returns the active ongoing defect/leakage event for this machine & zone if any."""
        return db.query(LeakageEvent).filter(
            LeakageEvent.machine_id == machine_id,
            LeakageEvent.zone_id == zone_id,
            LeakageEvent.is_rejected_transient == False,
            LeakageEvent.status.in_([
                EventStatus.DETECTED.value,
                EventStatus.ACKNOWLEDGED.value,
                EventStatus.UNDER_INVESTIGATION.value
            ])
        ).order_by(desc(LeakageEvent.detection_timestamp)).first()

    @staticmethod
    def create_or_update_leakage_event(
        db: Session,
        machine_id: str,
        zone_id: str,
        sensor_id: str,
        duration_sec: float,
        reason: str,
        severity: str,
        defect_type: str = "Hydraulic Oil Leakage",
        oil_signal_pct: float = 85.0,
        pressure_bar: float = 160.0,
        temperature_c: float = 48.0,
        flow_rate_lpm: float = 72.0,
        persistence_duration_threshold: float = 4.0,
        detection_evidence: Optional[str] = None,
        diagnosis_summary: Optional[str] = None,
        possible_causes: Optional[str] = None,
        recommended_inspection: Optional[str] = None,
        recommended_action: Optional[str] = None,
        scenario_started_at: Optional[datetime] = None,
        abnormal_detected_at: Optional[datetime] = None,
        persistence_started_at: Optional[datetime] = None
    ) -> Tuple[LeakageEvent, bool]:
        """
        Deduplication safeguard:
        If an active event already exists for this machine & zone, update its duration without creating duplicates!
        """
        existing = EventService.get_active_event_for_zone(db, machine_id, zone_id)
        now_dt = datetime.now(timezone.utc)

        if existing:
            existing.detection_duration_sec = round(duration_sec, 2)
            existing.oil_signal_pct = round(oil_signal_pct, 1)
            existing.pressure_bar = round(pressure_bar, 1)
            existing.temperature_c = round(temperature_c, 1)
            existing.flow_rate_lpm = round(flow_rate_lpm, 1)
            db.commit()
            db.refresh(existing)
            return existing, False

        # Generate unique defect ID and event ID
        ts_suffix = f"{int(now_dt.timestamp()) % 100000:05d}"
        event_id = f"EVT-{machine_id[-3:]}-{zone_id[-2:]}-{ts_suffix}"
        defect_id = f"DEF-{machine_id[-3:]}-{zone_id[-2:]}-{ts_suffix}"

        new_event = LeakageEvent(
            id=event_id,
            defect_id=defect_id,
            machine_id=machine_id,
            zone_id=zone_id,
            sensor_id=sensor_id,
            event_type="Hydraulic Oil Leakage Confirmed",
            defect_type=defect_type,
            severity=severity or EventSeverity.HIGH.value,
            status=EventStatus.DETECTED.value,
            detection_timestamp=now_dt,
            confirmation_timestamp=now_dt,
            scenario_started_at=scenario_started_at,
            abnormal_detected_at=abnormal_detected_at or now_dt,
            persistence_started_at=persistence_started_at or now_dt,
            defect_confirmed_at=now_dt,
            alert_generated_at=now_dt,
            acknowledged_at=None,
            investigated_at=None,
            resolved_at=None,
            closed_at=None,
            detection_duration_sec=round(duration_sec, 2),
            detection_reason=reason,
            oil_signal_pct=round(oil_signal_pct, 1),
            pressure_bar=round(pressure_bar, 1),
            temperature_c=round(temperature_c, 1),
            flow_rate_lpm=round(flow_rate_lpm, 1),
            persistence_duration_threshold=persistence_duration_threshold,
            detection_evidence=detection_evidence,
            diagnosis_summary=diagnosis_summary or reason,
            possible_causes=possible_causes,
            recommended_inspection=recommended_inspection,
            recommended_action=recommended_action,
            acknowledgement_status=False,
            is_rejected_transient=False
        )
        db.add(new_event)
        db.flush()

        # Initial confirmation activity audit trail
        activity = EventActivity(
            event_id=event_id,
            activity_type="DEFECT_CONFIRMED",
            performed_by="HYDROGUARD Detection Engine",
            notes=f"Persistence criteria passed ({duration_sec:.1f}s / {persistence_duration_threshold}s). Defect confirmed: {defect_type}."
        )
        db.add(activity)

        notif = Notification(
            event_id=event_id,
            machine_id=machine_id,
            zone_id=zone_id,
            title=f"DEFECT CONFIRMED: {defect_type} in {zone_id}",
            message=reason,
            severity=severity or EventSeverity.HIGH.value
        )
        db.add(notif)
        db.commit()
        db.refresh(new_event)
        return new_event, True

    @staticmethod
    def create_transient_rejected_event(
        db: Session,
        machine_id: str,
        zone_id: str,
        sensor_id: str,
        duration_sec: float,
        oil_signal_pct: float,
        pressure_bar: float,
        temperature_c: float,
        flow_rate_lpm: float,
        persistence_duration_threshold: float,
        rejection_reason: str,
        scenario_started_at: Optional[datetime] = None,
        abnormal_detected_at: Optional[datetime] = None,
        persistence_started_at: Optional[datetime] = None
    ) -> LeakageEvent:
        """Stores transient/rejected signal attempts for complete auditability without marking as confirmed defect."""
        now_dt = datetime.now(timezone.utc)
        ts_suffix = f"{int(now_dt.timestamp()) % 100000:05d}"
        event_id = f"EVT-REJ-{machine_id[-3:]}-{zone_id[-2:]}-{ts_suffix}"
        defect_id = f"DEF-REJ-{machine_id[-3:]}-{zone_id[-2:]}-{ts_suffix}"

        rej_event = LeakageEvent(
            id=event_id,
            defect_id=defect_id,
            machine_id=machine_id,
            zone_id=zone_id,
            sensor_id=sensor_id,
            event_type="Transient Signal / False Alarm",
            defect_type="Transient Signal / False Alarm",
            severity=EventSeverity.LOW.value,
            status="REJECTED",
            detection_timestamp=now_dt,
            confirmation_timestamp=None,
            scenario_started_at=scenario_started_at,
            abnormal_detected_at=abnormal_detected_at or now_dt,
            persistence_started_at=persistence_started_at or now_dt,
            defect_confirmed_at=None,
            alert_generated_at=None,
            acknowledged_at=None,
            investigated_at=None,
            resolved_at=None,
            closed_at=None,
            detection_duration_sec=round(duration_sec, 2),
            detection_reason=rejection_reason,
            oil_signal_pct=round(oil_signal_pct, 1),
            pressure_bar=round(pressure_bar, 1),
            temperature_c=round(temperature_c, 1),
            flow_rate_lpm=round(flow_rate_lpm, 1),
            persistence_duration_threshold=persistence_duration_threshold,
            detection_evidence=f"Spike elevated for {duration_sec:.1f}s, dropped before required {persistence_duration_threshold:.1f}s threshold.",
            diagnosis_summary="Transient signal rejected by rule-based persistence filter. Classified as false alarm prevention.",
            possible_causes="Tool washdown splash, die change coolant overspray, optical condensation transient.",
            recommended_inspection="Inspect sensor optical face for residue.",
            recommended_action="No repair required. False alarm prevented.",
            is_rejected_transient=True,
            rejection_reason=rejection_reason
        )
        db.add(rej_event)
        db.flush()

        activity = EventActivity(
            event_id=event_id,
            activity_type="TRANSIENT_REJECTED",
            performed_by="HYDROGUARD Detection Engine",
            notes=f"Signal spike aborted at {duration_sec:.1f}s (< {persistence_duration_threshold}s). Prevented false alert dispatch."
        )
        db.add(activity)
        db.commit()
        db.refresh(rej_event)
        return rej_event

    @staticmethod
    def acknowledge_event(db: Session, event_id: str, user_name: str, notes: Optional[str] = None) -> LeakageEvent:
        event = db.query(LeakageEvent).filter(LeakageEvent.id == event_id).first()
        if not event:
            raise HTTPException(status_code=404, detail=f"Defect event {event_id} not found")

        if event.status == EventStatus.ACKNOWLEDGED.value:
            return event

        target = EventStatus.ACKNOWLEDGED.value
        if not EventStateMachine.validate_transition(event.status, target):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid lifecycle transition: Cannot move event {event_id} from '{event.status}' to '{target}'"
            )

        event.status = target
        event.acknowledgement_status = True
        event.acknowledged_by = user_name
        event.acknowledgement_timestamp = datetime.now(timezone.utc)
        event.acknowledged_at = event.acknowledgement_timestamp

        act = EventActivity(
            event_id=event.id,
            activity_type="ACKNOWLEDGED",
            performed_by=user_name,
            notes=notes or "Operator acknowledged active defect alarm."
        )
        db.add(act)
        db.commit()
        db.refresh(event)
        return event

    @staticmethod
    def investigate_event(db: Session, event_id: str, technician_name: str, investigation_status: str, notes: str) -> LeakageEvent:
        event = db.query(LeakageEvent).filter(LeakageEvent.id == event_id).first()
        if not event:
            raise HTTPException(status_code=404, detail=f"Defect event {event_id} not found")

        target = EventStatus.UNDER_INVESTIGATION.value
        if not EventStateMachine.validate_transition(event.status, target):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid lifecycle transition: Cannot move event from '{event.status}' to '{target}'. Event must be acknowledged first."
            )

        event.status = target
        event.assigned_technician = technician_name
        event.investigation_status = investigation_status
        event.maintenance_notes = notes
        event.investigated_at = datetime.now(timezone.utc)

        act = EventActivity(
            event_id=event.id,
            activity_type="INVESTIGATION_STARTED",
            performed_by=technician_name,
            notes=f"Investigation dispatched: {investigation_status}. Notes: {notes}"
        )
        db.add(act)
        db.commit()
        db.refresh(event)
        return event

    @staticmethod
    def resolve_event(db: Session, event_id: str, resolved_by: str, notes: str) -> LeakageEvent:
        event = db.query(LeakageEvent).filter(LeakageEvent.id == event_id).first()
        if not event:
            raise HTTPException(status_code=404, detail=f"Defect event {event_id} not found")

        target = EventStatus.RESOLVED.value
        if not EventStateMachine.validate_transition(event.status, target):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid lifecycle transition: Cannot move event from '{event.status}' to '{target}'. Event must be under investigation first."
            )

        # Clear simulated sensor values for this zone
        sensor = db.query(VirtualSensor).filter(VirtualSensor.id == event.sensor_id).first()
        if sensor and sensor.simulated_signal_value > 50.0:
            sensor.simulated_signal_value = 8.5
            sensor.pressure_bar = 160.0

        zone = db.query(Zone).filter(Zone.id == event.zone_id, Zone.machine_id == event.machine_id).first()
        if zone:
            zone.current_status = ZoneStatus.NORMAL.value

        event.status = target
        event.resolved_by = resolved_by
        event.resolution_timestamp = datetime.now(timezone.utc)
        event.resolved_at = event.resolution_timestamp

        act = EventActivity(
            event_id=event.id,
            activity_type="RESOLVED",
            performed_by=resolved_by,
            notes=notes
        )
        db.add(act)
        db.commit()
        db.refresh(event)
        return event

    @staticmethod
    def close_event(db: Session, event_id: str, closed_by: str, closure_notes: str) -> LeakageEvent:
        event = db.query(LeakageEvent).filter(LeakageEvent.id == event_id).first()
        if not event:
            raise HTTPException(status_code=404, detail=f"Defect event {event_id} not found")

        target = EventStatus.CLOSED.value
        if not EventStateMachine.validate_transition(event.status, target):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid lifecycle transition: Cannot close event with status '{event.status}'. Event must be marked RESOLVED first."
            )

        event.status = target
        event.closed_by = closed_by
        event.closure_timestamp = datetime.now(timezone.utc)
        event.closed_at = event.closure_timestamp
        event.closure_notes = closure_notes

        act = EventActivity(
            event_id=event.id,
            activity_type="CLOSED",
            performed_by=closed_by,
            notes=closure_notes
        )
        db.add(act)
        db.commit()
        db.refresh(event)
        return event

    @staticmethod
    def get_events_paginated(
        db: Session,
        skip: int = 0,
        limit: int = 50,
        machine_id: Optional[str] = None,
        zone_id: Optional[str] = None,
        defect_type: Optional[str] = None,
        status: Optional[str] = None,
        severity: Optional[str] = None,
        search: Optional[str] = None,
        include_rejected: bool = True
    ) -> Tuple[List[LeakageEvent], int]:
        query = db.query(LeakageEvent)

        if not include_rejected:
            query = query.filter(LeakageEvent.is_rejected_transient == False)

        if machine_id:
            query = query.filter(LeakageEvent.machine_id == machine_id)
        if zone_id:
            query = query.filter(LeakageEvent.zone_id == zone_id)
        if defect_type:
            query = query.filter(LeakageEvent.defect_type == defect_type)
        if status:
            query = query.filter(LeakageEvent.status == status)
        if severity:
            query = query.filter(LeakageEvent.severity == severity)
        if search:
            s = f"%{search}%"
            query = query.filter(or_(
                LeakageEvent.id.ilike(s),
                LeakageEvent.defect_id.ilike(s),
                LeakageEvent.defect_type.ilike(s),
                LeakageEvent.detection_reason.ilike(s),
                LeakageEvent.assigned_technician.ilike(s),
                LeakageEvent.acknowledged_by.ilike(s)
            ))

        total = query.count()
        items = query.order_by(desc(LeakageEvent.detection_timestamp)).offset(skip).limit(limit).all()
        return items, total

event_service = EventService()
