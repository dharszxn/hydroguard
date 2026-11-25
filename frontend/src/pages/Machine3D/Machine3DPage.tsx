import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Tag, Spin } from 'antd';
import { Box } from 'lucide-react';
import { SimulationControlPanel } from '../../components/common/SimulationControlPanel';
import { LiveDefectReportPanel } from '../../components/machinery/LiveDefectReportPanel';
import { zoneService, eventService } from '../../services/api';
import { Zone, LeakageEvent, TelemetryReading, ZoneStatus, DefectReport } from '../../types';
import { tokens } from '../../styles/tokens';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PageHeader } from '../../components/common/PageHeader';

const HydraulicMachine3D = lazy(() => import('../../components/machinery/HydraulicMachine3D'));

interface Machine3DPageProps {
  initialZoneId?: string;
  onNavigateTab: (tab: string, zoneId?: string) => void;
  telemetry: Record<string, TelemetryReading>;
  zoneStatuses: Record<string, ZoneStatus>;
}

export const Machine3DPage: React.FC<Machine3DPageProps> = ({
  initialZoneId = 'ZONE-03',
  onNavigateTab,
  telemetry,
  zoneStatuses
}) => {
  const [selectedZoneId, setSelectedZoneId] = useState<string>(initialZoneId);
  const [zones, setZones] = useState<Zone[]>([]);
  const [activeReports, setActiveReports] = useState<DefectReport[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | undefined>();

  useEffect(() => {
    if (initialZoneId) {
      setSelectedZoneId(initialZoneId);
    }
  }, [initialZoneId]);

  const loadData = async () => {
    try {
      const [zRes, reportsRes] = await Promise.all([
        zoneService.getZones('MCH-001'),
        eventService.getActiveDefectReports('MCH-001')
      ]);
      setZones(zRes);
      setActiveReports(reportsRes);
      if (reportsRes.length > 0 && !selectedReportId) {
        setSelectedReportId(reportsRes[0].event_id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 2000);
    return () => clearInterval(interval);
  }, [selectedReportId]);

  const selectedZone = zones.find((z) => z.id === selectedZoneId) || {
    id: selectedZoneId,
    name: selectedZoneId === 'ZONE-01' ? 'Oil Reservoir & Power Pack' :
          selectedZoneId === 'ZONE-02' ? 'Hydraulic Pump & Motor' :
          selectedZoneId === 'ZONE-03' ? 'Pressure Pipeline & Manifold' :
          selectedZoneId === 'ZONE-04' ? 'Control Valve Block' :
          selectedZoneId === 'ZONE-05' ? 'Hydraulic Cylinder & Ram' : 'Oil Return Line & Filter',
    machine_id: 'MCH-001',
    component_mapping: 'pipeline_press',
    detection_threshold: 65.0,
    persistence_duration: 4.0,
    severity_level: 'CRITICAL',
    is_enabled: true,
    current_status: zoneStatuses[selectedZoneId] || 'NORMAL',
    simulated_signal_value: 8.5,
    pressure_bar: 160.0,
    temperature_c: 48.0,
    flow_rate_lpm: 72.0,
    is_connected: true
  };

  const currentStatus = zoneStatuses[selectedZoneId] || selectedZone.current_status || 'NORMAL';
  const isConfirmedLeak = currentStatus === 'LEAKAGE_CONFIRMED' || currentStatus === 'LEAKAGE CONFIRMED';
  const isSuspected = currentStatus === 'LEAKAGE_SUSPECTED' || currentStatus === 'LEAKAGE SUSPECTED';

  const currentTelemetry = telemetry[selectedZoneId] || {
    sensor_id: `SENS-OIL-${selectedZoneId.slice(-2)}`,
    zone_id: selectedZoneId,
    machine_id: 'MCH-001',
    oil_signal_pct: selectedZone.simulated_signal_value || 8.5,
    pressure_bar: selectedZone.pressure_bar || 160.0,
    temperature_c: selectedZone.temperature_c || 48.0,
    flow_rate_lpm: selectedZone.flow_rate_lpm || 72.0,
    is_connected: true,
    timestamp: new Date().toISOString()
  };

  // Handlers for maintenance actions
  const handleAcknowledge = async (eventId: string, notes?: string) => {
    await eventService.acknowledge(eventId, 'Operator on Shift', notes);
    await loadData();
  };

  const handleInvestigate = async (eventId: string, technician: string, notes: string) => {
    await eventService.investigate(eventId, technician, 'IN_PROGRESS', notes);
    await loadData();
  };

  const handleResolve = async (eventId: string, resolvedBy: string, notes: string) => {
    await eventService.resolve(eventId, resolvedBy, notes);
    await loadData();
  };

  const handleClose = async (eventId: string, closedBy: string, notes: string) => {
    await eventService.close(eventId, closedBy, notes);
    await loadData();
  };

  return (
    <div>
      <PageHeader
        title="3D Digital Twin & Automatic Defect Diagnosis"
        subtitle="High-fidelity 500-Ton Hydraulic Press (MCH-001) with component-level sensor mapping and real-time diagnostic reporting"
        breadcrumbs={['HYDROGUARD', 'Digital Twin', '3D Machine View']}
        actions={
          <StatusBadge status={isConfirmedLeak ? 'LEAKAGE CONFIRMED' : isSuspected ? 'LEAKAGE SUSPECTED' : activeReports.length > 0 ? 'CRITICAL' : 'NORMAL'} />
        }
      />

      {/* Simulation Scenario Toolbar */}
      <SimulationControlPanel
        selectedZoneId={selectedZoneId}
        onSelectZone={(zid) => setSelectedZoneId(zid)}
      />

      {/* Main 3D Display Container */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16, height: 640 }}>
        {/* 3D Canvas Box */}
        <div className="scada-panel" style={{ position: 'relative', overflow: 'hidden', height: '100%' }}>
          <div className="scada-panel-header" style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, background: 'rgba(255,255,255,0.92)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Box size={16} color={tokens.colors.steel} />
              <span>500-TON HYDRAULIC PRESS DIGITAL TWIN (MCH-001)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: tokens.colors.textMuted }}>Selected:</span>
              <Tag color={isConfirmedLeak ? 'error' : isSuspected ? 'warning' : 'processing'} style={{ fontWeight: 600 }}>
                {selectedZoneId} ({selectedZone.name})
              </Tag>
            </div>
          </div>

          {/* Lazy loaded 3D Canvas */}
          <Suspense fallback={
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, background: '#F8F9FA' }}>
              <Spin size="large" />
              <span style={{ fontSize: 12, color: tokens.colors.textMuted }}>Loading Industrial CAD Digital Twin...</span>
            </div>
          }>
            <HydraulicMachine3D
              selectedZoneId={selectedZoneId}
              onSelectZone={(zid) => setSelectedZoneId(zid)}
              zoneStatuses={zoneStatuses}
            />
          </Suspense>
        </div>

        {/* Right-Side Live Defect Report & Telemetry HUD */}
        <LiveDefectReportPanel
          selectedZone={selectedZone}
          currentTelemetry={currentTelemetry}
          currentStatus={currentStatus}
          activeReports={activeReports}
          selectedReportId={selectedReportId}
          onSelectReportId={(id) => {
            setSelectedReportId(id);
            const r = activeReports.find(x => x.event_id === id);
            if (r) setSelectedZoneId(r.zone_id);
          }}
          onAcknowledge={handleAcknowledge}
          onInvestigate={handleInvestigate}
          onResolve={handleResolve}
          onClose={handleClose}
          onViewFullReport={(id) => onNavigateTab('defect-history', id)}
        />
      </div>
    </div>
  );
};

export default Machine3DPage;
