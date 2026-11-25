import React, { useState, useEffect } from 'react';
import { Select, Slider, Button, Badge, Space, Typography, Progress } from 'antd';
import {
  Play, Pause, PlayCircle, Square, RotateCcw, Wifi, WifiOff, ShieldCheck
} from 'lucide-react';
import { simulationService, deviceService } from '../../services/api';
import { SimulationStatus } from '../../types';

const { Text } = Typography;

interface SimulationControlProps {
  onScenarioChange?: (scenario: string, zoneId: string) => void;
  selectedZoneId?: string;
  onSelectZone?: (zoneId: string) => void;
}

export const SimulationControlPanel: React.FC<SimulationControlProps> = ({
  onScenarioChange,
  selectedZoneId = 'ZONE-03',
  onSelectZone
}) => {
  const [machineId, setMachineId] = useState('MCH-001');
  const [zoneId, setZoneId] = useState(selectedZoneId);
  const [scenario, setScenario] = useState('scenario_2');
  const [persistenceSec, setPersistenceSec] = useState(4.0);
  const [intensity, setIntensity] = useState(85);
  const [status, setStatus] = useState<SimulationStatus | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setZoneId(selectedZoneId);
  }, [selectedZoneId]);

  const fetchStatus = async () => {
    try {
      const res = await simulationService.getStatus();
      setStatus(res);
    } catch (e) {
      // ignore poll errors
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleStart = async () => {
    setLoading(true);
    try {
      await simulationService.start({
        scenario_id: scenario,
        machine_id: machineId,
        zone_id: zoneId,
        persistence_seconds: persistenceSec,
        signal_intensity: intensity
      });
      if (onScenarioChange) onScenarioChange(scenario, zoneId);
      await fetchStatus();
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async () => {
    setLoading(true);
    try {
      await simulationService.pause();
      await fetchStatus();
    } finally {
      setLoading(false);
    }
  };

  const handleResume = async () => {
    setLoading(true);
    try {
      await simulationService.resume();
      await fetchStatus();
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    setLoading(true);
    try {
      await simulationService.stop();
      await fetchStatus();
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setLoading(true);
    try {
      await simulationService.reset();
      await fetchStatus();
    } finally {
      setLoading(false);
    }
  };

  const handleToggleWifi = async () => {
    if (status?.wifi_connected) {
      await deviceService.disconnect('ESP32-EDGE-01');
    } else {
      await deviceService.reconnect('ESP32-EDGE-01');
    }
    await fetchStatus();
  };

  const elapsed = status?.elapsed_persistence_sec || 0;
  const required = status?.persistence_threshold_sec || persistenceSec;
  const timerPercent = Math.min(100, Math.round((elapsed / Math.max(required, 0.1)) * 100));

  return (
    <div className="scada-panel" style={{ width: '100%', marginBottom: 16 }}>
      <div className="scada-panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldCheck size={16} color="#356A9A" />
          <span>VIRTUAL SENSOR & SCENARIO SIMULATION ENGINE</span>
          <Badge
            status={
              status?.is_paused ? 'warning' :
              status?.is_running ? 'processing' : 'default'
            }
            text={
              status?.is_paused ? 'SIMULATION PAUSED' :
              status?.is_running ? 'SIMULATION ACTIVE' : 'STANDBY'
            }
            style={{ marginLeft: 8, fontSize: 11, fontWeight: 600 }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: '#6C757D' }}>
            Simulated Edge Node: <strong>ESP32-EDGE-01</strong>
          </span>
          <Button
            size="small"
            type={status?.wifi_connected ? 'default' : 'primary'}
            danger={!status?.wifi_connected}
            icon={status?.wifi_connected ? <Wifi size={13} /> : <WifiOff size={13} />}
            onClick={handleToggleWifi}
          >
            {status?.wifi_connected ? 'SIMULATED WI-FI: ONLINE' : `BUFFERED (${status?.buffer_count || 0})`}
          </Button>
        </div>
      </div>

      <div style={{ padding: '12px 16px', background: '#FAFBFC' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          {/* Machine Selector */}
          <div>
            <Text type="secondary" style={{ fontSize: 11, fontWeight: 600 }}>MACHINE SELECTION</Text>
            <Select
              style={{ width: '100%', marginTop: 4 }}
              value={machineId}
              onChange={(val) => setMachineId(val)}
              options={[
                { value: 'MCH-001', label: 'MCH-001: 500-Ton Hydraulic Press' },
              ]}
            />
          </div>

          {/* Zone Selector */}
          <div>
            <Text type="secondary" style={{ fontSize: 11, fontWeight: 600 }}>MONITORING ZONE</Text>
            <Select
              style={{ width: '100%', marginTop: 4 }}
              value={zoneId}
              onChange={(val) => {
                setZoneId(val);
                if (onSelectZone) onSelectZone(val);
              }}
              options={[
                { value: 'ZONE-01', label: 'ZONE-01: Oil Reservoir' },
                { value: 'ZONE-02', label: 'ZONE-02: Hydraulic Pump' },
                { value: 'ZONE-03', label: 'ZONE-03: Pressure Pipeline' },
                { value: 'ZONE-04', label: 'ZONE-04: Control Valve' },
                { value: 'ZONE-05', label: 'ZONE-05: Hydraulic Cylinder' },
                { value: 'ZONE-06', label: 'ZONE-06: Oil Return Line' },
              ]}
            />
          </div>

          {/* Scenario Selector */}
          <div>
            <Text type="secondary" style={{ fontSize: 11, fontWeight: 600 }}>SIMULATION SCENARIO</Text>
            <Select
              style={{ width: '100%', marginTop: 4 }}
              value={scenario}
              onChange={(val) => setScenario(val)}
              options={[
                { value: 'scenario_1', label: '1. Normal Operation (Clean Baseline)' },
                { value: 'scenario_2', label: '2. Gradual Leakage (Ramp)' },
                { value: 'scenario_3', label: '3. Sudden Leakage (Step)' },
                { value: 'scenario_4', label: '4. Transient Splash (Rejection Demo)' },
                { value: 'scenario_5', label: '5. Sensor Disconnection' },
                { value: 'scenario_6', label: '6. Wi-Fi Disconnection (Edge Buffering)' },
                { value: 'scenario_7', label: '7. Critical High-Pressure Leak' },
                { value: 'scenario_8', label: '8. Multiple Zone Leakage (Zones 1 & 3)' },
                { value: 'scenario_9', label: '9. Pressure Drop without Leak Signal (112 bar)' },
              ]}
            />
          </div>

          {/* Persistence Duration */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text type="secondary" style={{ fontSize: 11, fontWeight: 600 }}>PERSISTENCE DURATION</Text>
              <span style={{ fontSize: 11, fontFamily: 'monospace' }}>{persistenceSec}s</span>
            </div>
            <Slider
              min={1.0}
              max={10.0}
              step={0.5}
              value={persistenceSec}
              onChange={(v) => setPersistenceSec(v)}
              style={{ marginTop: 8 }}
            />
          </div>

          {/* Signal Intensity */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text type="secondary" style={{ fontSize: 11, fontWeight: 600 }}>OIL LEAK INTENSITY</Text>
              <span style={{ fontSize: 11, fontFamily: 'monospace' }}>{intensity}%</span>
            </div>
            <Slider
              min={20}
              max={100}
              value={intensity}
              onChange={(v) => setIntensity(v)}
              style={{ marginTop: 8 }}
            />
          </div>
        </div>

        {/* Persistence Timer Live Bar */}
        <div style={{ marginTop: 12, padding: '8px 12px', background: '#FFFFFF', border: '1px solid #DEE2E6', borderRadius: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#243B53' }}>
              Rule-Based Persistence Validation: <strong>{status?.validation_state || 'NORMAL'}</strong>
            </span>
            <span style={{ fontSize: 12, fontFamily: 'monospace' }}>
              {status?.signal_timer_active ? (
                <strong style={{ color: timerPercent >= 100 ? '#DC3545' : '#D99A22' }}>
                  {timerPercent >= 100 ? 'PERSISTENCE CONFIRMED (LEAK DETECTED)' : `TIMER: ${elapsed.toFixed(1)}s / ${required.toFixed(1)}s`}
                </strong>
              ) : status?.leak_confirmed ? (
                <span style={{ color: '#DC3545', fontWeight: 600 }}>CONFIRMED LEAK IN ZONE</span>
              ) : (
                <span style={{ color: '#198754' }}>SIGNAL STABLE (NO TIMER ACTIVE)</span>
              )}
            </span>
          </div>
          <Progress
            percent={timerPercent}
            status={timerPercent >= 100 ? 'exception' : 'active'}
            strokeColor={timerPercent >= 100 ? '#DC3545' : '#D99A22'}
            size="small"
            showInfo={false}
          />
        </div>

        {/* Action Buttons */}
        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <Space>
            <Button
              type="primary"
              icon={<Play size={14} />}
              onClick={handleStart}
              loading={loading}
              style={{ background: '#243B53', borderColor: '#243B53' }}
            >
              Start Scenario
            </Button>

            {status?.is_paused ? (
              <Button
                icon={<PlayCircle size={14} />}
                onClick={handleResume}
                loading={loading}
                style={{ color: '#198754', borderColor: '#198754' }}
              >
                Resume
              </Button>
            ) : (
              <Button
                icon={<Pause size={14} />}
                onClick={handlePause}
                loading={loading}
                disabled={!status?.is_running}
              >
                Pause
              </Button>
            )}

            <Button
              icon={<Square size={14} />}
              onClick={handleStop}
              loading={loading}
              disabled={!status?.is_running && !status?.is_paused}
            >
              Stop
            </Button>

            <Button
              icon={<RotateCcw size={14} />}
              onClick={handleReset}
              loading={loading}
            >
              Reset Baseline
            </Button>
          </Space>

          <span style={{ fontSize: 11, color: '#6C757D' }}>
            SIMULATED EDGE NODE – ONLINE (PS-021) • Software Simulation Only
          </span>
        </div>
      </div>
    </div>
  );
};
