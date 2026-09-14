import datetime
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from ..database.models import Machine, SensorReading, AlertEvent, MaintenanceAction, HealthHistory
from ..ml.engine import MLEngine
from ..schemas.schemas import DemoScenarioStepResponse, SensorReadingBase, AlertResponse
from .alert_intelligence_service import AlertIntelligenceService

class DemoScenarioService:
    def __init__(self):
        self.ml = MLEngine.get_instance()
        self.alert_service = AlertIntelligenceService()

    def get_scenario_steps_info(self) -> List[Dict[str, Any]]:
        return [
            {
                "step": 1,
                "name": "Nominal Baseline",
                "badge": "NORMAL",
                "desc": "Machine M-017 operating within optimal envelope. Tool wear low, normal torque and temperature. Health 95/100, Confidence 94%."
            },
            {
                "step": 2,
                "name": "Degradation & Thermal Drift",
                "badge": "EARLY_WARNING",
                "desc": "Gradual tool wear accumulation (185 min) and slight thermal cooling deficit. Health drops to 74, Alert Intelligence sets monitor status."
            },
            {
                "step": 3,
                "name": "Torque Spike & Critical Failure Risk",
                "badge": "CRITICAL",
                "desc": "Severe tool wear (238 min) and load surge (66.0 Nm). Failure risk reaches 82%, Confidence 91%. Prescriptive action generated: Inspect bearing & replace tool."
            },
            {
                "step": 4,
                "name": "Maintenance Intervention & Reset",
                "badge": "RECOVERED",
                "desc": "Prescriptive maintenance executed: Tool replaced, spindle recalibrated. Health restored to 96/100."
            }
        ]

    def execute_step(self, step: int, db: Session) -> DemoScenarioStepResponse:
        machine_id = "M-017"
        machine = db.query(Machine).filter(Machine.id == machine_id).first()
        now = datetime.datetime.now(datetime.timezone.utc)

        m_context = {
            "bearing_replacement_days_ago": machine.bearing_replacement_days_ago if machine else 42,
            "tool_replacement_days_ago": machine.tool_replacement_days_ago if machine else 5,
            "last_maintenance_action": "Spindle Precision Calibration"
        }

        if step == 1:
            step_name = "Nominal Baseline (Normal Operation)"
            desc = "Machine M-017 is running smoothly under standard operating parameters. All physics indicators nominal."
            status = "HEALTHY_BASELINE"
            air_temp = 299.8
            proc_temp = 309.8
            rpm = 1520.0
            torque = 38.5
            tool_wear = 45.0
            vibration = 0.76
            m_status = "RUNNING"

        elif step == 2:
            step_name = "Degradation Phase (Thermal Drift & Tool Wear)"
            desc = "Tool wear has increased to 185 min, and process temperature is drifting. Health score drops into Early Warning band (74/100)."
            status = "WARNING_DEGRADATION"
            air_temp = 302.5
            proc_temp = 311.2 # temp diff reduced -> heat dissipation risk
            rpm = 1440.0
            torque = 48.0
            tool_wear = 185.0
            vibration = 1.35
            m_status = "RUNNING"

        elif step == 3:
            step_name = "Critical Overload & Failure Imminent"
            desc = "Tool wear exceeded 238 min combined with torque surge to 66.0 Nm and thermal deficit. CRITICAL alert & prescriptive work order triggered!"
            status = "CRITICAL_FAILURE_RISK"
            air_temp = 305.5
            proc_temp = 312.5 # Delta T = 7.0 K (< 8.6 K) & RPM = 1320 (< 1380)
            rpm = 1320.0
            torque = 66.0
            tool_wear = 238.0
            vibration = 1.95
            m_status = "WARNING"

        elif step == 4:
            step_name = "Prescriptive Maintenance Intervention & Recovery"
            desc = "Prescriptive work order executed: Carbide cutting insert replaced, coolant flushed, and spindle dynamically recalibrated."
            status = "MAINTENANCE_RESTORED"
            air_temp = 299.5
            proc_temp = 309.5
            rpm = 1530.0
            torque = 38.0
            tool_wear = 5.0 # fresh tool
            vibration = 0.72
            m_status = "RUNNING"

        else:
            step = 1
            step_name = "Nominal Baseline"
            desc = "Reset to baseline."
            status = "HEALTHY_BASELINE"
            air_temp = 299.8
            proc_temp = 309.8
            rpm = 1520.0
            torque = 38.5
            tool_wear = 45.0
            vibration = 0.76
            m_status = "RUNNING"

        reading_dict = {
            'air_temperature': air_temp,
            'process_temperature': proc_temp,
            'rotational_speed': rpm,
            'torque': torque,
            'tool_wear': tool_wear,
            'machine_type': machine.type if machine else "H",
            'vibration': vibration
        }

        pred = self.ml.predict(reading_dict, machine_id=machine_id, maintenance_context=m_context)

        # Update machine state in DB
        if machine:
            machine.health_score = pred.health_score
            machine.failure_probability = pred.failure_probability
            machine.confidence_score = pred.confidence_breakdown.confidence_score
            machine.anomaly_score = pred.anomaly_score
            machine.risk_level = pred.risk_level
            machine.rul_minutes = pred.estimated_rul_minutes
            machine.top_risk_factor = pred.top_positive_contributors[0].feature if pred.top_positive_contributors else "Nominal Operating State"
            machine.operating_status = m_status
            if step == 4:
                machine.tool_replacement_days_ago = 0
                machine.last_maintenance = now
            machine.updated_at = now

        # Record sensor reading in DB
        reading = SensorReading(
            machine_id=machine_id,
            timestamp=now,
            air_temperature=air_temp,
            process_temperature=proc_temp,
            rotational_speed=rpm,
            torque=torque,
            tool_wear=tool_wear,
            vibration=round(vibration, 3),
            acoustic=round(0.55 + (100.0 - pred.health_score) * 0.008, 3),
            current=round(11.5 + (torque / 3.8), 2),
            health_score=pred.health_score,
            failure_probability=pred.failure_probability,
            confidence_score=pred.confidence_breakdown.confidence_score,
            anomaly_score=pred.anomaly_score,
            is_anomaly=pred.is_anomaly,
            is_simulated=True
        )
        db.add(reading)

        # Record health history
        h_hist = HealthHistory(
            machine_id=machine_id,
            timestamp=now,
            health_score=pred.health_score,
            failure_probability=pred.failure_probability,
            confidence_score=pred.confidence_breakdown.confidence_score,
            anomaly_score=pred.anomaly_score,
            risk_level=pred.risk_level
        )
        db.add(h_hist)

        triggered_alert = None
        if step == 1:
            # Baseline: Ensure all prior alerts for M-017 are resolved
            unresolved = db.query(AlertEvent).filter(AlertEvent.machine_id == machine_id, AlertEvent.resolved == False).all()
            for al in unresolved:
                al.resolved = True
                al.acknowledged = True
                al.status = "RESOLVED"

        elif step in [2, 3]:
            alert_event = self.alert_service.evaluate_and_record_alert(
                db=db,
                machine_id=machine_id,
                health_score=pred.health_score,
                failure_prob=pred.failure_probability,
                risk_level=pred.risk_level,
                confidence_info=pred.confidence_breakdown.model_dump(),
                diagnosed_mode=pred.predicted_failure_mode,
                prescriptive_plan=pred.prescriptive_plan.model_dump(),
                is_simulated=True
            )
            if alert_event:
                triggered_alert = AlertResponse.model_validate(alert_event)

        elif step == 4:
            # Resolve pending alerts for M-017
            unresolved = db.query(AlertEvent).filter(AlertEvent.machine_id == machine_id, AlertEvent.resolved == False).all()
            for al in unresolved:
                al.resolved = True
                al.acknowledged = True
                al.status = "RESOLVED"

            # Log maintenance event
            m_event = MaintenanceAction(
                machine_id=machine_id,
                timestamp=now,
                action_type="Prescriptive Tooling Replacement & Spindle Calibration",
                maintenance_type="Prescriptive AI Dispatch",
                component="Spindle Tooling & Bearing Assembly",
                parts_replaced="Sandvik CNMG Carbide Insert Set & Klüber NBU 15 Lubricant",
                failure_reason="Prescriptive alert: Tool wear 238 min & thermal dissipation gradient limit",
                technician="Automated AI Dispatch / Lead Maintenance Specialist",
                notes="Replaced worn carbide insert. Recalibrated spindle runout and verified thermal baseline. Health restored.",
                operating_cycles_at_service=machine.operating_cycles if machine else 1420,
                downtime_avoided_hours=6.5,
                cost_savings_est=18500.0
            )
            db.add(m_event)

        db.commit()

        return DemoScenarioStepResponse(
            step=step,
            step_name=step_name,
            description=desc,
            machine_id=machine_id,
            readings=SensorReadingBase(
                air_temperature=air_temp,
                process_temperature=proc_temp,
                rotational_speed=rpm,
                torque=torque,
                tool_wear=tool_wear,
                machine_type=machine.type if machine else "H",
                vibration=vibration
            ),
            prediction=pred,
            triggered_alert=triggered_alert,
            system_status=status
        )

