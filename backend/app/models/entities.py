import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, ForeignKeyConstraint, Text, Index
)
from sqlalchemy.orm import relationship
from app.database.session import Base

class UserRole(str, enum.Enum):
    ADMIN = "Administrator"
    OPERATOR = "Operator"
    TECHNICIAN = "Maintenance Technician"

class ZoneStatus(str, enum.Enum):
    NORMAL = "NORMAL"
    MONITORING = "MONITORING"
    WARNING = "WARNING"
    LEAKAGE_SUSPECTED = "LEAKAGE SUSPECTED"
    LEAKAGE_CONFIRMED = "LEAKAGE CONFIRMED"
    SENSOR_DISCONNECTED = "SENSOR DISCONNECTED"

class EventSeverity(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class EventStatus(str, enum.Enum):
    DETECTED = "DETECTED"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    UNDER_INVESTIGATION = "UNDER INVESTIGATION"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"

class DeviceStatus(str, enum.Enum):
    ONLINE = "ONLINE"
    OFFLINE = "OFFLINE"
    BUFFERING = "BUFFERING"
    SYNCING = "SYNCING"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), default=UserRole.OPERATOR.value)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Machine(Base):
    __tablename__ = "machines"
    id = Column(String(50), primary_key=True, index=True)  # MCH-001
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    location = Column(String(255), default="Main Hydraulic Bay 1")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    zones = relationship("Zone", back_populates="machine", cascade="all, delete-orphan")
    devices = relationship("VirtualDevice", back_populates="machine")

class Zone(Base):
    __tablename__ = "zones"
    id = Column(String(50), primary_key=True)
    machine_id = Column(String(50), ForeignKey("machines.id"), nullable=False, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    component_mapping = Column(String(100), nullable=False)
    detection_threshold = Column(Float, default=65.0)
    persistence_duration = Column(Float, default=4.0)
    severity_level = Column(String(50), default=EventSeverity.HIGH.value)
    is_enabled = Column(Boolean, default=True)
    current_status = Column(String(50), default=ZoneStatus.NORMAL.value)
    last_sensor_update = Column(DateTime, default=datetime.utcnow)

    machine = relationship("Machine", back_populates="zones")
    sensors = relationship("VirtualSensor", back_populates="zone", cascade="all, delete-orphan")
    events = relationship("LeakageEvent", back_populates="zone")

class VirtualDevice(Base):
    __tablename__ = "virtual_devices"
    id = Column(String(50), primary_key=True, index=True)  # ESP32-EDGE-01
    machine_id = Column(String(50), ForeignKey("machines.id"), nullable=False, index=True)
    connectivity_state = Column(String(50), default=DeviceStatus.ONLINE.value)
    ip_address = Column(String(50), default="192.168.1.101")
    wifi_ssid = Column(String(100), default="FACTORY-SCADA-WLAN")
    firmware_version = Column(String(50), default="v2.4.1-INNOX")
    buffer_count = Column(Integer, default=0)
    last_heartbeat = Column(DateTime, default=datetime.utcnow)

    machine = relationship("Machine", back_populates="devices")
    sensors = relationship("VirtualSensor", back_populates="device")

class VirtualSensor(Base):
    __tablename__ = "sensors"
    id = Column(String(50), primary_key=True, index=True)  # SENS-OIL-01
    machine_id = Column(String(50), nullable=False, index=True)
    zone_id = Column(String(50), nullable=False, index=True)
    device_id = Column(String(50), ForeignKey("virtual_devices.id"), nullable=False, index=True)
    sensor_type = Column(String(100), default="Optical/Conductive Oil Leak Sensor")
    simulated_signal_value = Column(Float, default=12.0)
    pressure_bar = Column(Float, default=160.0)
    temperature_c = Column(Float, default=48.0)
    flow_rate_lpm = Column(Float, default=72.0)
    is_connected = Column(Boolean, default=True)
    last_update = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        ForeignKeyConstraint(
            ["zone_id", "machine_id"],
            ["zones.id", "zones.machine_id"]
        ),
    )

    device = relationship("VirtualDevice", back_populates="sensors")
    zone = relationship("Zone", foreign_keys=[zone_id, machine_id], back_populates="sensors")

class SensorReading(Base):
    __tablename__ = "sensor_readings"
    id = Column(Integer, primary_key=True, index=True)
    sensor_id = Column(String(50), ForeignKey("sensors.id"), nullable=False, index=True)
    machine_id = Column(String(50), nullable=False, index=True)
    zone_id = Column(String(50), nullable=False, index=True)
    oil_signal_pct = Column(Float, nullable=False)
    pressure_bar = Column(Float, nullable=False)
    temperature_c = Column(Float, nullable=False)
    flow_rate_lpm = Column(Float, nullable=False)
    is_simulated = Column(Boolean, default=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    __table_args__ = (
        Index("ix_sensor_readings_machine_zone_ts", "machine_id", "zone_id", "timestamp"),
    )

class LeakageEvent(Base):
    __tablename__ = "leakage_events"
    id = Column(String(50), primary_key=True, index=True)  # EVT-001-03-XXXXX
    defect_id = Column(String(50), nullable=True, index=True)  # DEF-001-03-XXXXX
    machine_id = Column(String(50), nullable=False, index=True)
    zone_id = Column(String(50), nullable=False, index=True)
    sensor_id = Column(String(50), nullable=False, index=True)
    event_type = Column(String(100), default="Hydraulic Oil Leakage Confirmed")
    defect_type = Column(String(100), default="Hydraulic Oil Leakage", index=True)
    severity = Column(String(50), default=EventSeverity.HIGH.value, index=True)
    status = Column(String(50), default=EventStatus.DETECTED.value, index=True)
    detection_timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    confirmation_timestamp = Column(DateTime, nullable=True, index=True)
    detection_duration_sec = Column(Float, default=0.0)
    detection_reason = Column(Text, default="Signal persistence validation passed.")
    
    # Independent lifecycle timestamps (real system time in UTC)
    scenario_started_at = Column(DateTime, nullable=True)
    abnormal_detected_at = Column(DateTime, nullable=True)
    persistence_started_at = Column(DateTime, nullable=True)
    defect_confirmed_at = Column(DateTime, nullable=True, index=True)
    alert_generated_at = Column(DateTime, nullable=True)
    acknowledged_at = Column(DateTime, nullable=True)
    investigated_at = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    closed_at = Column(DateTime, nullable=True)
    
    # Snapshot telemetry at detection time
    oil_signal_pct = Column(Float, default=0.0)
    pressure_bar = Column(Float, default=160.0)
    temperature_c = Column(Float, default=48.0)
    flow_rate_lpm = Column(Float, default=72.0)
    persistence_duration_threshold = Column(Float, default=4.0)

    # Detailed engineering diagnosis & prescriptive guidance
    detection_evidence = Column(Text, nullable=True)
    diagnosis_summary = Column(Text, nullable=True)
    possible_causes = Column(Text, nullable=True)
    recommended_inspection = Column(Text, nullable=True)
    recommended_action = Column(Text, nullable=True)

    # Transient / rejection tracking
    is_rejected_transient = Column(Boolean, default=False, index=True)
    rejection_reason = Column(Text, nullable=True)
    
    acknowledgement_status = Column(Boolean, default=False)
    acknowledged_by = Column(String(255), nullable=True)
    acknowledgement_timestamp = Column(DateTime, nullable=True)
    
    investigation_status = Column(String(100), default="PENDING")
    assigned_technician = Column(String(255), nullable=True)
    maintenance_notes = Column(Text, nullable=True)
    
    resolved_by = Column(String(255), nullable=True)
    resolution_timestamp = Column(DateTime, nullable=True)
    closed_by = Column(String(255), nullable=True)
    closure_timestamp = Column(DateTime, nullable=True)
    closure_notes = Column(Text, nullable=True)

    __table_args__ = (
        ForeignKeyConstraint(
            ["zone_id", "machine_id"],
            ["zones.id", "zones.machine_id"]
        ),
        Index("ix_leakage_events_lookup", "machine_id", "zone_id", "status"),
    )

    zone = relationship("Zone", foreign_keys=[zone_id, machine_id], back_populates="events")
    activities = relationship("EventActivity", back_populates="event", cascade="all, delete-orphan", order_by="EventActivity.timestamp.asc()")

class EventActivity(Base):
    __tablename__ = "event_activities"
    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(String(50), ForeignKey("leakage_events.id"), nullable=False, index=True)
    activity_type = Column(String(100), nullable=False)
    performed_by = Column(String(255), default="System Detection Engine")
    notes = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    event = relationship("LeakageEvent", back_populates="activities")

class MaintenanceRecord(Base):
    __tablename__ = "maintenance_records"
    id = Column(String(50), primary_key=True, index=True)
    event_id = Column(String(50), nullable=True, index=True)
    machine_id = Column(String(50), nullable=False, index=True)
    zone_id = Column(String(50), nullable=False, index=True)
    schedule_type = Column(String(100), default="CORRECTIVE")
    assigned_technician = Column(String(255), nullable=False)
    repair_status = Column(String(50), default="SCHEDULED", index=True)
    inspection_findings = Column(Text, nullable=True)
    actions_taken = Column(Text, nullable=True)
    scheduled_date = Column(DateTime, default=datetime.utcnow)
    completion_time = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(String(50), nullable=True, index=True)
    machine_id = Column(String(50), nullable=False, index=True)
    zone_id = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    severity = Column(String(50), default=EventSeverity.HIGH.value)
    is_read = Column(Boolean, default=False, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

class DeviceSyncLog(Base):
    __tablename__ = "device_sync_logs"
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String(50), nullable=False, index=True)
    events_synced = Column(Integer, default=0)
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
