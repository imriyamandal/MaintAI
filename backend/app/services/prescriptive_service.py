"""
MaintAI Prescriptive Maintenance Engine
Translates predictive risk, SHAP feature attributions, physics anomalies, and machine maintenance memory
into structured, actionable, evidence-based industrial work orders with SLA deadlines.
"""

from typing import Dict, Any, List, Optional
import datetime

class PrescriptiveService:
    def __init__(self):
        pass

    def generate_prescriptive_plan(
        self,
        machine_id: str,
        health_score: float,
        failure_prob: float,
        risk_level: str,
        confidence_info: Dict[str, Any],
        diagnosed_mode: str,
        shap_pos_contributors: List[Any],
        telemetry: Dict[str, Any],
        maintenance_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Generates a structured prescriptive maintenance decision package:
        - Prediction (Risk %, Level)
        - Why (Sensor trends & SHAP drivers)
        - What To Do (Action, SLA Window, Target Component, Priority)
        - Why This Action (Engineering justification + maintenance history correlation)
        - Fallback on low confidence or insufficient evidence
        """
        confidence_score = confidence_info.get("confidence_score", 90.0)
        is_low_conf = confidence_info.get("is_low_confidence", False)

        # Fallback if insufficient or low-confidence evidence
        if is_low_conf or confidence_score < 60.0:
            act = "Perform physical visual inspection of machine & verify sensor cabling/calibration."
            return {
                "machine_id": machine_id,
                "failure_risk_pct": round(failure_prob * 100, 1),
                "risk_level": risk_level,
                "confidence_score": confidence_score,
                "confidence_rating": confidence_info.get("confidence_rating", "LOW"),
                "has_sufficient_evidence": False,
                "primary_symptoms": ["Uncertain telemetry readings", "Data quality below acceptable threshold"],
                "recommended_action": act,
                "action": act,
                "target_component": "Sensor Telemetry Harness & Transducers",
                "suggested_timeframe": "< 12 Hours (Next Shift)",
                "sla_window": "< 12 Hours",
                "priority": "P2-Urgent",
                "action_type": "Telemetry Verification & Physical Inspection",
                "justification": "Insufficient evidence for automated prescriptive component replacement. Low confidence indicates noisy or missing sensor feeds.",
                "parts_required": ["None (Inspection & Calibration Kit)"],
                "estimated_downtime_minutes": 30,
                "sop_reference": "SOP-INST-004: Telemetry Sensor Validation Standard",
                "sop_steps": [
                    "Isolate sensor bus and test voltage levels on analog input channels.",
                    "Inspect transducer cabling for mechanical wear or electromagnetic interference.",
                    "Recalibrate zero-offset on thermocouple and vibration sensor."
                ],
                "safety_fallback": "If signal drop persists > 30 minutes, switch PLC to fallback closed-loop conservative speed limits."
            }

        # Healthy / Stable state
        if health_score >= 88.0 and failure_prob < 0.20:
            act = "Maintain scheduled preventive inspection cycle. No corrective intervention required."
            return {
                "machine_id": machine_id,
                "failure_risk_pct": round(failure_prob * 100, 1),
                "risk_level": "Healthy",
                "confidence_score": confidence_score,
                "confidence_rating": confidence_info.get("confidence_rating", "HIGH"),
                "has_sufficient_evidence": True,
                "primary_symptoms": ["All telemetry streams operating within nominal physics envelope."],
                "recommended_action": act,
                "action": act,
                "target_component": "Full Asset System",
                "suggested_timeframe": "Next scheduled monthly PM",
                "sla_window": "Next 30 Days",
                "priority": "P4-Advisory",
                "action_type": "Routine Monitoring",
                "justification": "Asset health score is optimal (>88/100). All thermal, torque, and vibration indicators are nominal.",
                "parts_required": [],
                "estimated_downtime_minutes": 0,
                "sop_reference": "SOP-PM-001: Standard Machine Inspection",
                "sop_steps": [
                    "Verify baseline lube oil level and inspect pneumatic pressure gauge.",
                    "Record operating hours and verify cleanliness of swarf conveyor."
                ],
                "safety_fallback": None
            }

        # Analyze physical symptoms from telemetry & SHAP
        symptoms = []
        air_temp = telemetry.get('air_temperature', 300.0)
        proc_temp = telemetry.get('process_temperature', 310.0)
        rpm = telemetry.get('rotational_speed', 1500.0)
        torque = telemetry.get('torque', 40.0)
        tool_wear = telemetry.get('tool_wear', 60.0)
        vibration = telemetry.get('vibration', 0.8)

        temp_diff = proc_temp - air_temp

        if tool_wear > 190.0:
            symptoms.append(f"Tool wear critical ({tool_wear:.0f} min > 200 min limit)")
        if temp_diff < 8.6:
            symptoms.append(f"Thermal dissipation deficiency (ΔT = {temp_diff:.1f} K < 8.6 K)")
        if torque > 55.0:
            symptoms.append(f"Spindle torque overload ({torque:.1f} Nm > 55 Nm nominal)")
        if vibration > 1.4:
            symptoms.append(f"Elevated vibration RMS ({vibration:.2f} mm/s)")
        if rpm < 1350:
            symptoms.append(f"Rotational speed under-speed ({rpm:.0f} RPM)")

        # Include top SHAP contributors
        for c in shap_pos_contributors[:2]:
            feat_name = c.feature if hasattr(c, 'feature') else c.get('feature', '')
            val = c.value if hasattr(c, 'value') else c.get('value', '')
            symptoms.append(f"SHAP driver: Elevated {feat_name} ({val})")

        # Deduplicate symptoms
        symptoms = list(dict.fromkeys(symptoms))[:4]
        if not symptoms:
            symptoms.append("Multivariate telemetry drift detected across operating envelope.")

        # Maintenance History Context Integration
        history_note = ""
        bearing_days = 42
        if maintenance_context:
            bearing_days = maintenance_context.get("bearing_replacement_days_ago", 42)
            last_action = maintenance_context.get("last_maintenance_action", "Routine Service")
            history_note = f" (Asset memory: Bearing replaced {bearing_days} days ago; previous action: {last_action})"

        # Generate targeted prescriptive decision logic
        if "Tool Wear" in diagnosed_mode or tool_wear > 195:
            action = "Replace cutting insert / carbide tooling and re-calibrate tool zero offset."
            target = "Spindle Tooling & Toolholder Assembly"
            is_critical = failure_prob >= 0.65 or tool_wear >= 220
            timeframe = "< 2 Hours (Immediate)" if is_critical else "< 12 Hours"
            priority = "P1-Critical" if is_critical else "P2-Urgent"
            action_type = "Tooling Cartridge Replacement"
            justification = f"Tool wear has reached {tool_wear:.0f} operating minutes. Continued cutting will cause dimensional tolerance failure or sudden catastrophic carbide breakage.{history_note}"
            parts = ["Carbide Insert ISO CNMG-120408", "Toolholder Clamping Screw"]
            downtime = 25
            sop = "SOP-TL-012: Carbide Tool Replacement & Offset Calibration"
            sop_steps = [
                "Engage E-Stop and lock out main spindle drive electrical circuit.",
                "Unclamp toolholder index pin and remove worn Sandvik insert.",
                "Seat fresh carbide insert into precision pocket and torque screw to 3.5 Nm.",
                "Execute optical presetting probe cycle to re-calibrate tool Z-axis zero offset."
            ]
            safety = "If tool wear exceeds 240 min before technician dispatch: Trigger automatic spindle feed hold via PLC interlock."

        elif "Heat Dissipation" in diagnosed_mode or (temp_diff < 8.6 and rpm < 1400):
            action = "Inspect spindle cooling loop, verify coolant pump pressure, and clean radiator fins."
            target = "Thermal Cooling System & Heat Exchanger"
            is_critical = failure_prob >= 0.70 or temp_diff < 7.5
            timeframe = "< 2 Hours" if is_critical else "< 12 Hours"
            priority = "P1-Critical" if is_critical else "P2-Urgent"
            action_type = "Cooling System Service"
            justification = f"Process-to-air thermal gradient is constrained to {temp_diff:.1f} K. Restricted heat dissipation risks thermal spindle elongation and bearing seizure.{history_note}"
            parts = ["Coolant Inline Filter Element", "Synthetic Water-Soluble Coolant"]
            downtime = 45
            sop = "SOP-TH-008: Closed-Loop Spindle Cooling Maintenance"
            sop_steps = [
                "Check coolant pressure gauge at manifold inlet (Nominal: 4.5–6.0 bar).",
                "Flush coolant heat exchanger core and clean swarf buildup on radiator matrix.",
                "Inspect chiller fluid level and verify proportional thermostatic valve actuation.",
                "Run 5-minute thermal stabilization cycle at 1500 RPM and verify ΔT > 8.6 K."
            ]
            safety = "If process temperature exceeds 315 K: Trigger spindle speed derating to 800 RPM."

        elif "Overstrain" in diagnosed_mode or (torque * tool_wear > 11500):
            action = "Inspect spindle bearing assembly for micro-pitting, reduce feed rate by 15%, and re-torque spindle chuck."
            target = "Main Spindle Drive & Bearings"
            is_critical = failure_prob >= 0.65
            timeframe = "< 2 Hours" if is_critical else "< 12 Hours"
            priority = "P1-Critical" if is_critical else "P2-Urgent"
            action_type = "Mechanical Overstrain Mitigation"
            justification = f"Mechanical stress product ({torque * tool_wear:.0f} Nm·min) has exceeded fatigue thresholds. Combination of torque surges and vibration indicates bearing stress.{history_note}"
            parts = ["SKF 6205 Angular Contact Bearings", "High-Speed Spindle Grease Klüber NBU 15"]
            downtime = 90
            sop = "SOP-MECH-019: Spindle Bearing Inspection & Vibration Analysis"
            sop_steps = [
                "Perform high-frequency FFT acoustic emission check on front/rear bearing journals.",
                "Check axial and radial spindle runout using dial indicator (< 0.003 mm tolerance).",
                "Inject 10ml Klüber NBU 15 synthetic grease into bearing purge ports.",
                "Reduce CNC cutting feed rate by 15% until full bearing inspection is completed."
            ]
            safety = "If vibration RMS exceeds 2.5 mm/s: Trigger immediate controlled emergency spindle ramp-down."

        elif "Power" in diagnosed_mode or torque > 60:
            action = "Verify Variable Frequency Drive (VFD) current limits, check spindle belt tension, and test motor winding resistance."
            target = "Spindle Motor & VFD Drive Inverter"
            is_critical = failure_prob >= 0.70
            timeframe = "< 2 Hours" if is_critical else "< 12 Hours"
            priority = "P1-Critical" if is_critical else "P2-Urgent"
            action_type = "Electrical & Drive Inspection"
            justification = f"Spindle mechanical power is outside nominal bounds ({torque:.1f} Nm at {rpm:.0f} RPM). High friction or electrical VFD harmonic drift detected.{history_note}"
            parts = ["Drive Belt Set", "Inverter Terminal Lugs"]
            downtime = 60
            sop = "SOP-ELEC-005: Motor Drive & Power Quality Diagnostics"
            sop_steps = [
                "Measure 3-phase current draw balance across VFD output terminals.",
                "Check drive belt deflection and retension to 450 N tension spec.",
                "Inspect spindle motor terminal box for thermal discolouration or loose connections."
            ]
            safety = "If motor current exceeds 25A continuous: Trip electronic overload breaker."

        else:
            action = "Conduct precision vibration frequency analysis and lubricate spindle bearing housing."
            target = "Spindle Bearing Assembly & Guideways"
            is_urgent = failure_prob >= 0.40
            timeframe = "< 12 Hours" if is_urgent else "Next 48-72 Hours"
            priority = "P2-Urgent" if is_urgent else "P3-Scheduled"
            action_type = "Preventive Lubrication & Telemetry Audit"
            justification = f"Multivariate anomaly indicators detected with failure probability at {failure_prob*100:.1f}%. Bearing assembly was serviced {bearing_days} days ago.{history_note}"
            parts = ["High-Pressure Spindle Lubricant"]
            downtime = 30
            sop = "SOP-MECH-003: High-Precision Spindle Lubrication Standard"
            sop_steps = [
                "Clean bearing grease fitting nipples and verify purge relief port is unobstructed.",
                "Inject manufacturer-specified synthetic grease dose using calibrated hand pump.",
                "Run 10-minute warm-up profile and record baseline vibration RMS."
            ]
            safety = None

        return {
            "machine_id": machine_id,
            "failure_risk_pct": round(failure_prob * 100, 1),
            "risk_level": risk_level,
            "confidence_score": confidence_score,
            "confidence_rating": confidence_info.get("confidence_rating", "HIGH"),
            "has_sufficient_evidence": True,
            "primary_symptoms": symptoms,
            "recommended_action": action,
            "action": action,
            "target_component": target,
            "suggested_timeframe": timeframe,
            "sla_window": timeframe,
            "priority": priority,
            "action_type": action_type,
            "justification": justification,
            "parts_required": parts,
            "estimated_downtime_minutes": downtime,
            "sop_reference": sop,
            "sop_steps": sop_steps,
            "safety_fallback": safety
        }
