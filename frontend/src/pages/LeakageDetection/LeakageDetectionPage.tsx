import React from 'react';
import { Tag, Steps, Progress, Alert } from 'antd';
import {
  ShieldAlert, ArrowRight, CheckCircle2, Clock, Check, AlertOctagon,
  HelpCircle, Filter
} from 'lucide-react';
import { SimulationControlPanel } from '../../components/common/SimulationControlPanel';
import { TelemetryReading, ZoneStatus } from '../../types';

interface LeakageDetectionPageProps {
  telemetry: Record<string, TelemetryReading>;
  zoneStatuses: Record<string, ZoneStatus>;
}

export const LeakageDetectionPage: React.FC<LeakageDetectionPageProps> = ({ telemetry, zoneStatuses }) => {
  const targetTelemetry = telemetry['ZONE-03'] || {
    oil_signal_pct: 8.5,
    pressure_bar: 160.0,
    temperature_c: 48.0,
    flow_rate_lpm: 72.0,
    is_connected: true
  };

  const status = zoneStatuses['ZONE-03'] || 'NORMAL';
  const isSuspected = status === 'LEAKAGE_SUSPECTED';
  const isConfirmed = status === 'LEAKAGE_CONFIRMED';
  const isAboveThreshold = targetTelemetry.oil_signal_pct >= 65.0;

  return (
    <div>
      <SimulationControlPanel selectedZoneId="ZONE-03" />

      {/* Detection Architecture Diagram */}
      <div className="scada-panel" style={{ marginBottom: 16 }}>
        <div className="scada-panel-header">
          <span>DETERMINISTIC RULE-BASED DETECTION WORKFLOW & PERSISTENCE ENGINE (PS-021)</span>
          <Tag color="geekblue">ALGORITHM VERIFIED</Tag>
        </div>
        <div style={{ padding: 20 }}>
          <Steps
            current={isConfirmed ? 4 : isSuspected ? 2 : isAboveThreshold ? 1 : 0}
            items={[
              {
                title: 'Sensor Signal Received',
                description: `Current: ${targetTelemetry.oil_signal_pct.toFixed(1)}%`,
                status: 'finish'
              },
              {
                title: 'Threshold Comparison',
                description: `Thresh: 65.0% (${isAboveThreshold ? 'ABOVE' : 'BELOW'})`,
                status: isAboveThreshold ? 'finish' : 'wait'
              },
              {
                title: 'Persistence Validation',
                description: isConfirmed ? 'Criteria Met (4.0s Passed)' : isSuspected ? 'Timer Running...' : 'Standby / Filtered',
                status: isConfirmed ? 'finish' : isSuspected ? 'process' : 'wait'
              },
              {
                title: 'Zone Identification',
                description: 'Mapped to ZONE-03 (Pressure Line)',
                status: isConfirmed ? 'finish' : 'wait'
              },
              {
                title: 'Leakage Confirmed & Event Recorded',
                description: isConfirmed ? 'Active Incident Generated' : 'Standby',
                status: isConfirmed ? 'finish' : 'wait'
              }
            ]}
          />
        </div>
      </div>

      {/* Live Engineering Comparison */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Signal & Persistence Status Box */}
        <div className="scada-panel">
          <div className="scada-panel-header">
            <span>DETECTION REGISTERS (ZONE-03: PRESSURE PIPELINE)</span>
            <Tag color={isConfirmed ? 'error' : isSuspected ? 'warning' : 'success'}>
              {status}
            </Tag>
          </div>
          <div style={{ padding: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: 8, background: '#FAFBFC', border: '1px solid #DEE2E6', borderRadius: 4 }}>
                <span style={{ color: '#6C757D' }}>Primary Sensor Input:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: isAboveThreshold ? '#DC3545' : '#243B53' }}>
                  {targetTelemetry.oil_signal_pct.toFixed(1)}%
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: 8, background: '#FAFBFC', border: '1px solid #DEE2E6', borderRadius: 4 }}>
                <span style={{ color: '#6C757D' }}>Configured Threshold:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>65.0%</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: 8, background: '#FAFBFC', border: '1px solid #DEE2E6', borderRadius: 4 }}>
                <span style={{ color: '#6C757D' }}>Configured Persistence Window:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>4.0 seconds continuous</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: 8, background: '#FAFBFC', border: '1px solid #DEE2E6', borderRadius: 4 }}>
                <span style={{ color: '#6C757D' }}>Transient Splash Rejection:</span>
                <span style={{ color: '#198754', fontWeight: 600 }}>ENABLED (&lt; 4.0s suppressed)</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: 8, background: '#FAFBFC', border: '1px solid #DEE2E6', borderRadius: 4 }}>
                <span style={{ color: '#6C757D' }}>Sensor Connection State:</span>
                <span style={{ color: targetTelemetry.is_connected ? '#198754' : '#DC3545', fontWeight: 600 }}>
                  {targetTelemetry.is_connected ? 'HEALTHY' : 'DISCONNECTED'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Transient Rejection Theory & Spec */}
        <div className="scada-panel">
          <div className="scada-panel-header">
            <span>TRANSIENT SPLASH REJECTION LOGIC</span>
            <Tag color="purple">ENGINEERING DESIGN</Tag>
          </div>
          <div style={{ padding: 16 }}>
            <div style={{ fontSize: 13, color: '#343A40', lineHeight: 1.6 }}>
              In real-world hydraulic machinery, temporary splashing during tooling stroke or minor maintenance droplet spray can momentarily trigger optical sensors.
            </div>
            
            <div style={{ marginTop: 12, padding: 12, background: '#F8F9FA', border: '1px solid #DEE2E6', borderRadius: 4 }}>
              <div style={{ fontWeight: 600, color: '#243B53', marginBottom: 6 }}>Deterministic Persistence Formula:</div>
              <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#0B5ED7' }}>
                IF (signal &ge; 65%) &rarr; Start Timer(t0);<br />
                IF (signal &ge; 65% for &Delta;t &ge; 4.0s) &rarr; CONFIRM LEAK;<br />
                IF (signal &lt; 65% while &Delta;t &lt; 4.0s) &rarr; REJECT TRANSIENT (NO ALARM).
              </div>
            </div>

            <div style={{ marginTop: 12, fontSize: 12, color: '#6C757D' }}>
              Select <strong>Scenario 4: Transient Splash</strong> in the control panel above to test and verify that spikes shorter than 4.0s are immediately rejected without raising false events.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

