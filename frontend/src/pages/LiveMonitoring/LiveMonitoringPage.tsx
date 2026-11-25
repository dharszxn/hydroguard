import React, { useState, useEffect } from 'react';
import { Select, Table, Tag, Input, Badge, Button, Space, Card } from 'antd';
import {
  Activity, Search, RefreshCw, Radio, Droplets, Gauge, Thermometer, CheckCircle, AlertTriangle
} from 'lucide-react';
import { zoneService } from '../../services/api';
import { Zone, TelemetryReading } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { StatusBadge } from '../../components/common/StatusBadge';

interface LiveMonitoringPageProps {
  telemetry: Record<string, TelemetryReading>;
  onSelectZoneFor3D?: (zoneId: string) => void;
}

export const LiveMonitoringPage: React.FC<LiveMonitoringPageProps> = ({ telemetry, onSelectZoneFor3D }) => {
  const [zones, setZones] = useState<Zone[]>([]);
  const [filteredMachine, setFilteredMachine] = useState<string>('MCH-001');
  const [selectedZoneFilter, setSelectedZoneFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const fetchZones = async () => {
    setLoading(true);
    try {
      const data = await zoneService.getZones(filteredMachine);
      setZones(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchZones();
    const interval = setInterval(fetchZones, 3000);
    return () => clearInterval(interval);
  }, [filteredMachine]);

  const displayedZones = zones.filter((z) => {
    if (selectedZoneFilter !== 'ALL' && z.id !== selectedZoneFilter) return false;
    if (searchQuery && !z.name.toLowerCase().includes(searchQuery.toLowerCase()) && !z.id.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const columns = [
    {
      title: 'Zone ID & Name',
      key: 'zone',
      render: (_: any, r: Zone) => (
        <div>
          <div style={{ fontFamily: 'monospace', fontWeight: 600, color: '#243B53' }}>{r.id}</div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{r.name}</div>
        </div>
      )
    },
    {
      title: 'Sensor ID',
      dataIndex: 'sensor_id',
      key: 'sensor_id',
      render: (id: string) => <span style={{ fontFamily: 'monospace', color: '#6C757D' }}>{id || 'SENS-OIL-01'}</span>
    },
    {
      title: 'Sensor State',
      key: 'connectivity',
      render: (_: any, r: Zone) => {
        const isConn = telemetry[r.id]?.is_connected ?? r.is_connected;
        return (
          <Tag color={isConn ? 'success' : 'default'} style={{ fontSize: 11, fontWeight: 600 }}>
            {isConn ? 'CONNECTED' : 'DISCONNECTED'}
          </Tag>
        );
      }
    },
    {
      title: 'Oil Detection Signal',
      key: 'oil_signal',
      render: (_: any, r: Zone) => {
        const val = telemetry[r.id]?.oil_signal_pct ?? r.simulated_signal_value ?? 0;
        const isHigh = val >= r.detection_threshold;
        return (
          <div>
            <span style={{ fontFamily: 'monospace', fontWeight: 600, color: isHigh ? '#DC3545' : '#243B53', fontSize: 13 }}>
              {val.toFixed(1)}%
            </span>
            <span style={{ fontSize: 11, color: '#6C757D', marginLeft: 4 }}>
              (Thresh: {r.detection_threshold}%)
            </span>
          </div>
        );
      }
    },
    {
      title: 'Detection Status',
      dataIndex: 'current_status',
      key: 'status',
      render: (st: string) => {
        const isCrit = st === 'LEAKAGE_CONFIRMED';
        const isWarn = st === 'LEAKAGE_SUSPECTED';
        return (
          <Tag color={isCrit ? 'error' : isWarn ? 'warning' : 'success'} style={{ fontWeight: 600, fontSize: 11 }}>
            {st}
          </Tag>
        );
      }
    },
    {
      title: 'Pressure',
      key: 'pressure',
      render: (_: any, r: Zone) => {
        const p = telemetry[r.id]?.pressure_bar ?? r.pressure_bar ?? 160.0;
        return <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>{p.toFixed(1)} bar</span>;
      }
    },
    {
      title: 'Flow Rate',
      key: 'flow',
      render: (_: any, r: Zone) => {
        const f = telemetry[r.id]?.flow_rate_lpm ?? r.flow_rate_lpm ?? 72.0;
        return <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>{f.toFixed(1)} LPM</span>;
      }
    },
    {
      title: 'Oil Temp',
      key: 'temp',
      render: (_: any, r: Zone) => {
        const t = telemetry[r.id]?.temperature_c ?? r.temperature_c ?? 48.0;
        return <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>{t.toFixed(1)} °C</span>;
      }
    },
    {
      title: '3D Action',
      key: 'action',
      render: (_: any, r: Zone) => (
        <Button size="small" type="link" onClick={() => onSelectZoneFor3D && onSelectZoneFor3D(r.id)}>
          Locate in 3D
        </Button>
      )
    }
  ];

  return (
    <div>
      <PageHeader
        title="Real-Time Machine Monitoring"
        subtitle="Continuous telemetry, pressure, temperature, flow rate, and simulated oil detection signals"
        breadcrumbs={['HYDROGUARD', 'Monitoring', 'Machine Monitoring']}
      />

      {/* Real-time Telemetry Controls Bar */}
      <div className="scada-panel" style={{ padding: '12px 16px', marginBottom: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <Space wrap>
            <div>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#6C757D', marginRight: 6 }}>MACHINE:</span>
              <Select
                value={filteredMachine}
                onChange={setFilteredMachine}
                style={{ width: 220 }}
                options={[{ value: 'MCH-001', label: 'MCH-001 (500-Ton Press)' }]}
              />
            </div>

            <div>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#6C757D', marginRight: 6 }}>ZONE:</span>
              <Select
                value={selectedZoneFilter}
                onChange={setSelectedZoneFilter}
                style={{ width: 180 }}
                options={[
                  { value: 'ALL', label: 'All Monitoring Zones' },
                  { value: 'ZONE-01', label: 'ZONE-01: Reservoir' },
                  { value: 'ZONE-02', label: 'ZONE-02: Pump' },
                  { value: 'ZONE-03', label: 'ZONE-03: Pressure Line' },
                  { value: 'ZONE-04', label: 'ZONE-04: Control Valve' },
                  { value: 'ZONE-05', label: 'ZONE-05: Cylinder' },
                  { value: 'ZONE-06', label: 'ZONE-06: Return Line' },
                ]}
              />
            </div>

            <Input
              prefix={<Search size={14} color="#6C757D" />}
              placeholder="Search zone name or sensor ID..."
              style={{ width: 240 }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </Space>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Tag color="geekblue" style={{ fontSize: 11, padding: '2px 8px' }}>
              <Radio size={12} style={{ marginRight: 4 }} /> LIVE WEBSOCKET TELEMETRY
            </Tag>
            <Button size="small" icon={<RefreshCw size={13} />} onClick={fetchZones} loading={loading}>
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Grid of Industrial Zone Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14, marginBottom: 16 }}>
        {displayedZones.map((zone) => {
          const t = telemetry[zone.id] || {
            oil_signal_pct: zone.simulated_signal_value || 8.2,
            pressure_bar: zone.pressure_bar || 160.0,
            temperature_c: zone.temperature_c || 48.0,
            flow_rate_lpm: zone.flow_rate_lpm || 72.0,
            is_connected: zone.is_connected
          };
          const isAlarm = zone.current_status === 'LEAKAGE_CONFIRMED';
          const isSuspected = zone.current_status === 'LEAKAGE_SUSPECTED';

          return (
            <div
              key={zone.id}
              className="scada-panel"
              style={{
                borderLeft: isAlarm ? '4px solid #DC3545' : isSuspected ? '4px solid #D99A22' : '4px solid #198754',
                padding: '14px 16px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#6C757D' }}>
                    {zone.id} • Sensor: {zone.sensor_id || 'SENS-OIL-01'}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#243B53', marginTop: 2 }}>
                    {zone.name}
                  </div>
                </div>
                <Tag color={isAlarm ? 'error' : isSuspected ? 'warning' : 'success'} style={{ fontWeight: 600 }}>
                  {zone.current_status}
                </Tag>
              </div>

              {/* Sensor parameters */}
              <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, background: '#FAFBFC', padding: 8, borderRadius: 3, border: '1px solid #DEE2E6' }}>
                <div>
                  <div style={{ fontSize: 10, color: '#6C757D' }}>SIMULATED OIL SIGNAL</div>
                  <div style={{ fontSize: 16, fontFamily: 'monospace', fontWeight: 700, color: t.oil_signal_pct > zone.detection_threshold ? '#DC3545' : '#243B53' }}>
                    {t.oil_signal_pct.toFixed(1)}%
                  </div>
                  <div style={{ fontSize: 10, color: '#6C757D' }}>Threshold: {zone.detection_threshold}%</div>
                </div>

                <div>
                  <div style={{ fontSize: 10, color: '#6C757D' }}>HYDRAULIC PRESSURE</div>
                  <div style={{ fontSize: 16, fontFamily: 'monospace', fontWeight: 700, color: '#243B53' }}>
                    {t.pressure_bar.toFixed(1)} bar
                  </div>
                  <div style={{ fontSize: 10, color: '#6C757D' }}>Nominal: 160 bar</div>
                </div>

                <div>
                  <div style={{ fontSize: 10, color: '#6C757D' }}>TEMPERATURE</div>
                  <div style={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 600 }}>
                    {t.temperature_c.toFixed(1)} °C
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 10, color: '#6C757D' }}>DELIVERY FLOW</div>
                  <div style={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 600 }}>
                    {t.flow_rate_lpm.toFixed(1)} LPM
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, fontSize: 11, color: '#6C757D' }}>
                <span>Persistence rule: {zone.persistence_duration}s validation</span>
                <Button size="small" type="link" onClick={() => onSelectZoneFor3D && onSelectZoneFor3D(zone.id)} style={{ padding: 0 }}>
                  Inspect in 3D &rarr;
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Structured Telemetry Table */}
      <div className="scada-panel">
        <div className="scada-panel-header">
          <span>ALL MONITORED ZONE SENSORS & TELEMETRY REGISTERS</span>
          <span style={{ fontSize: 11, color: '#6C757D' }}>Showing {displayedZones.length} Nodes</span>
        </div>
        <Table
          size="small"
          dataSource={displayedZones}
          columns={columns}
          rowKey="id"
          pagination={false}
        />
      </div>
    </div>
  );
};

