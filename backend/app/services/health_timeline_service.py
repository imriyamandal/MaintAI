"""
MaintAI Health Timeline & Degradation Trend Analytics Service
Computes multi-interval time-series degradation trajectories (24h, 7d, 14d, 30d)
and automatically derives statistical trend insights from historical telemetry.
"""

import datetime
from typing import Dict, Any, List, Optional
import numpy as np
from sqlalchemy.orm import Session
from ..database.models import Machine, SensorReading, HealthHistory

class HealthTimelineService:
    def __init__(self):
        pass

    def get_machine_health_timeline(
        self,
        machine_id: str,
        timeframe: str,
        db: Session
    ) -> Dict[str, Any]:
        """
        Retrieves health trajectory points and automatically computes mathematical trend insights.
        Supported timeframes: '24h', '7d', '14d', '30d'
        """
        now = datetime.datetime.now(datetime.timezone.utc)
        days_map = {'24h': 1, '7d': 7, '14d': 14, '30d': 30}
        days = days_map.get(timeframe.lower(), 7)
        start_time = now - datetime.timedelta(days=days)

        # Query health history and sensor readings
        records = (
            db.query(SensorReading)
            .filter(SensorReading.machine_id == machine_id, SensorReading.timestamp >= start_time)
            .order_by(SensorReading.timestamp.asc())
            .all()
        )

        machine = db.query(Machine).filter(Machine.id == machine_id).first()

        if not records:
            # Fallback if no records within window
            return {
                "machine_id": machine_id,
                "timeframe": timeframe,
                "data_points_count": 0,
                "has_sufficient_data": False,
                "message": "Insufficient historical data for selected timeframe.",
                "timeline_points": [],
                "trend_insights": ["Insufficient historical data to calculate multi-day trends."]
            }

        points = []
        for r in records:
            points.append({
                "timestamp": r.timestamp.isoformat(),
                "time_label": r.timestamp.strftime("%b %d %H:%M"),
                "health_score": round(r.health_score, 1),
                "failure_probability": round(r.failure_probability, 4),
                "confidence_score": round(r.confidence_score if hasattr(r, 'confidence_score') and r.confidence_score else 92.0, 1),
                "anomaly_score": round(r.anomaly_score, 4),
                "torque": round(r.torque, 1),
                "temperature": round(r.process_temperature - 273.15, 1),
                "vibration": round(r.vibration, 3),
                "tool_wear": round(r.tool_wear, 0)
            })

        # Calculate mathematical trend insights
        insights = []
        health_series = [p["health_score"] for p in points]
        first_health = health_series[0]
        latest_health = health_series[-1]
        health_delta = latest_health - first_health
        health_pct_change = round(((latest_health - first_health) / max(1.0, first_health)) * 100.0, 1)

        if health_pct_change <= -15.0:
            insights.append(f"Health has declined {abs(health_pct_change):.1f}% over the last {timeframe.upper()}.")
        elif health_pct_change <= -5.0:
            insights.append(f"Gradual health degradation of {abs(health_pct_change):.1f}% detected over {timeframe.upper()}.")
        elif health_pct_change >= 5.0:
            insights.append(f"Equipment health improved by +{health_pct_change:.1f}% following maintenance intervention.")
        else:
            insights.append(f"Equipment health has remained stable (±{abs(health_pct_change):.1f}%) across {timeframe.upper()}.")

        # Vibration trend
        vib_series = [p["vibration"] for p in points]
        if len(vib_series) >= 5:
            first_vib = vib_series[0]
            latest_vib = vib_series[-1]
            if latest_vib > first_vib * 1.25:
                vib_inc_pct = round(((latest_vib - first_vib) / max(0.1, first_vib)) * 100, 1)
                insights.append(f"Vibration RMS increased continuously by +{vib_inc_pct}% across operating intervals.")

        # Warning threshold entry detection
        warning_entries = [p for p in points if p["health_score"] < 70.0]
        if warning_entries:
            first_warn_time = datetime.datetime.fromisoformat(warning_entries[0]["timestamp"])
            if first_warn_time.tzinfo is None:
                first_warn_time = first_warn_time.replace(tzinfo=datetime.timezone.utc)
            hours_ago = round((now - first_warn_time).total_seconds() / 3600.0, 1)
            if hours_ago > 0:
                insights.append(f"Machine entered Warning threshold state {hours_ago} hours ago.")

        # Risk probability trajectory
        prob_series = [p["failure_probability"] for p in points]
        if prob_series[-1] > prob_series[0] + 0.20:
            p_start = round(prob_series[0] * 100, 1)
            p_end = round(prob_series[-1] * 100, 1)
            insights.append(f"Failure probability increased from {p_start}% to {p_end}% over observation window.")

        return {
            "machine_id": machine_id,
            "timeframe": timeframe,
            "data_points_count": len(points),
            "has_sufficient_data": True,
            "current_health": latest_health,
            "baseline_health": first_health,
            "net_health_change": round(health_delta, 1),
            "net_health_pct_change": health_pct_change,
            "timeline_points": points,
            "trend_insights": insights
        }
