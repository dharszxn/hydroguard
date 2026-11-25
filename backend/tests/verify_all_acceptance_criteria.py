import time
from datetime import datetime
import requests
import sys

BASE_URL = "http://127.0.0.1:8000/api/v1"

def log(msg, status="INFO"):
    print(f"[{status}] {msg}")

def assert_true(condition, msg):
    if not condition:
        print(f"[FAIL] {msg}")
        sys.exit(1)
    else:
        print(f"[PASS] {msg}")

def run_acceptance_tests():
    print("=" * 70)
    print("HYDROGUARD MODULE 7 ACCEPTANCE CRITERIA AUTOMATED TEST SUITE")
    print("=" * 70)

    # Health Check
    res = requests.get(f"{BASE_URL}/health")
    assert_true(res.status_code == 200, "Backend health check")

    # Clean initial state
    requests.post(f"{BASE_URL}/simulation/reset")
    time.sleep(1)

    # -------------------------------------------------------------------------
    # TEST 1: Normal operation -> no defect report
    # -------------------------------------------------------------------------
    log("Testing Criterion 1: Normal Operation (scenario_1)...")
    start_test_1 = datetime.utcnow()
    requests.post(f"{BASE_URL}/simulation/start", json={
        "scenario_id": "scenario_1",
        "machine_id": "MCH-001",
        "zone_id": "ZONE-03",
        "persistence_seconds": 4.0,
        "signal_intensity": 85.0
    })
    time.sleep(2)
    st = requests.get(f"{BASE_URL}/simulation/status").json()
    assert_true(not st["leak_confirmed"], "Criterion 1: No leak confirmed in normal operation")
    active_reports = requests.get(f"{BASE_URL}/events/reports/active?machine_id=MCH-001").json()
    # Reports should generate zero new active defect reports during normal operation
    new_active = [
        r for r in active_reports
        if r["zone_id"] == "ZONE-03" and datetime.fromisoformat(r["detection_timestamp"].replace('Z', '')) >= start_test_1
    ]
    assert_true(len(new_active) == 0, "Criterion 1: Zero new active defect reports generated in normal state")

    # -------------------------------------------------------------------------
    # TEST 2: Sudden leakage -> correct zone highlighted and report generated
    # -------------------------------------------------------------------------
    log("Testing Criterion 2: Sudden Leakage in ZONE-05 (Hydraulic Cylinder)...")
    requests.post(f"{BASE_URL}/simulation/start", json={
        "scenario_id": "scenario_3",
        "machine_id": "MCH-001",
        "zone_id": "ZONE-05",
        "persistence_seconds": 2.5,
        "signal_intensity": 88.0
    })
    time.sleep(3.2)
    st = requests.get(f"{BASE_URL}/simulation/status").json()
    assert_true(st["leak_confirmed"], "Criterion 2: Sudden leakage confirmed by persistence")
    z5 = requests.get(f"{BASE_URL}/zones/ZONE-05?machine_id=MCH-001").json()
    assert_true(z5["current_status"] in ["LEAKAGE CONFIRMED", "LEAKAGE_CONFIRMED"], "Criterion 2: ZONE-05 status is LEAKAGE CONFIRMED")
    
    # Verify generated defect report
    reports = requests.get(f"{BASE_URL}/events/reports/active?machine_id=MCH-001").json()
    z5_report = next((r for r in reports if r["zone_id"] == "ZONE-05"), None)
    assert_true(z5_report is not None, "Criterion 2: Defect report generated for ZONE-05")
    assert_true("DEF-" in z5_report["defect_id"], f"Criterion 2: Unique Defect ID present ({z5_report['defect_id']})")
    assert_true(len(z5_report["possible_causes"]) > 0, "Criterion 2: Possible causes provided")
    assert_true(len(z5_report["recommended_action"]) > 0, "Criterion 2: Recommended action provided")
    stored_event_id = z5_report["event_id"]

    # -------------------------------------------------------------------------
    # TEST 3: Gradual leakage -> correct persistence validation and diagnosis
    # -------------------------------------------------------------------------
    log("Testing Criterion 3: Gradual Leakage in ZONE-04 (Control Valve)...")
    requests.post(f"{BASE_URL}/simulation/start", json={
        "scenario_id": "scenario_2",
        "machine_id": "MCH-001",
        "zone_id": "ZONE-04",
        "persistence_seconds": 2.0,
        "signal_intensity": 85.0
    })
    time.sleep(5.0)
    z4 = requests.get(f"{BASE_URL}/zones/ZONE-04?machine_id=MCH-001").json()
    assert_true(z4["current_status"] in ["LEAKAGE CONFIRMED", "LEAKAGE_CONFIRMED", "LEAKAGE SUSPECTED", "LEAKAGE_SUSPECTED"], "Criterion 3: Gradual leak detected")

    # -------------------------------------------------------------------------
    # TEST 4: Transient splash -> rejected and saved as a rejected event
    # -------------------------------------------------------------------------
    log("Testing Criterion 4: Transient Splash rejection (< 4.0s persistence)...")
    events_before = requests.get(f"{BASE_URL}/events").json()
    requests.post(f"{BASE_URL}/simulation/start", json={
        "scenario_id": "scenario_4",
        "machine_id": "MCH-001",
        "zone_id": "ZONE-06",
        "persistence_seconds": 4.0,
        "signal_intensity": 85.0
    })
    time.sleep(3.5)
    st = requests.get(f"{BASE_URL}/simulation/status").json()
    assert_true(not st["leak_confirmed"], "Criterion 4: Transient spike did not confirm a leak")
    events_after = requests.get(f"{BASE_URL}/events").json()
    # Check that a transient rejected record was saved into history
    rejected_events = [e for e in events_after if e.get("is_rejected_transient") == True and e.get("zone_id") == "ZONE-06"]
    assert_true(len(rejected_events) > 0, "Criterion 4: Transient splash persistently saved as REJECTED event in database")

    # -------------------------------------------------------------------------
    # TEST 5: Pressure drop without leak signal -> must NOT falsely confirm leakage
    # -------------------------------------------------------------------------
    log("Testing Criterion 5: Pressure Drop without Leak Signal (Scenario 9)...")
    requests.post(f"{BASE_URL}/simulation/start", json={
        "scenario_id": "scenario_9",
        "machine_id": "MCH-001",
        "zone_id": "ZONE-02",
        "persistence_seconds": 3.0
    })
    time.sleep(2)
    st = requests.get(f"{BASE_URL}/simulation/status").json()
    assert_true(not st["leak_confirmed"], "Criterion 5: Pressure drop did NOT falsely confirm oil leakage!")
    z2 = requests.get(f"{BASE_URL}/zones/ZONE-02?machine_id=MCH-001").json()
    assert_true(z2["current_status"] != "LEAKAGE CONFIRMED", "Criterion 5: Zone status is NOT leakage confirmed")

    # -------------------------------------------------------------------------
    # TEST 6: Sensor disconnection -> equipment fault report
    # -------------------------------------------------------------------------
    log("Testing Criterion 6: Sensor Disconnection...")
    requests.post(f"{BASE_URL}/simulation/start", json={
        "scenario_id": "scenario_5",
        "machine_id": "MCH-001",
        "zone_id": "ZONE-03"
    })
    time.sleep(2)
    st = requests.get(f"{BASE_URL}/simulation/status").json()
    assert_true(not st["sensor_connected"], "Criterion 6: Sensor is offline")
    assert_true(not st["leak_confirmed"], "Criterion 6: Sensor disconnect not misclassified as oil leak")
    z3 = requests.get(f"{BASE_URL}/zones/ZONE-03?machine_id=MCH-001").json()
    assert_true("SENSOR" in z3["current_status"], "Criterion 6: Zone marked with SENSOR DISCONNECTED fault")

    # -------------------------------------------------------------------------
    # TEST 7: Multiple defects -> separate reports and separate history
    # -------------------------------------------------------------------------
    log("Testing Criterion 7: Multiple Defects (Scenario 8 stimulating Zone 1 & Zone 3)...")
    requests.post(f"{BASE_URL}/simulation/start", json={
        "scenario_id": "scenario_8",
        "machine_id": "MCH-001",
        "zone_id": "ZONE-03",
        "persistence_seconds": 2.0
    })
    time.sleep(3)
    active = requests.get(f"{BASE_URL}/events/reports/active?machine_id=MCH-001").json()
    zones_with_reports = {r["zone_id"] for r in active}
    assert_true(len(zones_with_reports) >= 2, f"Criterion 7: Multiple zones have independent defect reports ({zones_with_reports})")

    # -------------------------------------------------------------------------
    # TEST 8: Acknowledge -> timestamp added, defect remains active
    # -------------------------------------------------------------------------
    log(f"Testing Criterion 8: Acknowledge event {stored_event_id}...")
    ack_res = requests.post(f"{BASE_URL}/events/{stored_event_id}/acknowledge", json={
        "user_name": "Lead Operator John Doe",
        "notes": "Verified cylinder ram seal warning on HUD."
    }).json()
    assert_true(ack_res["acknowledgement_status"] == True, "Criterion 8: Event acknowledged")
    assert_true(ack_res["acknowledgement_timestamp"] is not None, "Criterion 8: Actual acknowledgement timestamp recorded")
    assert_true(ack_res["status"] == "ACKNOWLEDGED", "Criterion 8: Status updated to ACKNOWLEDGED (still active, not resolved)")

    # -------------------------------------------------------------------------
    # TEST 9: Resolve -> resolution details and timestamp saved
    # -------------------------------------------------------------------------
    log(f"Testing Criterion 9: Investigate & Resolve event {stored_event_id}...")
    requests.post(f"{BASE_URL}/events/{stored_event_id}/investigate", json={
        "technician_name": "Tech Alex Smith",
        "investigation_status": "IN_PROGRESS",
        "notes": "Inspecting ram gland nut."
    })
    res_res = requests.post(f"{BASE_URL}/events/{stored_event_id}/resolve", json={
        "resolved_by": "Chief Maintenance Eng. V. Selvam",
        "notes": "Replaced hydraulic cylinder secondary lip seal."
    }).json()
    assert_true(res_res["status"] == "RESOLVED", "Criterion 9: Event marked as RESOLVED")
    assert_true(res_res["resolution_timestamp"] is not None, "Criterion 9: Resolution timestamp recorded")

    # -------------------------------------------------------------------------
    # TEST 10: Close -> final event status and closure timestamp saved
    # -------------------------------------------------------------------------
    log(f"Testing Criterion 10: Close event {stored_event_id}...")
    close_res = requests.post(f"{BASE_URL}/events/{stored_event_id}/close", json={
        "closed_by": "Quality Supervisor M. David",
        "closure_notes": "Completed 10 press cycles without leakage. Event closed."
    }).json()
    assert_true(close_res["status"] == "CLOSED", "Criterion 10: Event status is CLOSED")
    assert_true(close_res["closure_timestamp"] is not None, "Criterion 10: Closure timestamp recorded")

    # -------------------------------------------------------------------------
    # TEST 11: Refresh & Persistence across page reload
    # -------------------------------------------------------------------------
    log("Testing Criterion 11: Refresh & Persistent retrieval from database...")
    ev = requests.get(f"{BASE_URL}/events/{stored_event_id}").json()
    assert_true(ev["id"] == stored_event_id, "Criterion 11: Event retrieved reliably")
    assert_true(ev["status"] == "CLOSED", "Criterion 11: Final state preserved in database")
    assert_true(len(ev["activities"]) >= 4, f"Criterion 11: Audit activities preserved ({len(ev['activities'])} steps)")

    # -------------------------------------------------------------------------
    # TEST 12: CSV & Report Export
    # -------------------------------------------------------------------------
    log("Testing Criterion 12: CSV Export streaming...")
    csv_res = requests.get(f"{BASE_URL}/events/export/csv")
    assert_true(csv_res.status_code == 200, "Criterion 12: CSV Export status 200")
    assert_true("text/csv" in csv_res.headers.get("content-type", ""), "Criterion 12: Media type is text/csv")
    assert_true("Event ID,Defect ID" in csv_res.text, "Criterion 12: CSV headers present")
    assert_true(stored_event_id in csv_res.text, "Criterion 12: Event recorded in exported CSV")

    # -------------------------------------------------------------------------
    # TEST 13: Reset simulation -> history remains unchanged
    # -------------------------------------------------------------------------
    log("Testing Criterion 13: Reset Simulation does NOT erase historical records...")
    count_before = len(requests.get(f"{BASE_URL}/events").json())
    requests.post(f"{BASE_URL}/simulation/reset")
    time.sleep(1)
    count_after = len(requests.get(f"{BASE_URL}/events").json())
    assert_true(count_before == count_after, f"Criterion 13: History count unchanged after simulation reset ({count_before} records)")

    # -------------------------------------------------------------------------
    # TEST 14: 3D Component to Zone Mapping
    # -------------------------------------------------------------------------
    log("Testing Criterion 14: Component to Zone Mapping verification...")
    zones = requests.get(f"{BASE_URL}/zones?machine_id=MCH-001").json()
    assert_true(len(zones) == 6, "Criterion 14: 6 machine zones active")
    zone_ids = [z["id"] for z in zones]
    for expected in ["ZONE-01", "ZONE-02", "ZONE-03", "ZONE-04", "ZONE-05", "ZONE-06"]:
        assert_true(expected in zone_ids, f"Criterion 14: {expected} correctly mapped")

    print("\n" + "=" * 70)
    print("ALL 14 MODULE 7 ACCEPTANCE CRITERIA TEST CASES PASSED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    run_acceptance_tests()
