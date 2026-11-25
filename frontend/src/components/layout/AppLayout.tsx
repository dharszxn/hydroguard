import React, { useState, useEffect } from 'react';
import {
  Layout, Menu, Badge, Button, Popover, List, Tag, Typography, Avatar, Tooltip
} from 'antd';
import {
  LayoutDashboard, Activity, Box, Layers,
  FileCheck2, BarChart3, Wrench, FileSpreadsheet,
  Settings, Bell, Wifi, WifiOff, ShieldCheck, ShieldAlert, User
} from 'lucide-react';
import { notificationService } from '../../services/api';
import { NotificationItem, User as UserType } from '../../types';
import { tokens } from '../../styles/tokens';
import { formatIST } from '../../utils/dateUtils';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

interface AppLayoutProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  currentUser: UserType | null;
  onLogout: () => void;
  wifiConnected?: boolean;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentTab,
  onSelectTab,
  currentUser,
  onLogout,
  wifiConnected = true,
  children
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const fetchNotifs = async () => {
    try {
      const data = await notificationService.getNotifications();
      setNotifications(data);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 3000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAllRead = async () => {
    await notificationService.markAllRead();
    fetchNotifs();
  };

  // Consolidated Navigation Structure with Defect History & Reports
  const navItems = [
    { key: 'overview', icon: <LayoutDashboard size={18} />, label: 'Overview' },
    { key: 'monitoring', icon: <Activity size={18} />, label: 'Machine Monitoring' },
    { key: 'machine3d', icon: <Box size={18} />, label: '3D Machine View' },
    { key: 'defect-history', icon: <FileCheck2 size={18} />, label: 'Defect History & Reports' },
    { key: 'zones', icon: <Layers size={18} />, label: 'Machines & Zones' },
    { key: 'events', icon: <ShieldAlert size={18} />, label: 'Event Management' },
    { key: 'analytics', icon: <BarChart3 size={18} />, label: 'Analytics' },
    { key: 'maintenance', icon: <Wrench size={18} />, label: 'Maintenance' },
    { key: 'reports', icon: <FileSpreadsheet size={18} />, label: 'Reports' },
    { key: 'settings', icon: <Settings size={18} />, label: 'Settings' },
  ];

  const notificationContent = (
    <div style={{ width: 340, maxHeight: 420, overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingBottom: 6, borderBottom: `1px solid ${tokens.colors.border}` }}>
        <Text strong style={{ fontSize: 13, color: tokens.colors.navy }}>Operational Alerts ({unreadCount})</Text>
        {unreadCount > 0 && (
          <Button type="link" size="small" onClick={handleMarkAllRead} style={{ padding: 0 }}>
            Mark All Read
          </Button>
        )}
      </div>
      <List
        size="small"
        dataSource={notifications.slice(0, 15)}
        renderItem={(item) => (
          <List.Item
            key={item.id}
            style={{
              padding: '8px 4px',
              backgroundColor: item.is_read ? 'transparent' : '#F8F9FA',
              borderBottom: '1px solid #F1F3F5'
            }}
          >
            <div style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text strong style={{ fontSize: 12, color: item.severity === 'CRITICAL' ? tokens.colors.critical : tokens.colors.textMain }}>
                  {item.title}
                </Text>
                <Tag color={item.severity === 'CRITICAL' ? 'error' : item.severity === 'HIGH' ? 'warning' : 'default'} style={{ fontSize: 10 }}>
                  {item.severity}
                </Tag>
              </div>
              <div style={{ fontSize: 11, color: tokens.colors.textMuted, marginTop: 2 }}>{item.message}</div>
              <div style={{ fontSize: 10, color: '#ADB5BD', marginTop: 2, fontFamily: tokens.fonts.mono }}>
                {formatIST(item.timestamp)}
              </div>
            </div>
          </List.Item>
        )}
      />
    </div>
  );

  return (
    <Layout style={{ minHeight: '100vh', background: tokens.colors.bgPage }}>
      {/* SCADA Left Sidebar with Complete HYDROGUARD Branding */}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={(val) => setCollapsed(val)}
        width={256}
        collapsedWidth={80}
        theme="light"
        style={{
          background: tokens.colors.bgSidebar,
          borderRight: `1px solid ${tokens.colors.border}`,
          height: '100vh',
          position: 'sticky',
          top: 0,
          left: 0,
          zIndex: 110,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '1px 0 3px rgba(0,0,0,0.03)'
        }}
      >
        {/* Sidebar Brand Header */}
        <div style={{
          height: 68,
          borderBottom: `1px solid ${tokens.colors.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? '0' : '0 16px',
          background: '#FFFFFF',
          overflow: 'hidden'
        }}>
          {collapsed ? (
            <Tooltip title="HYDROGUARD — Hydraulic Oil & Leakage Monitoring System" placement="right">
              <div style={{
                width: 38,
                height: 38,
                background: tokens.colors.navy,
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                cursor: 'pointer'
              }}>
                <ShieldCheck size={22} />
              </div>
            </Tooltip>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', overflow: 'hidden' }}>
              <div style={{
                width: 36,
                height: 36,
                background: tokens.colors.navy,
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                flexShrink: 0
              }}>
                <ShieldCheck size={20} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    fontSize: 15,
                    fontWeight: 700,
                    letterSpacing: '0.5px',
                    color: tokens.colors.navy,
                    lineHeight: 1.1,
                    whiteSpace: 'nowrap'
                  }}>
                    HYDROGUARD
                  </span>
                  <Tag color="geekblue" style={{ fontSize: 9, lineHeight: '15px', padding: '0 4px', fontWeight: 600, margin: 0 }}>
                    PS-021
                  </Tag>
                </div>
                <span style={{
                  fontSize: 10,
                  color: tokens.colors.textMuted,
                  marginTop: 2,
                  fontWeight: 500,
                  lineHeight: 1.2,
                  whiteSpace: 'normal',
                  wordBreak: 'break-word'
                }}>
                  Hydraulic Oil & Leakage Monitoring System
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Section title */}
        {!collapsed && (
          <div style={{ padding: '14px 18px 4px', fontSize: 10, fontWeight: 700, color: tokens.colors.textMuted, letterSpacing: '0.6px', textTransform: 'uppercase' }}>
            SCADA Operations
          </div>
        )}

        {/* 9 Navigation Items */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <Menu
            mode="inline"
            selectedKeys={[currentTab]}
            onClick={({ key }) => onSelectTab(key)}
            style={{
              background: 'transparent',
              borderRight: 'none',
              fontSize: 13,
              fontWeight: 500,
              paddingTop: 4
            }}
            items={navItems}
          />
        </div>

        {/* Sidebar Footer Indicator */}
        {!collapsed && (
          <div style={{
            padding: '10px 16px',
            borderTop: `1px solid ${tokens.colors.border}`,
            background: '#FFFFFF',
            fontSize: 10,
            color: tokens.colors.textMuted,
            display: 'flex',
            flexDirection: 'column',
            gap: 2
          }}>
            <div><strong>Sakthi Hackathon 2.0</strong></div>
            <div>Team InnoX • Sri Eshwar College</div>
          </div>
        )}
      </Sider>

      {/* Main Layout containing Top Header and Page Content */}
      <Layout style={{ minWidth: 0, background: tokens.colors.bgPage }}>
        {/* Top SCADA Engineering Header */}
        <Header
          style={{
            background: '#FFFFFF',
            padding: '0 24px',
            height: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `1px solid ${tokens.colors.border}`,
            position: 'sticky',
            top: 0,
            zIndex: 100,
          }}
        >
          {/* Machine & Facility Context */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: tokens.colors.navy }}>
              MCH-001 (500-Ton Hydraulic Press)
            </span>
            <span style={{ color: '#CED4DA' }}>|</span>
            <span style={{ fontSize: 12, color: tokens.colors.textMuted }}>
              Bay 1, Line 3
            </span>
          </div>

          {/* Right Header Indicators */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Simulation mode indicator */}
            <div style={{
              background: tokens.colors.bgSidebar,
              border: `1px solid ${tokens.colors.border}`,
              borderRadius: 3,
              padding: '2px 8px',
              fontSize: 11,
              color: tokens.colors.textMain,
              fontWeight: 500
            }}>
              Simulation: <strong>Software-Only Engine</strong>
            </div>

            {/* ESP32 Edge Node Connectivity Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              {wifiConnected ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: tokens.colors.success, fontWeight: 600 }}>
                  <Wifi size={14} /> ESP32-EDGE-01 ONLINE
                </span>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: tokens.colors.critical, fontWeight: 600 }}>
                  <WifiOff size={14} /> ESP32-EDGE-01 BUFFERING
                </span>
              )}
            </div>

            {/* Operational Alerts Popover */}
            <Popover
              content={notificationContent}
              trigger="click"
              open={popoverOpen}
              onOpenChange={setPopoverOpen}
              placement="bottomRight"
            >
              <Badge count={unreadCount} size="small" offset={[-2, 4]}>
                <Button
                  type="text"
                  icon={<Bell size={18} color={tokens.colors.textMain} />}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                />
              </Badge>
            </Popover>

            {/* Genuine User Profile & Role */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 8, borderLeft: `1px solid ${tokens.colors.border}` }}>
              <Avatar size="small" icon={<User size={14} />} style={{ backgroundColor: tokens.colors.steel }} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: tokens.colors.navy, lineHeight: 1.2 }}>
                  {currentUser?.full_name || 'System User'}
                </span>
                <span style={{ fontSize: 10, color: tokens.colors.textMuted }}>
                  {currentUser?.role || 'Authenticated'}
                </span>
              </div>
              <Button size="small" type="link" onClick={onLogout} style={{ fontSize: 11, color: tokens.colors.critical, padding: '0 4px' }}>
                Logout
              </Button>
            </div>
          </div>
        </Header>

        {/* Content Area with Auto-Adjusting Responsive Grid */}
        <Content style={{ padding: '20px 24px', overflowY: 'auto', minWidth: 0 }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};
