from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.schemas.schemas import SimulationScenarioRequest, SimulationStatusResponse
from app.services.simulation.simulator import simulation_engine
from app.services.detection.engine import detection_engine
import time

router = APIRouter(prefix="/simulation", tags=["Simulation Control"])

@router.post("/start")
async def start_simulation(payload: SimulationScenarioRequest):
    await simulation_engine.start_simulation(
        scenario_id=payload.scenario_id,
        machine_id=payload.machine_id or "MCH-001",
        zone_id=payload.zone_id or "ZONE-03",
        persistence_sec=payload.persistence_seconds or 4.0,
        intensity=payload.signal_intensity or 85.0
    )
    return {"status": "RUNNING", "scenario": payload.scenario_id, "zone": payload.zone_id}

@router.post("/pause")
async def pause_simulation():
    await simulation_engine.pause_simulation()
    return {"status": "PAUSED"}

@router.post("/resume")
async def resume_simulation():
    await simulation_engine.resume_simulation()
    return {"status": "RESUMED"}

@router.post("/stop")
async def stop_simulation():
    await simulation_engine.stop_simulation()
    return {"status": "STOPPED"}

@router.post("/reset")
async def reset_simulation():
    await simulation_engine.reset_simulation()
    return {"status": "RESET_COMPLETED"}

@router.post("/scenario")
async def trigger_scenario(payload: SimulationScenarioRequest):
    await simulation_engine.start_simulation(
        scenario_id=payload.scenario_id,
        machine_id=payload.machine_id or "MCH-001",
        zone_id=payload.zone_id or "ZONE-03",
        persistence_sec=payload.persistence_seconds or 4.0,
        intensity=payload.signal_intensity or 85.0
    )
    return {"status": "TRIGGERED", "scenario": payload.scenario_id}

@router.get("/status", response_model=SimulationStatusResponse)
async def get_simulation_status():
    target_sensor = f"SENS-OIL-{simulation_engine.target_zone_id[-2:]}"
    sensor_connected = simulation_engine.sensor_connected_map.get(target_sensor, True)

    timer_state = detection_engine.zone_timers.get(simulation_engine.target_zone_id, {})
    timer_start = timer_state.get("timer_start")
    
    elapsed = 0.0
    if timer_start and not simulation_engine.is_paused:
        elapsed = time.time() - timer_start
    elif timer_start and simulation_engine.is_paused and simulation_engine.pause_start_time > 0:
        elapsed = simulation_engine.pause_start_time - timer_start

    # Determine validation state label
    if simulation_engine.is_paused:
        validation_state = "SIMULATION PAUSED"
    elif not sensor_connected:
        validation_state = "SENSOR OFFLINE / FAULT"
    elif not simulation_engine.wifi_connected:
        validation_state = "EDGE OFFLINE / BUFFERING"
    elif timer_state.get("is_confirmed", False):
        validation_state = "LEAKAGE CONFIRMED"
    elif timer_start is not None:
        validation_state = "PERSISTENCE VALIDATING"
    else:
        validation_state = "SIGNAL STABLE (NORMAL)"

    return SimulationStatusResponse(
        is_running=simulation_engine.is_running,
        is_paused=simulation_engine.is_paused,
        active_scenario=simulation_engine.active_scenario,
        machine_id=simulation_engine.target_machine_id,
        zone_id=simulation_engine.target_zone_id,
        persistence_threshold_sec=simulation_engine.persistence_threshold_sec,
        current_signal_pct=simulation_engine.signal_intensity,
        signal_timer_active=timer_start is not None,
        elapsed_persistence_sec=round(max(0.0, elapsed), 2),
        leak_confirmed=timer_state.get("is_confirmed", False),
        wifi_connected=simulation_engine.wifi_connected,
        sensor_connected=sensor_connected,
        buffer_count=len(simulation_engine.buffered_events),
        validation_state=validation_state
    )
