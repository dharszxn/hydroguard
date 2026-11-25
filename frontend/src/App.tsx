import React, { useState, Suspense, lazy } from 'react';
import { ConfigProvider, Modal, Button, Spin } from 'antd';
import { AppLayout } from './components/layout/AppLayout';
import { useTelemetryWebSocket } from './hooks/useTelemetryWebSocket';
import { User } from './types';
import { tokens } from './styles/tokens';

// Synchronous core tabs
import { OverviewPage } from './pages/Overview/OverviewPage';
import { LiveMonitoringPage } from './pages/LiveMonitoring/LiveMonitoringPage';
import { ZoneManagementPage } from './pages/ZoneManagement/ZoneManagementPage';
import { EventManagementPage } from './pages/EventManagement/EventManagementPage';
import { AnalyticsPage } from './pages/Analytics/AnalyticsPage';
import { HistoricalDataPage } from './pages/HistoricalData/HistoricalDataPage';
import { MaintenancePage } from './pages/Maintenance/MaintenancePage';
import { ReportsPage } from './pages/Reports/ReportsPage';
import { SettingsPage } from './pages/Settings/SettingsPage';
import { LoginPage } from './pages/Login/LoginPage';

// Section 7: Lazy-load heavy components
const Machine3DPage = lazy(() => import('./pages/Machine3D/Machine3DPage'));
const DefectHistoryPage = lazy(() => import('./pages/DefectHistory/DefectHistoryPage'));

import { PlayCircle, ShieldCheck } from 'lucide-react';

export const App: React.FC = () => {
  // Authentication State - Genuine registered users only (No hardcoded example accounts)
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('hydroguard_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [currentTab, setCurrentTab] = useState<string>('overview');
  const [selectedZoneId, setSelectedZoneId] = useState<string>('ZONE-03');
  const [demoModalVisible, setDemoModalVisible] = useState<boolean>(false);

  // Live WebSocket Connection
  const {
    telemetry,
    zoneStatuses,
    wifiConnected,
  } = useTelemetryWebSocket();

  const handleNavigate = (tab: string, zoneId?: string) => {
    setCurrentTab(tab);
    if (zoneId) {
      setSelectedZoneId(zoneId);
    }
  };

  const handleLoginSuccess = (user: User, token?: string) => {
    localStorage.setItem('hydroguard_user', JSON.stringify(user));
    if (token) {
      localStorage.setItem('hydroguard_token', token);
    }
    setCurrentUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('hydroguard_user');
    localStorage.removeItem('hydroguard_token');
    setCurrentUser(null);
  };

  if (!currentUser) {
    return (
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: tokens.colors.navy,
            borderRadius: 4,
            fontFamily: tokens.fonts.sans
          }
        }}
      >
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      </ConfigProvider>
    );
  }

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: tokens.colors.navy,
          colorSuccess: tokens.colors.success,
          colorWarning: tokens.colors.warning,
          colorError: tokens.colors.critical,
          colorInfo: tokens.colors.info,
          borderRadius: 4,
          fontFamily: tokens.fonts.sans
        }
      }}
    >
      <AppLayout
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        currentUser={currentUser}
        onLogout={handleLogout}
        wifiConnected={wifiConnected}
      >
        {/* Floating Demo Workflow Guide Button */}
        <div style={{ position: 'fixed', bottom: 16, right: 20, zIndex: 90 }}>
          <Button
            type="primary"
            size="small"
            icon={<PlayCircle size={14} />}
            onClick={() => setDemoModalVisible(true)}
            style={{
              background: tokens.colors.navy,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              fontWeight: 600,
              height: 32,
              borderRadius: 16,
              opacity: 0.95
            }}
          >
            Demo Guide (20 Steps)
          </Button>
        </div>

        {/* 9-Item Consolidated Navigation Tabs */}
        {currentTab === 'overview' && (
          <OverviewPage onNavigateTab={handleNavigate} telemetry={telemetry} />
        )}

        {currentTab === 'monitoring' && (
          <LiveMonitoringPage
            telemetry={telemetry}
            onSelectZoneFor3D={(zid) => handleNavigate('machine3d', zid)}
          />
        )}

        {currentTab === 'machine3d' && (
          <Suspense fallback={
            <div style={{ padding: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <Spin size="large" />
              <span style={{ fontSize: 13, color: tokens.colors.textMuted }}>Loading 3D Machinery Digital Twin...</span>
            </div>
          }>
            <Machine3DPage
              initialZoneId={selectedZoneId}
              onNavigateTab={handleNavigate}
              telemetry={telemetry}
              zoneStatuses={zoneStatuses}
            />
          </Suspense>
        )}

        {currentTab === 'defect-history' && (
          <Suspense fallback={
            <div style={{ padding: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <Spin size="large" />
              <span style={{ fontSize: 13, color: tokens.colors.textMuted }}>Loading Defect History & Reports Archive...</span>
            </div>
          }>
            <DefectHistoryPage initialEventId={selectedZoneId.startsWith('EVT') || selectedZoneId.startsWith('DEF') ? selectedZoneId : undefined} />
          </Suspense>
        )}

        {currentTab === 'zones' && <ZoneManagementPage />}
        {currentTab === 'events' && <EventManagementPage />}
        {currentTab === 'analytics' && <AnalyticsPage />}
        {currentTab === 'maintenance' && <MaintenancePage />}
        {currentTab === 'reports' && <ReportsPage />}
        {currentTab === 'settings' && <SettingsPage />}

        {/* 20-Step Demonstration Guide Modal */}
        <Modal
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={18} color={tokens.colors.steel} />
              <span>HYDROGUARD Official Hackathon Demonstration Sequence (Section 25)</span>
            </div>
          }
          open={demoModalVisible}
          onOk={() => setDemoModalVisible(false)}
          onCancel={() => setDemoModalVisible(false)}
          width={650}
          okText="Got It"
        >
          <div style={{ maxHeight: 440, overflowY: 'auto', paddingRight: 8 }}>
            <div style={{ fontSize: 12, color: tokens.colors.textMuted, marginBottom: 12 }}>
              Follow this verified 20-step evaluation sequence during hackathon reviews:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
              <div><strong>STEP 1:</strong> Open <em>Overview</em> & inspect machine health summary.</div>
              <div><strong>STEP 2:</strong> Navigate to <em>3D Machine View</em> (lazy loaded).</div>
              <div><strong>STEP 3:</strong> Review all 6 monitoring zones in CAD 3D representation.</div>
              <div><strong>STEP 4:</strong> Select <strong>ZONE-03: Pressure Pipeline</strong>.</div>
              <div><strong>STEP 5:</strong> Open simulation control panel at the top.</div>
              <div><strong>STEP 6:</strong> Select <em>Scenario 2: Gradual Leakage</em>.</div>
              <div><strong>STEP 7:</strong> Click <strong>Start Scenario</strong>.</div>
              <div><strong>STEP 8:</strong> Observe sensor oil signal rise above 65%.</div>
              <div><strong>STEP 9:</strong> Watch persistence timer progress bar count to 4.0s.</div>
              <div><strong>STEP 10:</strong> Engine confirms persistent leakage condition.</div>
              <div><strong>STEP 11:</strong> ZONE-03 component highlights in alert red with 3D marker.</div>
              <div><strong>STEP 12:</strong> Alert notification appears in top bar.</div>
              <div><strong>STEP 13:</strong> Navigate to <em>Event Management</em>.</div>
              <div><strong>STEP 14:</strong> Click <strong>Acknowledge</strong> on the active event.</div>
              <div><strong>STEP 15:</strong> Click <strong>Investigate</strong> & record flange findings.</div>
              <div><strong>STEP 16:</strong> Log maintenance work order & corrective notes.</div>
              <div><strong>STEP 17:</strong> Reset / clear simulated leakage condition.</div>
              <div><strong>STEP 18:</strong> Click <strong>Resolve</strong>, then <strong>Close Ticket</strong>.</div>
              <div><strong>STEP 19:</strong> Open <em>Reports</em> and export CSV telemetry & incidents.</div>
              <div><strong>STEP 20:</strong> Open <em>Analytics</em> to review response times & accuracy.</div>
            </div>
            <div style={{ marginTop: 14, padding: 10, background: '#E8F5E9', border: '1px solid #C8E6C9', borderRadius: 4, fontSize: 11, color: '#1B5E20' }}>
              <strong>Transient Rejection Test:</strong> Select <em>Scenario 4: Transient Splash</em> to demonstrate that short temporary spikes (&lt; 4s) are rejected without generating false events.
            </div>
          </div>
        </Modal>
      </AppLayout>
    </ConfigProvider>
  );
};

export default App;
