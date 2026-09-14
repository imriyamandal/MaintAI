import os
import json
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Tuple, Optional
from ..schemas.schemas import (
    SHAPFeatureContribution, PredictResponse, SimulationResponse,
    StateComparison, ConfidenceBreakdownResponse, PrescriptiveRecommendationResponse,
    DigitalTwinState
)
from ..services.confidence_service import ConfidenceService
from ..services.prescriptive_service import PrescriptiveService

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
MODELS_DIR = os.path.join(BASE_DIR, "models")
DATA_DIR = os.path.join(BASE_DIR, "data")

class MLEngine:
    _instance = None

    def __init__(self):
        self.models = {}
        self.scaler = None
        self.iso_forest = None
        self.rul_model = None
        self.shap_explainer = None
        self.metadata = {}
        self.confidence_service = ConfidenceService()
        self.prescriptive_service = PrescriptiveService()
        self.feature_cols = [
            'air_temperature',
            'process_temperature',
            'rotational_speed',
            'torque',
            'tool_wear',
            'temp_diff',
            'power',
            'overstrain_index',
            'heat_dissipation_risk',
            'torque_rpm_ratio',
            'type_l',
            'type_m',
            'type_h'
        ]
        self.load_artifacts()

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = MLEngine()
        return cls._instance

    def load_artifacts(self):
        try:
            if os.path.exists(os.path.join(MODELS_DIR, "xgboost.joblib")):
                self.models['xgboost'] = joblib.load(os.path.join(MODELS_DIR, "xgboost.joblib"))
            if os.path.exists(os.path.join(MODELS_DIR, "random_forest.joblib")):
                self.models['random_forest'] = joblib.load(os.path.join(MODELS_DIR, "random_forest.joblib"))
            if os.path.exists(os.path.join(MODELS_DIR, "gradient_boosting.joblib")):
                self.models['gradient_boosting'] = joblib.load(os.path.join(MODELS_DIR, "gradient_boosting.joblib"))
            if os.path.exists(os.path.join(MODELS_DIR, "logistic_regression.joblib")):
                self.models['logistic_regression'] = joblib.load(os.path.join(MODELS_DIR, "logistic_regression.joblib"))
            if os.path.exists(os.path.join(MODELS_DIR, "scaler.joblib")):
                self.scaler = joblib.load(os.path.join(MODELS_DIR, "scaler.joblib"))
            if os.path.exists(os.path.join(MODELS_DIR, "isolation_forest.joblib")):
                self.iso_forest = joblib.load(os.path.join(MODELS_DIR, "isolation_forest.joblib"))
            if os.path.exists(os.path.join(MODELS_DIR, "rul_model.joblib")):
                self.rul_model = joblib.load(os.path.join(MODELS_DIR, "rul_model.joblib"))
            if os.path.exists(os.path.join(MODELS_DIR, "shap_explainer.joblib")):
                self.shap_explainer = joblib.load(os.path.join(MODELS_DIR, "shap_explainer.joblib"))
            if os.path.exists(os.path.join(MODELS_DIR, "model_metadata.json")):
                with open(os.path.join(MODELS_DIR, "model_metadata.json"), "r") as f:
                    self.metadata = json.load(f)
            print("[MLEngine] Artifacts loaded successfully.")
        except Exception as e:
            print(f"[MLEngine] Warning: Error loading artifacts: {e}")

    def prepare_features(self, reading_dict: Dict[str, Any]) -> pd.DataFrame:
        air_temp = float(reading_dict.get('air_temperature', 300.0))
        proc_temp = float(reading_dict.get('process_temperature', 310.0))
        rpm = float(reading_dict.get('rotational_speed', 1500.0))
        torque = float(reading_dict.get('torque', 40.0))
        tool_wear = float(reading_dict.get('tool_wear', 60.0))
        m_type = str(reading_dict.get('machine_type', 'M')).upper()

        temp_diff = proc_temp - air_temp
        power = torque * rpm * (2 * np.pi / 60)
        overstrain = torque * tool_wear
        heat_risk = rpm / (temp_diff + 1e-3)
        torque_rpm = torque / (rpm + 1e-3)

        type_l = 1.0 if m_type == 'L' else 0.0
        type_m = 1.0 if m_type == 'M' else 0.0
        type_h = 1.0 if m_type == 'H' else 0.0

        row = {
            'air_temperature': air_temp,
            'process_temperature': proc_temp,
            'rotational_speed': rpm,
            'torque': torque,
            'tool_wear': tool_wear,
            'temp_diff': temp_diff,
            'power': power,
            'overstrain_index': overstrain,
            'heat_dissipation_risk': heat_risk,
            'torque_rpm_ratio': torque_rpm,
            'type_l': type_l,
            'type_m': type_m,
            'type_h': type_h
        }
        return pd.DataFrame([row])[self.feature_cols]

    def calculate_health_score(self, failure_prob: float, anomaly_score: float, row_dict: Dict[str, float]) -> float:
        """
        Composite Health Score Formula (0 - 100):
        Health = 100 * [0.45*(1 - failure_prob) + 0.25*(1 - anomaly_score) + 0.30*(1 - envelope_deviation)]
        """
        dev = 0.0
        temp_diff = row_dict.get('process_temperature', 310.0) - row_dict.get('air_temperature', 300.0)
        if temp_diff < 8.6 or temp_diff > 13.0:
            dev += 0.25
        rpm = row_dict.get('rotational_speed', 1500.0)
        if rpm < 1350 or rpm > 2000:
            dev += 0.25
        torque = row_dict.get('torque', 40.0)
        if torque > 55.0 or torque < 20.0:
            dev += 0.25
        tool_wear = row_dict.get('tool_wear', 60.0)
        if tool_wear > 200.0:
            dev += 0.25
            
        envelope_dev = min(1.0, dev)

        raw_health = 100.0 * (
            0.45 * (1.0 - failure_prob) +
            0.25 * (1.0 - anomaly_score) +
            0.30 * (1.0 - envelope_dev)
        )
        return float(np.round(np.clip(raw_health, 0.0, 100.0), 1))

    def diagnose_failure_mode(self, row_dict: Dict[str, Any], failure_prob: float) -> str:
        air_temp = float(row_dict.get('air_temperature', 300.0))
        proc_temp = float(row_dict.get('process_temperature', 310.0))
        rpm = float(row_dict.get('rotational_speed', 1500.0))
        torque = float(row_dict.get('torque', 40.0))
        tool_wear = float(row_dict.get('tool_wear', 60.0))
        m_type = str(row_dict.get('machine_type', 'M')).upper()

        temp_diff = proc_temp - air_temp
        power = torque * rpm * (2 * np.pi / 60)
        prod = tool_wear * torque
        limit = 11000 if m_type == 'L' else (12000 if m_type == 'M' else 13000)

        modes = []
        if tool_wear > 200:
            modes.append("Tool Wear Failure (TWF)")
        if temp_diff < 8.6 and rpm < 1380:
            modes.append("Heat Dissipation Failure (HDF)")
        if power < 3500 or power > 9000:
            modes.append("Power Overload/Deficit Failure (PWF)")
        if prod > limit:
            modes.append("Mechanical Overstrain Failure (OSF)")

        if not modes:
            if failure_prob > 0.4:
                return "Bearing Degradation & Multi-Factor Anomaly"
            return "Nominal Operation (Optimal State)"
        return " + ".join(modes)

    def predict(
        self,
        reading_dict: Dict[str, Any],
        machine_id: str = "M-017",
        maintenance_context: Optional[Dict[str, Any]] = None,
        recent_probabilities: Optional[List[float]] = None,
        compute_shap: bool = True
    ) -> PredictResponse:
        X_df = self.prepare_features(reading_dict)
        model = self.models.get('xgboost') or self.models.get('random_forest')
        
        if model is None:
            failure_prob = 0.05
            is_anomaly = False
            anomaly_score = 0.04
            rul = 220.0
        else:
            failure_prob = float(model.predict_proba(X_df)[0][1])
            if self.iso_forest is not None:
                raw_score = self.iso_forest.score_samples(X_df)[0]
                anomaly_score = float(np.clip(((-raw_score) - 0.40) * 3.0, 0.0, 1.0))
                is_anomaly = bool(anomaly_score > 0.50 or self.iso_forest.predict(X_df)[0] == -1)
            else:
                anomaly_score = float(np.clip(failure_prob * 0.8, 0.0, 1.0))
                is_anomaly = anomaly_score > 0.5

            if self.rul_model is not None:
                rul = float(np.round(self.rul_model.predict(X_df)[0], 1))
            else:
                rul = float(np.round(max(0.0, 250.0 - reading_dict.get('tool_wear', 60.0)), 1))

        health_score = self.calculate_health_score(failure_prob, anomaly_score, reading_dict)

        if health_score >= 88:
            risk_level = "Healthy"
        elif health_score >= 70:
            risk_level = "Stable"
        elif health_score >= 45:
            risk_level = "Warning"
        else:
            risk_level = "Critical"

        failure_predicted = bool(failure_prob >= 0.50 or risk_level == "Critical")
        failure_mode = self.diagnose_failure_mode(reading_dict, failure_prob)

        # Compute SHAP explanation
        contributions = []
        top_pos = []
        top_neg = []
        if compute_shap and self.shap_explainer is not None:
            try:
                shap_vals = self.shap_explainer.shap_values(X_df)[0]
                for col, val, s_val in zip(self.feature_cols, X_df.iloc[0], shap_vals):
                    impact = "INCREASES_RISK" if s_val > 0.01 else ("DECREASES_RISK" if s_val < -0.01 else "NEUTRAL")
                    desc = f"{col} = {val:.2f} ({impact.replace('_', ' ').title()})"
                    item = SHAPFeatureContribution(
                        feature=col,
                        value=float(np.round(val, 2)),
                        shap_value=float(np.round(s_val, 4)),
                        impact=impact,
                        description=desc
                    )
                    contributions.append(item)
                    if s_val > 0.01:
                        top_pos.append(item)
                    elif s_val < -0.01:
                        top_neg.append(item)
            except Exception as e:
                print(f"[MLEngine] SHAP computation error: {e}")

        top_pos.sort(key=lambda x: x.shap_value, reverse=True)
        top_neg.sort(key=lambda x: x.shap_value)

        # Compute Defensible Multi-Factor AI Confidence
        conf_dict = self.confidence_service.compute_confidence(
            reading_dict=reading_dict,
            failure_prob=failure_prob,
            recent_probabilities=recent_probabilities
        )
        conf_breakdown = ConfidenceBreakdownResponse(**conf_dict)

        # Generate Structured Prescriptive Recommendation
        prescriptive_dict = self.prescriptive_service.generate_prescriptive_plan(
            machine_id=machine_id,
            health_score=health_score,
            failure_prob=failure_prob,
            risk_level=risk_level,
            confidence_info=conf_dict,
            diagnosed_mode=failure_mode,
            shap_pos_contributors=top_pos,
            telemetry=reading_dict,
            maintenance_context=maintenance_context
        )
        prescriptive_plan = PrescriptiveRecommendationResponse(**prescriptive_dict)

        return PredictResponse(
            machine_id=machine_id,
            failure_predicted=failure_predicted,
            failure_probability=round(failure_prob, 4),
            health_score=health_score,
            anomaly_score=round(anomaly_score, 4),
            is_anomaly=is_anomaly,
            risk_level=risk_level,
            estimated_rul_minutes=rul,
            estimated_time_to_risk_minutes=rul,
            wear_life_minutes=rul,
            predicted_failure_mode=failure_mode,
            top_positive_contributors=top_pos[:4],
            top_negative_contributors=top_neg[:4],
            all_contributions=contributions,
            maintenance_recommendation=prescriptive_plan.recommended_action,
            confidence_level=round(conf_breakdown.confidence_score / 100.0, 4),
            confidence_breakdown=conf_breakdown,
            prescriptive_plan=prescriptive_plan
        )

    def simulate(
        self,
        current_dict: Dict[str, Any],
        sim_dict: Dict[str, Any],
        machine_id: str = "M-017",
        maintenance_context: Optional[Dict[str, Any]] = None
    ) -> SimulationResponse:
        current_pred = self.predict(current_dict, machine_id=machine_id, maintenance_context=maintenance_context)
        sim_pred = self.predict(sim_dict, machine_id=machine_id, maintenance_context=maintenance_context)

        curr_top = current_pred.top_positive_contributors[0].feature if current_pred.top_positive_contributors else "Nominal"
        sim_top = sim_pred.top_positive_contributors[0].feature if sim_pred.top_positive_contributors else "Nominal"

        curr_state = StateComparison(
            health_score=current_pred.health_score,
            failure_probability=current_pred.failure_probability,
            confidence_score=current_pred.confidence_breakdown.confidence_score,
            anomaly_score=current_pred.anomaly_score,
            risk_level=current_pred.risk_level,
            estimated_rul_minutes=current_pred.estimated_rul_minutes,
            estimated_time_to_risk_minutes=current_pred.estimated_rul_minutes,
            wear_life_minutes=current_pred.estimated_rul_minutes,
            top_risk_factor=curr_top
        )

        sim_state = StateComparison(
            health_score=sim_pred.health_score,
            failure_probability=sim_pred.failure_probability,
            confidence_score=sim_pred.confidence_breakdown.confidence_score,
            anomaly_score=sim_pred.anomaly_score,
            risk_level=sim_pred.risk_level,
            estimated_rul_minutes=sim_pred.estimated_rul_minutes,
            estimated_time_to_risk_minutes=sim_pred.estimated_rul_minutes,
            wear_life_minutes=sim_pred.estimated_rul_minutes,
            top_risk_factor=sim_top
        )

        delta_health = round(sim_pred.health_score - current_pred.health_score, 1)
        delta_fail = round(sim_pred.failure_probability - current_pred.failure_probability, 4)
        delta_conf = round(sim_pred.confidence_breakdown.confidence_score - current_pred.confidence_breakdown.confidence_score, 1)
        delta_anom = round(sim_pred.anomaly_score - current_pred.anomaly_score, 4)

        param_labels = {
            'tool_wear': 'Tool Wear [min]',
            'torque': 'Spindle Torque [Nm]',
            'rotational_speed': 'Rotational Speed [RPM]',
            'process_temperature': 'Process Temp [K]',
            'air_temperature': 'Air Temp [K]',
            'vibration': 'Vibration [mm/s]'
        }
        changes = []
        for key, label in param_labels.items():
            c_val = float(current_dict.get(key, 0.0))
            s_val = float(sim_dict.get(key, 0.0))
            diff = s_val - c_val
            if abs(diff) > 0.01:
                pct = (diff / max(0.01, abs(c_val))) * 100
                changes.append({
                    'feature': label,
                    'key': key,
                    'baseline': round(c_val, 2),
                    'simulated': round(s_val, 2),
                    'delta': round(diff, 2),
                    'pct_shift': round(pct, 1),
                    'abs_pct': abs(pct),
                    'desc': f"{label}: {c_val:.1f} → {s_val:.1f} ({'+' if diff > 0 else ''}{diff:.1f}, {'+' if pct > 0 else ''}{pct:.1f}%)"
                })

        changes.sort(key=lambda x: x['abs_pct'], reverse=True)
        what_changed = changes[:3]
        if not what_changed:
            what_changed = [{
                'feature': 'Nominal Parameters',
                'key': 'nominal',
                'baseline': 0.0,
                'simulated': 0.0,
                'delta': 0.0,
                'pct_shift': 0.0,
                'abs_pct': 0.0,
                'desc': "Operating parameters maintained at nominal baseline setpoints."
            }]

        if delta_health < -2.0 or delta_fail > 0.05:
            direction = "DEGRADED"
        elif delta_health > 2.0 or delta_fail < -0.05:
            direction = "IMPROVED"
        else:
            direction = "UNCHANGED"

        return SimulationResponse(
            machine_id=machine_id,
            current_state=curr_state,
            simulated_state=sim_state,
            delta_health_score=delta_health,
            delta_failure_probability=delta_fail,
            delta_confidence_score=delta_conf,
            delta_anomaly_score=delta_anom,
            risk_direction=direction,
            what_changed=what_changed,
            recommendation=sim_pred.prescriptive_plan.recommended_action,
            prescriptive_plan=sim_pred.prescriptive_plan,
            disclaimer="Simulation is a decision-support prototype and not a substitute for certified industrial safety procedures."
        )

    def build_digital_twin_state(
        self,
        machine_id: str,
        machine_name: str,
        telemetry: Dict[str, Any],
        prediction: PredictResponse
    ) -> DigitalTwinState:
        """
        Constructs real-time subsystem state status for Digital Twin Lite
        """
        air_temp = float(telemetry.get('air_temperature', 300.0))
        proc_temp = float(telemetry.get('process_temperature', 310.0))
        rpm = float(telemetry.get('rotational_speed', 1500.0))
        torque = float(telemetry.get('torque', 40.0))
        tool_wear = float(telemetry.get('tool_wear', 60.0))
        vibration = float(telemetry.get('vibration', 0.8))

        temp_diff = proc_temp - air_temp

        # Subsystems evaluation
        # 1. Spindle Motor
        motor_status = "NORMAL"
        if torque > 58.0 or torque < 18.0:
            motor_status = "CRITICAL" if torque > 65.0 else "WARNING"

        # 2. Bearing Assembly
        bearing_status = "NORMAL"
        if vibration > 1.3 or proc_temp > 313.0:
            bearing_status = "CRITICAL" if vibration > 1.8 else "WARNING"

        # 3. Tooling Cartridge
        tool_status = "NORMAL"
        if tool_wear > 180.0:
            tool_status = "CRITICAL" if tool_wear > 215.0 else "WARNING"

        # 4. Cooling Loop & Heat Exchanger
        cooling_status = "NORMAL"
        if temp_diff < 8.6 or proc_temp > 314.0:
            cooling_status = "WARNING" if temp_diff < 8.6 else "CRITICAL"

        # 5. Drive & Guideways
        drive_status = "NORMAL"
        if rpm < 1350 or rpm > 2200:
            drive_status = "WARNING"

        overall_status = "NORMAL"
        if prediction.risk_level == "Critical" or any(s == "CRITICAL" for s in [motor_status, bearing_status, tool_status]):
            overall_status = "CRITICAL"
        elif prediction.risk_level in ["Warning", "Stable"] or any(s == "WARNING" for s in [motor_status, bearing_status, tool_status, cooling_status]):
            overall_status = "WARNING"

        return DigitalTwinState(
            machine_id=machine_id,
            name=machine_name,
            status=overall_status,
            health_score=prediction.health_score,
            failure_risk_pct=round(prediction.failure_probability * 100, 1),
            confidence_score=prediction.confidence_breakdown.confidence_score,
            temperature_c=round(proc_temp - 273.15, 1),
            vibration_rms=round(vibration, 3),
            spindle_rpm=round(rpm, 0),
            spindle_torque=round(torque, 1),
            tool_wear_min=round(tool_wear, 0),
            subsystems={
                "spindle_motor": motor_status,
                "bearing_assembly": bearing_status,
                "tooling_cartridge": tool_status,
                "cooling_loop": cooling_status,
                "drive_guideways": drive_status
            }
        )

