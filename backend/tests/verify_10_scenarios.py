import time
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

def run_tests():
    print("=" * 60)
    print("HYDROGUARD SCENARIO SIMULATION ENGINE & 3D VERIFICATION")
    print("=" * 60)

    # Health check
    res = requests.get(f"{BASE_URL}/health")
    assert_true(res.status_code == 200, "Backend health check")

    # 1. TEST CASE 10: Reset Simulation
    log("Testing Case 10: Reset Simulation baseline restore...")
    res = requests.post(f"{BASE_URL}/simulation/reset")
    assert_true(res.status_code == 200, "Simulation reset API call")
    time.sleep(1)
    status = requests.get(f"{BASE_URL}/simulation/status").json()
    assert_true(not status["is_running"], "Case 10: Simulation stopped on reset")
    assert_true(status["validation_state"] == "SIGNAL STABLE (NORMAL)", "Case 10: Status is NORMAL")
    
    # Check zones
    zones = requests.get(f"{BASE_URL}/zones?machine_id=MCH-001").json()
    assert_true(isinstance(zones, list) and len(zones) == 6, "Case 10: Found 6 zones")
    assert_true(all(z["current_status"] == "NORMAL" for z in zones), "Case 10: All zones in NORMAL status")

    # 2. TEST CASE 1: Normal Operation
    log("Testing Case 1: Normal Operation (scenario_1)...")
    requests.post(f"{BASE_URL}/simulation/start", json={
        "scenario_id": "scenario_1",
        "machine_id": "MCH-001",
        "zone_id": "ZONE-03",
        "persistence_seconds": 4.0,
        "signal_intensity": 85.0
    })
    time.sleep(3)
    status = requests.get(f"{BASE_URL}/simulation/status").json()
    assert_true(status["is_running"], "Case 1: Simulation is running")
    assert_true(not status["leak_confirmed"], "Case 1: No leak confirmed in normal operation")
    assert_true(not status["signal_timer_active"], "Case 1: Persistence timer not active")

    # 3. TEST CASE 8: Pause Simulation
    log("Testing Case 8: Pause Simulation...")
    requests.post(f"{BASE_URL}/simulation/pause")
    time.sleep(1)
    status = requests.get(f"{BASE_URL}/simulation/status").json()
    assert_true(status["is_paused"], "Case 8: Simulation is paused")
    assert_true(status["validation_state"] == "SIMULATION PAUSED", "Case 8: Validation state is SIMULATION PAUSED")

    # 4. TEST CASE 9: Resume Simulation
    log("Testing Case 9: Resume Simulation...")
    requests.post(f"{BASE_URL}/simulation/resume")
    time.sleep(1)
    status = requests.get(f"{BASE_URL}/simulation/status").json()
    assert_true(not status["is_paused"], "Case 9: Simulation is resumed")
    assert_true(status["is_running"], "Case 9: Simulation is actively running")

    # 5. TEST CASE 4: Temporary Splash / False Alarm Rejection
    log("Testing Case 4: Temporary Splash (< 4s persistence)...")
    requests.post(f"{BASE_URL}/simulation/start", json={
        "scenario_id": "scenario_4",
        "machine_id": "MCH-001",
        "zone_id": "ZONE-03",
        "persistence_seconds": 4.0,
        "signal_intensity": 85.0
    })
    # Poll during first 2 seconds - should be validating
    timer_detected = False
    for _ in range(6):
        time.sleep(0.4)
        status = requests.get(f"{BASE_URL}/simulation/status").json()
        if status["signal_timer_active"]:
            timer_detected = True
            break
    assert_true(timer_detected, "Case 4: Persistence timer triggered by splash spike")
    # Wait for spike to drop (<2.5s) and persistence to reject (>3.5s)
    time.sleep(3.5)
    status = requests.get(f"{BASE_URL}/simulation/status").json()
    assert_true(not status["leak_confirmed"], "Case 4: Leak NOT confirmed (transient splash rejected)")
    zone = requests.get(f"{BASE_URL}/zones/ZONE-03?machine_id=MCH-001").json()
    assert_true(zone["current_status"] == "NORMAL", "Case 4: Zone restored to NORMAL without creating false event")

    # 6. TEST CASE 5: Sensor Disconnection
    log("Testing Case 5: Sensor Disconnection...")
    requests.post(f"{BASE_URL}/simulation/start", json={
        "scenario_id": "scenario_5",
        "machine_id": "MCH-001",
        "zone_id": "ZONE-03"
    })
    time.sleep(2)
    status = requests.get(f"{BASE_URL}/simulation/status").json()
    assert_true(not status["sensor_connected"], "Case 5: Sensor connection state is False")
    zone = requests.get(f"{BASE_URL}/zones/ZONE-03?machine_id=MCH-001").json()
    assert_true(zone["current_status"] in ["SENSOR DISCONNECTED", "SENSOR_DISCONNECTED"], "Case 5: Zone status is SENSOR DISCONNECTED")
    assert_true(not status["leak_confirmed"], "Case 5: Sensor fault not misreported as oil leak")

    # 7. TEST CASE 6: Wi-Fi Disconnection & Edge Buffering
    log("Testing Case 6: Wi-Fi Disconnection & Edge Buffering...")
    requests.post(f"{BASE_URL}/simulation/start", json={
        "scenario_id": "scenario_6",
        "machine_id": "MCH-001",
        "zone_id": "ZONE-03"
    })
    time.sleep(2)
    status = requests.get(f"{BASE_URL}/simulation/status").json()
    assert_true(not status["wifi_connected"], "Case 6: Edge Node Wi-Fi is OFFLINE")
    assert_true(status["buffer_count"] > 0, f"Case 6: Edge node buffer counter incrementing ({status['buffer_count']} records)")
    
    # Reconnect Wi-Fi
    log("Case 6: Reconnecting Wi-Fi and testing buffer sync...")
    requests.post(f"{BASE_URL}/devices/ESP32-EDGE-01/reconnect")
    time.sleep(1)
    status = requests.get(f"{BASE_URL}/simulation/status").json()
    assert_true(status["wifi_connected"], "Case 6: Edge node Wi-Fi restored to ONLINE")
    assert_true(status["buffer_count"] == 0, "Case 6: Buffer flushed and synchronized to central database")

    # 8. TEST CASE 3: Sudden Leakage (Step)
    log("Testing Case 3: Sudden Leakage (Immediate high signal, 3s persistence in ZONE-05)...")
    events_before = len(requests.get(f"{BASE_URL}/events").json())
    requests.post(f"{BASE_URL}/simulation/start", json={
        "scenario_id": "scenario_3",
        "machine_id": "MCH-001",
        "zone_id": "ZONE-05",
        "persistence_seconds": 3.0,
        "signal_intensity": 88.0
    })
    time.sleep(1)
    status = requests.get(f"{BASE_URL}/simulation/status").json()
    assert_true(status["signal_timer_active"], "Case 3: Persistence timer started")
    # Wait for 3.0s persistence to elapse
    time.sleep(3.2)
    status = requests.get(f"{BASE_URL}/simulation/status").json()
    assert_true(status["leak_confirmed"], "Case 3: Leakage confirmed after persistence window")
    events_after = len(requests.get(f"{BASE_URL}/events").json())
    assert_true(events_after > events_before, "Case 3: Validated LeakageEvent recorded in database")

    # 9. TEST CASE 2: Gradual Leakage (Ramp)
    log("Testing Case 2: Gradual Leakage...")
    requests.post(f"{BASE_URL}/simulation/start", json={
        "scenario_id": "scenario_2",
        "machine_id": "MCH-001",
        "zone_id": "ZONE-04",
        "persistence_seconds": 3.0,
        "signal_intensity": 85.0
    })
    time.sleep(1)
    status = requests.get(f"{BASE_URL}/simulation/status").json()
    assert_true(status["is_running"], "Case 2: Gradual leak scenario running")

    # 10. TEST CASE 7: Multiple Zone Leakage (Scenario 8)
    log("Testing Case 7: Multiple Zone Leakage (ZONE-01 and ZONE-03 stimulated)...")
    requests.post(f"{BASE_URL}/simulation/start", json={
        "scenario_id": "scenario_8",
        "machine_id": "MCH-001",
        "zone_id": "ZONE-03",
        "persistence_seconds": 2.5,
        "signal_intensity": 88.0
    })
    time.sleep(3.5)
    z1 = requests.get(f"{BASE_URL}/zones/ZONE-01?machine_id=MCH-001").json()
    z3 = requests.get(f"{BASE_URL}/zones/ZONE-03?machine_id=MCH-001").json()
    assert_true(
        z1["current_status"] in ["LEAKAGE CONFIRMED", "LEAKAGE_CONFIRMED", "LEAKAGE SUSPECTED", "LEAKAGE_SUSPECTED"],
        f"Case 7: ZONE-01 identified and stimulated (status: {z1['current_status']})"
    )
    assert_true(
        z3["current_status"] in ["LEAKAGE CONFIRMED", "LEAKAGE_CONFIRMED", "LEAKAGE SUSPECTED", "LEAKAGE_SUSPECTED"],
        f"Case 7: ZONE-03 identified and stimulated (status: {z3['current_status']})"
    )

    print("\n" + "=" * 60)
    print("ALL 10 SCENARIO TEST CASES PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
