import React, { useState } from 'react';
import { Button, Tag, Space, Modal, Input, message } from 'antd';
import {
  AlertTriangle, ShieldAlert, CheckCircle2, Clock, Wrench, CheckCircle,
  FileText, Activity, Droplets, Gauge, Thermometer, ChevronRight, User, Info
} from 'lucide-react';
import { DefectReport, TelemetryReading, Zone, ZoneStatus } from '../../types';
import { tokens } from '../../styles/tokens';
import { StatusBadge } from '../common/StatusBadge';
import { formatIST } from '../../utils/dateUtils';

interface LiveDefectReportPanelProps {
  selectedZone: Zone;
  currentTelemetry: TelemetryReading;
  currentStatus: ZoneStatus;
  activeReports: DefectReport[];
  selectedReportId?: string;
  onSelectReportId?: (id: string) => void;
  onAcknowledge: (eventId: string, notes?: string) => Promise<void>;
  onInvestigate: (eventId: string, technician: string, notes: string) => Promise<void>;
  onResolve: (eventId: string, resolvedBy: string, notes: string) => Promise<void>;
  onClose: (eventId: string, closedBy: string, notes: string) => Promise<void>;
  onViewFullReport: (eventId: string) => void;
}

export const LiveDefectReportPanel: React.FC<LiveDefectReportPanelProps> = ({
  selectedZone,
  currentTelemetry,
  currentStatus,
  activeReports,
  selectedReportId,
  onSelectReportId,
  onAcknowledge,
  onInvestigate,
  onResolve,
  onClose,
  onViewFullReport
}) => {
  const [actionModal, setActionModal] = useState<{
    visible: boolean;
    type: 'investigate' | 'resolve' | 'close' | null;
    eventId: string;
    technicianOrUser: string;
    notes: string;
  }>({
    visible: false,
    type: null,
    eventId: '',
    technicianOrUser: '',
    notes: ''
  });

  const [loading, setLoading] = useState(false);

  // Active report for current selection or first available
  const report = activeReports.find(r => r.event_id === selectedReportId) || activeReports[0];

  const handleActionSubmit = async () => {
    if (!actionModal.type || !actionModal.eventId) return;
    setLoading(true);
    try {
      if (actionModal.type === 'investigate') {
        await onInvestigate(actionModal.eventId, actionModal.technicianOrUser || 'Tech Lead R. Kumar', actionModal.notes || 'Inspection dispatched.');
        message.success('Investigation started.');
      } else if (actionModal.type === 'resolve') {
        await onResolve(actionModal.eventId, actionModal.technicianOrUser || 'Chief Maintenance Eng. V. Selvam', actionModal.notes || 'Component seal replaced and pressure tested.');
        message.success('Defect marked as resolved.');
      } else if (actionModal.type === 'close') {
        await onClose(actionModal.eventId, actionModal.technicianOrUser || 'Quality Lead M. David', actionModal.notes || 'Verified 10 operating cycles with zero leakage. Event closed.');
        message.success('Event officially closed and archived.');
      }
      setActionModal({ visible: false, type: null, eventId: '', technicianOrUser: '', notes: '' });
    } catch (e: any) {
      message.error(e?.response?.data?.detail || 'Action failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="scada-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', width: 380, overflow: 'hidden' }}>
      {/* Header */}
      <div className="scada-panel-header" style={{ padding: '8px 12px', background: '#FFFFFF', borderBottom: `1px solid ${tokens.colors.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Activity size={15} color={tokens.colors.steel} />
          <span style={{ fontSize: 12, fontWeight: 700, color: tokens.colors.navy, letterSpacing: '0.04em' }}>
            {activeReports.length > 0 ? 'LIVE DEFECT DIAGNOSIS & HUD' : 'COMPONENT TELEMETRY HUD'}
          </span>
        </div>
        {activeReports.length > 0 ? (
          <Tag color="error" style={{ margin: 0, fontWeight: 700, fontSize: 10 }}>
            {activeReports.length} ACTIVE DEFECT{activeReports.length > 1 ? 'S' : ''}
          </Tag>
        ) : (
          <StatusBadge status={currentStatus} />
        )}
      </div>

      {/* Multi-Defect Switcher Tabs if >1 active defect */}
      {activeReports.length > 1 && (
        <div style={{ display: 'flex', gap: 4, padding: '6px 12px', background: '#F1F5F9', borderBottom: `1px solid ${tokens.colors.border}`, overflowX: 'auto' }}>
          {activeReports.map((r, i) => {
            const isSel = (report?.event_id === r.event_id);
            return (
              <button
                key={r.event_id}
                onClick={() => onSelectReportId && onSelectReportId(r.event_id)}
                style={{
                  padding: '3px 8px',
                  borderRadius: 3,
                  border: isSel ? '1.5px solid #DC2626' : '1px solid #CBD5E1',
                  background: isSel ? '#FEE2E2' : '#FFFFFF',
                  color: isSel ? '#B91C1C' : '#475569',
                  fontSize: 10,
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                Defect #{i + 1}: {r.zone_id}
              </button>
            );
          })}
        </div>
      )}

      {/* Scrollable Body */}
      <div style={{ padding: '12px 14px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Component Header Identity */}
        <div style={{ borderBottom: `1px solid ${tokens.colors.border}`, paddingBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: 11, fontFamily: tokens.fonts.mono, color: tokens.colors.textMuted }}>
              ZONE ID: {report ? report.zone_id : selectedZone.id}
            </span>
            <span style={{ fontSize: 10, color: tokens.colors.textMuted }}>
              Sensor: SENS-OIL-{(report ? report.zone_id : selectedZone.id).slice(-2)}
            </span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: tokens.colors.navy, marginTop: 2 }}>
            {report ? report.component_name : selectedZone.name}
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* CASE A: ACTIVE DEFECT REPORT VISIBLE                          */}
        {/* ------------------------------------------------------------- */}
        {report ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Defect Banner */}
            <div style={{
              background: '#FEF2F2',
              border: '1px solid #FCA5A5',
              borderRadius: 4,
              padding: '10px 12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 10, fontFamily: tokens.fonts.mono, color: '#991B1B', fontWeight: 700 }}>
                    HYDRAULIC DEFECT REPORT
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#991B1B', marginTop: 2 }}>
                    {report.defect_type}
                  </div>
                  <div style={{ fontSize: 10, color: '#7F1D1D', fontFamily: tokens.fonts.mono }}>
                    Defect ID: <strong>{report.defect_id}</strong>
                  </div>
                </div>
                <Tag color="error" style={{ fontWeight: 700, margin: 0 }}>
                  {report.severity}
                </Tag>
              </div>

              <div style={{ fontSize: 10, color: '#7F1D1D', marginTop: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div>Detected (IST): <strong>{formatIST(report.detection_timestamp)}</strong></div>
                <div>Lifecycle Status: <strong>{report.current_status}</strong></div>
              </div>
            </div>

            {/* Sensor Evidence Grid */}
            <div style={{ background: '#FAFBFC', border: `1px solid ${tokens.colors.border}`, borderRadius: 4, padding: '8px 10px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: tokens.colors.navy, textTransform: 'uppercase', marginBottom: 6 }}>
                Sensor Evidence & Telemetry Snapshot
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 11 }}>
                <div>
                  <span style={{ color: tokens.colors.textMuted, fontSize: 10 }}>Oil Leak Signal:</span>
                  <div style={{ fontWeight: 700, color: report.oil_signal_pct > 65 ? tokens.colors.critical : tokens.colors.navy }}>
                    {report.oil_signal_pct.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <span style={{ color: tokens.colors.textMuted, fontSize: 10 }}>Circuit Pressure:</span>
                  <div style={{ fontWeight: 700, color: tokens.colors.navy }}>
                    {report.pressure_bar.toFixed(1)} bar
                  </div>
                </div>
                <div>
                  <span style={{ color: tokens.colors.textMuted, fontSize: 10 }}>Flow Rate:</span>
                  <div style={{ fontWeight: 700, color: tokens.colors.navy }}>
                    {report.flow_rate_lpm.toFixed(1)} LPM
                  </div>
                </div>
                <div>
                  <span style={{ color: tokens.colors.textMuted, fontSize: 10 }}>Temperature:</span>
                  <div style={{ fontWeight: 700, color: tokens.colors.navy }}>
                    {report.temperature_c.toFixed(1)} °C
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 10, color: tokens.colors.textMuted, marginTop: 6, borderTop: '1px dashed #E2E8F0', paddingTop: 4 }}>
                Persistence Duration: <strong>{report.persistence_duration.toFixed(1)}s</strong> (Criteria: &ge; {report.persistence_duration_threshold.toFixed(1)}s)
              </div>
            </div>

            {/* Diagnosis & Classification Reason */}
            <div style={{ background: '#F8FAFC', border: `1px solid ${tokens.colors.border}`, borderRadius: 4, padding: '8px 10px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: tokens.colors.navy, textTransform: 'uppercase', marginBottom: 4 }}>
                Diagnostic Narrative
              </div>
              <div style={{ fontSize: 11, color: '#334155', lineHeight: '1.4' }}>
                {report.diagnosis}
              </div>
            </div>

            {/* Possible Causes (Suggested) */}
            <div style={{ background: '#FFFFFF', border: `1px solid ${tokens.colors.border}`, borderRadius: 4, padding: '8px 10px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#D97706', textTransform: 'uppercase', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                <AlertTriangle size={12} />
                <span>Possible Causes (Suggestions)</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 10.5, color: '#475569', lineHeight: '1.4' }}>
                {report.possible_causes.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>

            {/* Recommended Corrective Actions */}
            <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 4, padding: '8px 10px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#166534', textTransform: 'uppercase', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Wrench size={12} />
                <span>Recommended Actions</span>
              </div>
              <div style={{ fontSize: 10.5, color: '#14532D', lineHeight: '1.4' }}>
                <div><strong>Inspection:</strong> {report.recommended_inspection}</div>
                <div style={{ marginTop: 4 }}><strong>Action:</strong> {report.recommended_action}</div>
              </div>
            </div>

            {/* Event Lifecycle Actions */}
            <div style={{ background: '#FFFFFF', border: `1px solid ${tokens.colors.border}`, borderRadius: 4, padding: '10px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: tokens.colors.navy, textTransform: 'uppercase', marginBottom: 8 }}>
                Maintenance Lifecycle Actions
              </div>
              <Space direction="vertical" style={{ width: '100%' }}>
                {!report.acknowledgement_status && (
                  <Button
                    type="primary"
                    block
                    size="small"
                    style={{ background: '#D97706', borderColor: '#D97706', fontWeight: 600 }}
                    onClick={async () => {
                      await onAcknowledge(report.event_id, 'Lead Operator acknowledged alarm on HUD.');
                      message.success('Alarm acknowledged.');
                    }}
                  >
                    1. Acknowledge Alarm
                  </Button>
                )}

                {report.acknowledgement_status && report.investigation_status === 'PENDING' && (
                  <Button
                    type="primary"
                    block
                    size="small"
                    style={{ background: '#2563EB', borderColor: '#2563EB', fontWeight: 600 }}
                    onClick={() => setActionModal({
                      visible: true,
                      type: 'investigate',
                      eventId: report.event_id,
                      technicianOrUser: 'Tech Lead R. Kumar',
                      notes: 'Dispatched maintenance tech for physical inspection.'
                    })}
                  >
                    2. Start Investigation
                  </Button>
                )}

                {report.investigation_status !== 'PENDING' && report.current_status !== 'RESOLVED' && report.current_status !== 'CLOSED' && (
                  <Button
                    type="primary"
                    block
                    size="small"
                    style={{ background: '#16A34A', borderColor: '#16A34A', fontWeight: 600 }}
                    onClick={() => setActionModal({
                      visible: true,
                      type: 'resolve',
                      eventId: report.event_id,
                      technicianOrUser: 'Chief Maintenance Eng. V. Selvam',
                      notes: 'O-ring seal renewed and bolted to spec. Leak resolved.'
                    })}
                  >
                    3. Mark as Resolved
                  </Button>
                )}

                {report.current_status === 'RESOLVED' && (
                  <Button
                    type="primary"
                    block
                    size="small"
                    style={{ background: '#475569', borderColor: '#475569', fontWeight: 600 }}
                    onClick={() => setActionModal({
                      visible: true,
                      type: 'close',
                      eventId: report.event_id,
                      technicianOrUser: 'Quality Supervisor M. David',
                      notes: 'Post-repair inspection confirmed 0% leak over 10 test cycles. Closed.'
                    })}
                  >
                    4. Close Event Officially
                  </Button>
                )}

                <Button
                  block
                  size="small"
                  icon={<FileText size={13} />}
                  onClick={() => onViewFullReport(report.event_id)}
                >
                  View Full Defect Dossier &rarr;
                </Button>
              </Space>
            </div>

            {/* Lifecycle Timestamps in IST */}
            <div style={{ background: '#F8FAFC', border: `1px solid ${tokens.colors.border}`, borderRadius: 4, padding: '8px 10px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: tokens.colors.navy, textTransform: 'uppercase', marginBottom: 6 }}>
                Lifecycle Timestamps (IST)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 4, fontSize: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: tokens.colors.textMuted }}>Abnormal Detected:</span>
                  <span style={{ fontWeight: 600, fontFamily: tokens.fonts.mono }}>{formatIST(report.abnormal_detected_at || report.detection_timestamp)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: tokens.colors.textMuted }}>Defect Confirmed:</span>
                  <span style={{ fontWeight: 600, fontFamily: tokens.fonts.mono }}>{formatIST(report.defect_confirmed_at || report.confirmation_timestamp)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: tokens.colors.textMuted }}>Acknowledged:</span>
                  <span style={{ fontWeight: 600, fontFamily: tokens.fonts.mono }}>{formatIST(report.acknowledged_at || report.acknowledgement_timestamp)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: tokens.colors.textMuted }}>Resolved:</span>
                  <span style={{ fontWeight: 600, fontFamily: tokens.fonts.mono }}>{formatIST(report.resolved_at || report.resolution_timestamp)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: tokens.colors.textMuted }}>Closed:</span>
                  <span style={{ fontWeight: 600, fontFamily: tokens.fonts.mono }}>{formatIST(report.closed_at || report.closure_timestamp)}</span>
                </div>
              </div>
            </div>

            {/* Event Timeline */}
            <div style={{ background: '#FFFFFF', border: `1px solid ${tokens.colors.border}`, borderRadius: 4, padding: '8px 10px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: tokens.colors.navy, textTransform: 'uppercase', marginBottom: 6 }}>
                Audit Timeline ({report.timeline.length} Steps)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {report.timeline.map((act) => (
                  <div key={act.id} style={{ fontSize: 10, display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: 2 }}>
                    <span style={{ fontWeight: 600, color: tokens.colors.navy }}>{act.activity_type}</span>
                    <span style={{ color: tokens.colors.textMuted, fontFamily: tokens.fonts.mono }}>{formatIST(act.timestamp)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* ------------------------------------------------------------- */
          /* CASE B: NOMINAL CONDITION (NO DEFECT DETECTED)                */
          /* ------------------------------------------------------------- */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Clean Status Banner */}
            <div style={{
              background: '#F0FDF4',
              border: '1px solid #BBF7D0',
              borderRadius: 4,
              padding: '10px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <CheckCircle2 size={18} color="#16A34A" />
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#15803D' }}>
                  No active defects detected
                </div>
                <div style={{ fontSize: 10.5, color: '#166534', marginTop: 1 }}>
                  Machine MCH-001 operating within normal tolerances.
                </div>
              </div>
            </div>

            {/* Selected Component Live Registers */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Oil Signal */}
              <div style={{ padding: '8px 10px', background: '#FAFBFC', border: `1px solid ${tokens.colors.border}`, borderRadius: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: tokens.colors.textMuted }}>SIMULATED OIL LEAK SIGNAL</span>
                  <Droplets size={14} color={tokens.colors.steel} />
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 2 }}>
                  <span className="metric-number" style={{ fontSize: 18, color: currentTelemetry.oil_signal_pct > 65 ? tokens.colors.critical : tokens.colors.navy }}>
                    {currentTelemetry.oil_signal_pct.toFixed(1)}%
                  </span>
                  <span style={{ fontSize: 11, color: tokens.colors.textMuted }}>Threshold: {selectedZone.detection_threshold}%</span>
                </div>
              </div>

              {/* Pressure */}
              <div style={{ padding: '8px 10px', background: '#FAFBFC', border: `1px solid ${tokens.colors.border}`, borderRadius: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: tokens.colors.textMuted }}>CIRCUIT PRESSURE</span>
                  <Gauge size={14} color={tokens.colors.steel} />
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 2 }}>
                  <span className="metric-number" style={{ fontSize: 18, color: tokens.colors.navy }}>
                    {currentTelemetry.pressure_bar.toFixed(1)} bar
                  </span>
                  <span style={{ fontSize: 11, color: tokens.colors.textMuted }}>Nominal: 160 bar</span>
                </div>
              </div>

              {/* Temperature */}
              <div style={{ padding: '8px 10px', background: '#FAFBFC', border: `1px solid ${tokens.colors.border}`, borderRadius: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: tokens.colors.textMuted }}>FLUID TEMPERATURE</span>
                  <Thermometer size={14} color={tokens.colors.steel} />
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 2 }}>
                  <span className="metric-number" style={{ fontSize: 18, color: tokens.colors.navy }}>
                    {currentTelemetry.temperature_c.toFixed(1)} °C
                  </span>
                  <span style={{ fontSize: 11, color: tokens.colors.textMuted }}>Max: 65 °C</span>
                </div>
              </div>

              {/* Flow Rate */}
              <div style={{ padding: '8px 10px', background: '#FAFBFC', border: `1px solid ${tokens.colors.border}`, borderRadius: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: tokens.colors.textMuted }}>FLOW RATE</span>
                  <Activity size={14} color={tokens.colors.steel} />
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 2 }}>
                  <span className="metric-number" style={{ fontSize: 18, color: tokens.colors.navy }}>
                    {currentTelemetry.flow_rate_lpm.toFixed(1)} LPM
                  </span>
                  <span style={{ fontSize: 11, color: tokens.colors.textMuted }}>Nominal: 72 LPM</span>
                </div>
              </div>
            </div>

            {/* Machine Condition Overview */}
            <div style={{ padding: '8px 10px', background: '#FFFFFF', border: `1px solid ${tokens.colors.border}`, borderRadius: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: tokens.colors.navy, marginBottom: 4 }}>
                Machine Health Status
              </div>
              <div style={{ fontSize: 10.5, color: tokens.colors.textMuted, lineHeight: '1.4' }}>
                All 6 monitored zones are communicating with edge node <strong>ESP32-EDGE-01</strong>. Run a scenario from the top panel to test automatic defect diagnosis.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal for Lifecycle Action (Investigate, Resolve, Close) */}
      <Modal
        title={
          actionModal.type === 'investigate' ? 'Dispatch Maintenance Investigation' :
          actionModal.type === 'resolve' ? 'Confirm Defect Resolution' :
          'Close Defect Incident'
        }
        open={actionModal.visible}
        onOk={handleActionSubmit}
        confirmLoading={loading}
        onCancel={() => setActionModal({ visible: false, type: null, eventId: '', technicianOrUser: '', notes: '' })}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 8 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: tokens.colors.navy }}>
              {actionModal.type === 'investigate' ? 'Assigned Maintenance Technician' :
               actionModal.type === 'resolve' ? 'Resolved By (Technician Name)' :
               'Closed By (Quality / Shift Supervisor)'}
            </label>
            <Input
              style={{ marginTop: 4 }}
              value={actionModal.technicianOrUser}
              onChange={(e) => setActionModal({ ...actionModal, technicianOrUser: e.target.value })}
              placeholder="Enter technician or supervisor full name"
            />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: tokens.colors.navy }}>
              Maintenance Activity Notes / Findings
            </label>
            <Input.TextArea
              rows={3}
              style={{ marginTop: 4 }}
              value={actionModal.notes}
              onChange={(e) => setActionModal({ ...actionModal, notes: e.target.value })}
              placeholder="Describe inspection findings, actions taken, or verification steps"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default LiveDefectReportPanel;
