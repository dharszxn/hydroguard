import React from 'react';
import { Tag } from 'antd';
import { ZoneStatus, EventStatus, EventSeverity } from '../../types';

interface StatusBadgeProps {
  status: string;
  type?: 'zone' | 'event' | 'severity' | 'connectivity';
  size?: 'small' | 'middle';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'zone' }) => {
  const norm = (status || '').toUpperCase().trim();

  let color = 'default';
  if (norm.includes('CONFIRMED') || norm.includes('CRITICAL')) {
    color = 'error';
  } else if (norm.includes('SUSPECTED') || norm.includes('WARNING') || norm.includes('HIGH') || norm.includes('INVESTIGATION')) {
    color = 'warning';
  } else if (norm.includes('NORMAL') || norm.includes('RESOLVED') || norm.includes('ONLINE') || norm.includes('HEALTHY')) {
    color = 'success';
  } else if (norm.includes('ACKNOWLEDGED') || norm.includes('MONITORING')) {
    color = 'processing';
  } else if (norm.includes('DISCONNECTED') || norm.includes('OFFLINE')) {
    color = 'default';
  }

  return (
    <Tag color={color} style={{ fontSize: 11, fontWeight: 600, padding: '1px 6px', margin: 0, textTransform: 'uppercase' }}>
      {status}
    </Tag>
  );
};

