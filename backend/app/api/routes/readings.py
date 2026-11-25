from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.database.session import get_db
from app.models.entities import SensorReading, VirtualSensor
from app.schemas.schemas import SensorReadingResponse, SensorResponse

router = APIRouter(prefix="/readings", tags=["Readings & Sensors"])

@router.get("", response_model=List[SensorReadingResponse])
def get_readings(sensor_id: str = None, limit: int = 50, db: Session = Depends(get_db)):
    query = db.query(SensorReading).order_by(SensorReading.timestamp.desc())
    if sensor_id:
        query = query.filter(SensorReading.sensor_id == sensor_id)
    readings = query.limit(limit).all()
    return readings

@router.get("/latest", response_model=List[SensorResponse])
def get_latest_sensors(db: Session = Depends(get_db)):
    sensors = db.query(VirtualSensor).all()
    return sensors

