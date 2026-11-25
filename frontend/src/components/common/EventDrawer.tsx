import React from 'react';
import { Drawer, Timeline, Tag, Typography, Button } from 'antd';
import { ShieldAlert, Clock, User, CheckCircle2 } from 'lucide-react';
import { LeakageEvent } from '../../types';
import { StatusBadge } from './StatusBadge';
import { formatIST } from '../../utils/dateUtils';

const { Text } = Typography;

interface EventDrawerProps {
  open: boolean;
  onClose: () => void;
  event: LeakageEvent | null;
  onAcknowledge?: (event: LeakageEvent) => void;
  onInvestigate?: (event: LeakageEvent) => void;
  onResolve?: (event: LeakageEvent) => void;
  onCloseEvent?: (event: LeakageEvent) => void;
}

export const EventDrawer: React.FC<EventDrawerProps> = ({
  open,
  onClose,
  event,
  onAcknowledge,
  onInvestigate,
  onResolve,
  onCloseEvent,
}) => {
  if (!event) return null;

  return (
    <Drawer
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '92%' }}>
          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#243B53' }}>{event.id}</span>
          <StatusBadge status={event.status} type="event" />
        </div>
      }
      placement="right"
      width={460}
      onClose={onClose}
      open={open}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Core Event Parameters Panel */}
        <div style={{ padding: 12, background: '#FAFBFC', border: '1px solid #DEE2E6', borderRadius: 4 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
            <div>
              <span style={{ color: '#6C757D' }}>Machine:</span>
              <div style={{ fontWeight: 600 }}>{event.machine_id}</div>
            </div>
            <div>
              <span style={{ color: '#6C757D' }}>Monitoring Zone:</span>
              <div style={{ fontWeight: 600 }}>{event.zone_id}</div>
            </div>
            <div>
              <span style={{ color: '#6C757D' }}>Severity:</span>
              <div><StatusBadge status={event.severity} type="severity" /></div>
            </div>
            <div>
              <span style={{ color: '#6C757D' }}>Persistence Duration:</span>
              <div style={{ fontFamily: 'monospace', fontWeight: 600 }}>{event.detection_duration_sec}s</div>
            </div>
          </div>

          <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid #E9ECEF', fontSize: 12 }}>
            <span style={{ color: '#6C757D' }}>Detection Reason:</span>
            <div style={{ marginTop: 2, color: '#343A40' }}>{event.detection_reason}</div>
          </div>
        </div>

        {/* Action Buttons for Current Lifecycle State */}
        <div style={{ display: 'flex', gap: 8 }}>
          {event.status === 'DETECTED' && onAcknowledge && (
            <Button type="primary" block style={{ background: '#243B53' }} onClick={() => onAcknowledge(event)}>
              Acknowledge Event
            </Button>
          )}
          {event.status === 'ACKNOWLEDGED' && onInvestigate && (
            <Button type="default" block onClick={() => onInvestigate(event)}>
              Start Investigation
            </Button>
          )}
          {event.status === 'UNDER INVESTIGATION' && onResolve && (
            <Button type="primary" block style={{ background: '#198754', borderColor: '#198754' }} onClick={() => onResolve(event)}>
              Mark Resolved
            </Button>
          )}
          {event.status === 'RESOLVED' && onCloseEvent && (
            <Button type="default" block onClick={() => onCloseEvent(event)}>
              Close Incident Ticket
            </Button>
          )}
        </div>

        {/* Audit Trail Timeline */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#243B53', marginBottom: 12 }}>
            Event Activity Audit Trail
          </div>
          <Timeline
            items={(event.activities || []).map((act) => ({
              color: act.activity_type === 'CLOSED' ? 'gray' : act.activity_type === 'RESOLVED' ? 'green' : act.activity_type === 'INVESTIGATION' ? 'orange' : 'blue',
              children: (
                <div style={{ fontSize: 12 }}>
                  <div style={{ fontWeight: 600, color: '#243B53' }}>{act.activity_type}</div>
                  <div style={{ fontSize: 11, color: '#6C757D' }}>
                    By: {act.performed_by} • {formatIST(act.timestamp)}
                  </div>
                  {act.notes && (
                    <div style={{ fontSize: 11, marginTop: 4, background: '#F8F9FA', padding: 6, border: '1px solid #E9ECEF', borderRadius: 3 }}>
                      {act.notes}
                    </div>
                  )}
                </div>
              )
            }))}
          />
        </div>
      </div>
    </Drawer>
  );
};

