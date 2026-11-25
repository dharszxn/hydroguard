import axios from 'axios';
import {
  Machine, Zone, LeakageEvent, MaintenanceRecord,
  NotificationItem, SimulationStatus, VirtualDevice, DefectReport
} from '../types';

const API_BASE = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

export const authService = {
  getSetupStatus: async () => {
    const res = await api.get('/auth/setup-status');
    return res.data;
  },
  setupAdmin: async (payload: { full_name: string; email: string; password: string }) => {
    const res = await api.post('/auth/setup-admin', payload);
    return res.data;
  },
  register: async (payload: { full_name: string; email: string; password: string; role?: string }) => {
    const res = await api.post('/auth/register', payload);
    return res.data;
  },
  login: async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
  },
  getUsers: async () => {
    const res = await api.get('/auth/users');
    return res.data;
  }
};

export const machineService = {
  getMachines: async (): Promise<Machine[]> => {
    const res = await api.get('/machines');
    return res.data;
  },
  getMachine: async (id: string): Promise<Machine> => {
    const res = await api.get(`/machines/${id}`);
    return res.data;
  }
};

export const zoneService = {
  getZones: async (machineId: string = 'MCH-001'): Promise<Zone[]> => {
    const res = await api.get(`/zones?machine_id=${machineId}`);
    return res.data;
  },
  createZone: async (zone: Partial<Zone>): Promise<Zone> => {
    const res = await api.post('/zones', zone);
    return res.data;
  },
  updateZone: async (id: string, zone: Partial<Zone>): Promise<Zone> => {
    const res = await api.put(`/zones/${id}`, zone);
    return res.data;
  },
  deleteZone: async (id: string): Promise<any> => {
    const res = await api.delete(`/zones/${id}`);
    return res.data;
  }
};

export const eventService = {
  getEvents: async (params?: { status?: string; zone_id?: string; defect_type?: string; severity?: string; search?: string }): Promise<LeakageEvent[]> => {
    let url = '/events?';
    if (params) {
      const q = new URLSearchParams();
      if (params.status) q.append('status', params.status);
      if (params.zone_id) q.append('zone_id', params.zone_id);
      if (params.defect_type) q.append('defect_type', params.defect_type);
      if (params.severity) q.append('severity', params.severity);
      if (params.search) q.append('search', params.search);
      url += q.toString();
    }
    const res = await api.get(url);
    return res.data;
  },
  getActiveDefectReports: async (machineId: string = 'MCH-001'): Promise<DefectReport[]> => {
    const res = await api.get(`/events/reports/active?machine_id=${machineId}`);
    return res.data;
  },
  getDefectReport: async (eventId: string): Promise<DefectReport> => {
    const res = await api.get(`/events/${eventId}/report`);
    return res.data;
  },
  getExportCsvUrl: (params?: Record<string, string>): string => {
    const q = new URLSearchParams(params || {});
    return `${API_BASE}/events/export/csv?${q.toString()}`;
  },
  getEvent: async (id: string): Promise<LeakageEvent> => {
    const res = await api.get(`/events/${id}`);
    return res.data;
  },
  acknowledge: async (id: string, userName: string, notes?: string): Promise<LeakageEvent> => {
    const res = await api.post(`/events/${id}/acknowledge`, { user_name: userName, notes });
    return res.data;
  },
  investigate: async (id: string, technicianName: string, status: string, notes: string): Promise<LeakageEvent> => {
    const res = await api.post(`/events/${id}/investigate`, {
      technician_name: technicianName,
      investigation_status: status,
      notes
    });
    return res.data;
  },
  resolve: async (id: string, resolvedBy: string, notes: string): Promise<LeakageEvent> => {
    const res = await api.post(`/events/${id}/resolve`, { resolved_by: resolvedBy, notes });
    return res.data;
  },
  close: async (id: string, closedBy: string, closureNotes: string): Promise<LeakageEvent> => {
    const res = await api.post(`/events/${id}/close`, { closed_by: closedBy, closure_notes: closureNotes });
    return res.data;
  }
};

export const simulationService = {
  start: async (params: { scenario_id: string; machine_id?: string; zone_id?: string; persistence_seconds?: number; signal_intensity?: number }) => {
    const res = await api.post('/simulation/start', params);
    return res.data;
  },
  pause: async () => {
    const res = await api.post('/simulation/pause');
    return res.data;
  },
  resume: async () => {
    const res = await api.post('/simulation/resume');
    return res.data;
  },
  stop: async () => {
    const res = await api.post('/simulation/stop');
    return res.data;
  },
  reset: async () => {
    const res = await api.post('/simulation/reset');
    return res.data;
  },
  getStatus: async (): Promise<SimulationStatus> => {
    const res = await api.get('/simulation/status');
    return res.data;
  }
};

export const deviceService = {
  getStatus: async (): Promise<VirtualDevice[]> => {
    const res = await api.get('/devices/status');
    return res.data;
  },
  disconnect: async (deviceId: string) => {
    const res = await api.post(`/devices/${deviceId}/disconnect`);
    return res.data;
  },
  reconnect: async (deviceId: string) => {
    const res = await api.post(`/devices/${deviceId}/reconnect`);
    return res.data;
  },
  getSyncLogs: async () => {
    const res = await api.get('/devices/sync-logs');
    return res.data;
  }
};

export const analyticsService = {
  getOverview: async () => {
    const res = await api.get('/analytics/overview');
    return res.data;
  },
  getTrends: async () => {
    const res = await api.get('/analytics/trends');
    return res.data;
  }
};

export const maintenanceService = {
  getRecords: async (): Promise<MaintenanceRecord[]> => {
    const res = await api.get('/maintenance');
    return res.data;
  },
  createRecord: async (record: Partial<MaintenanceRecord>): Promise<MaintenanceRecord> => {
    const res = await api.post('/maintenance', record);
    return res.data;
  },
  updateRecord: async (id: string, status: string, findings?: string, actions?: string): Promise<MaintenanceRecord> => {
    const res = await api.put(`/maintenance/${id}?status=${status}`, { findings, actions });
    return res.data;
  }
};

export const notificationService = {
  getNotifications: async (): Promise<NotificationItem[]> => {
    const res = await api.get('/notifications');
    return res.data;
  },
  markRead: async (id: number) => {
    const res = await api.post(`/notifications/${id}/read`);
    return res.data;
  },
  markAllRead: async () => {
    const res = await api.post('/notifications/mark-all-read');
    return res.data;
  }
};

export const reportsService = {
  getSummary: async () => {
    const res = await api.get('/reports/summary');
    return res.data;
  },
  eventsCsvUrl: `${API_BASE}/reports/export/events.csv`,
  readingsCsvUrl: `${API_BASE}/reports/export/readings.csv`,
};

export default api;
