import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Progress, Alert } from 'antd';
import {
  CheckCircle2, AlertTriangle, AlertOctagon, CheckCheck,
  Activity, ArrowRight, Gauge, Thermometer, Droplets
} from 'lucide-react';
import { machineService, zoneService, eventService, analyticsService } from '../../services/api';
import { Machine, Zone, LeakageEvent, TelemetryReading } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { StatusBadge } from '../../components/common/StatusBadge';
import { formatIST } from '../../utils/dateUtils';

interface OverviewPageProps {
  onNavigateTab: (tab: string, zoneId?: string) => void;
  telemetry: Record<string, TelemetryReading>;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ onNavigateTab, telemetry }) => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [events, setEvents] = useState<LeakageEvent[]>([]);
  const [trends, setTrends] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    try {
      const [mRes, zRes, eRes, tRes] = await Promise.all([
        machineService.getMachines(),
        zoneService.getZones('MCH-001'),
        eventService.getEvents(),
        analyticsService.getTrends(),
      ]);
      setMachines(mRes);
      setZones(zRes);
      setEvents(eRes);
      setTrends(tRes);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, []);

  const totalZones = zones.length;
  const healthyZones = zones.filter((z) => z.current_status === 'NORMAL').length;
  const warningZones = zones.filter((z) => ['WARNING', 'LEAKAGE SUSPECTED', 'SENSOR DISCONNECTED'].includes(z.current_status)).length;
  const confirmedLeaks = zones.filter((z) => z.current_status === 'LEAKAGE CONFIRMED').length;
  const activeEvents = events.filter((e) => ['DETECTED', 'ACKNOWLEDGED', 'UNDER INVESTIGATION'].includes(e.status)).length;
  const resolvedEvents = events.filter((e) => ['RESOLVED', 'CLOSED'].includes(e.status)).length;

  const machineColumns = [
    { title: 'Machine ID', dataIndex: 'id', key: 'id', render: (text: string) => <strong style={{ color: '#243B53' }}>{text}</strong> },
    { title: 'Machine Name', dataIndex: 'name', key: 'name' },
    { title: 'Location', dataIndex: 'location', key: 'location' },
    { title: 'Total Zones', dataIndex: 'total_zones', key: 'total_zones', align: 'center' as const },
    {
      title: 'Healthy Zones',
      dataIndex: 'healthy_zones',
      key: 'healthy_zones',
      align: 'center' as const,
      render: (val: number) => <span style={{ color: '#198754', fontWeight: 600 }}>{val}</span>
    },
    {
      title: 'Warning / Leak',
      key: 'issues',
      align: 'center' as const,
      render: (_: any, r: Machine) => (
        <span style={{ color: r.warning_zones > 0 || r.active_events > 0 ? '#DC3545' : '#6C757D', fontWeight: 600 }}>
          {r.warning_zones + (r.overall_condition === 'CRITICAL' ? 1 : 0)}
        </span>
      )
    },
    {
      title: 'Condition',
      dataIndex: 'overall_condition',
      key: 'overall_condition',
      render: (cond: string) => {
        const color = cond === 'CRITICAL' ? 'error' : cond === 'WARNING' ? 'warning' : 'success';
        return <Tag color={color} style={{ fontWeight: 600 }}>{cond}</Tag>;
      }
    },
    {
      title: 'Actions',
      key: 'action',
      render: (_: any, r: Machine) => (
        <Button size="small" type="link" onClick={() => onNavigateTab('machine3d')}>
          View 3D Digital Twin
        </Button>
      )
    }
  ];

  const recentEventColumns = [
    { title: 'Event ID', dataIndex: 'id', key: 'id', render: (t: string) => <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{t}</span> },
    { title: 'Zone', dataIndex: 'zone_id', key: 'zone_id' },
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      render: (s: string) => (
        <Tag color={s === 'CRITICAL' ? 'error' : s === 'HIGH' ? 'warning' : 'default'} style={{ fontSize: 11, fontWeight: 600 }}>
          {s}
        </Tag>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (st: string) => {
        const color = st === 'CLOSED' ? 'default' : st === 'RESOLVED' ? 'success' : st === 'ACKNOWLEDGED' ? 'processing' : 'error';
        return <Tag color={color}>{st}</Tag>;
      }
    },
    {
      title: 'Detection Time (IST)',
      dataIndex: 'detection_timestamp',
      key: 'detection_timestamp',
      render: (dt: string) => <span style={{ fontFamily: 'monospace' }}>{formatIST(dt)}</span>
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, r: LeakageEvent) => (
        <Button size="small" type="link" onClick={() => onNavigateTab('events')}>
          Inspect Workflow
        </Button>
      )
    }
  ];

  return (
    <div>
      <PageHeader
        title="Hydraulic System Fleet Overview"
        subtitle="Real-time operational health, active alarms, and zone-wise telemetry for 500-Ton Hydraulic Press (MCH-001)"
        breadcrumbs={['HYDROGUARD', 'Operations', 'Overview']}
        actions={
          <Button type="primary" onClick={() => onNavigateTab('machine3d')} style={{ background: '#243B53' }}>
            Open 3D Digital Twin &rarr;
          </Button>
        }
      />

      {/* Critical Leakage Banner Alert if active */}
      {confirmedLeaks > 0 && (
        <Alert
          type="error"
          showIcon
          message="ACTIVE HYDRAULIC LEAKAGE DETECTED IN MONITORING ZONES"
          description={`Rule-based detection engine confirmed active oil leak in ${confirmedLeaks} zone(s). Open 3D Machine View or Event Management to respond.`}
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" danger type="primary" onClick={() => onNavigateTab('machine3d')}>
              Open 3D Digital Twin
            </Button>
          }
        />
      )}

      {/* KPI Panels Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
        {/* KPI 1 */}
        <div className="scada-panel" style={{ padding: '12px 16px' }}>
          <div style={{ fontSize: 11, color: '#6C757D', fontWeight: 600 }}>TOTAL MACHINES</div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 4 }}>
            <span className="metric-number" style={{ fontSize: 24, color: '#243B53' }}>{machines.length || 1}</span>
            <Tag color="blue" style={{ fontSize: 10 }}>MCH-001</Tag>
          </div>
          <div style={{ fontSize: 11, color: '#198754', marginTop: 4 }}>100% In Commission</div>
        </div>

        {/* KPI 2 */}
        <div className="scada-panel" style={{ padding: '12px 16px' }}>
          <div style={{ fontSize: 11, color: '#6C757D', fontWeight: 600 }}>MONITORED ZONES</div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 4 }}>
            <span className="metric-number" style={{ fontSize: 24, color: '#243B53' }}>{totalZones}</span>
            <Activity size={16} color="#356A9A" />
          </div>
          <div style={{ fontSize: 11, color: '#6C757D', marginTop: 4 }}>Optical/Conductive Nodes</div>
        </div>

        {/* KPI 3 */}
        <div className="scada-panel" style={{ padding: '12px 16px' }}>
          <div style={{ fontSize: 11, color: '#6C757D', fontWeight: 600 }}>HEALTHY ZONES</div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 4 }}>
            <span className="metric-number" style={{ fontSize: 24, color: '#198754' }}>{healthyZones}</span>
            <CheckCircle2 size={16} color="#198754" />
          </div>
          <div style={{ fontSize: 11, color: '#198754', marginTop: 4 }}>Clean Baseline Signal</div>
        </div>

        {/* KPI 4 */}
        <div className="scada-panel" style={{ padding: '12px 16px' }}>
          <div style={{ fontSize: 11, color: '#6C757D', fontWeight: 600 }}>WARNING / SUSPECTED</div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 4 }}>
            <span className="metric-number" style={{ fontSize: 24, color: warningZones > 0 ? '#D99A22' : '#243B53' }}>
              {warningZones}
            </span>
            <AlertTriangle size={16} color={warningZones > 0 ? '#D99A22' : '#ADB5BD'} />
          </div>
          <div style={{ fontSize: 11, color: '#6C757D', marginTop: 4 }}>Persistence Validating</div>
        </div>

        {/* KPI 5 */}
        <div className="scada-panel" style={{ padding: '12px 16px' }}>
          <div style={{ fontSize: 11, color: '#6C757D', fontWeight: 600 }}>ACTIVE LEAKAGE EVENTS</div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 4 }}>
            <span className="metric-number" style={{ fontSize: 24, color: activeEvents > 0 ? '#DC3545' : '#243B53' }}>
              {activeEvents}
            </span>
            <AlertOctagon size={16} color={activeEvents > 0 ? '#DC3545' : '#ADB5BD'} />
          </div>
          <div style={{ fontSize: 11, color: activeEvents > 0 ? '#DC3545' : '#6C757D', marginTop: 4 }}>Requires Operator Action</div>
        </div>

        {/* KPI 6 */}
        <div className="scada-panel" style={{ padding: '12px 16px' }}>
          <div style={{ fontSize: 11, color: '#6C757D', fontWeight: 600 }}>RESOLVED / CLOSED</div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 4 }}>
            <span className="metric-number" style={{ fontSize: 24, color: '#243B53' }}>{resolvedEvents}</span>
            <CheckCheck size={16} color="#356A9A" />
          </div>
          <div style={{ fontSize: 11, color: '#198754', marginTop: 4 }}>Full Audit History</div>
        </div>
      </div>

      {/* Machine Summary Table */}
      <div className="scada-panel" style={{ marginBottom: 16 }}>
        <div className="scada-panel-header">
          <span>HYDRAULIC MACHINE FLEET HEALTH SUMMARY</span>
          <span style={{ fontSize: 11, color: '#6C757D' }}>Facility: Main Hydraulic Bay 1</span>
        </div>
        <Table
          size="small"
          dataSource={machines}
          columns={machineColumns}
          rowKey="id"
          pagination={false}
        />
      </div>

      {/* Zone Status Cards Overview */}
      <div className="scada-panel" style={{ marginBottom: 16 }}>
        <div className="scada-panel-header">
          <span>ZONE-WISE REAL-TIME OPERATIONAL STATUS (MCH-001)</span>
          <Button size="small" type="link" onClick={() => onNavigateTab('monitoring')}>
            View Detailed Telemetry <ArrowRight size={12} style={{ verticalAlign: 'middle' }} />
          </Button>
        </div>
        <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          {zones.map((zone) => {
            const t = telemetry[zone.id] || {
              oil_signal_pct: zone.simulated_signal_value || 8.2,
              pressure_bar: zone.pressure_bar || 160.0,
              temperature_c: zone.temperature_c || 48.0,
              flow_rate_lpm: zone.flow_rate_lpm || 72.0
            };
            const isCritical = zone.current_status === 'LEAKAGE_CONFIRMED';
            const isSuspected = zone.current_status === 'LEAKAGE_SUSPECTED';

            return (
              <div
                key={zone.id}
                onClick={() => onNavigateTab('machine3d', zone.id)}
                style={{
                  border: isCritical ? '2px solid #DC3545' : isSuspected ? '2px solid #D99A22' : '1px solid #DEE2E6',
                  borderRadius: 4,
                  padding: '12px 14px',
                  background: isCritical ? '#FFF5F5' : '#FFFFFF',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#6C757D' }}>{zone.id}</span>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#243B53' }}>{zone.name}</div>
                  </div>
                  <Tag color={isCritical ? 'error' : isSuspected ? 'warning' : 'success'} style={{ fontSize: 10, fontWeight: 600 }}>
                    {zone.current_status}
                  </Tag>
                </div>

                <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
                  <div>
                    <span style={{ color: '#6C757D', fontSize: 11 }}>Oil Leak Signal:</span>
                    <div style={{ fontFamily: 'monospace', fontWeight: 600, color: t.oil_signal_pct > 65 ? '#DC3545' : '#243B53' }}>
                      {t.oil_signal_pct.toFixed(1)}% (Thresh: {zone.detection_threshold}%)
                    </div>
                  </div>
                  <div>
                    <span style={{ color: '#6C757D', fontSize: 11 }}>Hydraulic Pressure:</span>
                    <div style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                      {t.pressure_bar.toFixed(1)} bar
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 8 }}>
                  <Progress
                    percent={Math.min(100, Math.round((t.oil_signal_pct / zone.detection_threshold) * 100))}
                    strokeColor={isCritical ? '#DC3545' : t.oil_signal_pct > 65 ? '#D99A22' : '#356A9A'}
                    size="small"
                    showInfo={false}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Leakage Events & Telemetry Trend */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 16 }}>
        {/* Recent Events */}
        <div className="scada-panel">
          <div className="scada-panel-header">
            <span>RECENT LEAKAGE EVENTS & INCIDENTS</span>
            <Button size="small" type="link" onClick={() => onNavigateTab('events')}>
              Full Event Console
            </Button>
          </div>
          <Table
            size="small"
            dataSource={events.slice(0, 5)}
            columns={recentEventColumns}
            rowKey="id"
            pagination={false}
          />
        </div>

        {/* Live Operating Telemetry Parameters */}
        <div className="scada-panel">
          <div className="scada-panel-header">
            <span>REAL-TIME HYDRAULIC SYSTEM TELEMETRY (ZONE-03)</span>
            <Tag color="cyan">SIMULATED SCADA FEED</Tag>
          </div>
          <div style={{ padding: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ padding: 12, border: '1px solid #DEE2E6', borderRadius: 4, background: '#FAFBFC' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6C757D', fontSize: 11 }}>
                  <Droplets size={14} color="#356A9A" /> OIL DETECTION SIGNAL
                </div>
                <div className="metric-number" style={{ fontSize: 22, color: '#243B53', marginTop: 4 }}>
                  {(telemetry['ZONE-03']?.oil_signal_pct || 8.4).toFixed(1)}%
                </div>
                <div style={{ fontSize: 10, color: '#6C757D', marginTop: 2 }}>Optical / Conductivity Sensor</div>
              </div>

              <div style={{ padding: 12, border: '1px solid #DEE2E6', borderRadius: 4, background: '#FAFBFC' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6C757D', fontSize: 11 }}>
                  <Gauge size={14} color="#356A9A" /> HYDRAULIC PRESSURE
                </div>
                <div className="metric-number" style={{ fontSize: 22, color: '#243B53', marginTop: 4 }}>
                  {(telemetry['ZONE-03']?.pressure_bar || 160.0).toFixed(1)} bar
                </div>
                <div style={{ fontSize: 10, color: '#6C757D', marginTop: 2 }}>Nominal: 160 bar ± 5%</div>
              </div>

              <div style={{ padding: 12, border: '1px solid #DEE2E6', borderRadius: 4, background: '#FAFBFC' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6C757D', fontSize: 11 }}>
                  <Thermometer size={14} color="#356A9A" /> OIL TEMPERATURE
                </div>
                <div className="metric-number" style={{ fontSize: 22, color: '#243B53', marginTop: 4 }}>
                  {(telemetry['ZONE-03']?.temperature_c || 48.2).toFixed(1)} °C
                </div>
                <div style={{ fontSize: 10, color: '#6C757D', marginTop: 2 }}>ISO VG 46 Oil Spec</div>
              </div>

              <div style={{ padding: 12, border: '1px solid #DEE2E6', borderRadius: 4, background: '#FAFBFC' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6C757D', fontSize: 11 }}>
                  <Activity size={14} color="#356A9A" /> DELIVERY FLOW RATE
                </div>
                <div className="metric-number" style={{ fontSize: 22, color: '#243B53', marginTop: 4 }}>
                  {(telemetry['ZONE-03']?.flow_rate_lpm || 72.1).toFixed(1)} LPM
                </div>
                <div style={{ fontSize: 10, color: '#6C757D', marginTop: 2 }}>Axial Piston Pump Output</div>
              </div>
            </div>

            <div style={{ marginTop: 16, fontSize: 11, color: '#6C757D', borderTop: '1px solid #DEE2E6', paddingTop: 8 }}>
              * Rule-based detection logic monitors oil sensor signal drops. Pressure and flow provide operational context without false alarms.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

