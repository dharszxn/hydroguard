import React, { useState, useEffect } from 'react';
import {
  Table, Tag, Button, Modal, Form, Input, Select, Space, message, Input as AntInput
} from 'antd';
import {
  FileCheck2, CheckCircle2, Search, Wrench, ShieldAlert, Clock, User, Filter, RefreshCw
} from 'lucide-react';
import { eventService } from '../../services/api';
import { LeakageEvent } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EventDrawer } from '../../components/common/EventDrawer';
import { PageHeader } from '../../components/common/PageHeader';
import { tokens } from '../../styles/tokens';
import { formatIST } from '../../utils/dateUtils';

const { TextArea } = AntInput;

export const EventManagementPage: React.FC = () => {
  const [events, setEvents] = useState<LeakageEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<LeakageEvent | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [ackModal, setAckModal] = useState(false);
  const [invModal, setInvModal] = useState(false);
  const [resModal, setResModal] = useState(false);
  const [closeModal, setCloseModal] = useState(false);

  const [form] = Form.useForm();

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const data = await eventService.getEvents();
      // Apply client filtering if needed
      let filtered = data;
      if (statusFilter !== 'ALL') {
        filtered = filtered.filter((e) => e.status === statusFilter);
      }
      if (severityFilter !== 'ALL') {
        filtered = filtered.filter((e) => e.severity === severityFilter);
      }
      if (searchQuery) {
        const s = searchQuery.toLowerCase();
        filtered = filtered.filter((e) =>
          e.id.toLowerCase().includes(s) ||
          e.zone_id.toLowerCase().includes(s) ||
          (e.assigned_technician && e.assigned_technician.toLowerCase().includes(s))
        );
      }
      setTotal(filtered.length);
      setEvents(filtered.slice(skip, skip + limit));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [skip, limit, statusFilter, severityFilter, searchQuery]);

  // Periodic refresh
  useEffect(() => {
    const interval = setInterval(fetchEvents, 4000);
    return () => clearInterval(interval);
  }, [statusFilter, severityFilter, searchQuery]);

  // Acknowledge
  const handleOpenAcknowledge = (event: LeakageEvent) => {
    setSelectedEvent(event);
    form.resetFields();
    form.setFieldsValue({
      user_name: 'Operator John Doe',
      notes: 'Leakage alarm verified on SCADA. Inspection dispatched.'
    });
    setAckModal(true);
  };

  const submitAcknowledge = async () => {
    if (!selectedEvent) return;
    try {
      const values = await form.validateFields();
      await eventService.acknowledge(selectedEvent.id, values.user_name, values.notes);
      message.success(`Event ${selectedEvent.id} acknowledged`);
      setAckModal(false);
      fetchEvents();
    } catch (e: any) {
      message.error(e.response?.data?.detail || 'Failed to acknowledge');
    }
  };

  // Investigate
  const handleOpenInvestigate = (event: LeakageEvent) => {
    setSelectedEvent(event);
    form.resetFields();
    form.setFieldsValue({
      technician_name: 'Alex Smith (Hydraulic Tech)',
      investigation_status: 'INSPECTION_IN_PROGRESS',
      notes: 'Inspecting high-pressure flange joint and gasket.'
    });
    setInvModal(true);
  };

  const submitInvestigate = async () => {
    if (!selectedEvent) return;
    try {
      const values = await form.validateFields();
      await eventService.investigate(
        selectedEvent.id,
        values.technician_name,
        values.investigation_status,
        values.notes
      );
      message.success(`Investigation logged for event ${selectedEvent.id}`);
      setInvModal(false);
      fetchEvents();
    } catch (e: any) {
      message.error(e.response?.data?.detail || 'Failed to update investigation');
    }
  };

  // Resolve
  const handleOpenResolve = (event: LeakageEvent) => {
    setSelectedEvent(event);
    form.resetFields();
    form.setFieldsValue({
      resolved_by: 'Alex Smith (Hydraulic Tech)',
      notes: 'Replaced eroded flange seal gasket, torqued to 180 Nm, and wiped sensor cavity.'
    });
    setResModal(true);
  };

  const submitResolve = async () => {
    if (!selectedEvent) return;
    try {
      const values = await form.validateFields();
      await eventService.resolve(selectedEvent.id, values.resolved_by, values.notes);
      message.success(`Event ${selectedEvent.id} marked as RESOLVED`);
      setResModal(false);
      fetchEvents();
    } catch (e: any) {
      message.error(e.response?.data?.detail || 'Failed to resolve event');
    }
  };

  // Close
  const handleOpenClose = (event: LeakageEvent) => {
    setSelectedEvent(event);
    form.resetFields();
    form.setFieldsValue({
      closed_by: 'Operator Sarah Connor',
      closure_notes: 'Pressure restored to 160 bar, zero oil leak detected after soak test.'
    });
    setCloseModal(true);
  };

  const submitClose = async () => {
    if (!selectedEvent) return;
    try {
      const values = await form.validateFields();
      await eventService.close(selectedEvent.id, values.closed_by, values.closure_notes);
      message.success(`Event ${selectedEvent.id} successfully CLOSED`);
      setCloseModal(false);
      fetchEvents();
    } catch (e: any) {
      message.error(e.response?.data?.detail || 'Failed to close event');
    }
  };

  const handleOpenDrawer = (event: LeakageEvent) => {
    setSelectedEvent(event);
    setDrawerOpen(true);
  };

  const columns = [
    {
      title: 'Event ID',
      dataIndex: 'id',
      key: 'id',
      render: (t: string) => <strong style={{ fontFamily: tokens.fonts.mono, color: tokens.colors.navy }}>{t}</strong>
    },
    {
      title: 'Machine & Zone',
      key: 'zone',
      render: (_: any, r: LeakageEvent) => (
        <div>
          <span style={{ fontWeight: 600 }}>{r.zone_id}</span>
          <span style={{ color: tokens.colors.textMuted, marginLeft: 4 }}>({r.machine_id})</span>
        </div>
      )
    },
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      render: (s: string) => <StatusBadge status={s} type="severity" />
    },
    {
      title: 'Lifecycle Status',
      dataIndex: 'status',
      key: 'status',
      render: (st: string) => <StatusBadge status={st} type="event" />
    },
    {
      title: 'Detection Time (IST)',
      dataIndex: 'detection_timestamp',
      key: 'detection_timestamp',
      render: (dt: string) => <span style={{ fontFamily: tokens.fonts.mono }}>{formatIST(dt)}</span>
    },
    {
      title: 'Persistence',
      dataIndex: 'detection_duration_sec',
      key: 'detection_duration_sec',
      align: 'center' as const,
      render: (d: number) => <span style={{ fontFamily: tokens.fonts.mono }}>{d}s</span>
    },
    {
      title: 'Responsible Tech',
      dataIndex: 'assigned_technician',
      key: 'assigned_technician',
      render: (tech: string) => <span style={{ fontSize: 12 }}>{tech || 'Unassigned'}</span>
    },
    {
      title: 'Lifecycle Actions',
      key: 'actions',
      render: (_: any, r: LeakageEvent) => (
        <Space size="small">
          {r.status === 'DETECTED' && (
            <Button size="small" type="primary" onClick={() => handleOpenAcknowledge(r)} style={{ background: tokens.colors.navy }}>
              Acknowledge
            </Button>
          )}

          {r.status === 'ACKNOWLEDGED' && (
            <Button size="small" type="default" onClick={() => handleOpenInvestigate(r)}>
              Investigate
            </Button>
          )}

          {r.status === 'UNDER INVESTIGATION' && (
            <Button size="small" type="primary" style={{ background: tokens.colors.success, borderColor: tokens.colors.success }} onClick={() => handleOpenResolve(r)}>
              Resolve
            </Button>
          )}

          {r.status === 'RESOLVED' && (
            <Button size="small" type="default" onClick={() => handleOpenClose(r)}>
              Close Ticket
            </Button>
          )}

          <Button size="small" type="link" onClick={() => handleOpenDrawer(r)} style={{ padding: 0 }}>
            Audit Details
          </Button>
        </Space>
      )
    }
  ];

  return (
    <div>
      <PageHeader
        title="Leakage Event Management"
        subtitle="Formal state machine: DETECTED → ACKNOWLEDGED → UNDER INVESTIGATION → RESOLVED → CLOSED"
        breadcrumbs={['HYDROGUARD', 'Incidents', 'Event Management']}
      />

      <div className="scada-panel">
        <div className="scada-panel-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileCheck2 size={16} color={tokens.colors.steel} />
            <span>INCIDENT TICKETS & EVENT LIFECYCLE</span>
          </div>
          <Button size="small" icon={<RefreshCw size={13} />} onClick={fetchEvents} loading={loading}>
            Refresh
          </Button>
        </div>

        {/* Filter and Search Bar */}
        <div style={{ padding: '12px 16px', background: '#FAFBFC', borderBottom: `1px solid ${tokens.colors.border}`, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
          <Space wrap>
            <div>
              <span style={{ fontSize: 11, fontWeight: 600, color: tokens.colors.textMuted, marginRight: 6 }}>STATUS:</span>
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: 170 }}
                options={[
                  { value: 'ALL', label: 'All Lifecycle States' },
                  { value: 'DETECTED', label: 'DETECTED' },
                  { value: 'ACKNOWLEDGED', label: 'ACKNOWLEDGED' },
                  { value: 'UNDER INVESTIGATION', label: 'UNDER INVESTIGATION' },
                  { value: 'RESOLVED', label: 'RESOLVED' },
                  { value: 'CLOSED', label: 'CLOSED' },
                ]}
              />
            </div>

            <div>
              <span style={{ fontSize: 11, fontWeight: 600, color: tokens.colors.textMuted, marginRight: 6 }}>SEVERITY:</span>
              <Select
                value={severityFilter}
                onChange={setSeverityFilter}
                style={{ width: 130 }}
                options={[
                  { value: 'ALL', label: 'All Severities' },
                  { value: 'CRITICAL', label: 'CRITICAL' },
                  { value: 'HIGH', label: 'HIGH' },
                  { value: 'MEDIUM', label: 'MEDIUM' },
                  { value: 'LOW', label: 'LOW' },
                ]}
              />
            </div>

            <Input
              prefix={<Search size={14} color={tokens.colors.textMuted} />}
              placeholder="Search event ID, technician..."
              style={{ width: 230 }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </Space>

          <span style={{ fontSize: 11, color: tokens.colors.textMuted }}>
            Showing {events.length} of {total} records
          </span>
        </div>

        <Table
          size="middle"
          dataSource={events}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            current: Math.floor(skip / limit) + 1,
            pageSize: limit,
            total: total,
            showSizeChanger: true,
            onChange: (page, pageSize) => {
              setSkip((page - 1) * pageSize);
              setLimit(pageSize);
            }
          }}
        />
      </div>

      {/* Reusable Event Detail & Audit Drawer */}
      <EventDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        event={selectedEvent}
        onAcknowledge={handleOpenAcknowledge}
        onInvestigate={handleOpenInvestigate}
        onResolve={handleOpenResolve}
        onCloseEvent={handleOpenClose}
      />

      {/* 1. Acknowledge Modal */}
      <Modal
        title={`Acknowledge Leakage Alarm: ${selectedEvent?.id}`}
        open={ackModal}
        onOk={submitAcknowledge}
        onCancel={() => setAckModal(false)}
        okText="Confirm Acknowledgement"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="user_name" label="Operator Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="notes" label="Operator Acknowledgement Notes" rules={[{ required: true }]}>
            <TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 2. Investigate Modal */}
      <Modal
        title={`Log Investigation: ${selectedEvent?.id}`}
        open={invModal}
        onOk={submitInvestigate}
        onCancel={() => setInvModal(false)}
        okText="Submit Investigation Report"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="technician_name" label="Assigned Technician" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="investigation_status" label="Investigation Finding" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'INSPECTION_IN_PROGRESS', label: 'Inspection In Progress' },
                { value: 'FLANGE_SEAL_FAILURE', label: 'Flange Seal Gasket Blown' },
                { value: 'HOSE_CRIMP_FATIGUE', label: 'High Pressure Hose Crimp Fatigue' },
                { value: 'VALVE_SPOOL_O_RING_WORN', label: 'Control Valve Spool O-Ring Worn' },
                { value: 'CYLINDER_GLAND_PACKING', label: 'Cylinder Gland Packing Leak' },
              ]}
            />
          </Form.Item>
          <Form.Item name="notes" label="Physical Inspection Observations" rules={[{ required: true }]}>
            <TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 3. Resolve Modal */}
      <Modal
        title={`Resolve Leakage Incident: ${selectedEvent?.id}`}
        open={resModal}
        onOk={submitResolve}
        onCancel={() => setResModal(false)}
        okText="Mark Event Resolved"
        okButtonProps={{ style: { background: tokens.colors.success, borderColor: tokens.colors.success } }}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="resolved_by" label="Certified Technician" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="notes" label="Corrective Repair Actions Taken" rules={[{ required: true }]}>
            <TextArea rows={3} placeholder="Describe seal replacement, torque applied, and cleanup..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* 4. Close Modal */}
      <Modal
        title={`Sign-off and Close Incident: ${selectedEvent?.id}`}
        open={closeModal}
        onOk={submitClose}
        onCancel={() => setCloseModal(false)}
        okText="Permanently Close Ticket"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="closed_by" label="Supervising Engineer / Operator" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="closure_notes" label="Closure & Verification Summary" rules={[{ required: true }]}>
            <TextArea rows={3} placeholder="Confirm system pressure holding stable and zero leaks observed..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default EventManagementPage;
