import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field, ConfigDict

# --- Core Sensor Schemas ---
class SensorReadingBase(BaseModel):
    air_temperature: float = Field(..., description="Air temperature in Kelvin (e.g. 298.1)")
    process_temperature: float = Field(..., description="Process temperature in Kelvin (e.g. 308.6)")
    rotational_speed: float = Field(..., description="Spindle speed in RPM (e.g. 1551)")
    torque: float = Field(..., description="Torque in Nm (e.g. 42.8)")
    tool_wear: float = Field(..., description="Tool wear in minutes (e.g. 112)")
    machine_type: str = Field("M", description="Type: L, M, or H")
    vibration: Optional[float] = Field(0.85, description="Vibration RMS in mm/s")

class SensorReadingResponse(SensorReadingBase):
    id: Optional[int] = None
    machine_id: str
    timestamp: datetime.datetime
    acoustic: float = 0.6
    current: float = 12.0
    health_score: float = 95.0
    failure_probability: float = 0.03
    confidence_score: float = 94.0
    anomaly_score: float = 0.02
    is_anomaly: bool = False
    is_simulated: bool = False

    model_config = ConfigDict(from_attributes=True)

# --- Confidence Breakdown ---
class ConfidenceBreakdownResponse(BaseModel):
    confidence_score: float = Field(..., description="Overall confidence percentage (0-100%)")
    confidence_rating: str = Field(..., description="HIGH, MODERATE, or LOW")
    data_quality_score: float = 98.0
    boundary_validity_score: float = 95.0
    stability_score: float = 92.0
    calibration_score: float = 90.0
    data_completeness_pct: float = 98.5
    physical_bound_adherence_pct: float = 96.0
    sensor_stability_index_pct: float = 92.0
    model_calibration_pct: float = 90.0
    explanation: Optional[str] = None
    uncertainty_factors: List[str] = []
    is_low_confidence: bool = False
    status_message: str = "High confidence — telemetry streams verified against physics envelope."

# --- Prescriptive Maintenance Plan ---
class PrescriptiveRecommendationResponse(BaseModel):
    machine_id: str
    machine_name: Optional[str] = None
    failure_risk_pct: float
    risk_level: str
    confidence_score: float
    confidence_rating: str
    has_sufficient_evidence: bool = True
    primary_symptoms: List[str] = []
    recommended_action: str
    action: Optional[str] = None
    target_component: str
    suggested_timeframe: str
    sla_window: Optional[str] = None
    priority: str # "P1-Critical", "P2-Urgent", "P3-Scheduled", "P4-Advisory"
    action_type: str
    justification: str
    parts_required: List[str] = []
    estimated_downtime_minutes: int = 30
    sop_reference: str = "SOP-MECH-001"
    sop_steps: Optional[List[str]] = None
    safety_fallback: Optional[str] = None

# --- Alerts & Maintenance ---
class AlertResponse(BaseModel):
    id: int
    machine_id: str
    timestamp: datetime.datetime
    first_detected: Optional[datetime.datetime] = None
    last_detected: Optional[datetime.datetime] = None
    severity: str # "CRITICAL", "WARNING", "EARLY_WARNING", "INFO"
    reason: str
    contributing_factors: Optional[str] = None
    recommended_action: str
    priority_score: float = 50.0
    occurrence_count: int = 1
    duration_minutes: float = 0.0
    is_transient: bool = False
    suppression_reason: Optional[str] = None
    status: str = "ACTIVE" # "ACTIVE", "ACKNOWLEDGED", "RESOLVED", "SUPPRESSED"
    acknowledged: bool = False
    resolved: bool = False

    model_config = ConfigDict(from_attributes=True)

class AlertAcknowledgeRequest(BaseModel):
    acknowledged: bool = True
    resolved: Optional[bool] = False
    status: Optional[str] = None
    suppression_reason: Optional[str] = None

class MaintenanceActionResponse(BaseModel):
    id: int
    machine_id: str
    timestamp: datetime.datetime
    action_type: str
    maintenance_type: str = "Prescriptive AI Dispatch"
    component: str = "Main Spindle Bearing"
    parts_replaced: str = "SKF 6205 Bearing Assembly"
    failure_reason: Optional[str] = None
    technician: str
    notes: Optional[str] = None
    operating_cycles_at_service: int = 1380
    downtime_avoided_hours: float = 0.0
    cost_savings_est: float = 0.0

    model_config = ConfigDict(from_attributes=True)

# --- Health Timeline & Degradation Insights ---
class HealthTimelinePoint(BaseModel):
    timestamp: str
    time_label: str
    health_score: float
    failure_probability: float
    confidence_score: float
    anomaly_score: float
    torque: float
    temperature: float
    vibration: float
    tool_wear: float

class HealthTimelineResponse(BaseModel):
    machine_id: str
    timeframe: str
    data_points_count: int
    has_sufficient_data: bool
    current_health: Optional[float] = None
    baseline_health: Optional[float] = None
    net_health_change: Optional[float] = None
    net_health_pct_change: Optional[float] = None
    timeline_points: List[HealthTimelinePoint] = []
    trend_insights: List[str] = []

# --- Digital Twin Lite ---
class DigitalTwinState(BaseModel):
    machine_id: str
    name: str
    status: str # "NORMAL", "WARNING", "CRITICAL"
    health_score: float
    failure_risk_pct: float
    confidence_score: float
    temperature_c: float
    vibration_rms: float
    spindle_rpm: float
    spindle_torque: float
    tool_wear_min: float
    subsystems: Dict[str, str]
    spindle_bearing_status: Optional[str] = "NOMINAL"
    thermal_dissipation_status: Optional[str] = "NOMINAL"
    motor_drive_status: Optional[str] = "NOMINAL"
    tool_cutting_status: Optional[str] = "NOMINAL"

# --- Machine Entities ---
class MachineResponse(BaseModel):
    id: str
    name: str
    type: str
    category: str
    location: str
    health_score: float
    failure_probability: float
    confidence_score: float = 94.0
    anomaly_score: float
    risk_level: str
    rul_minutes: float = Field(..., description="Physics-Informed Wear Life in minutes derived from tool wear and operating stress")
    estimated_time_to_risk_minutes: Optional[float] = Field(None, description="Estimated time-to-inspection in minutes")
    wear_life_minutes: Optional[float] = Field(None, description="Decision-support wear life estimate (not certified physical remaining life)")
    top_risk_factor: str
    operating_status: str
    install_date: Optional[datetime.datetime] = None
    operating_cycles: int = 1420
    last_maintenance: datetime.datetime
    next_recommended_maintenance: datetime.datetime
    bearing_replacement_days_ago: int = 42
    tool_replacement_days_ago: int = 5
    data_completeness_pct: float = 98.5
    sensor_quality_status: str = "Good"
    current_readings: Optional[SensorReadingBase] = None

    model_config = ConfigDict(from_attributes=True)

class MachineDetailResponse(MachineResponse):
    confidence_breakdown: Optional[ConfidenceBreakdownResponse] = None
    confidence_details: Optional[Dict[str, Any]] = None
    prescriptive_plan: Optional[PrescriptiveRecommendationResponse] = None
    prescriptive_action: Optional[PrescriptiveRecommendationResponse] = None
    digital_twin: Optional[DigitalTwinState] = None
    recent_readings: List[SensorReadingResponse] = []
    active_alerts: List[AlertResponse] = []
    maintenance_history: List[MaintenanceActionResponse] = []

    model_config = ConfigDict(from_attributes=True)

# --- Fleet Summary ---
class FleetSummaryResponse(BaseModel):
    total_machines: int
    healthy_machines: int
    stable_machines: int
    warning_machines: int
    critical_machines: int
    average_health_score: float
    average_confidence_score: float = 91.5
    predicted_failures_count: int
    active_alerts_count: int
    avoidable_downtime_hours_est: float
    cost_savings_est_usd: float
    fleet_health_distribution: Dict[str, int]
    top_critical_machines: List[MachineResponse]

# --- Inference & Prediction ---
class PredictRequest(SensorReadingBase):
    machine_id: Optional[str] = "M-017"

class SHAPFeatureContribution(BaseModel):
    feature: str
    value: Any
    shap_value: float
    impact: str # "INCREASES_RISK", "DECREASES_RISK", "NEUTRAL"
    description: str

class PredictResponse(BaseModel):
    machine_id: str
    failure_predicted: bool
    failure_probability: float
    health_score: float
    anomaly_score: float
    is_anomaly: bool
    risk_level: str
    estimated_rul_minutes: float = Field(..., description="Physics-Informed Wear Life in minutes derived from wear and operating-stress model")
    estimated_time_to_risk_minutes: Optional[float] = Field(None, description="Estimated time-to-inspection in minutes")
    wear_life_minutes: Optional[float] = Field(None, description="Decision-support wear life estimate (not certified physical remaining life)")
    predicted_failure_mode: str
    top_positive_contributors: List[SHAPFeatureContribution] = []
    top_negative_contributors: List[SHAPFeatureContribution] = []
    all_contributions: List[SHAPFeatureContribution] = []
    maintenance_recommendation: str
    confidence_level: float
    confidence_breakdown: ConfidenceBreakdownResponse
    prescriptive_plan: PrescriptiveRecommendationResponse

# --- What-If Simulation ---
class SimulationRequest(BaseModel):
    machine_id: Optional[str] = "M-017"
    air_temperature: float = 300.0
    process_temperature: float = 310.0
    rotational_speed: float = 1500.0
    torque: float = 40.0
    tool_wear: float = 60.0
    machine_type: str = "M"
    vibration: Optional[float] = None

class StateComparison(BaseModel):
    health_score: float
    failure_probability: float
    confidence_score: float = 90.0
    anomaly_score: float
    risk_level: str
    estimated_rul_minutes: float = Field(..., description="Physics-Informed Wear Life in minutes")
    estimated_time_to_risk_minutes: Optional[float] = Field(None, description="Estimated time-to-inspection in minutes")
    wear_life_minutes: Optional[float] = Field(None, description="Decision-support wear life estimate (not certified physical remaining life)")
    top_risk_factor: str

class SimulationResponse(BaseModel):
    machine_id: str
    current_state: StateComparison
    simulated_state: StateComparison
    delta_health_score: float
    delta_failure_probability: float
    delta_confidence_score: float
    delta_anomaly_score: float
    risk_direction: str # "DEGRADED", "IMPROVED", "UNCHANGED"
    what_changed: List[Dict[str, Any]] = []
    recommendation: str
    prescriptive_plan: PrescriptiveRecommendationResponse
    disclaimer: str = "Simulation is a decision-support prototype and not a substitute for certified industrial safety procedures."

# --- Explainability ---
class SHAPExplanationResponse(BaseModel):
    machine_id: str
    base_value: float
    prediction_value: float
    failure_probability: float
    confidence_score: float
    risk_level: str
    contributions: List[SHAPFeatureContribution]
    narrative_explanation: str

class GlobalSHAPResponse(BaseModel):
    selected_model: str
    global_feature_importance: List[Dict[str, Any]]
    feature_correlation_matrix: Dict[str, Dict[str, float]]
    model_comparison_metrics: Dict[str, Any]

# --- Copilot ---
class CopilotQueryRequest(BaseModel):
    query: str
    machine_id: Optional[str] = None
    session_id: Optional[str] = "default-session"

class CopilotQueryResponse(BaseModel):
    query: str
    answer: str
    intent_detected: str
    referenced_machines: List[str] = []
    referenced_metrics: Dict[str, Any] = {}
    grounded_evidence: List[str] = []
    has_insufficient_data: bool = False
    timestamp: datetime.datetime = Field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc))

# --- Demo Scenario ---
class DemoScenarioStepResponse(BaseModel):
    step: int
    step_name: str
    description: str
    machine_id: str
    readings: SensorReadingBase
    prediction: PredictResponse
    triggered_alert: Optional[AlertResponse] = None
    system_status: str
