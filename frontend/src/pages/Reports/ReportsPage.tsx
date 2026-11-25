import React, { useState, useEffect } from 'react';
import { Button, Card, Tag, Table, Divider, Space } from 'antd';
import { FileSpreadsheet, Download, FileText, CheckCircle2, ShieldCheck } from 'lucide-react';
import { reportsService } from '../../services/api';
import { PageHeader } from '../../components/common/PageHeader';
import { formatIST } from '../../utils/dateUtils';

export const ReportsPage: React.FC = () => {
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    reportsService.getSummary().then(setSummary).catch(console.error);
  }, []);

  const reportCards = [
    {
      title: 'Machine Health & Reliability Report',
      desc: 'Comprehensive operating state, zone-wise status, and aggregate MTBF / leak incidence metrics for MCH-001.',
      period: 'Monthly Audit Cycle (November 2026)',
      type: 'Executive Engineering Report'
    },
    {
      title: 'Leakage Incident & Response Time Report',
      desc: 'Complete log of confirmed events, operator acknowledgment timestamps, investigation findings, and closure durations.',
      period: 'Full Event History',
      type: 'Compliance & Safety Audit'
    },
    {
      title: 'PS-021 Algorithm Validation Report',
      desc: 'Verification report of rule-based persistence engine, transient splash rejection efficacy, and zero-false-alarm benchmarks.',
      period: 'Sakthi Hackathon 2.0 Evaluation',
      type: 'Validation Certificate'
    },
    {
      title: 'Preventive & Corrective Maintenance Report',
      desc: 'Work order completion logs, seal replacement records, torquing parameters, and maintenance technician sign-offs.',
      period: 'Maintenance Log 2026',
      type: 'Work Order Summary'
    }
  ];

  return (
    <div>
      <PageHeader
        title="Enterprise Reports & Exports"
        subtitle="Generate ISO 4406 / DIN 24312 compliance summaries and CSV data exports"
        breadcrumbs={['HYDROGUARD', 'Documentation', 'Reports']}
      />

      <div className="scada-panel" style={{ marginBottom: 16 }}>
        <div className="scada-panel-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileSpreadsheet size={16} color="#356A9A" />
            <span>ENTERPRISE REPORT GENERATION & DATA EXPORTS</span>
          </div>
          <Space>
            <Button type="primary" icon={<Download size={13} />} href={reportsService.eventsCsvUrl} target="_blank" style={{ background: '#243B53' }}>
              Export Events CSV
            </Button>
            <Button icon={<Download size={13} />} href={reportsService.readingsCsvUrl} target="_blank">
              Export Telemetry CSV
            </Button>
          </Space>
        </div>

        <div style={{ padding: 16, background: '#FAFBFC', borderBottom: '1px solid #DEE2E6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#243B53' }}>
                {summary?.title || 'HYDROGUARD Industrial Report Suite'}
              </div>
              <div style={{ fontSize: 11, color: '#6C757D', marginTop: 2 }}>
                Generated (IST): {formatIST(summary?.generated_at || Date.now())} • Architecture: {summary?.hardware_abstraction}
              </div>
            </div>
            <Tag color="geekblue" style={{ fontSize: 11, padding: '3px 8px' }}>
              ISO 4406 / DIN 24312 Hydraulic Compliance Ready
            </Tag>
          </div>
        </div>

        <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
          {reportCards.map((rc, idx) => (
            <div key={idx} style={{ border: '1px solid #DEE2E6', borderRadius: 4, padding: 16, background: '#FFFFFF' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#243B53' }}>{rc.title}</div>
                <Tag color="blue">{rc.type}</Tag>
              </div>
              <div style={{ fontSize: 12, color: '#6C757D', marginTop: 8, lineHeight: 1.5 }}>
                {rc.desc}
              </div>
              <div style={{ fontSize: 11, color: '#ADB5BD', marginTop: 10 }}>
                Period: {rc.period}
              </div>
              <Divider style={{ margin: '12px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Button size="small" icon={<FileText size={12} />} onClick={() => window.print()}>
                  Print / Save PDF
                </Button>
                <Button size="small" type="link" href={reportsService.eventsCsvUrl} target="_blank" style={{ padding: 0 }}>
                  Download CSV &rarr;
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
