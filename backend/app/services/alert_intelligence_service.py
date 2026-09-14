"""
MaintAI Alert Intelligence & False Alarm Reduction Service
Implements intelligent alert deduplication, transient spike suppression, 4-tier risk classification,
persistence tracking, and multi-factor alert prioritization.
"""

import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from ..database.models import AlertEvent, Machine

class AlertIntelligenceService:
    def __init__(self):
        pass

    def evaluate_and_record_alert(
        self,
        db: Session,
        machine_id: str,
        health_score: float,
        failure_prob: float,
        risk_level: str,
        confidence_info: Dict[str, Any],
        diagnosed_mode: str,
        prescriptive_plan: Dict[str, Any],
        is_simulated: bool = False
    ) -> Optional[AlertEvent]:
        """
        Evaluates machine telemetry for alerts:
        1. Filters normal states (no alert needed)
        2. Determines 4-tier severity (CRITICAL, WARNING, EARLY_WARNING, NORMAL)
        3. Checks for existing active alert for deduplication & persistence update
        4. Calculates alert priority score
        """
        now = datetime.datetime.now(datetime.timezone.utc)
        confidence_score = confidence_info.get("confidence_score", 90.0)

        # 1. Determine Alert Severity Tier
        if failure_prob >= 0.70 or health_score < 45.0:
            severity = "CRITICAL"
            sev_weight = 100.0
        elif failure_prob >= 0.40 or health_score < 70.0:
            severity = "WARNING"
            sev_weight = 70.0
        elif failure_prob >= 0.20 or health_score < 85.0:
            severity = "EARLY_WARNING"
            sev_weight = 40.0
        else:
            # Machine is in normal state - no alert required
            # If there was an unresolved alert for this machine, resolve it automatically if health is fully nominal
            if health_score >= 90.0:
                unresolved = (
                    db.query(AlertEvent)
                    .filter(AlertEvent.machine_id == machine_id, AlertEvent.resolved == False)
                    .all()
                )
                for al in unresolved:
                    al.resolved = True
                    al.status = "RESOLVED"
                if unresolved:
                    db.commit()
            return None

        # 2. Check for Existing Active/Unresolved Alert (Deduplication)
        existing_alert = (
            db.query(AlertEvent)
            .filter(
                AlertEvent.machine_id == machine_id,
                AlertEvent.resolved == False,
                AlertEvent.status != "SUPPRESSED"
            )
            .order_by(AlertEvent.timestamp.desc())
            .first()
        )

        reason = f"{diagnosed_mode} detected. Health Score: {health_score}/100"
        recommended_action = prescriptive_plan.get("recommended_action", "Inspect machine telemetry.")
        contributing_str = " | ".join(prescriptive_plan.get("primary_symptoms", ["Telemetry deviation"]))

        # Calculate Priority Score (0 - 100)
        # Priority = (FailureProb * 40) + (Confidence * 25) + (SeverityWeight * 20) + (Persistence * 15)
        persistence_factor = 10.0
        if existing_alert:
            duration = (now - existing_alert.first_detected).total_seconds() / 60.0
            persistence_factor = min(100.0, 10.0 + (duration * 0.5) + (existing_alert.occurrence_count * 5.0))
        
        priority_score = round(
            (failure_prob * 40.0) +
            ((confidence_score / 100.0) * 25.0) +
            ((sev_weight / 100.0) * 20.0) +
            ((persistence_factor / 100.0) * 15.0),
            1
        )

        if existing_alert:
            # Update existing alert rather than creating duplicate
            existing_alert.occurrence_count += 1
            existing_alert.last_detected = now
            existing_alert.duration_minutes = round((now - existing_alert.first_detected).total_seconds() / 60.0, 1)
            existing_alert.severity = severity
            existing_alert.reason = reason
            existing_alert.contributing_factors = contributing_str
            existing_alert.recommended_action = recommended_action
            existing_alert.priority_score = priority_score
            existing_alert.is_transient = bool(existing_alert.occurrence_count < 2 and severity == "EARLY_WARNING")
            db.commit()
            db.refresh(existing_alert)
            return existing_alert

        # 3. Create New Intelligent Alert Record
        is_transient = bool(severity == "EARLY_WARNING")
        new_alert = AlertEvent(
            machine_id=machine_id,
            timestamp=now,
            first_detected=now,
            last_detected=now,
            severity=severity,
            reason=reason,
            contributing_factors=contributing_str,
            recommended_action=recommended_action,
            priority_score=priority_score,
            occurrence_count=1,
            duration_minutes=0.0,
            is_transient=is_transient,
            status="ACTIVE",
            acknowledged=False,
            resolved=False
        )
        db.add(new_alert)
        db.commit()
        db.refresh(new_alert)
        return new_alert

    def get_alert_summary_metrics(self, db: Session) -> Dict[str, Any]:
        """Calculates 4-tier alert KPI counts across the plant"""
        unresolved = db.query(AlertEvent).filter(AlertEvent.resolved == False).all()
        critical_count = sum(1 for a in unresolved if a.severity == "CRITICAL")
        warning_count = sum(1 for a in unresolved if a.severity == "WARNING")
        early_warning_count = sum(1 for a in unresolved if a.severity in ["EARLY_WARNING", "INFO"])
        total_active = len(unresolved)

        return {
            "total_active_alerts": total_active,
            "critical_count": critical_count,
            "warning_count": warning_count,
            "early_warning_count": early_warning_count,
            "suppressed_count": db.query(AlertEvent).filter(AlertEvent.status == "SUPPRESSED").count()
        }
