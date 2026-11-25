from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database.session import get_db
from app.models.entities import Zone, VirtualSensor
from app.schemas.schemas import ZoneResponse, ZoneCreate, ZoneUpdate

router = APIRouter(prefix="/zones", tags=["Zones"])

@router.get("", response_model=List[ZoneResponse])
@router.get("/machine/{machine_id}", response_model=List[ZoneResponse])
def get_zones(machine_id: str = "MCH-001", db: Session = Depends(get_db)):
    zones = db.query(Zone).filter(Zone.machine_id == machine_id).all()
    res = []
    for z in zones:
        sensor = db.query(VirtualSensor).filter(VirtualSensor.zone_id == z.id, VirtualSensor.machine_id == z.machine_id).first()
        res.append(ZoneResponse(
            id=z.id,
            machine_id=z.machine_id,
            name=z.name,
            component_mapping=z.component_mapping,
            detection_threshold=z.detection_threshold,
            persistence_duration=z.persistence_duration,
            severity_level=z.severity_level,
            is_enabled=z.is_enabled,
            current_status=z.current_status,
            last_sensor_update=z.last_sensor_update,
            sensor_id=sensor.id if sensor else None,
            simulated_signal_value=sensor.simulated_signal_value if sensor else 0.0,
            pressure_bar=sensor.pressure_bar if sensor else 160.0,
            temperature_c=sensor.temperature_c if sensor else 48.0,
            flow_rate_lpm=sensor.flow_rate_lpm if sensor else 72.0,
            is_connected=sensor.is_connected if sensor else True
        ))
    return res

@router.get("/{zone_id}", response_model=ZoneResponse)
def get_single_zone(zone_id: str, machine_id: str = "MCH-001", db: Session = Depends(get_db)):
    z = db.query(Zone).filter(Zone.id == zone_id, Zone.machine_id == machine_id).first()
    if not z:
        raise HTTPException(status_code=404, detail="Zone not found")
    sensor = db.query(VirtualSensor).filter(VirtualSensor.zone_id == z.id, VirtualSensor.machine_id == z.machine_id).first()
    return ZoneResponse(
        id=z.id,
        machine_id=z.machine_id,
        name=z.name,
        component_mapping=z.component_mapping,
        detection_threshold=z.detection_threshold,
        persistence_duration=z.persistence_duration,
        severity_level=z.severity_level,
        is_enabled=z.is_enabled,
        current_status=z.current_status,
        last_sensor_update=z.last_sensor_update,
        sensor_id=sensor.id if sensor else None,
        simulated_signal_value=sensor.simulated_signal_value if sensor else 0.0,
        pressure_bar=sensor.pressure_bar if sensor else 160.0,
        temperature_c=sensor.temperature_c if sensor else 48.0,
        flow_rate_lpm=sensor.flow_rate_lpm if sensor else 72.0,
        is_connected=sensor.is_connected if sensor else True
    )

@router.post("", response_model=ZoneResponse)
def create_zone(payload: ZoneCreate, db: Session = Depends(get_db)):
    existing = db.query(Zone).filter(Zone.id == payload.id, Zone.machine_id == payload.machine_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Duplicate Zone ID within machine")
    zone = Zone(**payload.dict())
    db.add(zone)
    db.commit()
    db.refresh(zone)
    return ZoneResponse(
        **payload.dict(),
        current_status=zone.current_status,
        last_sensor_update=zone.last_sensor_update
    )

@router.put("/{zone_id}", response_model=ZoneResponse)
def update_zone(zone_id: str, payload: ZoneUpdate, machine_id: str = "MCH-001", db: Session = Depends(get_db)):
    zone = db.query(Zone).filter(Zone.id == zone_id, Zone.machine_id == machine_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    
    update_data = payload.dict(exclude_unset=True)
    for k, v in update_data.items():
        setattr(zone, k, v)
    
    db.commit()
    db.refresh(zone)
    sensor = db.query(VirtualSensor).filter(VirtualSensor.zone_id == zone.id, VirtualSensor.machine_id == zone.machine_id).first()
    return ZoneResponse(
        id=zone.id,
        machine_id=zone.machine_id,
        name=zone.name,
        component_mapping=zone.component_mapping,
        detection_threshold=zone.detection_threshold,
        persistence_duration=zone.persistence_duration,
        severity_level=zone.severity_level,
        is_enabled=zone.is_enabled,
        current_status=zone.current_status,
        last_sensor_update=zone.last_sensor_update,
        sensor_id=sensor.id if sensor else None,
        simulated_signal_value=sensor.simulated_signal_value if sensor else 0.0,
        pressure_bar=sensor.pressure_bar if sensor else 160.0,
        temperature_c=sensor.temperature_c if sensor else 48.0,
        flow_rate_lpm=sensor.flow_rate_lpm if sensor else 72.0,
        is_connected=sensor.is_connected if sensor else True
    )

@router.delete("/{zone_id}")
def delete_zone(zone_id: str, machine_id: str = "MCH-001", db: Session = Depends(get_db)):
    zone = db.query(Zone).filter(Zone.id == zone_id, Zone.machine_id == machine_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    db.delete(zone)
    db.commit()
    return {"message": f"Zone {zone_id} deleted successfully"}

