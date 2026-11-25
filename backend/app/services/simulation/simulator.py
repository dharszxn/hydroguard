import asyncio
import random
import time
from datetime import datetime, timezone
from typing import Dict, Optional, List
from sqlalchemy.orm import Session
from app.database.session import SessionLocal
from app.models.entities import (
    VirtualSensor, VirtualDevice, Zone, SensorReading, DeviceSyncLog, Notification,
    DeviceStatus, EventSeverity, ZoneStatus
)
from app.services.detection.engine import detection_engine
from app.websocket.manager import ws_manager

class SimulationEngine:
    def __init__(self):
        self.is_running = False
        self.is_paused = False
        self.pause_start_time = 0.0
        self.total_paused_duration = 0.0
        self.active_scenario = "scenario_1"
        self.target_machine_id = "MCH-001"
        self.target_zone_id = "ZONE-03"
        self.persistence_threshold_sec = 4.0
        self.signal_intensity = 85.0
        self.scenario_start_time = 0.0
        self.scenario_duration_sec = 30
        
        # Edge node status
        self.wifi_connected = True
        self.sensor_connected_map: Dict[str, bool] = {
            "SENS-OIL-01": True,
            "SENS-OIL-02": True,
            "SENS-OIL-03": True,
            "SENS-OIL-04": True,
            "SENS-OIL-05": True,
            "SENS-OIL-06": True,
        }
        self.buffered_events: List[Dict] = []
        self._task: Optional[asyncio.Task] = None

    async def start_simulation(self, scenario_id: str = "scenario_1", machine_id: str = "MCH-001", zone_id: str = "ZONE-03", persistence_sec: float = 4.0, intensity: float = 85.0):
        self.active_scenario = scenario_id
        self.target_machine_id = machine_id
        self.target_zone_id = zone_id
        self.persistence_threshold_sec = persistence_sec
        self.signal_intensity = intensity
        self.scenario_start_time = time.time()
        self.scenario_started_dt = datetime.now(timezone.utc)
        self.total_paused_duration = 0.0
        self.is_running = True
        self.is_paused = False

        # Reset timers in detection engine for the target zones
        for z in ["ZONE-01", "ZONE-02", "ZONE-03", "ZONE-04", "ZONE-05", "ZONE-06"]:
            detection_engine.reset_zone(z)

        # Update target zone persistence duration in DB if customized
        db = SessionLocal()
        try:
            target_zone = db.query(Zone).filter(Zone.id == zone_id, Zone.machine_id == machine_id).first()
            if target_zone:
                target_zone.persistence_duration = persistence_sec
                db.commit()
        finally:
            db.close()

        # Configure connectivity states for scenarios
        if scenario_id == "scenario_1":
            self.wifi_connected = True
            for s in self.sensor_connected_map:
                self.sensor_connected_map[s] = True
        elif scenario_id == "scenario_5":
            # Target sensor disconnection
            target_sensor_id = f"SENS-OIL-{zone_id[-2:]}"
            self.sensor_connected_map[target_sensor_id] = False
        elif scenario_id == "scenario_6":
            # Edge Node Wi-Fi failure
            self.wifi_connected = False
        else:
            self.wifi_connected = True
            for s in self.sensor_connected_map:
                self.sensor_connected_map[s] = True

        # Run immediate first tick
        try:
            await self._tick()
        except Exception as e:
            print(f"[SimulationEngine Initial Tick Error] {e}")

        # Start continuous loop task if not running
        if self._task is None or self._task.done():
            self._task = asyncio.create_task(self._simulation_loop())

    async def pause_simulation(self):
        if self.is_running and not self.is_paused:
            self.is_paused = True
            self.pause_start_time = time.time()

    async def resume_simulation(self):
        if self.is_running and self.is_paused:
            self.is_paused = False
            if self.pause_start_time > 0:
                self.total_paused_duration += (time.time() - self.pause_start_time)
            self.pause_start_time = 0.0

    async def stop_simulation(self):
        self.is_running = False
        self.is_paused = False

    async def reset_simulation(self):
        self.is_running = False
        self.is_paused = False
        self.active_scenario = "scenario_1"
        self.wifi_connected = True
        self.buffered_events.clear()
        self.total_paused_duration = 0.0
        self.pause_start_time = 0.0

        for s in self.sensor_connected_map:
            self.sensor_connected_map[s] = True
        
        # Reset all detection engine timers
        for z in ["ZONE-01", "ZONE-02", "ZONE-03", "ZONE-04", "ZONE-05", "ZONE-06"]:
            detection_engine.reset_zone(z)

        # Restore database records to clean baseline
        db = SessionLocal()
        try:
            sensors = db.query(VirtualSensor).filter(VirtualSensor.machine_id == self.target_machine_id).all()
            for s in sensors:
                s.simulated_signal_value = 8.5
                s.pressure_bar = 160.0
                s.temperature_c = 48.0
                s.flow_rate_lpm = 72.0
                s.is_connected = True
                s.last_update = datetime.now(timezone.utc)

            zones = db.query(Zone).filter(Zone.machine_id == self.target_machine_id).all()
            for z in zones:
                z.current_status = ZoneStatus.NORMAL.value
                z.persistence_duration = 4.0

            device = db.query(VirtualDevice).filter(VirtualDevice.id == "ESP32-EDGE-01").first()
            if device:
                device.connectivity_state = DeviceStatus.ONLINE.value
                device.buffer_count = 0
                device.last_heartbeat = datetime.now(timezone.utc)

            db.commit()
        except Exception as e:
            print(f"[Reset DB Error] {e}")
            db.rollback()
        finally:
            db.close()

    def set_wifi_state(self, connected: bool):
        self.wifi_connected = connected
        db = SessionLocal()
        try:
            device = db.query(VirtualDevice).filter(VirtualDevice.id == "ESP32-EDGE-01").first()
            if device:
                if not connected:
                    device.connectivity_state = DeviceStatus.OFFLINE.value
                    notif = Notification(
                        machine_id="MCH-001",
                        zone_id="ALL",
                        title="Edge Node Offline: ESP32-EDGE-01",
                        message="Wi-Fi connection lost. Edge node switched to local buffering mode.",
                        severity=EventSeverity.HIGH.value
                    )
                    db.add(notif)
                else:
                    synced_count = len(self.buffered_events)
                    device.connectivity_state = DeviceStatus.ONLINE.value
                    device.buffer_count = 0
                    sync_log = DeviceSyncLog(
                        device_id="ESP32-EDGE-01",
                        events_synced=synced_count,
                        details=f"Reconnection established. {synced_count} buffered sensor telemetry packets synced to central DB."
                    )
                    db.add(sync_log)
                    self.buffered_events.clear()
                    notif = Notification(
                        machine_id="MCH-001",
                        zone_id="ALL",
                        title="Edge Node Restored: ESP32-EDGE-01",
                        message=f"Wi-Fi connection restored. Successfully synchronized {synced_count} buffered telemetry events.",
                        severity=EventSeverity.LOW.value
                    )
                    db.add(notif)
                db.commit()
        finally:
            db.close()

    async def _simulation_loop(self):
        while self.is_running:
            await asyncio.sleep(1.0)
            if not self.is_running:
                break
            if not self.is_paused:
                try:
                    await self._tick()
                except Exception as e:
                    print(f"[SimulationEngine Error] {e}")

    async def _tick(self):
        db = SessionLocal()
        try:
            now = datetime.now(timezone.utc)
            effective_elapsed = (time.time() - self.scenario_start_time) - self.total_paused_duration
            
            sensors = db.query(VirtualSensor).filter(VirtualSensor.machine_id == self.target_machine_id).all()
            device = db.query(VirtualDevice).filter(VirtualDevice.id == "ESP32-EDGE-01").first()
            
            if device:
                device.last_heartbeat = now
                if not self.wifi_connected:
                    device.connectivity_state = DeviceStatus.OFFLINE.value
                    device.buffer_count = len(self.buffered_events)
                else:
                    device.connectivity_state = DeviceStatus.ONLINE.value
                    device.buffer_count = 0

            latest_readings = []

            for sensor in sensors:
                zone_id = sensor.zone_id
                sensor_id = sensor.id
                is_connected = self.sensor_connected_map.get(sensor_id, True)
                sensor.is_connected = is_connected

                # Clean nominal values
                oil_pct = 7.0 + random.uniform(0.0, 4.0)
                pressure_bar = 160.0 + random.uniform(-1.5, 1.5)
                flow_lpm = 72.0 + random.uniform(-1.0, 1.0)
                temp_c = 48.0 + random.uniform(-0.5, 0.5)

                if is_connected:
                    if self.active_scenario == "scenario_1":
                        # Scenario 1: Normal Operation (Clean, steady noise)
                        oil_pct = 7.0 + random.uniform(0.0, 3.5)

                    elif self.active_scenario == "scenario_2":
                        # Scenario 2: Gradual Leakage (Ramps from 30% to 85% over 4s)
                        if zone_id == self.target_zone_id:
                            ramp = min(1.0, max(0.0, effective_elapsed / 4.0))
                            oil_pct = 30.0 + ramp * (self.signal_intensity - 30.0) + random.uniform(-0.5, 0.5)
                            pressure_bar = 160.0 - ramp * 16.0
                            temp_c = 48.0 + ramp * 4.0

                    elif self.active_scenario == "scenario_3":
                        # Scenario 3: Sudden Leakage (Immediate step to high intensity)
                        if zone_id == self.target_zone_id:
                            oil_pct = self.signal_intensity + random.uniform(-2.0, 2.0)
                            pressure_bar = 142.0 + random.uniform(-1.5, 1.5)
                            flow_lpm = 66.0 + random.uniform(-1.0, 1.0)

                    elif self.active_scenario == "scenario_4":
                        # Scenario 4: Transient Splash / False Alarm Rejection
                        # Elevated for 2.5s, then clears back to baseline (< persistence threshold 4.0s)
                        if zone_id == self.target_zone_id:
                            if effective_elapsed < 2.5:
                                oil_pct = 85.0 + random.uniform(0.0, 3.0)
                            else:
                                oil_pct = 8.0 + random.uniform(0.0, 3.0)

                    elif self.active_scenario == "scenario_5":
                        # Scenario 5: Sensor Disconnection
                        if zone_id == self.target_zone_id:
                            is_connected = False
                            sensor.is_connected = False
                            oil_pct = 0.0

                    elif self.active_scenario == "scenario_6":
                        # Scenario 6: Edge Wi-Fi Disconnection (Leak generated, buffered locally)
                        if zone_id == self.target_zone_id:
                            oil_pct = 80.0 + random.uniform(0.0, 4.0)

                    elif self.active_scenario == "scenario_7":
                        # Scenario 7: Critical Leakage & Pressure Plunge
                        if zone_id == self.target_zone_id:
                            oil_pct = 98.0 + random.uniform(-0.5, 1.0)
                            pressure_bar = 85.0 + random.uniform(-3.0, 3.0)
                            flow_lpm = 42.0 + random.uniform(-2.0, 2.0)
                            temp_c = 63.0 + random.uniform(0.0, 2.0)

                    elif self.active_scenario == "scenario_8":
                        # Scenario 8: Multiple Zone Leakage (Both ZONE-01 and ZONE-03 stimulated)
                        if zone_id in ["ZONE-01", "ZONE-03"]:
                            oil_pct = 86.0 + random.uniform(-1.5, 2.5)
                            pressure_bar = 138.0 + random.uniform(-2.0, 2.0)

                    elif self.active_scenario == "scenario_9":
                        # Scenario 9: Pressure Drop without Leak Signal (Tests that pressure drop alone is NOT an oil leak!)
                        if zone_id == self.target_zone_id:
                            oil_pct = 7.0 + random.uniform(0.0, 3.0)  # Clean oil signal!
                            pressure_bar = 112.0 + random.uniform(-2.0, 2.0)  # Significant pressure drop
                            flow_lpm = 58.0 + random.uniform(-1.5, 1.5)

                oil_pct = max(0.0, min(100.0, oil_pct))
                sensor.simulated_signal_value = round(oil_pct, 1)
                sensor.pressure_bar = round(pressure_bar, 1)
                sensor.temperature_c = round(temp_c, 1)
                sensor.flow_rate_lpm = round(flow_lpm, 1)
                sensor.last_update = now

                if not self.wifi_connected:
                    self.buffered_events.append({
                        "sensor_id": sensor_id,
                        "oil_pct": oil_pct,
                        "timestamp": now.isoformat()
                    })
                else:
                    detection_result = detection_engine.process_sensor_signal(
                        db=db,
                        machine_id=self.target_machine_id,
                        zone_id=zone_id,
                        sensor_id=sensor_id,
                        raw_signal=oil_pct,
                        pressure_bar=pressure_bar,
                        temperature_c=temp_c,
                        flow_rate_lpm=flow_lpm,
                        is_sensor_connected=is_connected,
                        is_wifi_connected=self.wifi_connected,
                        scenario_started_at=getattr(self, "scenario_started_dt", None)
                    )

                reading = SensorReading(
                    sensor_id=sensor_id,
                    machine_id=self.target_machine_id,
                    zone_id=zone_id,
                    oil_signal_pct=round(oil_pct, 1),
                    pressure_bar=round(pressure_bar, 1),
                    temperature_c=round(temp_c, 1),
                    flow_rate_lpm=round(flow_lpm, 1),
                    is_simulated=True,
                    timestamp=now
                )
                db.add(reading)

                latest_readings.append({
                    "sensor_id": sensor_id,
                    "zone_id": zone_id,
                    "machine_id": self.target_machine_id,
                    "oil_signal_pct": round(oil_pct, 1),
                    "pressure_bar": round(pressure_bar, 1),
                    "temperature_c": round(temp_c, 1),
                    "flow_rate_lpm": round(flow_lpm, 1),
                    "is_connected": is_connected,
                    "timestamp": now.isoformat()
                })

            db.commit()

            zone_states = []
            zones = db.query(Zone).filter(Zone.machine_id == self.target_machine_id).all()
            for z in zones:
                zone_states.append({
                    "zone_id": z.id,
                    "name": z.name,
                    "status": z.current_status,
                    "component_mapping": z.component_mapping
                })

            await ws_manager.broadcast({
                "type": "TELEMETRY_UPDATE",
                "timestamp": now.isoformat(),
                "active_scenario": self.active_scenario,
                "readings": latest_readings,
                "zones": zone_states,
                "wifi_connected": self.wifi_connected,
                "buffer_count": len(self.buffered_events)
            })

        finally:
            db.close()

simulation_engine = SimulationEngine()
