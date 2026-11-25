import { useState, useEffect, useRef, useCallback } from 'react';
import { TelemetryMessage, TelemetryReading, ZoneStatus } from '../types';

export function useTelemetryWebSocket() {
  const [telemetry, setTelemetry] = useState<Record<string, TelemetryReading>>({});
  const [zoneStatuses, setZoneStatuses] = useState<Record<string, ZoneStatus>>({});
  const [wifiConnected, setWifiConnected] = useState<boolean>(true);
  const [bufferCount, setBufferCount] = useState<number>(0);
  const [activeScenario, setActiveScenario] = useState<string>('scenario_1');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    try {
      const socket = new WebSocket('ws://localhost:8000/ws');
      wsRef.current = socket;

      socket.onopen = () => {
        setIsConnected(true);
      };

      socket.onmessage = (event) => {
        try {
          const data: TelemetryMessage = JSON.parse(event.data);
          if (data.type === 'TELEMETRY_UPDATE') {
            setActiveScenario(data.active_scenario);
            setWifiConnected(data.wifi_connected);
            setBufferCount(data.buffer_count);

            // Update readings map
            const readingMap: Record<string, TelemetryReading> = {};
            data.readings.forEach((r) => {
              readingMap[r.zone_id] = r;
              readingMap[r.sensor_id] = r;
            });
            setTelemetry((prev) => ({ ...prev, ...readingMap }));

            // Update zone statuses
            const statusMap: Record<string, ZoneStatus> = {};
            data.zones.forEach((z) => {
              statusMap[z.zone_id] = z.status;
            });
            setZoneStatuses((prev) => ({ ...prev, ...statusMap }));
          }
        } catch (e) {
          console.error('[WS Parse Error]', e);
        }
      };

      socket.onclose = () => {
        setIsConnected(false);
        // Retry connection after 2 seconds
        setTimeout(connect, 2000);
      };

      socket.onerror = () => {
        socket.close();
      };
    } catch (err) {
      setTimeout(connect, 2000);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return {
    telemetry,
    zoneStatuses,
    wifiConnected,
    bufferCount,
    activeScenario,
    isConnected,
  };
}

