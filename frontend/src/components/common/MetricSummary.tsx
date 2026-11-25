import React from 'react';
import { Tag } from 'antd';

interface MetricSummaryProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  statusColor?: string;
  tag?: string;
}

export const MetricSummary: React.FC<MetricSummaryProps> = ({
  title,
  value,
  subtitle,
  icon,
  statusColor = '#243B53',
  tag,
}) => {
  return (
    <div className="scada-panel" style={{ padding: '12px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: '#6C757D', fontWeight: 600, letterSpacing: '0.3px', textTransform: 'uppercase' }}>
          {title}
        </span>
        {icon}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 4 }}>
        <span className="metric-number" style={{ fontSize: 24, color: statusColor }}>
          {value}
        </span>
        {tag && <Tag color="blue" style={{ fontSize: 10, margin: 0 }}>{tag}</Tag>}
      </div>

      {subtitle && (
        <div style={{ fontSize: 11, color: '#6C757D', marginTop: 4 }}>
          {subtitle}
        </div>
      )}
    </div>
  );
};

