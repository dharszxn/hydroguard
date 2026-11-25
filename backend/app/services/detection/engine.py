import time
from datetime import datetime, timezone
from typing import Optional, Dict
from sqlalchemy.orm import Session
from app.models.entities import (
    Zone, VirtualSensor, LeakageEvent, Notification,
    ZoneStatus, EventSeverity, EventStatus
)
from app.services.event_service import event_service
from app.services.detection.diagnostic_rules import diagnose_telemetry
from app.websocket.manager import ws_manager

class DetectionEngine:
    def __init__(self):
        # zone_id -> { "timer_start": float, "first_detected_dt": datetime, "is_confirmed": bool, "active_event_id": str | None }
        self.zone_timers: Dict[str, Dict] = {}

    def process_sensor_signal(
        self,
        db: Session,
        machine_id: str,
        zone_id: str,
        sensor_id: str,
        raw_signal: float,
        pressure_bar: float = 160.0,
        temperature_c: float = 48.0,
        flow_rate_lpm: float = 72.0,
        is_sensor_connected: bool = True,
        is_wifi_connected: bool = True,
        scenario_started_at: Optional[datetime] = None
    ) -> Dict:
        """
        Rule-Based Persistence Detection & Automatic Defect Diagnosis Workflow:
        1. Connectivity Check: If sensor/wifi disconnected, classify fault.
        2. Signal Filtering: Check if raw_signal >= threshold or systemic pressure drop.
        3. Persistence Validation:
           - Signal above threshold: Start monotonic timer.
           - Remains above threshold for >= persistence_duration: Confirm defect & generate full diagnosis report.
           - Drops below threshold before timer completes: REJECT as transient splash and persist rejection record!
        4. Recovery: If cleared and physical signal is below threshold, restore zone status to NORMAL.
        """
        zone = db.query(Zone).filter(Zone.id == zone_id, Zone.machine_id == machine_id).first()
        if not zone or not zone.is_enabled:
            return {"status": "DISABLED", "confirmed": False}

        current_time = time.time()
        now_dt = datetime.now(timezone.utc)

        if zone_id not in self.zone_timers:
            self.zone_timers[zone_id] = {
                "timer_start": None,
                "first_detected_dt": None,
                "persistence_started_dt": None,
                "scenario_started_dt": None,
                "is_confirmed": False,
                "active_event_id": None
            }

        state = self.zone_timers[zone_id]

        # 1. Hardware Sensor Connectivity check
        if not is_sensor_connected:
            zone.current_status = ZoneStatus.SENSOR_DISCONNECTED.value
            db.commit()
            diag = diagnose_telemetry(
                zone_id=zone_id,
                raw_signal_pct=raw_signal,
                pressure_bar=pressure_bar,
                temperature_c=temperature_c,
                flow_rate_lpm=flow_rate_lpm,
                is_sensor_connected=False,
                is_wifi_connected=is_wifi_connected,
                duration_sec=0.0,
                threshold_sec=zone.persistence_duration,
                detection_threshold_pct=zone.detection_threshold
            )
            return {"status": ZoneStatus.SENSOR_DISCONNECTED.value, "confirmed": False, "diagnosis": diag}

        threshold = zone.detection_threshold
        persistence_duration = zone.persistence_duration

        # 2. Pressure Drop Check without oil leak signal
        if raw_signal < 20.0 and pressure_bar < 130.0:
            zone.current_status = ZoneStatus.WARNING.value
            db.commit()
            diag = diagnose_telemetry(
                zone_id=zone_id,
                raw_signal_pct=raw_signal,
                pressure_bar=pressure_bar,
                temperature_c=temperature_c,
                flow_rate_lpm=flow_rate_lpm,
                is_sensor_connected=True,
                is_wifi_connected=is_wifi_connected,
                duration_sec=0.0,
                threshold_sec=persistence_duration,
                detection_threshold_pct=threshold
            )
            return {"status": ZoneStatus.WARNING.value, "confirmed": False, "diagnosis": diag}

        # 3. Threshold Comparison for Oil Leakage
        if raw_signal >= threshold:
            if state["timer_start"] is None:
                # Timer start: Leakage Suspected
                state["timer_start"] = current_time
                state["first_detected_dt"] = now_dt
                state["persistence_started_dt"] = now_dt
                state["scenario_started_dt"] = scenario_started_at
                zone.current_status = ZoneStatus.LEAKAGE_SUSPECTED.value
                db.commit()

                notif = Notification(
                    machine_id=machine_id,
                    zone_id=zone_id,
                    title=f"Leakage Suspected: {zone.name}",
                    message=f"Simulated sensor signal at {raw_signal:.1f}% exceeded {threshold:.1f}% threshold. Validating persistence ({persistence_duration}s)...",
                    severity=EventSeverity.MEDIUM.value
                )
                db.add(notif)
                db.commit()

                return {
                    "status": ZoneStatus.LEAKAGE_SUSPECTED.value,
                    "elapsed": 0.0,
                    "required": persistence_duration,
                    "confirmed": False
                }
            else:
                elapsed = current_time - state["timer_start"]
                if elapsed >= persistence_duration and not state["is_confirmed"]:
                    # 4. Persistence Confirmed! Generate full automated diagnosis
                    state["is_confirmed"] = True
                    zone.current_status = ZoneStatus.LEAKAGE_CONFIRMED.value

                    diagnosis = diagnose_telemetry(
                        zone_id=zone_id,
                        raw_signal_pct=raw_signal,
                        pressure_bar=pressure_bar,
                        temperature_c=temperature_c,
                        flow_rate_lpm=flow_rate_lpm,
                        is_sensor_connected=is_sensor_connected,
                        is_wifi_connected=is_wifi_connected,
                        duration_sec=elapsed,
                        threshold_sec=persistence_duration,
                        detection_threshold_pct=threshold
                    )

                    reason = diagnosis["diagnosis_summary"]
                    event_rec, is_new = event_service.create_or_update_leakage_event(
                        db=db,
                        machine_id=machine_id,
                        zone_id=zone_id,
                        sensor_id=sensor_id,
                        duration_sec=elapsed,
                        reason=reason,
                        severity=diagnosis["severity"],
                        defect_type=diagnosis["defect_type"],
                        oil_signal_pct=raw_signal,
                        pressure_bar=pressure_bar,
                        temperature_c=temperature_c,
                        flow_rate_lpm=flow_rate_lpm,
                        persistence_duration_threshold=persistence_duration,
                        detection_evidence=diagnosis["detection_evidence"],
                        diagnosis_summary=diagnosis["diagnosis_summary"],
                        possible_causes="\n".join(diagnosis["possible_causes"]),
                        recommended_inspection=diagnosis["recommended_inspection"],
                        recommended_action=diagnosis["recommended_action"],
                        scenario_started_at=state.get("scenario_started_dt"),
                        abnormal_detected_at=state.get("first_detected_dt"),
                        persistence_started_at=state.get("persistence_started_dt")
                    )
                    state["active_event_id"] = event_rec.id

                    return {
                        "status": ZoneStatus.LEAKAGE_CONFIRMED.value,
                        "elapsed": elapsed,
                        "required": persistence_duration,
                        "confirmed": True,
                        "event_id": event_rec.id,
                        "defect_id": event_rec.defect_id,
                        "diagnosis": diagnosis
                    }
                elif state["is_confirmed"]:
                    # Continuous update of active confirmed leak
                    if state.get("active_event_id"):
                        event_service.create_or_update_leakage_event(
                            db=db,
                            machine_id=machine_id,
                            zone_id=zone_id,
                            sensor_id=sensor_id,
                            duration_sec=elapsed,
                            reason=f"Persistent defect ongoing ({elapsed:.1f}s).",
                            severity=zone.severity_level,
                            oil_signal_pct=raw_signal,
                            pressure_bar=pressure_bar,
                            temperature_c=temperature_c,
                            flow_rate_lpm=flow_rate_lpm
                        )
                    return {
                        "status": ZoneStatus.LEAKAGE_CONFIRMED.value,
                        "elapsed": elapsed,
                        "required": persistence_duration,
                        "confirmed": True,
                        "event_id": state["active_event_id"]
                    }
                else:
                    return {
                        "status": ZoneStatus.LEAKAGE_SUSPECTED.value,
                        "elapsed": elapsed,
                        "required": persistence_duration,
                        "confirmed": False
                    }
        else:
            # Signal is below threshold
            if state["timer_start"] is not None and not state["is_confirmed"]:
                # Transient Splash Rejected: Save as persistent rejected event!
                elapsed = current_time - state["timer_start"]
                abnormal_dt = state.get("first_detected_dt")
                persist_dt = state.get("persistence_started_dt")
                scen_dt = state.get("scenario_started_dt")
                state["timer_start"] = None
                state["first_detected_dt"] = None
                state["persistence_started_dt"] = None
                state["scenario_started_dt"] = None
                zone.current_status = ZoneStatus.NORMAL.value

                rejection_msg = f"Oil sensor spike cleared after {elapsed:.1f}s (< {persistence_duration}s). Classified as transient splash - false alarm prevented."
                
                # Persist rejected transient event into database history
                rej_event = event_service.create_transient_rejected_event(
                    db=db,
                    machine_id=machine_id,
                    zone_id=zone_id,
                    sensor_id=sensor_id,
                    duration_sec=elapsed,
                    oil_signal_pct=raw_signal,
                    pressure_bar=pressure_bar,
                    temperature_c=temperature_c,
                    flow_rate_lpm=flow_rate_lpm,
                    persistence_duration_threshold=persistence_duration,
                    rejection_reason=rejection_msg,
                    scenario_started_at=scen_dt,
                    abnormal_detected_at=abnormal_dt,
                    persistence_started_at=persist_dt
                )

                notif = Notification(
                    machine_id=machine_id,
                    zone_id=zone_id,
                    title=f"Transient Signal Rejected: {zone.name}",
                    message=rejection_msg,
                    severity=EventSeverity.LOW.value
                )
                db.add(notif)
                db.commit()

                return {
                    "status": "TRANSIENT_REJECTED",
                    "elapsed": elapsed,
                    "confirmed": False,
                    "rejected_event_id": rej_event.id
                }
            elif state["is_confirmed"]:
                # Signal recovered
                state["timer_start"] = None
                state["is_confirmed"] = False
                zone.current_status = ZoneStatus.NORMAL.value
                db.commit()
                return {
                    "status": "SIGNAL_RECOVERED",
                    "confirmed": False,
                    "event_id": state["active_event_id"]
                }
            else:
                if zone.current_status != ZoneStatus.NORMAL.value:
                    zone.current_status = ZoneStatus.NORMAL.value
                    db.commit()
                return {"status": ZoneStatus.NORMAL.value, "confirmed": False}

    def reset_zone(self, zone_id: str):
        if zone_id in self.zone_timers:
            self.zone_timers[zone_id] = {
                "timer_start": None,
                "first_detected_dt": None,
                "is_confirmed": False,
                "active_event_id": None
            }

detection_engine = DetectionEngine()
