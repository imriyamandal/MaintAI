import re
import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from ..database.models import Machine, SensorReading, AlertEvent, MaintenanceAction, HealthHistory
from ..ml.engine import MLEngine
from ..schemas.schemas import CopilotQueryResponse
from .health_timeline_service import HealthTimelineService

class CopilotService:
    def __init__(self):
        self.ml = MLEngine.get_instance()
        self.timeline_service = HealthTimelineService()

    def process_query(self, query: str, machine_id: Optional[str], db: Session) -> CopilotQueryResponse:
        q_clean = query.strip()
        q_lower = q_clean.lower()
        
        # 1. Identify machine ID if mentioned in query or passed as context
        m_match = re.search(r'\b(m[-\s]?\d{2,3})\b', q_lower)
        target_machine_id = machine_id
        if m_match:
            raw_id = m_match.group(1).upper().replace(" ", "-")
            if not raw_id.startswith("M-"):
                raw_id = f"M-{raw_id[1:]}"
            target_machine_id = raw_id

        # 2. Maintenance Memory & Component History Queries
        if any(w in q_lower for w in ["bearing", "part", "replaced", "repair", "history", "installed", "cycle", "when was"]):
            if target_machine_id:
                return self._handle_maintenance_history_query(target_machine_id, q_clean, db)

        # 3. Trend & Multi-Day Change Queries (e.g. "what changed over last 14 days", "compare today vs 7 days")
        if any(w in q_lower for w in ["changed", "degradation", "timeline", "trend", "last 7 days", "last 14 days", "last 30 days", "last 24 hours", "compare"]):
            if target_machine_id:
                return self._handle_trend_comparison_query(target_machine_id, q_clean, db)

        # 4. Confidence & Uncertainty Inquiries (e.g. "why is confidence low?", "confidence score")
        if any(w in q_lower for w in ["confidence", "uncertainty", "trust", "reliable"]):
            if target_machine_id:
                return self._handle_confidence_query(target_machine_id, q_clean, db)

        # 5. Prescriptive Maintenance Action Inquiries (e.g. "what should we do next?", "recommended action")
        if any(w in q_lower for w in ["what to do", "what should", "recommend", "action", "sla", "next step", "how to fix"]):
            if target_machine_id:
                return self._handle_prescriptive_query(target_machine_id, q_clean, db)

        # 6. Why is machine at risk / root cause
        if any(w in q_lower for w in ["why", "risk", "root cause", "contributor", "cause", "explain"]):
            if target_machine_id:
                return self._handle_why_at_risk(target_machine_id, q_clean, db)
            else:
                return self._handle_fleet_risk_summary(q_clean, db)

        # 7. Which machines require attention first / ranking / critical
        if any(w in q_lower for w in ["attention", "priority", "critical", "which machine", "rank", "urgent", "failing"]):
            return self._handle_machines_requiring_attention(q_clean, db)

        # 8. What-if / simulation
        if any(w in q_lower for w in ["what if", "what happens", "if torque", "if rpm", "if temp", "increase", "decrease"]):
            return self._handle_what_if_query(q_clean, target_machine_id, db)

        # 9. Fleet summary / overview / today's health
        if any(w in q_lower for w in ["fleet summary", "machine health summary", "today's health", "todays health", "today's machine health", "fleet health", "plant health", "fleet status", "summarize today", "summarize fleet", "overall status", "how is the fleet"]):
            return self._handle_fleet_summary(q_clean, db)

        # 10. Specific sensor reading query
        if any(w in q_lower for w in ["temperature", "rpm", "speed", "torque", "tool wear", "vibration", "reading"]):
            if target_machine_id:
                return self._handle_sensor_query(target_machine_id, q_clean, db)

        # Fallback for unanswerable / out of domain queries
        return CopilotQueryResponse(
            query=q_clean,
            answer="I don't have enough telemetry data or domain context to determine that. I can provide grounded diagnostic analysis for machine health, SHAP risk drivers, maintenance memory, confidence quantification, and prescriptive action orders.",
            intent_detected="UNKNOWN_OR_INSUFFICIENT_DATA",
            referenced_machines=[],
            referenced_metrics={},
            grounded_evidence=["Query is out of scope or requested parameters are not registered in telemetry."],
            has_insufficient_data=True
        )

    def _handle_maintenance_history_query(self, machine_id: str, query: str, db: Session) -> CopilotQueryResponse:
        machine = db.query(Machine).filter(Machine.id == machine_id).first()
        if not machine:
            return self._not_found_response(machine_id, query)

        events = (
            db.query(MaintenanceAction)
            .filter(MaintenanceAction.machine_id == machine_id)
            .order_by(MaintenanceAction.timestamp.desc())
            .limit(5)
            .all()
        )

        evidence = [
            f"Machine: {machine.id} ({machine.name})",
            f"Install Date: {machine.install_date.strftime('%Y-%m-%d') if machine.install_date else 'N/A'}",
            f"Operating Cycles: {machine.operating_cycles}",
            f"Bearing Replaced: {machine.bearing_replacement_days_ago} days ago",
            f"Tool Replaced: {machine.tool_replacement_days_ago} days ago"
        ]

        event_lines = []
        for e in events:
            event_lines.append(f"- **{e.timestamp.strftime('%Y-%m-%d')}** [{e.maintenance_type}]: {e.action_type} (Parts: `{e.parts_replaced}`). Notes: *{e.notes or 'None'}*")

        answer = (
            f"**Maintenance Memory Registry for {machine.id} ({machine.name}):**\n\n"
            f"• **Bearing Assembly Status:** Replaced **{machine.bearing_replacement_days_ago} days ago** (Component: Main Spindle Bearing).\n"
            f"• **Tooling Cartridge Status:** Replaced **{machine.tool_replacement_days_ago} days ago**.\n"
            f"• **Total Cumulative Operating Cycles:** `{machine.operating_cycles}` cycles.\n"
            f"• **Last Full Service Date:** `{machine.last_maintenance.strftime('%Y-%m-%d')}`.\n"
            f"• **Next Recommended Service:** `{machine.next_recommended_maintenance.strftime('%Y-%m-%d')}`.\n\n"
            f"**Historical Service Log:**\n"
            + ("\n".join(event_lines) if event_lines else "No previous corrective work orders logged.")
        )

        return CopilotQueryResponse(
            query=query,
            answer=answer,
            intent_detected="MAINTENANCE_MEMORY",
            referenced_machines=[machine.id],
            referenced_metrics={
                "bearing_replacement_days_ago": machine.bearing_replacement_days_ago,
                "tool_replacement_days_ago": machine.tool_replacement_days_ago,
                "operating_cycles": machine.operating_cycles
            },
            grounded_evidence=evidence,
            has_insufficient_data=False
        )

    def _handle_trend_comparison_query(self, machine_id: str, query: str, db: Session) -> CopilotQueryResponse:
        tf = "14d" if "14" in query else ("30d" if "30" in query else ("24h" if "24" in query or "today" in query else "7d"))
        res = self.timeline_service.get_machine_health_timeline(machine_id, tf, db)

        if not res.get("has_sufficient_data"):
            return CopilotQueryResponse(
                query=query,
                answer=f"I don't have enough historical records to calculate degradation trends for {machine_id} over {tf}.",
                intent_detected="TREND_ANALYSIS",
                referenced_machines=[machine_id],
                has_insufficient_data=True
            )

        insights_str = "\n".join([f"- {ins}" for ins in res.get("trend_insights", [])])

        answer = (
            f"**Degradation Trend & Telemetry Trajectory for {machine_id} ({tf.upper()} Window):**\n\n"
            f"• **Baseline Health Score ({tf}):** `{res.get('baseline_health')}/100`\n"
            f"• **Current Health Score (Today):** `{res.get('current_health')}/100`\n"
            f"• **Net Trajectory:** `{res.get('net_health_change'):+.1f} pts` ({res.get('net_health_pct_change'):+.1f}%)\n\n"
            f"**Automated Mathematical Insights:**\n{insights_str}\n\n"
            f"*Summary:* Monitored across {res.get('data_points_count')} recorded telemetry intervals."
        )

        return CopilotQueryResponse(
            query=query,
            answer=answer,
            intent_detected="TREND_ANALYSIS",
            referenced_machines=[machine_id],
            referenced_metrics={
                "net_change": res.get("net_health_change"),
                "net_pct_change": res.get("net_health_pct_change"),
                "current_health": res.get("current_health")
            },
            grounded_evidence=res.get("trend_insights", []),
            has_insufficient_data=False
        )

    def _handle_confidence_query(self, machine_id: str, query: str, db: Session) -> CopilotQueryResponse:
        machine = db.query(Machine).filter(Machine.id == machine_id).first()
        if not machine:
            return self._not_found_response(machine_id, query)

        latest = db.query(SensorReading).filter(SensorReading.machine_id == machine_id).order_by(SensorReading.timestamp.desc()).first()
        r_dict = {
            'air_temperature': latest.air_temperature if latest else 300.0,
            'process_temperature': latest.process_temperature if latest else 310.0,
            'rotational_speed': latest.rotational_speed if latest else 1500.0,
            'torque': latest.torque if latest else 40.0,
            'tool_wear': latest.tool_wear if latest else 60.0,
            'machine_type': machine.type,
            'vibration': latest.vibration if latest else 0.8
        }
        pred = self.ml.predict(r_dict, machine_id=machine_id)
        cb = pred.confidence_breakdown

        factors_str = "\n".join([f"- ⚠️ {f}" for f in cb.uncertainty_factors]) if cb.uncertainty_factors else "- All sensor telemetry within nominal bounds."

        answer = (
            f"**AI Confidence & Trust Quantification for {machine_id}:**\n\n"
            f"• **Overall Confidence Score:** `{cb.confidence_score}%` ({cb.confidence_rating})\n"
            f"• **Data Completeness & Quality:** `{cb.data_quality_score}%`\n"
            f"• **Physical Boundary Validity:** `{cb.boundary_validity_score}%`\n"
            f"• **Prediction Stability:** `{cb.stability_score}%`\n"
            f"• **Model Calibration Factor:** `{cb.calibration_score}%`\n\n"
            f"**Evaluation Status:**\n{cb.status_message}\n\n"
            f"**Telemetry Factors Evaluated:**\n{factors_str}"
        )

        return CopilotQueryResponse(
            query=query,
            answer=answer,
            intent_detected="CONFIDENCE_ANALYSIS",
            referenced_machines=[machine.id],
            referenced_metrics={"confidence_score": cb.confidence_score, "rating": cb.confidence_rating},
            grounded_evidence=[f"Data Quality: {cb.data_quality_score}%", f"Stability: {cb.stability_score}%"],
            has_insufficient_data=False
        )

    def _handle_prescriptive_query(self, machine_id: str, query: str, db: Session) -> CopilotQueryResponse:
        machine = db.query(Machine).filter(Machine.id == machine_id).first()
        if not machine:
            return self._not_found_response(machine_id, query)

        latest = db.query(SensorReading).filter(SensorReading.machine_id == machine_id).order_by(SensorReading.timestamp.desc()).first()
        r_dict = {
            'air_temperature': latest.air_temperature if latest else 300.0,
            'process_temperature': latest.process_temperature if latest else 310.0,
            'rotational_speed': latest.rotational_speed if latest else 1500.0,
            'torque': latest.torque if latest else 40.0,
            'tool_wear': latest.tool_wear if latest else 60.0,
            'machine_type': machine.type,
            'vibration': latest.vibration if latest else 0.8
        }
        m_context = {
            "bearing_replacement_days_ago": machine.bearing_replacement_days_ago,
            "tool_replacement_days_ago": machine.tool_replacement_days_ago
        }
        pred = self.ml.predict(r_dict, machine_id=machine_id, maintenance_context=m_context)
        p = pred.prescriptive_plan

        parts_str = ", ".join(p.parts_required) if p.parts_required else "None"
        symptoms_str = "\n".join([f"- {s}" for s in p.primary_symptoms])

        answer = (
            f"**Prescriptive Maintenance Work Order for {machine.id}:**\n\n"
            f"• **Recommended Action:** **{p.recommended_action}**\n"
            f"• **Priority Level:** `{p.priority}` | **SLA Window:** `{p.suggested_timeframe}`\n"
            f"• **Target Subsystem:** `{p.target_component}`\n"
            f"• **Required Tooling / Parts:** `{parts_str}`\n"
            f"• **Estimated Service Downtime:** `{p.estimated_downtime_minutes} min`\n"
            f"• **SOP Standard:** `{p.sop_reference}`\n\n"
            f"**Engineering Justification:**\n{p.justification}\n\n"
            f"**Detected Symptoms:**\n{symptoms_str}"
        )

        return CopilotQueryResponse(
            query=query,
            answer=answer,
            intent_detected="PRESCRIPTIVE_RECOMMENDATION",
            referenced_machines=[machine.id],
            referenced_metrics={"priority": p.priority, "timeframe": p.suggested_timeframe},
            grounded_evidence=[p.justification, f"Target: {p.target_component}"],
            has_insufficient_data=False
        )

    def _handle_why_at_risk(self, machine_id: str, query: str, db: Session) -> CopilotQueryResponse:
        machine = db.query(Machine).filter(Machine.id == machine_id).first()
        if not machine:
            return self._not_found_response(machine_id, query)

        latest_reading = (
            db.query(SensorReading)
            .filter(SensorReading.machine_id == machine_id)
            .order_by(SensorReading.timestamp.desc())
            .first()
        )

        r_dict = {
            'air_temperature': latest_reading.air_temperature if latest_reading else 300.0,
            'process_temperature': latest_reading.process_temperature if latest_reading else 310.0,
            'rotational_speed': latest_reading.rotational_speed if latest_reading else 1500.0,
            'torque': latest_reading.torque if latest_reading else 40.0,
            'tool_wear': latest_reading.tool_wear if latest_reading else 60.0,
            'machine_type': machine.type,
            'vibration': latest_reading.vibration if latest_reading else 0.8
        }
        m_context = {
            "bearing_replacement_days_ago": machine.bearing_replacement_days_ago,
            "tool_replacement_days_ago": machine.tool_replacement_days_ago
        }

        pred = self.ml.predict(r_dict, machine_id=machine_id, maintenance_context=m_context)

        evidence = [
            f"Health Score: {pred.health_score}/100 (Risk Category: {pred.risk_level})",
            f"Failure Probability: {pred.failure_probability * 100:.1f}%",
            f"AI Confidence: {pred.confidence_breakdown.confidence_score}%",
            f"Bearing Last Replaced: {machine.bearing_replacement_days_ago} days ago",
            f"Diagnosed Mode: {pred.predicted_failure_mode}"
        ]

        top_factors_str = ""
        for idx, contrib in enumerate(pred.top_positive_contributors[:3]):
            evidence.append(f"SHAP Contributor #{idx+1}: {contrib.feature} = {contrib.value} (SHAP: +{contrib.shap_value})")
            top_factors_str += f"\n- **{contrib.feature}** ({contrib.value}): +{contrib.shap_value:.4f} risk contribution."

        answer = (
            f"**Diagnostic Root Cause Analysis for {machine.id} ({machine.name}):**\n\n"
            f"• **Current Health Score:** `{pred.health_score}/100` ({pred.risk_level})\n"
            f"• **Failure Probability:** `{pred.failure_probability*100:.1f}%` (AI Confidence: `{pred.confidence_breakdown.confidence_score}%`)\n"
            f"• **Diagnosed Physical Condition:** `{pred.predicted_failure_mode}`\n\n"
            f"**Primary Risk Drivers (SHAP TreeExplainer Decomposition):**{top_factors_str}\n\n"
            f"**Maintenance Memory Context:**\n"
            f"Main bearing assembly was replaced {machine.bearing_replacement_days_ago} days ago. Current thermal/vibration telemetry indicates active degradation.\n\n"
            f"**Prescriptive Action:**\n{pred.prescriptive_plan.recommended_action} (SLA: {pred.prescriptive_plan.suggested_timeframe})"
        )

        return CopilotQueryResponse(
            query=query,
            answer=answer,
            intent_detected="MACHINE_DIAGNOSTIC",
            referenced_machines=[machine.id],
            referenced_metrics={
                "health_score": pred.health_score,
                "failure_probability": pred.failure_probability,
                "risk_level": pred.risk_level,
                "predicted_failure_mode": pred.predicted_failure_mode
            },
            grounded_evidence=evidence,
            has_insufficient_data=False
        )

    def _handle_machines_requiring_attention(self, query: str, db: Session) -> CopilotQueryResponse:
        critical_machines = (
            db.query(Machine)
            .order_by(Machine.health_score.asc())
            .limit(5)
            .all()
        )

        if not critical_machines:
            return CopilotQueryResponse(
                query=query,
                answer="All monitored equipment in the fleet are operating with healthy status (Health Score > 90).",
                intent_detected="FLEET_PRIORITY",
                grounded_evidence=[],
                has_insufficient_data=False
            )

        machine_lines = []
        ref_ids = []
        evidence = []
        for m in critical_machines:
            ref_ids.append(m.id)
            machine_lines.append(
                f"1. **{m.id}** ({m.category}, {m.location}) — Health: `{m.health_score}/100` | Risk: `{m.risk_level}` | Conf: `{m.confidence_score}%` | Top Factor: `{m.top_risk_factor}`"
            )
            evidence.append(f"{m.id}: Health={m.health_score}, FailureProb={m.failure_probability}, Risk={m.risk_level}")

        answer = (
            f"**Prioritized Equipment Requiring Immediate Maintenance Inspection:**\n\n"
            + "\n".join(machine_lines)
            + "\n\n*Prescriptive Recommendation:* Dispatch technicians to inspect the top-ranked critical units according to their generated SLA windows."
        )

        return CopilotQueryResponse(
            query=query,
            answer=answer,
            intent_detected="FLEET_PRIORITY",
            referenced_machines=ref_ids,
            referenced_metrics={"critical_count": len([m for m in critical_machines if m.health_score < 70])},
            grounded_evidence=evidence,
            has_insufficient_data=False
        )

    def _handle_what_if_query(self, query: str, machine_id: Optional[str], db: Session) -> CopilotQueryResponse:
        target_id = machine_id or "M-017"
        machine = db.query(Machine).filter(Machine.id == target_id).first()
        latest = (
            db.query(SensorReading)
            .filter(SensorReading.machine_id == target_id)
            .order_by(SensorReading.timestamp.desc())
            .first()
        )

        curr_torque = latest.torque if latest else 40.0
        curr_tool = latest.tool_wear if latest else 60.0
        curr_rpm = latest.rotational_speed if latest else 1500.0
        curr_air = latest.air_temperature if latest else 300.0
        curr_proc = latest.process_temperature if latest else 310.0
        curr_vib = latest.vibration if latest else 0.8
        m_type = machine.type if machine else "M"

        sim_torque = curr_torque
        sim_rpm = curr_rpm
        sim_tool = curr_tool
        sim_air = curr_air
        sim_proc = curr_proc
        sim_vib = curr_vib

        t_match = re.search(r'torque\s*(?:increases|to|is|=)?\s*(\d+(?:\.\d+)?)', query.lower())
        if t_match:
            sim_torque = float(t_match.group(1))

        rpm_match = re.search(r'(?:rpm|speed)\s*(?:increases|to|is|=)?\s*(\d+)', query.lower())
        if rpm_match:
            sim_rpm = float(rpm_match.group(1))

        tool_match = re.search(r'(?:wear|tool)\s*(?:increases|to|is|=)?\s*(\d+)', query.lower())
        if tool_match:
            sim_tool = float(tool_match.group(1))

        curr_dict = {
            'air_temperature': curr_air,
            'process_temperature': curr_proc,
            'rotational_speed': curr_rpm,
            'torque': curr_torque,
            'tool_wear': curr_tool,
            'machine_type': m_type,
            'vibration': curr_vib
        }

        sim_dict = {
            'air_temperature': sim_air,
            'process_temperature': sim_proc,
            'rotational_speed': sim_rpm,
            'torque': sim_torque,
            'tool_wear': sim_tool,
            'machine_type': m_type,
            'vibration': sim_vib
        }

        sim_res = self.ml.simulate(curr_dict, sim_dict, machine_id=target_id)

        answer = (
            f"**What-If Simulation Results for {target_id}:**\n\n"
            f"• **Baseline State:** Health `{sim_res.current_state.health_score}/100` | Risk: `{sim_res.current_state.failure_probability*100:.1f}%` (Confidence: `{sim_res.current_state.confidence_score}%`)\n"
            f"• **Simulated State:** Health `{sim_res.simulated_state.health_score}/100` | Risk: `{sim_res.simulated_state.failure_probability*100:.1f}%` (Confidence: `{sim_res.simulated_state.confidence_score}%`)\n"
            f"• **Net Shift:** Health shifted by `{sim_res.delta_health_score:+.1f} pts` (Condition: **{sim_res.risk_direction}**)\n\n"
            f"**Prescriptive Engineering Action:**\n{sim_res.prescriptive_plan.recommended_action} (SLA: {sim_res.prescriptive_plan.suggested_timeframe})\n\n"
            f"> *Note:* {sim_res.disclaimer}"
        )

        return CopilotQueryResponse(
            query=query,
            answer=answer,
            intent_detected="SIMULATION",
            referenced_machines=[target_id],
            referenced_metrics={
                "delta_health": sim_res.delta_health_score,
                "delta_failure_probability": sim_res.delta_failure_probability,
                "simulated_health": sim_res.simulated_state.health_score
            },
            grounded_evidence=[
                f"Simulated Torque: {sim_torque} Nm",
                f"Simulated RPM: {sim_rpm}",
                f"Simulated Tool Wear: {sim_tool} min"
            ],
            has_insufficient_data=False
        )

    def _handle_fleet_summary(self, query: str, db: Session) -> CopilotQueryResponse:
        total = db.query(Machine).count()
        if total == 0:
            return CopilotQueryResponse(
                query=query,
                answer="I don't have enough data to determine that. No machines are currently registered in the database.",
                intent_detected="FLEET_SUMMARY",
                has_insufficient_data=True
            )

        healthy = db.query(Machine).filter(Machine.health_score >= 88).count()
        stable = db.query(Machine).filter(Machine.health_score >= 70, Machine.health_score < 88).count()
        warning = db.query(Machine).filter(Machine.health_score >= 45, Machine.health_score < 70).count()
        critical = db.query(Machine).filter(Machine.health_score < 45).count()

        machines = db.query(Machine).all()
        avg_health = round(sum(m.health_score for m in machines) / total, 1)
        avg_conf = round(sum(m.confidence_score for m in machines) / total, 1)
        active_alerts = db.query(AlertEvent).filter(AlertEvent.resolved == False).count()

        answer = (
            f"**Fleet-Wide Equipment Health Executive Summary:**\n\n"
            f"• **Total Monitored Fleet:** `{total} Units`\n"
            f"• **Fleet Average Health Score:** `{avg_health}/100`\n"
            f"• **Fleet Average AI Confidence:** `{avg_conf}%`\n"
            f"• **Condition Breakdown:**\n"
            f"  - 🟢 **Healthy (88–100):** `{healthy}` machines ({healthy/total*100:.0f}%)\n"
            f"  - 🟡 **Stable (70–87):** `{stable}` machines ({stable/total*100:.0f}%)\n"
            f"  - 🟠 **Warning (45–69):** `{warning}` machines ({warning/total*100:.0f}%)\n"
            f"  - 🔴 **Critical (<45):** `{critical}` machines ({critical/total*100:.0f}%)\n"
            f"• **Active Unresolved Alerts:** `{active_alerts}`\n\n"
            f"Plant reliability is currently operational with {critical} unit(s) requiring immediate prescriptive intervention."
        )

        return CopilotQueryResponse(
            query=query,
            answer=answer,
            intent_detected="FLEET_SUMMARY",
            referenced_machines=[],
            referenced_metrics={
                "total_machines": total,
                "avg_health": avg_health,
                "critical_count": critical,
                "active_alerts": active_alerts
            },
            grounded_evidence=[
                f"Computed across {total} registered production units.",
                f"Active alert count from AlertEvent table = {active_alerts}"
            ],
            has_insufficient_data=False
        )

    def _handle_sensor_query(self, machine_id: str, query: str, db: Session) -> CopilotQueryResponse:
        latest = (
            db.query(SensorReading)
            .filter(SensorReading.machine_id == machine_id)
            .order_by(SensorReading.timestamp.desc())
            .first()
        )
        if not latest:
            return self._not_found_response(machine_id, query)

        answer = (
            f"**Live Telemetry for {machine_id} (Recorded at {latest.timestamp.strftime('%H:%M:%S UTC')}):**\n\n"
            f"• **Air Temperature:** `{latest.air_temperature:.1f} K` ({latest.air_temperature - 273.15:.1f} °C)\n"
            f"• **Process Temperature:** `{latest.process_temperature:.1f} K` ({latest.process_temperature - 273.15:.1f} °C)\n"
            f"• **Rotational Speed:** `{latest.rotational_speed:.0f} RPM`\n"
            f"• **Torque:** `{latest.torque:.1f} Nm`\n"
            f"• **Tool Wear:** `{latest.tool_wear:.0f} min`\n"
            f"• **Vibration RMS:** `{latest.vibration:.3f} mm/s`\n"
            f"• **Current:** `{latest.current:.2f} A`\n"
            f"• **Health Score:** `{latest.health_score}/100` (Confidence: `{latest.confidence_score}%`)"
        )

        return CopilotQueryResponse(
            query=query,
            answer=answer,
            intent_detected="SENSOR_QUERY",
            referenced_machines=[machine_id],
            referenced_metrics={
                "air_temp": latest.air_temperature,
                "torque": latest.torque,
                "tool_wear": latest.tool_wear,
                "health_score": latest.health_score
            },
            grounded_evidence=[f"Telemetry record ID: {latest.id} at {latest.timestamp}"],
            has_insufficient_data=False
        )

    def _not_found_response(self, machine_id: str, query: str) -> CopilotQueryResponse:
        return CopilotQueryResponse(
            query=query,
            answer=f"I don't have enough data to determine that. Machine '{machine_id}' was not found in the active telemetry registry.",
            intent_detected="NOT_FOUND",
            referenced_machines=[machine_id],
            referenced_metrics={},
            grounded_evidence=[],
            has_insufficient_data=True
        )

