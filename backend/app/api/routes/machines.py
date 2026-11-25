from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database.session import get_db
from app.models.entities import Machine, Zone, LeakageEvent, ZoneStatus, EventStatus
from app.schemas.schemas import MachineResponse, MachineCreate

router = APIRouter(prefix="/machines", tags=["Machines"])

@router.get("", response_model=List[MachineResponse])
def get_machines(db: Session = Depends(get_db)):
    machines = db.query(Machine).all()
    res = []
    for m in machines:
        zones = db.query(Zone).filter(Zone.machine_id == m.id).all()
        total_zones = len(zones)
        healthy = sum(1 for z in zones if z.current_status == ZoneStatus.NORMAL.value)
        warning = sum(1 for z in zones if z.current_status in [ZoneStatus.WARNING.value, ZoneStatus.LEAKAGE_SUSPECTED.value, ZoneStatus.SENSOR_DISCONNECTED.value])
        active_events = db.query(LeakageEvent).filter(
            LeakageEvent.machine_id == m.id,
            LeakageEvent.status.in_([EventStatus.DETECTED.value, EventStatus.ACKNOWLEDGED.value, EventStatus.UNDER_INVESTIGATION.value])
        ).count()
        
        condition = "CRITICAL" if any(z.current_status == ZoneStatus.LEAKAGE_CONFIRMED.value for z in zones) else \
                    "WARNING" if warning > 0 else "NORMAL"

        res.append(MachineResponse(
            id=m.id,
            name=m.name,
            description=m.description,
            location=m.location,
            is_active=m.is_active,
            total_zones=total_zones,
            healthy_zones=healthy,
            warning_zones=warning,
            active_events=active_events,
            overall_condition=condition
        ))
    return res

@router.get("/{machine_id}", response_model=MachineResponse)
def get_machine(machine_id: str, db: Session = Depends(get_db)):
    m = db.query(Machine).filter(Machine.id == machine_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Machine not found")
    zones = db.query(Zone).filter(Zone.machine_id == m.id).all()
    healthy = sum(1 for z in zones if z.current_status == ZoneStatus.NORMAL.value)
    warning = sum(1 for z in zones if z.current_status in [ZoneStatus.WARNING.value, ZoneStatus.LEAKAGE_SUSPECTED.value, ZoneStatus.SENSOR_DISCONNECTED.value])
    active_events = db.query(LeakageEvent).filter(
        LeakageEvent.machine_id == m.id,
        LeakageEvent.status.in_([EventStatus.DETECTED.value, EventStatus.ACKNOWLEDGED.value, EventStatus.UNDER_INVESTIGATION.value])
    ).count()
    condition = "CRITICAL" if any(z.current_status == ZoneStatus.LEAKAGE_CONFIRMED.value for z in zones) else \
                "WARNING" if warning > 0 else "NORMAL"
    return MachineResponse(
        id=m.id,
        name=m.name,
        description=m.description,
        location=m.location,
        is_active=m.is_active,
        total_zones=len(zones),
        healthy_zones=healthy,
        warning_zones=warning,
        active_events=active_events,
        overall_condition=condition
    )

