import os
import sys
import unittest
import time

# Ensure backend root is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app, init_db_and_seed
from app.database.session import SessionLocal
from app.services.detection.engine import detection_engine
from app.models.entities import Zone, LeakageEvent, EventStatus, ZoneStatus

client = TestClient(app)

class TestDetectionAndAPI(unittest.TestCase):
    def setUp(self):
        init_db_and_seed()

    def test_system_health(self):
        response = client.get("/api/system/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "HEALTHY")
        self.assertEqual(data["simulation_mode"], "SOFTWARE_SIMULATION_ACTIVE")

    def test_machine_and_zones(self):
        res_m = client.get("/api/machines")
        self.assertEqual(res_m.status_code, 200)
        machines = res_m.json()
        self.assertGreaterEqual(len(machines), 1)
        self.assertEqual(machines[0]["id"], "MCH-001")

        res_z = client.get("/api/zones?machine_id=MCH-001")
        self.assertEqual(res_z.status_code, 200)
        zones = res_z.json()
        self.assertEqual(len(zones), 6)
        zone_ids = [z["id"] for z in zones]
        self.assertIn("ZONE-01", zone_ids)
        self.assertIn("ZONE-03", zone_ids)

    def test_persistence_validation_and_transient_rejection(self):
        db = SessionLocal()
        detection_engine.reset_zone("ZONE-03")

        # Step 1: Normal signal (12%) -> NORMAL
        r1 = detection_engine.process_sensor_signal(db, "MCH-001", "ZONE-03", "SENS-OIL-03", 12.0)
        self.assertEqual(r1["status"], "NORMAL")
        self.assertFalse(r1["confirmed"])

        # Step 2: Signal spikes to 85% (threshold is 65%) -> SUSPECTED
        r2 = detection_engine.process_sensor_signal(db, "MCH-001", "ZONE-03", "SENS-OIL-03", 85.0)
        self.assertEqual(r2["status"], "LEAKAGE SUSPECTED")
        self.assertFalse(r2["confirmed"])

        # Step 3: Immediate drop back to 10% after 0.5s (< 4s persistence duration) -> TRANSIENT_REJECTED
        r3 = detection_engine.process_sensor_signal(db, "MCH-001", "ZONE-03", "SENS-OIL-03", 10.0)
        self.assertEqual(r3["status"], "TRANSIENT_REJECTED")
        self.assertFalse(r3["confirmed"])

        # Step 4: Persistent signal above threshold for > 4.0s -> CONFIRMED
        detection_engine.reset_zone("ZONE-03")
        detection_engine.process_sensor_signal(db, "MCH-001", "ZONE-03", "SENS-OIL-03", 88.0)
        detection_engine.zone_timers["ZONE-03"]["timer_start"] = time.time() - 4.5
        r4 = detection_engine.process_sensor_signal(db, "MCH-001", "ZONE-03", "SENS-OIL-03", 88.0)
        self.assertEqual(r4["status"], "LEAKAGE CONFIRMED")
        self.assertTrue(r4["confirmed"])
        self.assertIn("event_id", r4)
        db.close()

    def test_event_lifecycle(self):
        res = client.get("/api/events")
        self.assertEqual(res.status_code, 200)
        events = res.json()
        self.assertGreaterEqual(len(events), 1)
        event_id = events[0]["id"]

        # Acknowledge
        res_ack = client.post(f"/api/events/{event_id}/acknowledge", json={
            "user_name": "Operator Sarah Connor",
            "notes": "Acknowledged high-pressure line leak."
        })
        self.assertEqual(res_ack.status_code, 200)
        self.assertTrue(res_ack.json()["acknowledgement_status"])
        self.assertEqual(res_ack.json()["status"], "ACKNOWLEDGED")

        # Investigate
        res_inv = client.post(f"/api/events/{event_id}/investigate", json={
            "technician_name": "Alex Smith",
            "investigation_status": "FLANGE_GASKET_DEFECT",
            "notes": "High pressure flange gasket eroded. Replacement in progress."
        })
        self.assertEqual(res_inv.status_code, 200)
        self.assertEqual(res_inv.json()["status"], "UNDER INVESTIGATION")

        # Resolve
        res_res = client.post(f"/api/events/{event_id}/resolve", json={
            "resolved_by": "Alex Smith",
            "notes": "New nitrile seal fitted and torque applied to 180 Nm."
        })
        self.assertEqual(res_res.status_code, 200)
        self.assertEqual(res_res.json()["status"], "RESOLVED")

        # Close
        res_close = client.post(f"/api/events/{event_id}/close", json={
            "closed_by": "Sarah Connor",
            "closure_notes": "Pressure restored to 160 bar, zero oil leak detected after 15 min soak test."
        })
        self.assertEqual(res_close.status_code, 200)
        self.assertEqual(res_close.json()["status"], "CLOSED")

    def test_connectivity_simulation(self):
        res_disc = client.post("/api/devices/ESP32-EDGE-01/disconnect")
        self.assertEqual(res_disc.status_code, 200)
        self.assertEqual(res_disc.json()["status"], "OFFLINE")

        res_rec = client.post("/api/devices/ESP32-EDGE-01/reconnect")
        self.assertEqual(res_rec.status_code, 200)
        self.assertEqual(res_rec.json()["status"], "ONLINE")

if __name__ == "__main__":
    unittest.main()
