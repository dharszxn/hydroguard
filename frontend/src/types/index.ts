export type UserRole = 'Administrator' | 'Operator' | 'Maintenance Technician';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
}

export type ZoneStatus =
  | 'NORMAL'
  | 'MONITORING'
  | 'WARNING'
  | 'LEAKAGE SUSPECTED'
  | 'LEAKAGE CONFIRMED'
  | 'LEAKAGE_SUSPECTED'
  | 'LEAKAGE_CONFIRMED'
  | 'SENSOR DISCONNECTED'
  | 'SENSOR_DISCONNECTED';

export type EventSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type EventStatus =
  | 'DETECTED'
  | 'ACKNOWLEDGED'
  | 'UNDER INVESTIGATION'
  | 'RESOLVED'
  | 'CLOSED';

export type DeviceConnectivity = 'ONLINE' | 'OFFLINE' | 'BUFFERING' | 'SYNCING';

export interface Machine {
  id: string;
  name: string;
  description?: string;
  location?: string;
  is_active: boolean;
  total_zones: number;
  healthy_zones: number;
  warning_zones: number;
  active_events: number;
  overall_condition: 'NORMAL' | 'WARNING' | 'CRITICAL';
}

export interface Zone {
  id: string;
  machine_id: string;
  name: string;
  component_mapping: string;
  detection_threshold: number;
  persistence_duration: number;
  severity_level: EventSeverity;
  is_enabled: boolean;
  current_status: ZoneStatus;
  last_sensor_update?: string;
  sensor_id?: string;
  simulated_signal_value: number;
  pressure_bar: number;
  temperature_c: number;
  flow_rate_lpm: number;
  is_connected: boolean;
}

export interface VirtualSensor {
  id: string;
  machine_id: string;
  zone_id: string;
  device_id: string;
  sensor_type: string;
  simulated_signal_value: number;
  pressure_bar: number;
  temperature_c: number;
  flow_rate_lpm: number;
  is_connected: boolean;
  last_update: string;
}

export interface VirtualDevice {
  id: string;
  machine_id: string;
  connectivity_state: DeviceConnectivity;
  ip_address: string;
  wifi_ssid: string;
  firmware_version: string;
  buffer_count: number;
  last_heartbeat: string;
}

export interface EventActivity {
  id: number;
  activity_type: string;
  performed_by: string;
  notes?: string;
  timestamp: string;
}

export interface LeakageEvent {
  id: string;
  defect_id?: string;
  machine_id: string;
  zone_id: string;
  sensor_id: string;
  event_type: string;
  defect_type?: string;
  severity: EventSeverity;
  status: EventStatus | 'REJECTED';
  detection_timestamp: string;
  confirmation_timestamp?: string;
  detection_duration_sec: number;
  detection_reason: string;
  oil_signal_pct?: number;
  pressure_bar?: number;
  temperature_c?: number;
  flow_rate_lpm?: number;
  persistence_duration_threshold?: number;
  detection_evidence?: string;
  diagnosis_summary?: string;
  possible_causes?: string;
  recommended_inspection?: string;
  recommended_action?: string;
  is_rejected_transient?: boolean;
  rejection_reason?: string;
  acknowledgement_status: boolean;
  acknowledged_by?: string;
  acknowledgement_timestamp?: string;
  investigation_status: string;
  assigned_technician?: string;
  maintenance_notes?: string;
  resolved_by?: string;
  resolution_timestamp?: string;
  closed_by?: string;
  closure_timestamp?: string;
  closure_notes?: string;

  // Independent lifecycle timestamps
  scenario_started_at?: string;
  abnormal_detected_at?: string;
  persistence_started_at?: string;
  defect_confirmed_at?: string;
  alert_generated_at?: string;
  acknowledged_at?: string;
  investigated_at?: string;
  resolved_at?: string;
  closed_at?: string;

  activities: EventActivity[];
}

export interface DefectReport {
  defect_id: string;
  event_id: string;
  machine_id: string;
  machine_name: string;
  zone_id: string;
  component_name: string;
  sensor_id: string;
  defect_type: string;
  severity: EventSeverity;
  detection_timestamp: string;
  confirmation_timestamp?: string;
  persistence_duration: number;
  persistence_duration_threshold: number;
  oil_signal_pct: number;
  pressure_bar: number;
  flow_rate_lpm: number;
  temperature_c: number;
  sensor_status: string;
  detection_method: string;
  detection_evidence: string;
  diagnosis: string;
  possible_causes: string[];
  recommended_inspection: string;
  recommended_action: string;
  current_status: EventStatus | string;
  acknowledgement_status: boolean;
  acknowledged_by?: string;
  acknowledgement_timestamp?: string;
  investigation_status: string;
  assigned_technician?: string;
  maintenance_notes?: string;
  resolved_by?: string;
  resolution_timestamp?: string;
  closed_by?: string;
  closure_timestamp?: string;
  closure_notes?: string;

  // Independent lifecycle timestamps
  scenario_started_at?: string;
  abnormal_detected_at?: string;
  persistence_started_at?: string;
  defect_confirmed_at?: string;
  alert_generated_at?: string;
  acknowledged_at?: string;
  investigated_at?: string;
  resolved_at?: string;
  closed_at?: string;

  timeline: EventActivity[];
}

export interface MaintenanceRecord {
  id: string;
  event_id?: string;
  machine_id: string;
  zone_id: string;
  schedule_type: string;
  assigned_technician: string;
  repair_status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  inspection_findings?: string;
  actions_taken?: string;
  scheduled_date: string;
  completion_time?: string;
  created_at: string;
}

export interface NotificationItem {
  id: number;
  event_id?: string;
  machine_id: string;
  zone_id: string;
  title: string;
  message: string;
  severity: EventSeverity;
  is_read: boolean;
  timestamp: string;
}

export interface SimulationStatus {
  is_running: boolean;
  is_paused: boolean;
  active_scenario: string;
  machine_id: string;
  zone_id: string;
  persistence_threshold_sec: number;
  current_signal_pct: number;
  signal_timer_active: boolean;
  elapsed_persistence_sec: number;
  leak_confirmed: boolean;
  wifi_connected: boolean;
  sensor_connected: boolean;
  buffer_count: number;
  validation_state?: string;
}

export interface TelemetryReading {
  sensor_id: string;
  zone_id: string;
  machine_id: string;
  oil_signal_pct: number;
  pressure_bar: number;
  temperature_c: number;
  flow_rate_lpm: number;
  is_connected: boolean;
  timestamp: string;
}

export interface TelemetryMessage {
  type: string;
  timestamp: string;
  active_scenario: string;
  readings: TelemetryReading[];
  zones: {
    zone_id: string;
    name: string;
    status: ZoneStatus;
    component_mapping: string;
  }[];
  wifi_connected: boolean;
  buffer_count: number;
}
