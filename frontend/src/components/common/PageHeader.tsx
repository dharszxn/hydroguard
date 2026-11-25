import React from 'react';
import { ChevronRight } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs: string[];
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  breadcrumbs,
  actions
}) => {
  return (
    <div style={{ marginBottom: 16 }}>
      {/* Breadcrumb line */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#6C757D', marginBottom: 4 }}>
        {breadcrumbs.map((b, idx) => (
          <React.Fragment key={idx}>
            <span style={{ color: idx === breadcrumbs.length - 1 ? '#243B53' : '#6C757D', fontWeight: idx === breadcrumbs.length - 1 ? 600 : 400 }}>
              {b}
            </span>
            {idx < breadcrumbs.length - 1 && <ChevronRight size={11} />}
          </React.Fragment>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#243B53', margin: 0 }}>
            {title}
          </h2>
          {subtitle && (
            <div style={{ fontSize: 12, color: '#6C757D', marginTop: 2 }}>
              {subtitle}
            </div>
          )}
        </div>
        {actions && <div>{actions}</div>}
      </div>
    </div>
  );
};

