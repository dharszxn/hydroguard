import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Select, Switch, Tag, Space, message, Popconfirm } from 'antd';
import { Plus, Edit2, Trash2, Layers, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { zoneService } from '../../services/api';
import { Zone } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { StatusBadge } from '../../components/common/StatusBadge';

export const ZoneManagementPage: React.FC = () => {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [form] = Form.useForm();

  const fetchZones = async () => {
    setLoading(true);
    try {
      const data = await zoneService.getZones('MCH-001');
      setZones(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchZones();
  }, []);

  const handleOpenAdd = () => {
    setEditingZone(null);
    form.resetFields();
    form.setFieldsValue({
      machine_id: 'MCH-001',
      detection_threshold: 65.0,
      persistence_duration: 4.0,
      severity_level: 'HIGH',
      is_enabled: true,
      component_mapping: 'pipeline_press'
    });
    setModalVisible(true);
  };

  const handleOpenEdit = (zone: Zone) => {
    setEditingZone(zone);
    form.setFieldsValue({
      id: zone.id,
      name: zone.name,
      machine_id: zone.machine_id,
      component_mapping: zone.component_mapping,
      detection_threshold: zone.detection_threshold,
      persistence_duration: zone.persistence_duration,
      severity_level: zone.severity_level,
      is_enabled: zone.is_enabled
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await zoneService.deleteZone(id);
      message.success(`Zone ${id} deleted successfully`);
      fetchZones();
    } catch (e: any) {
      message.error(e.response?.data?.detail || 'Failed to delete zone');
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editingZone) {
        await zoneService.updateZone(editingZone.id, values);
        message.success(`Zone ${editingZone.id} updated`);
      } else {
        await zoneService.createZone(values);
        message.success(`Zone ${values.id} created`);
      }
      setModalVisible(false);
      fetchZones();
    } catch (e: any) {
      if (e.response?.data?.detail) {
        message.error(e.response.data.detail);
      }
    }
  };

  const columns = [
    {
      title: 'Zone ID',
      dataIndex: 'id',
      key: 'id',
      render: (t: string) => <strong style={{ fontFamily: 'monospace', color: '#243B53' }}>{t}</strong>
    },
    {
      title: 'Zone Name',
      dataIndex: 'name',
      key: 'name',
      render: (t: string) => <span style={{ fontWeight: 600 }}>{t}</span>
    },
    {
      title: '3D Mapping',
      dataIndex: 'component_mapping',
      key: 'component_mapping',
      render: (m: string) => <Tag color="blue">{m}</Tag>
    },
    {
      title: 'Detection Threshold',
      dataIndex: 'detection_threshold',
      key: 'detection_threshold',
      align: 'center' as const,
      render: (v: number) => <span style={{ fontFamily: 'monospace' }}>{v}%</span>
    },
    {
      title: 'Persistence Validation',
      dataIndex: 'persistence_duration',
      key: 'persistence_duration',
      align: 'center' as const,
      render: (v: number) => <span style={{ fontFamily: 'monospace' }}>{v}s duration</span>
    },
    {
      title: 'Severity Config',
      dataIndex: 'severity_level',
      key: 'severity_level',
      render: (s: string) => (
        <Tag color={s === 'CRITICAL' ? 'error' : s === 'HIGH' ? 'warning' : 'default'} style={{ fontWeight: 600 }}>
          {s}
        </Tag>
      )
    },
    {
      title: 'State',
      dataIndex: 'is_enabled',
      key: 'is_enabled',
      render: (en: boolean) => (
        <Tag color={en ? 'success' : 'default'}>{en ? 'ACTIVE' : 'DISABLED'}</Tag>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, r: Zone) => (
        <Space size="middle">
          <Button size="small" icon={<Edit2 size={13} />} onClick={() => handleOpenEdit(r)}>
            Edit
          </Button>
          <Popconfirm
            title="Delete Monitoring Zone?"
            description={`Are you sure you want to delete ${r.id} (${r.name})?`}
            onConfirm={() => handleDelete(r.id)}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<Trash2 size={13} />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div>
      <PageHeader
        title="Machines & Monitoring Zones"
        subtitle="Manage zone thresholds, persistence durations, and 3D CAD physical component mappings"
        breadcrumbs={['HYDROGUARD', 'Configuration', 'Machines & Zones']}
      />

      <div className="scada-panel" style={{ marginBottom: 16 }}>
        <div className="scada-panel-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Layers size={16} color="#356A9A" />
            <span>HYDRAULIC MACHINE ZONE REGISTRY & SENSOR MAPPING</span>
          </div>
          <Button
            type="primary"
            icon={<Plus size={14} />}
            onClick={handleOpenAdd}
            style={{ background: '#243B53', borderColor: '#243B53' }}
          >
            Configure New Zone
          </Button>
        </div>
        <div style={{ padding: '8px 16px', background: '#FAFBFC', borderBottom: '1px solid #DEE2E6', fontSize: 12, color: '#6C757D' }}>
          Configured zones are deterministically linked to 3D CAD components, persistence criteria, and ESP32 virtual sensor channels.
        </div>
        <Table
          size="middle"
          dataSource={zones}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={false}
        />
      </div>

      {/* Add / Edit Modal */}
      <Modal
        title={editingZone ? `Edit Zone: ${editingZone.id}` : 'Configure New Monitoring Zone'}
        open={modalVisible}
        onOk={handleSave}
        onCancel={() => setModalVisible(false)}
        okText="Save Configuration"
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          {!editingZone && (
            <Form.Item name="id" label="Zone ID" rules={[{ required: true, message: 'Please enter Zone ID (e.g. ZONE-07)' }]}>
              <Input placeholder="ZONE-07" />
            </Form.Item>
          )}

          <Form.Item name="name" label="Zone Name" rules={[{ required: true, message: 'Please enter zone name' }]}>
            <Input placeholder="e.g. Auxiliary Pressure Manifold" />
          </Form.Item>

          <Form.Item name="machine_id" label="Assigned Machine">
            <Input disabled defaultValue="MCH-001" />
          </Form.Item>

          <Form.Item name="component_mapping" label="3D CAD Component Mapping" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'reservoir', label: 'Oil Reservoir' },
                { value: 'pump', label: 'Hydraulic Pump Unit' },
                { value: 'pipeline_press', label: 'Pressure Delivery Pipeline' },
                { value: 'valve', label: 'Directional Control Valve' },
                { value: 'cylinder', label: 'Main Hydraulic Cylinder' },
                { value: 'pipeline_return', label: 'Return Pipeline & Filter' },
              ]}
            />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item name="detection_threshold" label="Leak Threshold (%)" rules={[{ required: true }]}>
              <InputNumber min={10} max={99} step={1} style={{ width: '100%' }} addonAfter="%" />
            </Form.Item>

            <Form.Item name="persistence_duration" label="Persistence (seconds)" rules={[{ required: true }]}>
              <InputNumber min={1} max={30} step={0.5} style={{ width: '100%' }} addonAfter="s" />
            </Form.Item>
          </div>

          <Form.Item name="severity_level" label="Event Severity Level">
            <Select
              options={[
                { value: 'LOW', label: 'LOW' },
                { value: 'MEDIUM', label: 'MEDIUM' },
                { value: 'HIGH', label: 'HIGH' },
                { value: 'CRITICAL', label: 'CRITICAL' },
              ]}
            />
          </Form.Item>

          <Form.Item name="is_enabled" label="Zone Enabled" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

