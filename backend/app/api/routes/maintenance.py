from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from app.database.session import get_db
from app.models.entities import MaintenanceRecord
from app.schemas.schemas import MaintenanceResponse, MaintenanceCreate

router = APIRouter(prefix="/maintenance", tags=["Maintenance Management"])

@router.get("", response_model=List[MaintenanceResponse])
def get_maintenance_records(db: Session = Depends(get_db)):
    return db.query(MaintenanceRecord).order_by(MaintenanceRecord.created_at.desc()).all()

@router.post("", response_model=MaintenanceResponse)
def create_maintenance_record(payload: MaintenanceCreate, db: Session = Depends(get_db)):
    rec_id = f"MNT-{datetime.utcnow().strftime('%Y%m')}-{int(datetime.utcnow().timestamp()) % 1000:03d}"
    record = MaintenanceRecord(
        id=rec_id,
        event_id=payload.event_id,
        machine_id=payload.machine_id,
        zone_id=payload.zone_id,
        schedule_type=payload.schedule_type,
        assigned_technician=payload.assigned_technician,
        repair_status="SCHEDULED",
        inspection_findings=payload.inspection_findings,
        actions_taken=payload.actions_taken
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record

@router.put("/{record_id}", response_model=MaintenanceResponse)
def update_maintenance_record(record_id: str, status: str, findings: str = None, actions: str = None, db: Session = Depends(get_db)):
    rec = db.query(MaintenanceRecord).filter(MaintenanceRecord.id == record_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Maintenance record not found")
    rec.repair_status = status
    if findings:
        rec.inspection_findings = findings
    if actions:
        rec.actions_taken = actions
    if status == "COMPLETED":
        rec.completion_time = datetime.utcnow()
    db.commit()
    db.refresh(rec)
    return rec

