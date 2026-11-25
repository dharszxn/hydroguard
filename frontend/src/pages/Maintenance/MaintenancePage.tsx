import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, Tag, Space, message } from 'antd';
import { Wrench, Plus, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { maintenanceService } from '../../services/api';
import { MaintenanceRecord } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { formatISTDateOnly } from '../../utils/dateUtils';

export const MaintenancePage: React.FC = () => {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const data = await maintenanceService.getRecords();
      setRecords(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      await maintenanceService.createRecord(values);
      message.success('Maintenance work order logged');
      setModalVisible(false);
      form.resetFields();
      fetchRecords();
    } catch (e: any) {
      //
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await maintenanceService.updateRecord(id, status, 'Inspected and torqued to specification.');
      message.success(`Work order ${id} status updated to ${status}`);
      fetchRecords();
    } catch (e) {
      message.error('Failed to update status');
    }
  };

  const columns = [
    { title: 'Work Order ID', dataIndex: 'id', key: 'id', render: (t: string) => <strong style={{ fontFamily: 'monospace' }}>{t}</strong> },
    { title: 'Machine / Zone', key: 'mz', render: (_: any, r: MaintenanceRecord) => <div>{r.machine_id} • <strong>{r.zone_id}</strong></div> },
    { title: 'Schedule Type', dataIndex: 'schedule_type', key: 'schedule_type', render: (t: string) => <Tag color="blue">{t}</Tag> },
    { title: 'Assigned Tech', dataIndex: 'assigned_technician', key: 'assigned_technician' },
    {
      title: 'Status',
      dataIndex: 'repair_status',
      key: 'repair_status',
      render: (st: string) => {
        const color = st === 'COMPLETED' ? 'success' : st === 'IN_PROGRESS' ? 'warning' : 'default';
        return <Tag color={color} style={{ fontWeight: 600 }}>{st}</Tag>;
      }
    },
    { title: 'Scheduled Date (IST)', dataIndex: 'scheduled_date', key: 'scheduled_date', render: (d: string) => <span style={{ fontFamily: 'monospace' }}>{formatISTDateOnly(d)}</span> },
    {
      title: 'Action',
      key: 'actions',
      render: (_: any, r: MaintenanceRecord) => (
        <Space size="small">
          {r.repair_status === 'SCHEDULED' && (
            <Button size="small" onClick={() => handleUpdateStatus(r.id, 'IN_PROGRESS')}>
              Start Work
            </Button>
          )}
          {r.repair_status === 'IN_PROGRESS' && (
            <Button size="small" type="primary" style={{ background: '#198754' }} onClick={() => handleUpdateStatus(r.id, 'COMPLETED')}>
              Mark Complete
            </Button>
          )}
        </Space>
      )
    }
  ];

  return (
    <div>
      <PageHeader
        title="Industrial Maintenance Management"
        subtitle="Work orders, corrective leak remediation, and preventive inspection schedules"
        breadcrumbs={['HYDROGUARD', 'Maintenance', 'Work Orders']}
      />

      <div className="scada-panel">
        <div className="scada-panel-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Wrench size={16} color="#356A9A" />
            <span>HYDRAULIC PREVENTIVE & CORRECTIVE MAINTENANCE WORK ORDERS</span>
          </div>
          <Button
            type="primary"
            icon={<Plus size={14} />}
            onClick={() => setModalVisible(true)}
            style={{ background: '#243B53', borderColor: '#243B53' }}
          >
            Create Work Order
          </Button>
        </div>

        <Table
          size="middle"
          dataSource={records}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 8 }}
        />
      </div>

      <Modal
        title="Schedule Industrial Maintenance Task"
        open={modalVisible}
        onOk={handleCreate}
        onCancel={() => setModalVisible(false)}
        okText="Log Work Order"
      >
        <Form form={form} layout="vertical" initialValues={{ machine_id: 'MCH-001', zone_id: 'ZONE-03', schedule_type: 'CORRECTIVE', assigned_technician: 'Alex Smith (Hydraulic Tech)' }}>
          <Form.Item name="machine_id" label="Machine ID" rules={[{ required: true }]}>
            <Input disabled />
          </Form.Item>
          <Form.Item name="zone_id" label="Affected Zone" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'ZONE-01', label: 'ZONE-01: Oil Reservoir' },
                { value: 'ZONE-02', label: 'ZONE-02: Hydraulic Pump' },
                { value: 'ZONE-03', label: 'ZONE-03: Pressure Pipeline' },
                { value: 'ZONE-04', label: 'ZONE-04: Control Valve' },
                { value: 'ZONE-05', label: 'ZONE-05: Hydraulic Cylinder' },
                { value: 'ZONE-06', label: 'ZONE-06: Oil Return Line' },
              ]}
            />
          </Form.Item>
          <Form.Item name="schedule_type" label="Maintenance Classification">
            <Select
              options={[
                { value: 'CORRECTIVE', label: 'CORRECTIVE (Leak Remediation)' },
                { value: 'PREVENTIVE', label: 'PREVENTIVE (Scheduled Seal Inspection)' },
                { value: 'EMERGENCY', label: 'EMERGENCY (Immediate Pressure Drop)' },
              ]}
            />
          </Form.Item>
          <Form.Item name="assigned_technician" label="Assigned Technician" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="inspection_findings" label="Scope of Inspection / Defect Description">
            <Input.TextArea rows={3} placeholder="Inspect high-pressure flanges, replace nitrile O-rings..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

