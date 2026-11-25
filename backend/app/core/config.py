import os
from pydantic import BaseModel

class Settings(BaseModel):
    PROJECT_NAME: str = "HYDROGUARD Industrial Monitoring Platform"
    PROJECT_TITLE: str = "Hydraulic Oil & Leakage Monitoring System"
    TAGLINE: str = "Detect Early. Respond Faster."
    API_V1_STR: str = "/api"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./hydroguard.db")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "hydroguard-industrial-secret-key-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

settings = Settings()

