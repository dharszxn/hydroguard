import React, { useState, useEffect } from 'react';
import {
  Table, Tag, Button, Input, Select, Space, Drawer, Card, Row, Col, Typography,
  Divider, Tooltip, message, Popconfirm
} from 'antd';
import {
  FileText, Download, Printer, Search, Filter, ShieldAlert, CheckCircle2,
  Clock, AlertTriangle, Wrench, User, ExternalLink, RefreshCw, XCircle, ArrowLeft
} from 'lucide-react';
import { eventService } from '../../services/api';
import { LeakageEvent, DefectReport, EventStatus, EventSeverity } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { StatusBadge } from '../../components/common/StatusBadge';
import { tokens } from '../../styles/tokens';
import { formatIST } from '../../utils/dateUtils';

const { Text, Title } = Typography;

const ZONE_COMPONENT_NAMES: Record<string, string> = {
  'ZONE-01': 'Hydraulic Oil Reservoir & Power Pack',
  'ZONE-02': 'Hydraulic Pump & Electric Drive Motor',
  'ZONE-03': 'High-Pressure Delivery Pipeline & Manifold',
  'ZONE-04': 'Directional Control Valve Block',
  'ZONE-05': '500-Ton Hydraulic Cylinder & Main Ram',
  'ZONE-06': 'Oil Return Pipeline & Filter Assembly',
};

interface DefectHistoryPageProps {
  initialEventId?: string;
}

export const DefectHistoryPage: React.FC<DefectHistoryPageProps> = ({ initialEventId }) => {
  const [events, setEvents] = useState<LeakageEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [defectTypeFilter, setDefectTypeFilter] = useState('ALL');
  const [zoneFilter, setZoneFilter] = useState('ALL');

  const [selectedEvent, setSelectedEvent] = useState<LeakageEvent | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeReport, setActiveReport] = useState<DefectReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const data = await eventService.getEvents();
      setEvents(data);

      if (initialEventId) {
        const target = data.find((e) => e.id === initialEventId || e.defect_id === initialEventId);
        if (target) {
          openEventDetails(target);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 4000);
    return () => clearInterval(interval);
  }, []);

  const openEventDetails = async (event: LeakageEvent) => {
    setSelectedEvent(event);
    setDrawerOpen(true);
    setReportLoading(true);
    try {
      const rep = await eventService.getDefectReport(event.id);
      setActiveReport(rep);
    } catch (e) {
      setActiveReport(null);
    } finally {
      setReportLoading(false);
    }
  };

  const handleExportCsv = () => {
    const params: Record<string, string> = {};
    if (statusFilter !== 'ALL') params.status = statusFilter;
    if (severityFilter !== 'ALL') params.severity = severityFilter;
    if (defectTypeFilter !== 'ALL') params.defect_type = defectTypeFilter;
    if (zoneFilter !== 'ALL') params.zone_id = zoneFilter;
    if (searchQuery) params.search = searchQuery;

    const url = eventService.getExportCsvUrl(params);
    window.open(url, '_blank');
    message.success('Downloading defect event history CSV...');
  };

  const handlePrintReport = () => {
    window.print();
  };

  // Filter items in client
  const filteredEvents = events.filter((e) => {
    if (statusFilter !== 'ALL' && e.status !== statusFilter) return false;
    if (severityFilter !== 'ALL' && e.severity !== severityFilter) return false;
    if (defectTypeFilter !== 'ALL' && e.defect_type !== defectTypeFilter) return false;
    if (zoneFilter !== 'ALL' && e.zone_id !== zoneFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match =
        (e.id && e.id.toLowerCase().includes(q)) ||
        (e.defect_id && e.defect_id.toLowerCase().includes(q)) ||
        (e.zone_id && e.zone_id.toLowerCase().includes(q)) ||
        (e.defect_type && e.defect_type.toLowerCase().includes(q)) ||
        (e.assigned_technician && e.assigned_technician.toLowerCase().includes(q)) ||
        (e.detection_reason && e.detection_reason.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  const columns = [
    {
      title: 'Event / Defect ID',
      key: 'ids',
      width: 170,
      render: (_: any, r: LeakageEvent) => (
        <div>
          <div style={{ fontFamily: tokens.fonts.mono, fontWeight: 700, color: tokens.colors.navy, fontSize: 12 }}>
            {r.id}
          </div>
          {r.defect_id && (
            <div style={{ fontFamily: tokens.fonts.mono, fontSize: 10, color: tokens.colors.textMuted }}>
              {r.defect_id}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Machine & Zone',
      key: 'machine_zone',
      width: 190,
      render: (_: any, r: LeakageEvent) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 12, color: tokens.colors.navy }}>
            {r.zone_id}: {ZONE_COMPONENT_NAMES[r.zone_id] ? ZONE_COMPONENT_NAMES[r.zone_id].split(' & ')[0] : r.zone_id}
          </div>
          <div style={{ fontSize: 10, color: tokens.colors.textMuted }}>
            {r.machine_id} • Sensor: {r.sensor_id}
          </div>
        </div>
      ),
    },
    {
      title: 'Defect Classification',
      dataIndex: 'defect_type',
      key: 'defect_type',
      width: 180,
      render: (type: string, r: LeakageEvent) => {
        const val = type || r.event_type || 'Hydraulic Oil Leakage';
        const isRej = r.is_rejected_transient;
        return (
          <span style={{ fontSize: 11, fontWeight: 600, color: isRej ? '#64748B' : tokens.colors.navy }}>
            {val}
          </span>
        );
      },
    },
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      render: (sev: string) => {
        const color =
          sev === 'CRITICAL' ? 'error' :
          sev === 'HIGH' ? 'warning' :
          sev === 'MEDIUM' ? 'gold' : 'default';
        return <Tag color={color} style={{ fontWeight: 700, fontSize: 10 }}>{sev}</Tag>;
      },
    },
    {
      title: 'Detection Time (IST)',
      dataIndex: 'detection_timestamp',
      key: 'detection_timestamp',
      width: 170,
      render: (ts: string) => (
        <span style={{ fontSize: 11, fontFamily: tokens.fonts.mono }}>
          {formatIST(ts)}
        </span>
      ),
    },
    {
      title: 'Duration',
      dataIndex: 'detection_duration_sec',
      key: 'detection_duration_sec',
      width: 90,
      render: (dur: number) => (
        <span style={{ fontSize: 11, fontFamily: tokens.fonts.mono }}>
          {dur ? `${dur.toFixed(1)}s` : '--'}
        </span>
      ),
    },
    {
      title: 'Lifecycle Status',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status: string, r: LeakageEvent) => {
        if (r.is_rejected_transient) {
          return <Tag color="default" style={{ fontWeight: 600 }}>TRANSIENT REJECTED</Tag>;
        }
        return <StatusBadge status={status as EventStatus} type="event" />;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: any, r: LeakageEvent) => (
        <Button
          size="small"
          type="primary"
          style={{ background: '#243B53', borderColor: '#243B53', fontSize: 11 }}
          icon={<FileText size={12} />}
          onClick={() => openEventDetails(r)}
        >
          View Dossier
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Defect History & Diagnostic Reports Archive"
        subtitle="Persistent database records of confirmed machinery defects, transient rejection logs, and maintenance audit trails"
        breadcrumbs={['HYDROGUARD', 'Maintenance', 'Defect History & Reports']}
        actions={
          <Space>
            <Button
              icon={<RefreshCw size={14} />}
              onClick={fetchEvents}
              loading={loading}
            >
              Refresh Logs
            </Button>
            <Button
              type="primary"
              icon={<Download size={14} />}
              onClick={handleExportCsv}
              style={{ background: tokens.colors.steel, borderColor: tokens.colors.steel }}
            >
              Export CSV
            </Button>
          </Space>
        }
      />

      {/* Filter and Search Bar */}
      <div className="scada-panel" style={{ marginBottom: 16, padding: '12px 16px', background: '#FFFFFF' }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} md={6}>
            <Input
              placeholder="Search Event/Defect ID, Technician, Reason..."
              prefix={<Search size={14} color={tokens.colors.textMuted} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={12} md={4}>
            <Select
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={(v) => setStatusFilter(v)}
              options={[
                { value: 'ALL', label: 'All Lifecycle Statuses' },
                { value: 'DETECTED', label: 'DETECTED' },
                { value: 'ACKNOWLEDGED', label: 'ACKNOWLEDGED' },
                { value: 'UNDER INVESTIGATION', label: 'UNDER INVESTIGATION' },
                { value: 'RESOLVED', label: 'RESOLVED' },
                { value: 'CLOSED', label: 'CLOSED' },
                { value: 'REJECTED', label: 'REJECTED (Transient)' },
              ]}
            />
          </Col>
          <Col xs={12} md={4}>
            <Select
              style={{ width: '100%' }}
              value={severityFilter}
              onChange={(v) => setSeverityFilter(v)}
              options={[
                { value: 'ALL', label: 'All Severities' },
                { value: 'CRITICAL', label: 'CRITICAL' },
                { value: 'HIGH', label: 'HIGH' },
                { value: 'MEDIUM', label: 'MEDIUM' },
                { value: 'LOW', label: 'LOW' },
              ]}
            />
          </Col>
          <Col xs={12} md={5}>
            <Select
              style={{ width: '100%' }}
              value={defectTypeFilter}
              onChange={(v) => setDefectTypeFilter(v)}
              options={[
                { value: 'ALL', label: 'All Defect Types' },
                { value: 'Hydraulic Oil Leakage', label: 'Hydraulic Oil Leakage' },
                { value: 'High-Severity Oil Leakage', label: 'High-Severity Oil Leakage' },
                { value: 'Gradual Oil Leakage', label: 'Gradual Oil Leakage' },
                { value: 'Pressure Drop', label: 'Pressure Drop' },
                { value: 'Sensor Disconnection', label: 'Sensor Disconnection' },
                { value: 'Communication Failure', label: 'Communication Failure' },
                { value: 'Transient Signal / False Alarm', label: 'Transient Signal / False Alarm' },
              ]}
            />
          </Col>
          <Col xs={12} md={5}>
            <Select
              style={{ width: '100%' }}
              value={zoneFilter}
              onChange={(v) => setZoneFilter(v)}
              options={[
                { value: 'ALL', label: 'All Machine Zones' },
                { value: 'ZONE-01', label: 'ZONE-01: Reservoir' },
                { value: 'ZONE-02', label: 'ZONE-02: Pump & Motor' },
                { value: 'ZONE-03', label: 'ZONE-03: Pressure Pipeline' },
                { value: 'ZONE-04', label: 'ZONE-04: Control Valve' },
                { value: 'ZONE-05', label: 'ZONE-05: Cylinder & Ram' },
                { value: 'ZONE-06', label: 'ZONE-06: Return Pipeline' },
              ]}
            />
          </Col>
        </Row>
      </div>

      {/* Main Historical Table */}
      <div className="scada-panel">
        <Table
          dataSource={filteredEvents}
          columns={columns}
          rowKey="id"
          loading={loading}
          size="small"
          pagination={{ pageSize: 12, showSizeChanger: true, showTotal: (t) => `Total ${t} persistent records` }}
        />
      </div>

      {/* Detailed Event Dossier Drawer (Section A to J Breakdown & PDF Printable View) */}
      <Drawer
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: tokens.colors.navy }}>
              DEFECT REPORT DOSSIER: {selectedEvent?.defect_id || selectedEvent?.id}
            </span>
            <Button
              size="small"
              icon={<Printer size={13} />}
              onClick={handlePrintReport}
              style={{ marginRight: 24 }}
            >
              Print / Save PDF
            </Button>
          </div>
        }
        placement="right"
        width={680}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        {selectedEvent && (
          <div className="printable-report" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Header Document Banner */}
            <div style={{ border: `1px solid ${tokens.colors.border}`, padding: '12px 16px', background: '#FAFBFC', borderRadius: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 11, fontFamily: tokens.fonts.mono, color: tokens.colors.textMuted }}>
                    OFFICIAL SCADA DEFECT REPORT
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: tokens.colors.navy }}>
                    {selectedEvent.defect_type || selectedEvent.event_type}
                  </div>
                  <div style={{ fontSize: 11, color: tokens.colors.steel, marginTop: 2 }}>
                    PS-021 Industrial Machinery Reliability Protocol • Team InnoX
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Tag color={selectedEvent.severity === 'CRITICAL' ? 'error' : selectedEvent.severity === 'HIGH' ? 'warning' : 'default'} style={{ fontSize: 12, fontWeight: 700 }}>
                    {selectedEvent.severity}
                  </Tag>
                  <div style={{ fontSize: 11, color: tokens.colors.textMuted, marginTop: 4 }}>
                    Status: <strong>{selectedEvent.status}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* A. Event & B. Machine Information */}
            <Card size="small" title={<span style={{ fontSize: 12, fontWeight: 700, color: tokens.colors.navy }}>A & B. Component & Incident Identity</span>}>
              <Row gutter={[12, 8]}>
                <Col span={12}><Text type="secondary" style={{ fontSize: 11 }}>Event ID:</Text> <div style={{ fontFamily: tokens.fonts.mono, fontWeight: 600 }}>{selectedEvent.id}</div></Col>
                <Col span={12}><Text type="secondary" style={{ fontSize: 11 }}>Defect ID:</Text> <div style={{ fontFamily: tokens.fonts.mono, fontWeight: 600 }}>{selectedEvent.defect_id || '--'}</div></Col>
                <Col span={12}><Text type="secondary" style={{ fontSize: 11 }}>Machine:</Text> <div style={{ fontWeight: 600 }}>{selectedEvent.machine_id} (500-Ton Hydraulic Press)</div></Col>
                <Col span={12}><Text type="secondary" style={{ fontSize: 11 }}>Monitoring Zone:</Text> <div style={{ fontWeight: 600 }}>{selectedEvent.zone_id} ({ZONE_COMPONENT_NAMES[selectedEvent.zone_id] || selectedEvent.zone_id})</div></Col>
                <Col span={12}><Text type="secondary" style={{ fontSize: 11 }}>Sensor Hardware ID:</Text> <div style={{ fontFamily: tokens.fonts.mono }}>{selectedEvent.sensor_id}</div></Col>
                <Col span={12}><Text type="secondary" style={{ fontSize: 11 }}>Detection Method:</Text> <div>Rule-Based Persistence Validation</div></Col>
                <Col span={12}><Text type="secondary" style={{ fontSize: 11 }}>Detection Time (IST):</Text> <div style={{ fontFamily: tokens.fonts.mono, fontWeight: 600 }}>{formatIST(selectedEvent.detection_timestamp)}</div></Col>
                <Col span={12}><Text type="secondary" style={{ fontSize: 11 }}>Confirmation Time (IST):</Text> <div style={{ fontFamily: tokens.fonts.mono, fontWeight: 600 }}>{formatIST(selectedEvent.defect_confirmed_at || selectedEvent.confirmation_timestamp)}</div></Col>
              </Row>
            </Card>

            {/* C & D. Original Sensor Telemetry Snapshot & Persistence Evidence */}
            <Card size="small" title={<span style={{ fontSize: 12, fontWeight: 700, color: tokens.colors.navy }}>C & D. Telemetry Snapshot & Persistence Validation Evidence</span>}>
              <Row gutter={[12, 10]}>
                <Col span={6}>
                  <div style={{ background: '#F8FAFC', padding: 8, borderRadius: 4, textAlign: 'center', border: `1px solid ${tokens.colors.border}` }}>
                    <div style={{ fontSize: 10, color: tokens.colors.textMuted }}>OIL LEAK SIGNAL</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: (selectedEvent.oil_signal_pct || 0) > 65 ? tokens.colors.critical : tokens.colors.navy }}>
                      {(selectedEvent.oil_signal_pct || 0).toFixed(1)}%
                    </div>
                  </div>
                </Col>
                <Col span={6}>
                  <div style={{ background: '#F8FAFC', padding: 8, borderRadius: 4, textAlign: 'center', border: `1px solid ${tokens.colors.border}` }}>
                    <div style={{ fontSize: 10, color: tokens.colors.textMuted }}>PRESSURE</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: tokens.colors.navy }}>
                      {(selectedEvent.pressure_bar || 160).toFixed(1)} bar
                    </div>
                  </div>
                </Col>
                <Col span={6}>
                  <div style={{ background: '#F8FAFC', padding: 8, borderRadius: 4, textAlign: 'center', border: `1px solid ${tokens.colors.border}` }}>
                    <div style={{ fontSize: 10, color: tokens.colors.textMuted }}>FLOW RATE</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: tokens.colors.navy }}>
                      {(selectedEvent.flow_rate_lpm || 72).toFixed(1)} LPM
                    </div>
                  </div>
                </Col>
                <Col span={6}>
                  <div style={{ background: '#F8FAFC', padding: 8, borderRadius: 4, textAlign: 'center', border: `1px solid ${tokens.colors.border}` }}>
                    <div style={{ fontSize: 10, color: tokens.colors.textMuted }}>TEMPERATURE</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: tokens.colors.navy }}>
                      {(selectedEvent.temperature_c || 48).toFixed(1)} °C
                    </div>
                  </div>
                </Col>
              </Row>

              <div style={{ marginTop: 10, fontSize: 11, color: '#334155', background: '#FFFFFF', padding: '8px 10px', border: '1px dashed #CBD5E1', borderRadius: 4 }}>
                <strong>Persistence Evidence:</strong> {selectedEvent.detection_evidence || selectedEvent.detection_reason}
              </div>
            </Card>

            {/* E. Defect Diagnosis Narrative */}
            <Card size="small" title={<span style={{ fontSize: 12, fontWeight: 700, color: tokens.colors.navy }}>E. Automated Defect Diagnosis & Root Cause Classification</span>}>
              <div style={{ fontSize: 11.5, color: '#1E293B', lineHeight: '1.5' }}>
                {selectedEvent.diagnosis_summary || selectedEvent.detection_reason}
              </div>
            </Card>

            {/* F. Recommended Inspection and Corrective Actions */}
            <Card size="small" title={<span style={{ fontSize: 12, fontWeight: 700, color: tokens.colors.navy }}>F. Recommended Maintenance & Inspection Actions</span>}>
              <div style={{ fontSize: 11, color: '#1E293B', lineHeight: '1.5' }}>
                <div><strong>Recommended Inspection:</strong> {selectedEvent.recommended_inspection || 'Perform visual and ultrasonic leak check around component joints.'}</div>
                <div style={{ marginTop: 6 }}><strong>Prescribed Action:</strong> {selectedEvent.recommended_action || 'Isolate branch, replace worn seal package, retorque flange bolts.'}</div>
              </div>
            </Card>

            {/* G. Independent Event Lifecycle Timestamps (Authoritative System Time in IST) */}
            <Card size="small" title={<span style={{ fontSize: 12, fontWeight: 700, color: tokens.colors.navy }}>G. Authoritative Lifecycle Audit Timestamps (Asia/Kolkata - IST)</span>}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '8px 14px', fontSize: 11 }}>
                <div>
                  <Text type="secondary" style={{ fontSize: 10 }}>1. Scenario Started:</Text>
                  <div style={{ fontFamily: tokens.fonts.mono, fontWeight: 600 }}>{formatIST(selectedEvent.scenario_started_at)}</div>
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 10 }}>2. First Abnormal Signal Detected:</Text>
                  <div style={{ fontFamily: tokens.fonts.mono, fontWeight: 600 }}>{formatIST(selectedEvent.abnormal_detected_at || selectedEvent.detection_timestamp)}</div>
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 10 }}>3. Persistence Validation Started:</Text>
                  <div style={{ fontFamily: tokens.fonts.mono, fontWeight: 600 }}>{formatIST(selectedEvent.persistence_started_at || selectedEvent.detection_timestamp)}</div>
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 10 }}>4. Defect Confirmed:</Text>
                  <div style={{ fontFamily: tokens.fonts.mono, fontWeight: 600 }}>{formatIST(selectedEvent.defect_confirmed_at || selectedEvent.confirmation_timestamp)}</div>
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 10 }}>5. Alert Dispatched:</Text>
                  <div style={{ fontFamily: tokens.fonts.mono, fontWeight: 600 }}>{formatIST(selectedEvent.alert_generated_at || selectedEvent.confirmation_timestamp)}</div>
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 10 }}>6. Event Acknowledged:</Text>
                  <div style={{ fontFamily: tokens.fonts.mono, fontWeight: 600 }}>{formatIST(selectedEvent.acknowledged_at || selectedEvent.acknowledgement_timestamp)}</div>
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 10 }}>7. Investigation Started:</Text>
                  <div style={{ fontFamily: tokens.fonts.mono, fontWeight: 600 }}>{formatIST(selectedEvent.investigated_at)}</div>
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 10 }}>8. Defect Resolved:</Text>
                  <div style={{ fontFamily: tokens.fonts.mono, fontWeight: 600 }}>{formatIST(selectedEvent.resolved_at || selectedEvent.resolution_timestamp)}</div>
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 10 }}>9. Event Officially Closed:</Text>
                  <div style={{ fontFamily: tokens.fonts.mono, fontWeight: 600 }}>{formatIST(selectedEvent.closed_at || selectedEvent.closure_timestamp)}</div>
                </div>
              </div>
            </Card>

            {/* H. Chronological Step-by-Step Audit Trail */}
            <Card size="small" title={<span style={{ fontSize: 12, fontWeight: 700, color: tokens.colors.navy }}>H. Chronological Audit Trail & Maintenance Actions</span>}>
              {selectedEvent.activities && selectedEvent.activities.length > 0 ? (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr style={{ background: '#F1F5F9', textAlign: 'left', borderBottom: '1px solid #CBD5E1' }}>
                      <th style={{ padding: '6px 8px' }}>#</th>
                      <th style={{ padding: '6px 8px' }}>Action Type</th>
                      <th style={{ padding: '6px 8px' }}>Timestamp (IST)</th>
                      <th style={{ padding: '6px 8px' }}>Performed By</th>
                      <th style={{ padding: '6px 8px' }}>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedEvent.activities.map((act, index) => (
                      <tr key={act.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                        <td style={{ padding: '6px 8px', fontFamily: tokens.fonts.mono }}>{index + 1}</td>
                        <td style={{ padding: '6px 8px', fontWeight: 600, color: tokens.colors.navy }}>{act.activity_type}</td>
                        <td style={{ padding: '6px 8px', fontFamily: tokens.fonts.mono }}>{formatIST(act.timestamp)}</td>
                        <td style={{ padding: '6px 8px' }}>{act.performed_by}</td>
                        <td style={{ padding: '6px 8px', color: tokens.colors.textMuted }}>{act.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ fontSize: 11, color: tokens.colors.textMuted }}>No audit steps logged.</div>
              )}
            </Card>

            {/* I & J. Resolution & Closure Details */}
            <Card size="small" title={<span style={{ fontSize: 12, fontWeight: 700, color: tokens.colors.navy }}>I & J. Resolution Signoff & Closure Dossier</span>}>
              <Row gutter={[12, 8]}>
                <Col span={12}>
                  <Text type="secondary" style={{ fontSize: 11 }}>Acknowledged By:</Text>
                  <div>{selectedEvent.acknowledged_by || 'Unacknowledged'}</div>
                </Col>
                <Col span={12}>
                  <Text type="secondary" style={{ fontSize: 11 }}>Assigned Technician:</Text>
                  <div>{selectedEvent.assigned_technician || 'Pending assignment'}</div>
                </Col>
                <Col span={12}>
                  <Text type="secondary" style={{ fontSize: 11 }}>Resolved By:</Text>
                  <div>{selectedEvent.resolved_by || 'Unresolved'}</div>
                </Col>
                <Col span={12}>
                  <Text type="secondary" style={{ fontSize: 11 }}>Resolution Time (IST):</Text>
                  <div style={{ fontFamily: tokens.fonts.mono }}>
                    {formatIST(selectedEvent.resolved_at || selectedEvent.resolution_timestamp)}
                  </div>
                </Col>
                <Col span={12}>
                  <Text type="secondary" style={{ fontSize: 11 }}>Officially Closed By:</Text>
                  <div>{selectedEvent.closed_by || 'Open / Active'}</div>
                </Col>
                <Col span={12}>
                  <Text type="secondary" style={{ fontSize: 11 }}>Closure Time (IST):</Text>
                  <div style={{ fontFamily: tokens.fonts.mono }}>
                    {formatIST(selectedEvent.closed_at || selectedEvent.closure_timestamp)}
                  </div>
                </Col>
                {selectedEvent.closure_notes && (
                  <Col span={24}>
                    <Text type="secondary" style={{ fontSize: 11 }}>Closure Verification Notes:</Text>
                    <div style={{ fontStyle: 'italic', color: '#334155', marginTop: 2 }}>
                      {selectedEvent.closure_notes}
                    </div>
                  </Col>
                )}
              </Row>
            </Card>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default DefectHistoryPage;
