from pydantic import BaseModel, Field, field_serializer
from typing import Optional, List
from datetime import datetime, timezone

# Auth Schemas
class LoginRequest(BaseModel):
    email: str
    password: str
    remember_me: Optional[bool] = False

class RegisterRequest(BaseModel):
    full_name: str
    email: str
    password: str
    role: str = "Operator"

class SetupAdminRequest(BaseModel):
    full_name: str
    email: str
    password: str

class SetupStatusResponse(BaseModel):
    is_setup_required: bool
    user_count: int

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    is_active: bool

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Machine Schemas
class MachineBase(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    location: Optional[str] = "Main Hydraulic Bay 1"
    is_active: bool = True

class MachineCreate(MachineBase):
    pass

class MachineResponse(MachineBase):
    total_zones: int = 0
    healthy_zones: int = 0
    warning_zones: int = 0
    active_events: int = 0
    overall_condition: str = "NORMAL"

# Zone Schemas
class ZoneBase(BaseModel):
    id: str
    machine_id: str
    name: str
    component_mapping: str
    detection_threshold: float = 65.0
    persistence_duration: float = 4.0
    severity_level: str = "HIGH"
    is_enabled: bool = True

class ZoneCreate(ZoneBase):
    pass

class ZoneUpdate(BaseModel):
    name: Optional[str] = None
    detection_threshold: Optional[float] = None
    persistence_duration: Optional[float] = None
    severity_level: Optional[str] = None
    is_enabled: Optional[bool] = None

class ZoneResponse(ZoneBase):
    current_status: str
    last_sensor_update: Optional[datetime] = None
    sensor_id: Optional[str] = None
    simulated_signal_value: Optional[float] = 0.0
    pressure_bar: Optional[float] = 160.0
    temperature_c: Optional[float] = 48.0
    flow_rate_lpm: Optional[float] = 72.0
    is_connected: bool = True

# Virtual Sensor Schemas
class SensorBase(BaseModel):
    id: str
    machine_id: str
    zone_id: str
    device_id: str
    sensor_type: str = "Optical/Conductive Oil Leak Sensor"

class SensorResponse(SensorBase):
    simulated_signal_value: float
    pressure_bar: float
    temperature_c: float
    flow_rate_lpm: float
    is_connected: bool
    last_update: datetime

# Virtual Device Schemas
class DeviceResponse(BaseModel):
    id: str
    machine_id: str
    connectivity_state: str
    ip_address: str
    wifi_ssid: str
    firmware_version: str
    buffer_count: int
    last_heartbeat: datetime

# Sensor Reading Schemas
class SensorReadingResponse(BaseModel):
    id: int
    sensor_id: str
    machine_id: str
    zone_id: str
    oil_signal_pct: float
    pressure_bar: float
    temperature_c: float
    flow_rate_lpm: float
    is_simulated: bool
    timestamp: datetime

# Event Schemas
class EventActivityResponse(BaseModel):
    id: int
    activity_type: str
    performed_by: str
    notes: Optional[str]
    timestamp: datetime

    @field_serializer("timestamp", check_fields=False)
    def serialize_activity_ts(self, dt: Optional[datetime], _info):
        if dt is None:
            return None
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()

class LeakageEventResponse(BaseModel):
    id: str
    defect_id: Optional[str] = None
    machine_id: str
    zone_id: str
    sensor_id: str
    event_type: str
    defect_type: Optional[str] = "Hydraulic Oil Leakage"
    severity: str
    status: str
    detection_timestamp: datetime
    confirmation_timestamp: Optional[datetime] = None
    detection_duration_sec: float
    detection_reason: str
    oil_signal_pct: Optional[float] = 0.0
    pressure_bar: Optional[float] = 160.0
    temperature_c: Optional[float] = 48.0
    flow_rate_lpm: Optional[float] = 72.0
    persistence_duration_threshold: Optional[float] = 4.0
    detection_evidence: Optional[str] = None
    diagnosis_summary: Optional[str] = None
    possible_causes: Optional[str] = None
    recommended_inspection: Optional[str] = None
    recommended_action: Optional[str] = None
    is_rejected_transient: bool = False
    rejection_reason: Optional[str] = None
    acknowledgement_status: bool
    acknowledged_by: Optional[str] = None
    acknowledgement_timestamp: Optional[datetime] = None
    investigation_status: str
    assigned_technician: Optional[str] = None
    maintenance_notes: Optional[str] = None
    resolved_by: Optional[str] = None
    resolution_timestamp: Optional[datetime] = None
    closed_by: Optional[str] = None
    closure_timestamp: Optional[datetime] = None
    closure_notes: Optional[str] = None
    
    # Independent lifecycle timestamps (real system time in UTC)
    scenario_started_at: Optional[datetime] = None
    abnormal_detected_at: Optional[datetime] = None
    persistence_started_at: Optional[datetime] = None
    defect_confirmed_at: Optional[datetime] = None
    alert_generated_at: Optional[datetime] = None
    acknowledged_at: Optional[datetime] = None
    investigated_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None

    activities: List[EventActivityResponse] = []

    @field_serializer(
        "detection_timestamp",
        "confirmation_timestamp",
        "acknowledgement_timestamp",
        "resolution_timestamp",
        "closure_timestamp",
        "scenario_started_at",
        "abnormal_detected_at",
        "persistence_started_at",
        "defect_confirmed_at",
        "alert_generated_at",
        "acknowledged_at",
        "investigated_at",
        "resolved_at",
        "closed_at",
        check_fields=False
    )
    def serialize_event_ts(self, dt: Optional[datetime], _info):
        if dt is None:
            return None
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()

class DefectReportResponse(BaseModel):
    defect_id: str
    event_id: str
    machine_id: str
    machine_name: str
    zone_id: str
    component_name: str
    sensor_id: str
    defect_type: str
    severity: str
    detection_timestamp: datetime
    confirmation_timestamp: Optional[datetime] = None
    persistence_duration: float
    persistence_duration_threshold: float
    oil_signal_pct: float
    pressure_bar: float
    flow_rate_lpm: float
    temperature_c: float
    sensor_status: str
    detection_method: str = "Rule-Based Persistence Validation"
    detection_evidence: str
    diagnosis: str
    possible_causes: List[str]
    recommended_inspection: str
    recommended_action: str
    current_status: str
    acknowledgement_status: bool
    acknowledged_by: Optional[str] = None
    acknowledgement_timestamp: Optional[datetime] = None
    investigation_status: str = "PENDING"
    assigned_technician: Optional[str] = None
    maintenance_notes: Optional[str] = None
    resolved_by: Optional[str] = None
    resolution_timestamp: Optional[datetime] = None
    closed_by: Optional[str] = None
    closure_timestamp: Optional[datetime] = None
    closure_notes: Optional[str] = None

    # Independent lifecycle timestamps (real system time in UTC)
    scenario_started_at: Optional[datetime] = None
    abnormal_detected_at: Optional[datetime] = None
    persistence_started_at: Optional[datetime] = None
    defect_confirmed_at: Optional[datetime] = None
    alert_generated_at: Optional[datetime] = None
    acknowledged_at: Optional[datetime] = None
    investigated_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None

    timeline: List[EventActivityResponse] = []

    @field_serializer(
        "detection_timestamp",
        "confirmation_timestamp",
        "acknowledgement_timestamp",
        "resolution_timestamp",
        "closure_timestamp",
        "scenario_started_at",
        "abnormal_detected_at",
        "persistence_started_at",
        "defect_confirmed_at",
        "alert_generated_at",
        "acknowledged_at",
        "investigated_at",
        "resolved_at",
        "closed_at",
        check_fields=False
    )
    def serialize_report_ts(self, dt: Optional[datetime], _info):
        if dt is None:
            return None
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()

class EventAcknowledgeRequest(BaseModel):
    user_name: str = "Operator John Doe"
    notes: Optional[str] = "Leakage alarm acknowledged. Dispatching inspection."

class EventInvestigateRequest(BaseModel):
    technician_name: str
    investigation_status: str = "IN_PROGRESS"
    notes: str

class EventResolveRequest(BaseModel):
    resolved_by: str
    notes: str

class EventCloseRequest(BaseModel):
    closed_by: str
    closure_notes: str

# Simulation Schemas
class SimulationScenarioRequest(BaseModel):
    scenario_id: str  # scenario_1 to scenario_8
    machine_id: Optional[str] = "MCH-001"
    zone_id: Optional[str] = "ZONE-03"
    persistence_seconds: Optional[float] = 4.0
    signal_intensity: Optional[float] = 85.0
    duration_seconds: Optional[int] = 30

class SimulationStatusResponse(BaseModel):
    is_running: bool
    is_paused: bool = False
    active_scenario: Optional[str]
    machine_id: str
    zone_id: str
    persistence_threshold_sec: float
    current_signal_pct: float
    signal_timer_active: bool
    elapsed_persistence_sec: float
    leak_confirmed: bool
    wifi_connected: bool
    sensor_connected: bool
    buffer_count: int
    validation_state: Optional[str] = "NORMAL"

# Maintenance Schemas
class MaintenanceCreate(BaseModel):
    event_id: Optional[str] = None
    machine_id: str
    zone_id: str
    schedule_type: str = "CORRECTIVE"
    assigned_technician: str
    inspection_findings: Optional[str] = None
    actions_taken: Optional[str] = None

class MaintenanceResponse(BaseModel):
    id: str
    event_id: Optional[str]
    machine_id: str
    zone_id: str
    schedule_type: str
    assigned_technician: str
    repair_status: str
    inspection_findings: Optional[str]
    actions_taken: Optional[str]
    scheduled_date: datetime
    completion_time: Optional[datetime]
    created_at: datetime

# Analytics Schemas
class AnalyticsOverviewResponse(BaseModel):
    total_events: int
    confirmed_detections: int
    false_alarms_rejected: int
    missed_detections: int
    avg_detection_time_sec: float
    avg_acknowledgement_time_sec: float
    avg_closure_time_sec: float
    zone_identification_accuracy_pct: float
    precision_pct: float

# Notification Schemas
class NotificationResponse(BaseModel):
    id: int
    event_id: Optional[str]
    machine_id: str
    zone_id: str
    title: str
    message: str
    severity: str
    is_read: bool
    timestamp: datetime

