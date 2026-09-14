import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from .database import Base

def utc_now():
    return datetime.datetime.now(datetime.timezone.utc)

class Machine(Base):
    __tablename__ = "machines"

    id = Column(String(50), primary_key=True, index=True) # e.g. "M-017", "M-001"
    name = Column(String(100), nullable=False)
    type = Column(String(20), nullable=False) # "L", "M", "H"
    category = Column(String(50), nullable=False) # "CNC Milling Center", "Lathe Turning Center", "Stamping Press", "Grinding Machine"
    location = Column(String(50), default="Line 1 - Bay A")
    health_score = Column(Float, default=95.0)
    failure_probability = Column(Float, default=0.03)
    confidence_score = Column(Float, default=94.0)
    anomaly_score = Column(Float, default=0.02)
    risk_level = Column(String(20), default="Healthy") # "Healthy", "Stable", "Warning", "Critical"
    rul_minutes = Column(Float, default=240.0)
    top_risk_factor = Column(String(100), default="Nominal Operating State")
    operating_status = Column(String(20), default="RUNNING") # "RUNNING", "IDLE", "MAINTENANCE", "STOPPED"
    install_date = Column(DateTime, default=lambda: utc_now() - datetime.timedelta(days=730))
    operating_cycles = Column(Integer, default=1420)
    last_maintenance = Column(DateTime, default=utc_now)
    next_recommended_maintenance = Column(DateTime, default=lambda: utc_now() + datetime.timedelta(days=30))
    bearing_replacement_days_ago = Column(Integer, default=42)
    tool_replacement_days_ago = Column(Integer, default=5)
    data_completeness_pct = Column(Float, default=98.5)
    sensor_quality_status = Column(String(30), default="Good") # "Good", "Degraded", "Stale"
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    readings = relationship("SensorReading", back_populates="machine", cascade="all, delete-orphan")
    alerts = relationship("AlertEvent", back_populates="machine", cascade="all, delete-orphan")
    maintenance_events = relationship("MaintenanceAction", back_populates="machine", cascade="all, delete-orphan")
    health_records = relationship("HealthHistory", back_populates="machine", cascade="all, delete-orphan")

class HealthHistory(Base):
    __tablename__ = "health_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    machine_id = Column(String(50), ForeignKey("machines.id"), nullable=False, index=True)
    timestamp = Column(DateTime, default=utc_now, index=True)
    health_score = Column(Float, nullable=False)
    failure_probability = Column(Float, nullable=False)
    confidence_score = Column(Float, default=90.0)
    anomaly_score = Column(Float, default=0.02)
    risk_level = Column(String(20), default="Healthy")

    machine = relationship("Machine", back_populates="health_records")

class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    machine_id = Column(String(50), ForeignKey("machines.id"), nullable=False, index=True)
    timestamp = Column(DateTime, default=utc_now, index=True)
    air_temperature = Column(Float, nullable=False)
    process_temperature = Column(Float, nullable=False)
    rotational_speed = Column(Float, nullable=False)
    torque = Column(Float, nullable=False)
    tool_wear = Column(Float, nullable=False)
    vibration = Column(Float, default=0.85)
    acoustic = Column(Float, default=0.55)
    current = Column(Float, default=12.0)
    health_score = Column(Float, default=95.0)
    failure_probability = Column(Float, default=0.03)
    confidence_score = Column(Float, default=90.0)
    anomaly_score = Column(Float, default=0.02)
    is_anomaly = Column(Boolean, default=False)
    is_simulated = Column(Boolean, default=False)
    predicted_failure_type = Column(String(50), default="No Failure")

    machine = relationship("Machine", back_populates="readings")

class AlertEvent(Base):
    __tablename__ = "alert_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    machine_id = Column(String(50), ForeignKey("machines.id"), nullable=False, index=True)
    timestamp = Column(DateTime, default=utc_now, index=True)
    severity = Column(String(20), nullable=False) # "CRITICAL", "HIGH", "WARNING", "INFO"
    reason = Column(String(255), nullable=False)
    contributing_factors = Column(Text, nullable=True) # JSON or descriptive string of top SHAP contributors
    recommended_action = Column(String(255), nullable=False)
    priority_score = Column(Float, default=80.0)
    occurrence_count = Column(Integer, default=1)
    duration_minutes = Column(Float, default=0.0)
    is_transient = Column(Boolean, default=False)
    suppression_reason = Column(String(255), nullable=True)
    first_detected = Column(DateTime, default=utc_now)
    last_detected = Column(DateTime, default=utc_now)
    status = Column(String(20), default="ACTIVE") # "ACTIVE", "ACKNOWLEDGED", "RESOLVED", "SUPPRESSED"
    acknowledged = Column(Boolean, default=False)
    resolved = Column(Boolean, default=False)

    machine = relationship("Machine", back_populates="alerts")

class MaintenanceAction(Base):
    __tablename__ = "maintenance_actions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    machine_id = Column(String(50), ForeignKey("machines.id"), nullable=False, index=True)
    timestamp = Column(DateTime, default=utc_now)
    action_type = Column(String(50), nullable=False) # "PREVENTIVE", "CORRECTIVE", "INSPECTION", "REPLACEMENT"
    maintenance_type = Column(String(50), default="PREVENTIVE")
    action_taken = Column(String(255), nullable=True)
    component = Column(String(100), default="Spindle Head")
    parts_replaced = Column(String(255), nullable=True)
    failure_reason = Column(String(255), nullable=True)
    technician = Column(String(100), default="Automated Diagnostic Agent")
    performed_by = Column(String(100), default="Automated Diagnostic Agent")
    duration_hours = Column(Float, default=1.5)
    downtime_saved_hours = Column(Float, default=8.0)
    downtime_avoided_hours = Column(Float, default=8.0)
    cost_usd = Column(Float, default=350.0)
    cost_savings_est = Column(Float, default=8500.0)
    operating_cycles_at_service = Column(Integer, default=1200)
    notes = Column(Text, nullable=True)

    machine = relationship("Machine", back_populates="maintenance_events")
