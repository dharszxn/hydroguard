from sqlalchemy import text
from app.database.session import engine

def run_migrations():
    """
    Safely inspects existing tables and applies ALTER TABLE for new columns
    so no data is lost and existing SQLite tables stay consistent.
    """
    with engine.connect() as conn:
        # Check existing columns of leakage_events
        result = conn.execute(text("PRAGMA table_info(leakage_events)"))
        existing_cols = {row[1] for row in result.fetchall()}

        col_defs = [
            ("defect_id", "VARCHAR(50)"),
            ("defect_type", "VARCHAR(100) DEFAULT 'Hydraulic Oil Leakage'"),
            ("oil_signal_pct", "FLOAT DEFAULT 0.0"),
            ("pressure_bar", "FLOAT DEFAULT 160.0"),
            ("temperature_c", "FLOAT DEFAULT 48.0"),
            ("flow_rate_lpm", "FLOAT DEFAULT 72.0"),
            ("persistence_duration_threshold", "FLOAT DEFAULT 4.0"),
            ("detection_evidence", "TEXT"),
            ("diagnosis_summary", "TEXT"),
            ("possible_causes", "TEXT"),
            ("recommended_inspection", "TEXT"),
            ("recommended_action", "TEXT"),
            ("resolved_by", "VARCHAR(255)"),
            ("closed_by", "VARCHAR(255)"),
            ("is_rejected_transient", "BOOLEAN DEFAULT 0"),
            ("rejection_reason", "TEXT"),
            ("scenario_started_at", "DATETIME"),
            ("abnormal_detected_at", "DATETIME"),
            ("persistence_started_at", "DATETIME"),
            ("defect_confirmed_at", "DATETIME"),
            ("alert_generated_at", "DATETIME"),
            ("acknowledged_at", "DATETIME"),
            ("investigated_at", "DATETIME"),
            ("resolved_at", "DATETIME"),
            ("closed_at", "DATETIME")
        ]

        for col_name, col_type in col_defs:
            if col_name not in existing_cols:
                try:
                    conn.execute(text(f"ALTER TABLE leakage_events ADD COLUMN {col_name} {col_type}"))
                    conn.commit()
                except Exception as e:
                    print(f"[Migration Warning] Failed adding {col_name}: {e}")

        # Safely align lifecycle timestamps for existing records without modifying genuine historical data
        try:
            conn.execute(text("""
                UPDATE leakage_events
                SET defect_confirmed_at = confirmation_timestamp
                WHERE defect_confirmed_at IS NULL AND confirmation_timestamp IS NOT NULL
            """))
            conn.execute(text("""
                UPDATE leakage_events
                SET alert_generated_at = confirmation_timestamp
                WHERE alert_generated_at IS NULL AND confirmation_timestamp IS NOT NULL
            """))
            conn.execute(text("""
                UPDATE leakage_events
                SET abnormal_detected_at = detection_timestamp
                WHERE abnormal_detected_at IS NULL AND detection_timestamp IS NOT NULL
            """))
            conn.execute(text("""
                UPDATE leakage_events
                SET persistence_started_at = detection_timestamp
                WHERE persistence_started_at IS NULL AND detection_timestamp IS NOT NULL
            """))
            conn.execute(text("""
                UPDATE leakage_events
                SET acknowledged_at = acknowledgement_timestamp
                WHERE acknowledged_at IS NULL AND acknowledgement_timestamp IS NOT NULL
            """))
            conn.execute(text("""
                UPDATE leakage_events
                SET resolved_at = resolution_timestamp
                WHERE resolved_at IS NULL AND resolution_timestamp IS NOT NULL
            """))
            conn.execute(text("""
                UPDATE leakage_events
                SET closed_at = closure_timestamp
                WHERE closed_at IS NULL AND closure_timestamp IS NOT NULL
            """))
            conn.commit()
        except Exception as e:
            print(f"[Migration Warning] Timestamp alignment notice: {e}")
