import datetime
import random
import numpy as np
from sqlalchemy.orm import Session
from .database import engine, SessionLocal, Base
from .models import Machine, SensorReading, AlertEvent, MaintenanceAction, HealthHistory
from ..ml.engine import MLEngine
from ..services.alert_intelligence_service import AlertIntelligenceService

def seed_database(db: Session = None, force_reseed: bool = False):
    if db is None:
        db = SessionLocal()

    try:
        if force_reseed:
            print("[Database] Force reseed: Dropping and recreating tables...")
            Base.metadata.drop_all(bind=engine)
            Base.metadata.create_all(bind=engine)
        else:
            Base.metadata.create_all(bind=engine)
            if db.query(Machine).count() > 0:
                print("[Database] Already seeded.")
                return

        print("[Database] Seeding industrial fleet, maintenance memory & health histories...")
        ml = MLEngine.get_instance()
        alert_service = AlertIntelligenceService()

        machine_templates = [
            ("M-017", "High-Precision 5-Axis CNC Center", "H", "CNC Milling Center", "Line 1 - Bay A", "RUNNING", 42, 5, 1420),
            ("M-001", "Vertical Machining Center VMC-800", "M", "CNC Milling Center", "Line 1 - Bay A", "RUNNING", 85, 12, 2150),
            ("M-002", "Heavy Duty CNC Lathe TL-20", "L", "Lathe Turning Center", "Line 1 - Bay B", "RUNNING", 110, 18, 3200),
            ("M-003", "Precision Surface Grinder PSG-40", "M", "Grinding Machine", "Line 1 - Bay B", "RUNNING", 65, 8, 1890),
            ("M-004", "Hydraulic Stamping Press 500T", "H", "Stamping Press", "Line 2 - Bay A", "RUNNING", 34, 4, 1120),
            ("M-005", "Horizontal Boring Mill HBM-110", "H", "CNC Milling Center", "Line 2 - Bay A", "RUNNING", 95, 22, 2800),
            ("M-006", "High-Speed CNC Router R-400", "L", "CNC Milling Center", "Line 2 - Bay B", "RUNNING", 140, 15, 3400),
            ("M-007", "Multi-Spindle Screw Machine MSS-6", "M", "Lathe Turning Center", "Line 2 - Bay B", "RUNNING", 52, 7, 1650),
            ("M-008", "Progressive Die Stamping Press", "H", "Stamping Press", "Line 3 - Bay A", "RUNNING", 78, 19, 2400),
            ("M-009", "Robotic Welding Cell Arc-60", "L", "Welding & Assembly", "Line 3 - Bay A", "RUNNING", 25, 3, 980),
            ("M-010", "CNC Cylindrical Grinder CG-300", "M", "Grinding Machine", "Line 3 - Bay B", "RUNNING", 60, 9, 1750),
            ("M-011", "Deep Hole Drilling Center DHD-50", "H", "CNC Milling Center", "Line 3 - Bay B", "RUNNING", 120, 25, 3100),
            ("M-012", "Turret Punch Press TPP-25", "L", "Stamping Press", "Line 1 - Bay C", "RUNNING", 45, 6, 1300),
            ("M-013", "Vertical Turning Lathe VTL-160", "M", "Lathe Turning Center", "Line 1 - Bay C", "RUNNING", 88, 14, 2250),
            ("M-014", "Automated Gear Hobbing Machine", "H", "CNC Milling Center", "Line 2 - Bay C", "RUNNING", 105, 16, 2950),
            ("M-015", "Electrochemical Deburring Unit", "L", "Finishing Line", "Line 2 - Bay C", "RUNNING", 30, 4, 870),
            ("M-016", "Twin-Spindle CNC Lathe TSL-15", "M", "Lathe Turning Center", "Line 3 - Bay C", "RUNNING", 72, 11, 2050),
            ("M-018", "Ultra-Precision Jig Borer JB-5", "H", "CNC Milling Center", "Line 3 - Bay C", "RUNNING", 50, 7, 1500),
            ("M-019", "C-Frame Mechanical Press 150T", "L", "Stamping Press", "Line 1 - Bay D", "RUNNING", 130, 20, 3350),
            ("M-020", "Rotary Transfer Milling Center", "M", "CNC Milling Center", "Line 1 - Bay D", "RUNNING", 68, 10, 1920),
            ("M-021", "CNC Internal Grinder IG-200", "M", "Grinding Machine", "Line 2 - Bay D", "RUNNING", 82, 13, 2180),
            ("M-022", "High-Torque Thread Milling Unit", "H", "CNC Milling Center", "Line 2 - Bay D", "RUNNING", 40, 5, 1220),
            ("M-023", "Servo-Electric Sheet Metal Brake", "L", "Stamping Press", "Line 3 - Bay D", "RUNNING", 115, 17, 3050),
            ("M-024", "Double Column Machining Center", "H", "CNC Milling Center", "Line 3 - Bay D", "RUNNING", 58, 8, 1680),
        ]

        now = datetime.datetime.now(datetime.timezone.utc)

        for idx, (m_id, m_name, m_type, m_cat, m_loc, m_status, bearing_days, tool_days, cycles) in enumerate(machine_templates):
            # Controlled health states across fleet
            if m_id == "M-017":
                # Healthy baseline starter
                base_tool_wear = 45.0
                base_air_temp = 299.8
                base_proc_temp = 309.8
                base_rpm = 1520.0
                base_torque = 38.5
                base_vibration = 0.76
            elif idx % 7 == 0:
                # Warning / Elevated tool wear & torque
                base_tool_wear = 205.0
                base_air_temp = 302.5
                base_proc_temp = 312.0
                base_rpm = 1420.0
                base_torque = 54.0
                base_vibration = 1.45
            elif idx % 11 == 0:
                # Thermal / Heat dissipation anomaly
                base_tool_wear = 130.0
                base_air_temp = 304.0
                base_proc_temp = 311.5 # small temp diff -> HDF
                base_rpm = 1320.0
                base_torque = 62.0
                base_vibration = 1.62
            else:
                base_tool_wear = random.uniform(20.0, 140.0)
                base_air_temp = random.uniform(298.5, 301.5)
                base_proc_temp = base_air_temp + random.uniform(9.5, 11.5)
                base_rpm = random.uniform(1450.0, 1620.0)
                base_torque = random.uniform(34.0, 44.0)
                base_vibration = random.uniform(0.65, 0.95)

            reading_dict = {
                'air_temperature': base_air_temp,
                'process_temperature': base_proc_temp,
                'rotational_speed': base_rpm,
                'torque': base_torque,
                'tool_wear': base_tool_wear,
                'machine_type': m_type,
                'vibration': base_vibration
            }

            m_context = {
                "bearing_replacement_days_ago": bearing_days,
                "tool_replacement_days_ago": tool_days,
                "last_maintenance_action": "Preventive Spindle Calibration"
            }

            pred = ml.predict(reading_dict, machine_id=m_id, maintenance_context=m_context)

            top_factor = pred.top_positive_contributors[0].feature if pred.top_positive_contributors else "Nominal Operating State"

            machine = Machine(
                id=m_id,
                name=m_name,
                type=m_type,
                category=m_cat,
                location=m_loc,
                health_score=pred.health_score,
                failure_probability=pred.failure_probability,
                confidence_score=pred.confidence_breakdown.confidence_score,
                anomaly_score=pred.anomaly_score,
                risk_level=pred.risk_level,
                rul_minutes=pred.estimated_rul_minutes,
                top_risk_factor=top_factor,
                operating_status=m_status,
                install_date=now - datetime.timedelta(days=random.randint(400, 900)),
                operating_cycles=cycles,
                last_maintenance=now - datetime.timedelta(days=random.randint(5, 45)),
                next_recommended_maintenance=now + datetime.timedelta(days=max(3, int(pred.health_score / 3))),
                bearing_replacement_days_ago=bearing_days,
                tool_replacement_days_ago=tool_days,
                data_completeness_pct=round(random.uniform(96.0, 99.8), 1),
                sensor_quality_status="Optimal" if pred.confidence_breakdown.confidence_score >= 80 else "Degraded"
            )
            db.add(machine)

            # Generate 30 historical time-series sensor readings and health points per machine
            for t_idx in range(30, 0, -1):
                t_time = now - datetime.timedelta(minutes=t_idx * 5)
                step_noise = np.random.normal(0, 0.5)
                hist_air = base_air_temp + step_noise * 0.2
                hist_proc = base_proc_temp + step_noise * 0.3
                hist_rpm = base_rpm + np.random.normal(0, 15)
                hist_torque = base_torque + np.random.normal(0, 1.2)
                hist_tool = max(0, base_tool_wear - (t_idx * 0.4))
                hist_vib = max(0.4, base_vibration + np.random.normal(0, 0.05))

                h_dict = {
                    'air_temperature': hist_air,
                    'process_temperature': hist_proc,
                    'rotational_speed': hist_rpm,
                    'torque': hist_torque,
                    'tool_wear': hist_tool,
                    'machine_type': m_type,
                    'vibration': hist_vib
                }
                h_pred = ml.predict(h_dict, machine_id=m_id, maintenance_context=m_context, compute_shap=False)

                reading = SensorReading(
                    machine_id=m_id,
                    timestamp=t_time,
                    air_temperature=round(hist_air, 1),
                    process_temperature=round(hist_proc, 1),
                    rotational_speed=round(hist_rpm, 0),
                    torque=round(hist_torque, 1),
                    tool_wear=round(hist_tool, 0),
                    vibration=round(hist_vib, 3),
                    acoustic=round(0.55 + (100.0 - h_pred.health_score) * 0.005 + random.uniform(-0.03, 0.03), 3),
                    current=round(11.5 + (hist_torque / 4.0) + random.uniform(-0.3, 0.3), 2),
                    health_score=h_pred.health_score,
                    failure_probability=h_pred.failure_probability,
                    confidence_score=h_pred.confidence_breakdown.confidence_score,
                    anomaly_score=h_pred.anomaly_score,
                    is_anomaly=h_pred.is_anomaly,
                    is_simulated=False
                )
                db.add(reading)

                # Health history record
                h_history = HealthHistory(
                    machine_id=m_id,
                    timestamp=t_time,
                    health_score=h_pred.health_score,
                    failure_probability=h_pred.failure_probability,
                    confidence_score=h_pred.confidence_breakdown.confidence_score,
                    anomaly_score=h_pred.anomaly_score,
                    risk_level=h_pred.risk_level
                )
                db.add(h_history)

            # Generate intelligent alerts for warning/critical assets
            if pred.risk_level in ["Critical", "Warning", "Stable"] and pred.failure_probability > 0.25:
                alert_service.evaluate_and_record_alert(
                    db=db,
                    machine_id=m_id,
                    health_score=pred.health_score,
                    failure_prob=pred.failure_probability,
                    risk_level=pred.risk_level,
                    confidence_info=pred.confidence_breakdown.model_dump(),
                    diagnosed_mode=pred.predicted_failure_mode,
                    prescriptive_plan=pred.prescriptive_plan.model_dump(),
                    is_simulated=False
                )

            # Historical Maintenance Event
            parts_catalog = [
                ("Cutting Tool Replacement", "Carbide Tooling", "Sandvik CNMG-120408 Carbide Insert Set", "Abrasive flank wear exceeded 200 min limit"),
                ("Spindle Lubrication & Alignment", "Spindle Bearing Assembly", "SKF 6205 Bearing Grease & Seal Kit", "Minor friction increase detected during dynamic shift"),
                ("Coolant Loop Flush", "Cooling Subsystem", "Inline Microfilter & Synthetic Coolant Fluid", "Thermal dissipation gradient boundary drift"),
                ("Vibration Damper Service", "Mechanical Drive", "Polymer Vibration Dampers & Bushings", "Harmonic oscillation damper wear")
            ]
            act_name, comp, parts, f_reason = random.choice(parts_catalog)
            m_action = MaintenanceAction(
                machine_id=m_id,
                timestamp=now - datetime.timedelta(days=random.randint(15, 60)),
                action_type=act_name,
                maintenance_type="Prescriptive AI Dispatch",
                component=comp,
                parts_replaced=parts,
                failure_reason=f_reason,
                technician="Industrial AI Dispatch / Shift Specialist",
                notes="Prescriptive maintenance dispatched by MaintAI. Baseline restored and recalibrated.",
                operating_cycles_at_service=max(500, cycles - random.randint(100, 300)),
                downtime_avoided_hours=round(random.uniform(2.5, 8.0), 1),
                cost_savings_est=round(random.uniform(5000.0, 18500.0), 2)
            )
            db.add(m_action)

        db.commit()
        print(f"[Database] Successfully seeded {len(machine_templates)} industrial assets with maintenance memory & health timelines.")
    except Exception as e:
        db.rollback()
        print(f"[Database] Seeding error: {e}")
    finally:
        if db:
            db.close()

if __name__ == "__main__":
    seed_database()

