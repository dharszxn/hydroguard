import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Switch, InputNumber, Tag, message, Divider, Space } from 'antd';
import { Settings, ShieldCheck, Wifi, WifiOff, HardDrive, RefreshCw } from 'lucide-react';
import { deviceService } from '../../services/api';
import { VirtualDevice } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { formatIST } from '../../utils/dateUtils';

export const SettingsPage: React.FC = () => {
  const [devices, setDevices] = useState<VirtualDevice[]>([]);
  const [syncLogs, setSyncLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [d, l] = await Promise.all([
        deviceService.getStatus(),
        deviceService.getSyncLogs()
      ]);
      setDevices(d);
      setSyncLogs(l);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const dev = devices[0] || {
    id: 'ESP32-EDGE-01',
    ip_address: '192.168.1.101',
    wifi_ssid: 'FACTORY-SCADA-WLAN',
    firmware_version: 'v2.4.1-INNOX',
    connectivity_state: 'ONLINE',
    buffer_count: 0
  };

  const handleToggleWifi = async () => {
    try {
      if (dev.connectivity_state === 'ONLINE') {
        await deviceService.disconnect(dev.id);
        message.warning(`Wi-Fi disconnected for ${dev.id}. Telemetry is now buffering locally.`);
      } else {
        await deviceService.reconnect(dev.id);
        message.success(`Wi-Fi reconnected for ${dev.id}. Buffered telemetry synchronized.`);
      }
      loadData();
    } catch (e) {
      message.error('Failed to change device connectivity');
    }
  };

  return (
    <div>
      <PageHeader
        title="System Configuration & Edge Hardware"
        subtitle="Manage virtual ESP32 edge node parameters, Wi-Fi connectivity, and event buffering audit"
        breadcrumbs={['HYDROGUARD', 'Settings', 'Edge Configuration']}
      />

      <div className="scada-panel" style={{ marginBottom: 16 }}>
        <div className="scada-panel-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Settings size={16} color="#356A9A" />
            <span>SYSTEM CONFIGURATION & VIRTUAL EDGE NODE HARDWARE ABSTRACTION</span>
          </div>
          <Button icon={<RefreshCw size={13} />} onClick={loadData} loading={loading}>
            Refresh State
          </Button>
        </div>

        <div style={{ padding: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Edge Node Hardware Profile */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#243B53', marginBottom: 12 }}>
                Virtual Edge Node Configuration
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: '#FAFBFC', padding: 16, border: '1px solid #DEE2E6', borderRadius: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6C757D' }}>Device ID:</span>
                  <strong style={{ fontFamily: 'monospace' }}>{dev.id}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6C757D' }}>Assigned Machine:</span>
                  <span>MCH-001 (500-Ton Hydraulic Press)</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6C757D' }}>Simulated Hardware:</span>
                  <span>ESP32-WROOM-32D (Dual-Core 240MHz)</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6C757D' }}>Firmware Build:</span>
                  <Tag color="blue">{dev.firmware_version}</Tag>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6C757D' }}>Network SSID:</span>
                  <span style={{ fontFamily: 'monospace' }}>{dev.wifi_ssid}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#6C757D' }}>Wi-Fi State:</span>
                  <Tag color={dev.connectivity_state === 'ONLINE' ? 'success' : 'error'} style={{ fontWeight: 600 }}>
                    {dev.connectivity_state}
                  </Tag>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#6C757D' }}>Buffer Queue:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                    {dev.buffer_count} events buffered
                  </span>
                </div>

                <Divider style={{ margin: '8px 0' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>Simulate Network Failure:</span>
                  <Button
                    type={dev.connectivity_state === 'ONLINE' ? 'primary' : 'default'}
                    danger={dev.connectivity_state === 'ONLINE'}
                    icon={dev.connectivity_state === 'ONLINE' ? <WifiOff size={14} /> : <Wifi size={14} />}
                    onClick={handleToggleWifi}
                  >
                    {dev.connectivity_state === 'ONLINE' ? 'Disconnect Wi-Fi' : 'Reconnect & Sync'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Edge Node Synchronization Audit */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#243B53', marginBottom: 12 }}>
                Recent Edge Synchronization History
              </div>

              <div style={{ background: '#FAFBFC', padding: 16, border: '1px solid #DEE2E6', borderRadius: 4, maxHeight: 310, overflowY: 'auto' }}>
                {syncLogs.length === 0 ? (
                  <div style={{ fontSize: 12, color: '#6C757D' }}>No disconnection re-synchronization events recorded yet.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {syncLogs.map((log) => (
                      <div key={log.id} style={{ padding: 8, background: '#FFFFFF', border: '1px solid #DEE2E6', borderRadius: 3, fontSize: 11 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <strong>{log.device_id}</strong>
                          <span style={{ color: '#ADB5BD', fontFamily: 'monospace' }}>{formatIST(log.timestamp)}</span>
                        </div>
                        <div style={{ color: '#198754', fontWeight: 600, marginTop: 2 }}>
                          {log.events_synced} telemetry events synchronized
                        </div>
                        <div style={{ color: '#6C757D', marginTop: 2 }}>{log.details}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

