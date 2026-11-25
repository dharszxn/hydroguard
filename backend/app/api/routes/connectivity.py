from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.database.session import get_db
from app.models.entities import VirtualDevice, DeviceSyncLog
from app.schemas.schemas import DeviceResponse
from app.services.simulation.simulator import simulation_engine

router = APIRouter(prefix="/devices", tags=["Connectivity & Edge Nodes"])

@router.get("/status", response_model=List[DeviceResponse])
def get_device_status(db: Session = Depends(get_db)):
    devices = db.query(VirtualDevice).all()
    return devices

@router.post("/{device_id}/disconnect")
def disconnect_device(device_id: str):
    simulation_engine.set_wifi_state(False)
    return {"device_id": device_id, "status": "OFFLINE", "message": "Wi-Fi disconnected. Telemetry will be buffered on edge node."}

@router.post("/{device_id}/reconnect")
def reconnect_device(device_id: str):
    simulation_engine.set_wifi_state(True)
    return {"device_id": device_id, "status": "ONLINE", "message": "Wi-Fi restored. Buffered events synchronized to database."}

@router.get("/sync-logs")
def get_sync_logs(db: Session = Depends(get_db)):
    logs = db.query(DeviceSyncLog).order_by(DeviceSyncLog.timestamp.desc()).limit(20).all()
    return logs

