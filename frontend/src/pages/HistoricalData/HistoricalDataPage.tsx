import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Input, Select, DatePicker, message } from 'antd';
import { History, Download, Upload, Search, FileText } from 'lucide-react';
import { reportsService } from '../../services/api';
import { formatIST } from '../../utils/dateUtils';
import axios from 'axios';

export const HistoricalDataPage: React.FC = () => {
  const [readings, setReadings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterZone, setFilterZone] = useState('ALL');

  const fetchReadings = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:8000/api/readings?limit=60');
      setReadings(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReadings();
  }, []);

  const displayedReadings = readings.filter((r) => {
    if (filterZone !== 'ALL' && r.zone_id !== filterZone) return false;
    return true;
  });

  const columns = [
    { title: 'Log ID', dataIndex: 'id', key: 'id', render: (id: number) => <span style={{ fontFamily: 'monospace' }}>#{id}</span> },
    { title: 'Timestamp (IST)', dataIndex: 'timestamp', key: 'timestamp', render: (ts: string) => <span style={{ fontFamily: 'monospace' }}>{formatIST(ts)}</span> },
    { title: 'Machine ID', dataIndex: 'machine_id', key: 'machine_id' },
    { title: 'Zone ID', dataIndex: 'zone_id', key: 'zone_id', render: (z: string) => <strong>{z}</strong> },
    { title: 'Sensor ID', dataIndex: 'sensor_id', key: 'sensor_id', render: (s: string) => <span style={{ fontFamily: 'monospace' }}>{s}</span> },
    {
      title: 'Oil Signal (%)',
      dataIndex: 'oil_signal_pct',
      key: 'oil_signal_pct',
      align: 'right' as const,
      render: (v: number) => <span style={{ fontFamily: 'monospace', fontWeight: 600, color: v > 65 ? '#DC3545' : '#243B53' }}>{v.toFixed(1)}%</span>
    },
    {
      title: 'Pressure (bar)',
      dataIndex: 'pressure_bar',
      key: 'pressure_bar',
      align: 'right' as const,
      render: (p: number) => <span style={{ fontFamily: 'monospace' }}>{p.toFixed(1)}</span>
    },
    {
      title: 'Oil Temp (°C)',
      dataIndex: 'temperature_c',
      key: 'temperature_c',
      align: 'right' as const,
      render: (t: number) => <span style={{ fontFamily: 'monospace' }}>{t.toFixed(1)}</span>
    },
    {
      title: 'Flow (LPM)',
      dataIndex: 'flow_rate_lpm',
      key: 'flow_rate_lpm',
      align: 'right' as const,
      render: (f: number) => <span style={{ fontFamily: 'monospace' }}>{f.toFixed(1)}</span>
    },
    {
      title: 'Data Type',
      dataIndex: 'is_simulated',
      key: 'is_simulated',
      render: (sim: boolean) => <Tag color="blue">{sim ? 'SIMULATED' : 'FIELD'}</Tag>
    }
  ];

  return (
    <div>
      <div className="scada-panel">
        <div className="scada-panel-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <History size={16} color="#356A9A" />
            <span>HISTORICAL SENSOR TELEMETRY & LOG REPOSITORIES</span>
          </div>
          <Space>
            <Button
              icon={<Download size={13} />}
              href={reportsService.readingsCsvUrl}
              target="_blank"
            >
              Export Readings (CSV)
            </Button>
            <Button
              icon={<Download size={13} />}
              href={reportsService.eventsCsvUrl}
              target="_blank"
            >
              Export Events (CSV)
            </Button>
          </Space>
        </div>

        {/* Filter Bar */}
        <div style={{ padding: '10px 16px', background: '#FAFBFC', borderBottom: '1px solid #DEE2E6', display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#6C757D' }}>ZONE FILTER:</span>
          <Select
            value={filterZone}
            onChange={setFilterZone}
            style={{ width: 180 }}
            options={[
              { value: 'ALL', label: 'All Zones' },
              { value: 'ZONE-01', label: 'ZONE-01: Reservoir' },
              { value: 'ZONE-02', label: 'ZONE-02: Pump' },
              { value: 'ZONE-03', label: 'ZONE-03: Pressure Line' },
              { value: 'ZONE-04', label: 'ZONE-04: Control Valve' },
              { value: 'ZONE-05', label: 'ZONE-05: Cylinder' },
              { value: 'ZONE-06', label: 'ZONE-06: Return Line' },
            ]}
          />
          <span style={{ fontSize: 11, color: '#6C757D' }}>
            Showing latest {displayedReadings.length} persistent database records.
          </span>
        </div>

        <Table
          size="small"
          dataSource={displayedReadings}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 12 }}
        />
      </div>
    </div>
  );
};

