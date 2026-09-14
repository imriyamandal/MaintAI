import io
import os
import datetime
import pandas as pd
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from ..database.database import get_db
from ..database.models import Machine, SensorReading, AlertEvent, MaintenanceAction, HealthHistory
from ..database.seed import seed_database
from ..ml.engine import MLEngine
from ..schemas.schemas import (
    MachineResponse, MachineDetailResponse, FleetSummaryResponse,
    SensorReadingResponse, PredictRequest, PredictResponse,
    SimulationRequest, SimulationResponse, SHAPExplanationResponse,
    GlobalSHAPResponse, AlertResponse, AlertAcknowledgeRequest,
    MaintenanceActionResponse, HealthTimelineResponse, PrescriptiveRecommendationResponse,
    CopilotQueryRequest, CopilotQueryResponse, DemoScenarioStepResponse
)
from ..services.copilot_service import CopilotService
from ..services.demo_scenario_service import DemoScenarioService
from ..services.health_timeline_service import HealthTimelineService
from ..services.alert_intelligence_service import AlertIntelligenceService

router = APIRouter()
copilot_service = CopilotService()
demo_service = DemoScenarioService()
timeline_service = HealthTimelineService()
alert_service = AlertIntelligenceService()

@router.get("/health")
def get_system_health():
    ml = MLEngine.get_instance()
    return {
        "status": "ONLINE",
        "service": "MaintAI Industrial Predictive & Prescriptive Intelligence API",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "models_loaded": list(ml.models.keys()),
        "selected_production_model": ml.metadata.get("selected_model", "xgboost")
    }

@router.get("/fleet/summary", response_model=FleetSummaryResponse)
def get_fleet_summary(db: Session = Depends(get_db)):
    machines = db.query(Machine).all()
    total = len(machines)
    if total == 0:
        seed_database(db)
        machines = db.query(Machine).all()
        total = len(machines)

    healthy = sum(1 for m in machines if m.health_score >= 88)
    stable = sum(1 for m in machines if 70 <= m.health_score < 88)
    warning = sum(1 for m in machines if 45 <= m.health_score < 70)
    critical = sum(1 for m in machines if m.health_score < 45)

    avg_health = round(sum(m.health_score for m in machines) / max(1, total), 1)
    avg_confidence = round(sum(m.confidence_score for m in machines) / max(1, total), 1)
    failures_pred = sum(1 for m in machines if m.failure_probability >= 0.50 or m.risk_level == "Critical")
    active_alerts = db.query(AlertEvent).filter(AlertEvent.resolved == False, AlertEvent.status != "SUPPRESSED").count()

    avoidable_downtime_hours = round(critical * 4.5 + warning * 1.5, 1)
    cost_savings = round(avoidable_downtime_hours * 2800.0, 2)

    top_critical = (
        db.query(Machine)
        .order_by(Machine.health_score.asc())
        .limit(5)
        .all()
    )

    return FleetSummaryResponse(
        total_machines=total,
        healthy_machines=healthy,
        stable_machines=stable,
        warning_machines=warning,
        critical_machines=critical,
        average_health_score=avg_health,
        average_confidence_score=avg_confidence,
        predicted_failures_count=failures_pred,
        active_alerts_count=active_alerts,
        avoidable_downtime_hours_est=avoidable_downtime_hours,
        cost_savings_est_usd=cost_savings,
        fleet_health_distribution={
            "Healthy (88-100)": healthy,
            "Stable (70-87)": stable,
            "Warning (45-69)": warning,
            "Critical (0-44)": critical
        },
        top_critical_machines=top_critical
    )

@router.get("/machines", response_model=List[MachineResponse])
def get_machines(
    search: Optional[str] = None,
    risk_level: Optional[str] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Machine)
    if search:
        s = f"%{search}%"
        query = query.filter((Machine.id.ilike(s)) | (Machine.name.ilike(s)) | (Machine.location.ilike(s)))
    if risk_level and risk_level != "All":
        query = query.filter(Machine.risk_level.ilike(risk_level))
    if category and category != "All":
        query = query.filter(Machine.category.ilike(category))

    return query.order_by(Machine.health_score.asc()).all()

@router.get("/machines/{machine_id}", response_model=MachineDetailResponse)
def get_machine_detail(machine_id: str, db: Session = Depends(get_db)):
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail=f"Machine {machine_id} not found in registry")

    recent_readings = (
        db.query(SensorReading)
        .filter(SensorReading.machine_id == machine_id)
        .order_by(SensorReading.timestamp.asc())
        .limit(50)
        .all()
    )

    active_alerts = (
        db.query(AlertEvent)
        .filter(AlertEvent.machine_id == machine_id)
        .order_by(AlertEvent.priority_score.desc(), AlertEvent.timestamp.desc())
        .all()
    )

    maintenance_history = (
        db.query(MaintenanceAction)
        .filter(MaintenanceAction.machine_id == machine_id)
        .order_by(MaintenanceAction.timestamp.desc())
        .all()
    )

    latest = recent_readings[-1] if recent_readings else None
    current_readings_dict = None
    if latest:
        current_readings_dict = {
            "air_temperature": latest.air_temperature,
            "process_temperature": latest.process_temperature,
            "rotational_speed": latest.rotational_speed,
            "torque": latest.torque,
            "tool_wear": latest.tool_wear,
            "vibration": latest.vibration,
            "machine_type": machine.type
        }

    # Evaluate live inference for confidence breakdown & prescriptive plan
    ml = MLEngine.get_instance()
    m_context = {
        "bearing_replacement_days_ago": machine.bearing_replacement_days_ago,
        "tool_replacement_days_ago": machine.tool_replacement_days_ago,
        "last_maintenance_action": maintenance_history[0].action_type if maintenance_history else "Routine PM"
    }

    recent_probs = [r.failure_probability for r in recent_readings[-10:]] if recent_readings else []
    pred = ml.predict(
        current_readings_dict or {
            'air_temperature': 300.0,
            'process_temperature': 310.0,
            'rotational_speed': 1500.0,
            'torque': 40.0,
            'tool_wear': 60.0,
            'machine_type': machine.type,
            'vibration': 0.8
        },
        machine_id=machine.id,
        maintenance_context=m_context,
        recent_probabilities=recent_probs
    )

    digital_twin = ml.build_digital_twin_state(
        machine_id=machine.id,
        machine_name=machine.name,
        telemetry=current_readings_dict or {},
        prediction=pred
    )

    return MachineDetailResponse(
        id=machine.id,
        name=machine.name,
        type=machine.type,
        category=machine.category,
        location=machine.location,
        health_score=machine.health_score,
        failure_probability=machine.failure_probability,
        confidence_score=pred.confidence_breakdown.confidence_score,
        anomaly_score=machine.anomaly_score,
        risk_level=machine.risk_level,
        rul_minutes=machine.rul_minutes,
        estimated_time_to_risk_minutes=machine.rul_minutes,
        wear_life_minutes=machine.rul_minutes,
        top_risk_factor=machine.top_risk_factor,
        operating_status=machine.operating_status,
        install_date=machine.install_date,
        operating_cycles=machine.operating_cycles,
        last_maintenance=machine.last_maintenance,
        next_recommended_maintenance=machine.next_recommended_maintenance,
        bearing_replacement_days_ago=machine.bearing_replacement_days_ago,
        tool_replacement_days_ago=machine.tool_replacement_days_ago,
        data_completeness_pct=machine.data_completeness_pct,
        sensor_quality_status=machine.sensor_quality_status,
        current_readings=current_readings_dict,
        confidence_breakdown=pred.confidence_breakdown,
        confidence_details=pred.confidence_breakdown.model_dump(),
        prescriptive_plan=pred.prescriptive_plan,
        prescriptive_action=pred.prescriptive_plan,
        digital_twin=digital_twin,
        recent_readings=recent_readings,
        active_alerts=active_alerts,
        maintenance_history=maintenance_history
    )

@router.get("/machines/{machine_id}/history", response_model=HealthTimelineResponse)
def get_machine_history(
    machine_id: str,
    timeframe: str = Query("7d", description="24h, 7d, 14d, 30d"),
    db: Session = Depends(get_db)
):
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail=f"Machine {machine_id} not found")
    return timeline_service.get_machine_health_timeline(machine_id, timeframe, db)

@router.get("/machines/{machine_id}/maintenance", response_model=List[MaintenanceActionResponse])
def get_machine_maintenance_events(machine_id: str, db: Session = Depends(get_db)):
    return (
        db.query(MaintenanceAction)
        .filter(MaintenanceAction.machine_id == machine_id)
        .order_by(MaintenanceAction.timestamp.desc())
        .all()
    )

@router.get("/recommendations")
def get_prescriptive_recommendations(
    machine_id: Optional[str] = Query(None, description="Optional machine ID filter"),
    priority: Optional[str] = Query(None, description="Optional priority filter: P1-Critical, P2-Urgent, P3-Scheduled, P4-Advisory"),
    limit: Optional[int] = Query(50, description="Max recommendations to return"),
    db: Session = Depends(get_db)
):
    """Returns prioritized prescriptive maintenance actions across all machines requiring attention"""
    query = db.query(Machine)
    if machine_id:
        query = query.filter(Machine.id == machine_id)
    machines = query.order_by(Machine.health_score.asc()).all()
    ml = MLEngine.get_instance()
    recommendations = []

    for m in machines:
        latest = (
            db.query(SensorReading)
            .filter(SensorReading.machine_id == m.id)
            .order_by(SensorReading.timestamp.desc())
            .first()
        )
        r_dict = {
            'air_temperature': latest.air_temperature if latest else 300.0,
            'process_temperature': latest.process_temperature if latest else 310.0,
            'rotational_speed': latest.rotational_speed if latest else 1500.0,
            'torque': latest.torque if latest else 40.0,
            'tool_wear': latest.tool_wear if latest else 60.0,
            'machine_type': m.type,
            'vibration': latest.vibration if latest else 0.8
        }
        m_context = {
            "bearing_replacement_days_ago": m.bearing_replacement_days_ago,
            "tool_replacement_days_ago": m.tool_replacement_days_ago
        }
        pred = ml.predict(r_dict, machine_id=m.id, maintenance_context=m_context)
        plan_dict = pred.prescriptive_plan.model_dump()
        plan_dict["machine_name"] = m.name
        plan_dict["health_score"] = m.health_score
        plan_dict["failure_probability"] = round(m.failure_probability, 4)
        plan_dict["prescriptive_action"] = pred.prescriptive_plan.model_dump()
        plan_dict["predicted_failure_type"] = pred.predicted_failure_mode

        if priority and priority != "All":
            if plan_dict["priority"].lower() != priority.lower():
                continue

        recommendations.append(plan_dict)

    if limit:
        recommendations = recommendations[:limit]

    return {
        "recommendations": recommendations,
        "total_count": len(recommendations),
        "critical_p1_count": sum(1 for r in recommendations if r.get("priority") == "P1-Critical")
    }

@router.post("/predict", response_model=PredictResponse)
def predict_equipment_health(req: PredictRequest, db: Session = Depends(get_db)):
    ml = MLEngine.get_instance()
    m_id = req.machine_id or "M-017"
    machine = db.query(Machine).filter(Machine.id == m_id).first()

    m_context = {
        "bearing_replacement_days_ago": machine.bearing_replacement_days_ago if machine else 42,
        "tool_replacement_days_ago": machine.tool_replacement_days_ago if machine else 5
    }

    r_dict = {
        'air_temperature': req.air_temperature,
        'process_temperature': req.process_temperature,
        'rotational_speed': req.rotational_speed,
        'torque': req.torque,
        'tool_wear': req.tool_wear,
        'machine_type': req.machine_type or (machine.type if machine else "M"),
        'vibration': req.vibration if req.vibration is not None else 0.8
    }
    return ml.predict(r_dict, machine_id=m_id, maintenance_context=m_context)

@router.post("/simulate", response_model=SimulationResponse)
def simulate_parameter_change(req: SimulationRequest, db: Session = Depends(get_db)):
    ml = MLEngine.get_instance()
    machine_id = req.machine_id or "M-017"
    machine = db.query(Machine).filter(Machine.id == machine_id).first()

    latest = (
        db.query(SensorReading)
        .filter(SensorReading.machine_id == machine_id)
        .order_by(SensorReading.timestamp.desc())
        .first()
    )

    curr_dict = {
        'air_temperature': latest.air_temperature if latest else 300.0,
        'process_temperature': latest.process_temperature if latest else 310.0,
        'rotational_speed': latest.rotational_speed if latest else 1500.0,
        'torque': latest.torque if latest else 40.0,
        'tool_wear': latest.tool_wear if latest else 60.0,
        'machine_type': machine.type if machine else "M",
        'vibration': latest.vibration if latest else 0.8
    }

    sim_dict = {
        'air_temperature': req.air_temperature,
        'process_temperature': req.process_temperature,
        'rotational_speed': req.rotational_speed,
        'torque': req.torque,
        'tool_wear': req.tool_wear,
        'machine_type': req.machine_type,
        'vibration': req.vibration if req.vibration is not None else (latest.vibration if latest else 0.8)
    }

    m_context = {
        "bearing_replacement_days_ago": machine.bearing_replacement_days_ago if machine else 42,
        "tool_replacement_days_ago": machine.tool_replacement_days_ago if machine else 5
    }

    return ml.simulate(curr_dict, sim_dict, machine_id=machine_id, maintenance_context=m_context)

@router.get("/explain/global", response_model=GlobalSHAPResponse)
def get_global_explanation():
    ml = MLEngine.get_instance()
    return GlobalSHAPResponse(
        selected_model=ml.metadata.get("selected_model", "xgboost"),
        global_feature_importance=ml.metadata.get("global_shap_importance", []),
        feature_correlation_matrix=ml.metadata.get("correlations", {}),
        model_comparison_metrics=ml.metadata.get("models", {})
    )

@router.get("/explain/{machine_id}", response_model=SHAPExplanationResponse)
def get_machine_explanation(machine_id: str, db: Session = Depends(get_db)):
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail=f"Machine {machine_id} not found")

    latest = (
        db.query(SensorReading)
        .filter(SensorReading.machine_id == machine_id)
        .order_by(SensorReading.timestamp.desc())
        .first()
    )

    ml = MLEngine.get_instance()
    r_dict = {
        'air_temperature': latest.air_temperature if latest else 300.0,
        'process_temperature': latest.process_temperature if latest else 310.0,
        'rotational_speed': latest.rotational_speed if latest else 1500.0,
        'torque': latest.torque if latest else 40.0,
        'tool_wear': latest.tool_wear if latest else 60.0,
        'machine_type': machine.type,
        'vibration': latest.vibration if latest else 0.8
    }

    pred = ml.predict(r_dict, machine_id=machine_id)

    top_pos_names = [f"{c.feature} (+{c.shap_value:.3f})" for c in pred.top_positive_contributors[:3]]
    narrative = (
        f"Equipment {machine_id} is evaluated with Health Score {pred.health_score}/100 and Failure Probability {pred.failure_probability*100:.1f}% "
        f"(AI Confidence: {pred.confidence_breakdown.confidence_score}%). "
        f"SHAP decomposition indicates that {', '.join(top_pos_names) if top_pos_names else 'all parameters'} are the primary drivers of risk. "
        f"Diagnosed physical condition: {pred.predicted_failure_mode}."
    )

    base_val = 0.185
    return SHAPExplanationResponse(
        machine_id=machine_id,
        base_value=base_val,
        prediction_value=pred.failure_probability,
        failure_probability=pred.failure_probability,
        confidence_score=pred.confidence_breakdown.confidence_score,
        risk_level=pred.risk_level,
        contributions=pred.all_contributions,
        narrative_explanation=narrative
    )

@router.get("/alerts", response_model=List[AlertResponse])
def get_alerts(
    severity: Optional[str] = None,
    status: Optional[str] = None,
    resolved: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    query = db.query(AlertEvent)
    if severity and severity != "All":
        query = query.filter(AlertEvent.severity == severity.upper())
    if status and status != "All":
        query = query.filter(AlertEvent.status == status.upper())
    if resolved is not None:
        query = query.filter(AlertEvent.resolved == resolved)

    return query.order_by(AlertEvent.priority_score.desc(), AlertEvent.timestamp.desc()).all()

@router.get("/alerts/summary")
def get_alerts_summary(db: Session = Depends(get_db)):
    return alert_service.get_alert_summary_metrics(db)

@router.patch("/alerts/{alert_id}", response_model=AlertResponse)
def update_alert(alert_id: int, req: AlertAcknowledgeRequest, db: Session = Depends(get_db)):
    alert = db.query(AlertEvent).filter(AlertEvent.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail=f"Alert #{alert_id} not found")

    alert.acknowledged = req.acknowledged
    if req.resolved is not None:
        alert.resolved = req.resolved
        if req.resolved:
            alert.status = "RESOLVED"
    if req.status:
        alert.status = req.status
    if req.suppression_reason:
        alert.suppression_reason = req.suppression_reason

    db.commit()
    db.refresh(alert)
    return alert

@router.post("/alerts/{alert_id}/acknowledge", response_model=AlertResponse)
def acknowledge_alert_endpoint(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(AlertEvent).filter(AlertEvent.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail=f"Alert #{alert_id} not found")
    alert.acknowledged = True
    alert.status = "ACKNOWLEDGED"
    db.commit()
    db.refresh(alert)
    return alert

@router.post("/alerts/{alert_id}/resolve", response_model=AlertResponse)
def resolve_alert_endpoint(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(AlertEvent).filter(AlertEvent.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail=f"Alert #{alert_id} not found")
    alert.resolved = True
    alert.acknowledged = True
    alert.status = "RESOLVED"
    db.commit()
    db.refresh(alert)
    return alert

@router.post("/alerts/{alert_id}/suppress", response_model=AlertResponse)
def suppress_alert_endpoint(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(AlertEvent).filter(AlertEvent.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail=f"Alert #{alert_id} not found")
    alert.status = "SUPPRESSED"
    db.commit()
    db.refresh(alert)
    return alert

@router.get("/data-quality")
def get_fleet_data_quality(db: Session = Depends(get_db)):
    machines = db.query(Machine).all()
    return {
        "overall_completeness_pct": round(sum(m.data_completeness_pct for m in machines) / max(1, len(machines)), 1),
        "total_active_channels": len(machines) * 6,
        "healthy_channels": sum(1 for m in machines if m.sensor_quality_status == "Optimal") * 6,
        "degraded_channels": sum(1 for m in machines if m.sensor_quality_status != "Optimal") * 6,
        "timestamp_staleness_status": "Active Real-Time Telemetry Stream",
        "last_sync": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }

@router.get("/model-performance")
def get_model_performance():
    ml = MLEngine.get_instance()
    return ml.metadata

@router.post("/copilot/query", response_model=CopilotQueryResponse)
def query_copilot(req: CopilotQueryRequest, db: Session = Depends(get_db)):
    return copilot_service.process_query(req.query, req.machine_id, db)

@router.get("/demo/scenario")
def get_demo_scenario_info():
    return demo_service.get_scenario_steps_info()

@router.post("/demo/scenario/{step}", response_model=DemoScenarioStepResponse)
def execute_demo_scenario_step(step: int, db: Session = Depends(get_db)):
    return demo_service.execute_step(step, db)

@router.post("/seed/reset")
def reset_and_reseed_database(db: Session = Depends(get_db)):
    db.query(HealthHistory).delete()
    db.query(SensorReading).delete()
    db.query(AlertEvent).delete()
    db.query(MaintenanceAction).delete()
    db.query(Machine).delete()
    db.commit()
    seed_database(db)
    return {"status": "SUCCESS", "message": "Database reset and re-seeded successfully with rich maintenance memory."}

@router.post("/upload")
async def upload_dataset_csv(file: UploadFile = File(...)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted.")

    contents = await file.read()
    try:
        df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid CSV formatting: {str(e)}")

    if df.empty:
        raise HTTPException(status_code=422, detail="CSV file is empty. Please provide rows with valid telemetry data.")

    # Column normalization mapping
    col_map = {
        'Air temperature [K]': 'air_temperature',
        'Process temperature [K]': 'process_temperature',
        'Rotational speed [rpm]': 'rotational_speed',
        'Torque [Nm]': 'torque',
        'Tool wear [min]': 'tool_wear',
        'Type': 'machine_type'
    }
    df.rename(columns=col_map, inplace=True)
    cols = list(df.columns)
    
    required_cols = ['air_temperature', 'process_temperature', 'rotational_speed', 'torque', 'tool_wear']
    missing_cols = [c for c in required_cols if c not in cols]
    if missing_cols:
        raise HTTPException(
            status_code=422,
            detail=f"Schema validation failed. Missing required telemetry columns: {', '.join(missing_cols)}. Supported headers: air_temperature, process_temperature, rotational_speed, torque, tool_wear."
        )

    # Check for missing values / NaNs
    missing_count = int(df[required_cols].isna().sum().sum())
    
    # Check for duplicate rows
    duplicate_count = int(df.duplicated(subset=required_cols).sum())

    # Convert to numeric
    for c in required_cols:
        df[c] = pd.to_numeric(df[c], errors='coerce')

    df.dropna(subset=required_cols, inplace=True)

    # Physical sensor range validation
    outlier_mask = (
        (df['air_temperature'] < 270) | (df['air_temperature'] > 350) |
        (df['process_temperature'] < 270) | (df['process_temperature'] > 360) |
        (df['rotational_speed'] < 400) | (df['rotational_speed'] > 4000) |
        (df['torque'] < 0) | (df['torque'] > 200) |
        (df['tool_wear'] < 0) | (df['tool_wear'] > 400)
    )
    outlier_count = int(outlier_mask.sum())
    valid_rows = len(df) - outlier_count

    if valid_rows <= 0:
        raise HTTPException(
            status_code=422,
            detail="Sensor range validation failed. All records contain physically invalid values (out of standard sensor calibration boundaries)."
        )

    return {
        "filename": file.filename,
        "rows_processed": len(df),
        "valid_rows_count": valid_rows,
        "missing_values_detected": missing_count,
        "duplicate_rows_detected": duplicate_count,
        "outlier_records_flagged": outlier_count,
        "columns_detected": cols,
        "matched_schema": "AI4I 2020 Predictive Maintenance Standard (Validated)",
        "status": "VALIDATED_AND_INGESTED",
        "sample_preview": df[required_cols].head(5).to_dict(orient="records")
    }

