import pytest
import io
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ONLINE"
    assert "xgboost" in data["models_loaded"]

def test_fleet_summary_endpoint():
    response = client.get("/api/fleet/summary")
    assert response.status_code == 200
    data = response.json()
    assert data["total_machines"] >= 20
    assert "average_health_score" in data
    assert "average_confidence_score" in data
    assert "fleet_health_distribution" in data

def test_machines_list_and_search():
    response = client.get("/api/machines")
    assert response.status_code == 200
    machines = response.json()
    assert len(machines) >= 20
    
    # Test search
    res_search = client.get("/api/machines?search=M-017")
    assert res_search.status_code == 200
    m_data = res_search.json()
    assert len(m_data) == 1
    assert m_data[0]["id"] == "M-017"
    assert "confidence_score" in m_data[0]
    assert "bearing_replacement_days_ago" in m_data[0]

def test_machine_detail_endpoint():
    response = client.get("/api/machines/M-017")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "M-017"
    assert "recent_readings" in data
    assert len(data["recent_readings"]) > 0
    assert "confidence_breakdown" in data
    assert "prescriptive_plan" in data
    assert "digital_twin" in data
    assert data["digital_twin"]["spindle_bearing_status"] is not None

def test_machine_health_timeline():
    response = client.get("/api/machines/M-017/history?timeframe=7d")
    assert response.status_code == 200
    data = response.json()
    assert data["machine_id"] == "M-017"
    assert "timeline_points" in data
    assert len(data["timeline_points"]) > 0
    assert "trend_insights" in data

def test_machine_maintenance_events():
    response = client.get("/api/machines/M-017/maintenance")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    if len(data) > 0:
        assert "parts_replaced" in data[0]

def test_prescriptive_recommendations_endpoint():
    response = client.get("/api/recommendations")
    assert response.status_code == 200
    data = response.json()
    assert "recommendations" in data
    recs = data["recommendations"]
    assert len(recs) >= 20
    assert "action" in recs[0]["prescriptive_action"]
    assert "sla_window" in recs[0]["prescriptive_action"]
    assert "priority" in recs[0]["prescriptive_action"]

def test_predict_and_confidence_scoring():
    payload = {
        "machine_id": "M-017",
        "air_temperature": 300.0,
        "process_temperature": 310.0,
        "rotational_speed": 1500.0,
        "torque": 40.0,
        "tool_wear": 50.0,
        "vibration": 0.8,
        "machine_type": "M"
    }
    response = client.post("/api/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "failure_probability" in data
    assert "health_score" in data
    assert "risk_level" in data
    assert "confidence_breakdown" in data
    cb = data["confidence_breakdown"]
    assert cb["confidence_score"] > 0
    assert cb["data_quality_score"] > 0
    assert cb["boundary_validity_score"] > 0
    assert cb["stability_score"] > 0
    assert cb["calibration_score"] > 0
    assert "prescriptive_plan" in data
    assert data["prescriptive_plan"]["recommended_action"] != ""

def test_digital_twin_simulate_and_what_changed():
    payload = {
        "machine_id": "M-017",
        "air_temperature": 304.0,
        "process_temperature": 312.0,
        "rotational_speed": 1350.0,
        "torque": 68.0,
        "tool_wear": 235.0,
        "machine_type": "H"
    }
    response = client.post("/api/simulate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "current_state" in data
    assert "simulated_state" in data
    assert "delta_health_score" in data
    assert "what_changed" in data
    assert len(data["what_changed"]) > 0
    top_driver = data["what_changed"][0]
    assert "feature" in top_driver
    assert "pct_shift" in top_driver
    assert data["risk_direction"] in ["DEGRADED", "IMPROVED", "UNCHANGED"]

def test_shap_explanation_endpoint():
    response = client.get("/api/explain/M-017")
    assert response.status_code == 200
    data = response.json()
    assert data["machine_id"] == "M-017"
    assert "contributions" in data
    assert len(data["contributions"]) > 0
    assert "narrative_explanation" in data

def test_copilot_queries():
    # 1. Root cause query
    res1 = client.post("/api/copilot/query", json={"query": "Why is Machine M-017 at risk?"})
    assert res1.status_code == 200
    d1 = res1.json()
    assert "M-017" in d1["referenced_machines"]
    assert d1["has_insufficient_data"] == False
    assert len(d1["grounded_evidence"]) > 0

    # 2. Maintenance memory query
    res2 = client.post("/api/copilot/query", json={"query": "When was the bearing last replaced for M-017?"})
    assert res2.status_code == 200
    d2 = res2.json()
    assert "M-017" in d2["referenced_machines"]
    assert "Bearing" in d2["answer"]

    # 3. Prescriptive action inquiry
    res3 = client.post("/api/copilot/query", json={"query": "What maintenance action is recommended for M-017?"})
    assert res3.status_code == 200
    d3 = res3.json()
    assert "Recommended Action" in d3["answer"] or "Prescriptive" in d3["answer"]

    # 4. Out of scope inquiry
    res4 = client.post("/api/copilot/query", json={"query": "What is the stock price of Apple?"})
    assert res4.status_code == 200
    d4 = res4.json()
    assert "I don't have enough" in d4["answer"]
    assert d4["has_insufficient_data"] == True

def test_alerts_lifecycle_and_suppression():
    response = client.get("/api/alerts")
    assert response.status_code == 200
    alerts = response.json()
    assert isinstance(alerts, list)
    if len(alerts) > 0:
        a_id = alerts[0]["id"]
        # 1. Acknowledge
        ack_res = client.patch(f"/api/alerts/{a_id}", json={"acknowledged": True})
        assert ack_res.status_code == 200
        assert ack_res.json()["acknowledged"] == True
        
        # 2. Suppress with reason
        sup_res = client.patch(f"/api/alerts/{a_id}", json={
            "status": "SUPPRESSED",
            "suppression_reason": "Transient thermal outlier confirmed non-critical"
        })
        assert sup_res.status_code == 200
        assert sup_res.json()["status"] == "SUPPRESSED"
        assert sup_res.json()["suppression_reason"] == "Transient thermal outlier confirmed non-critical"

        # 3. Resolve
        res_res = client.patch(f"/api/alerts/{a_id}", json={"resolved": True, "acknowledged": True})
        assert res_res.status_code == 200
        assert res_res.json()["resolved"] == True

def test_csv_upload_validation_strict():
    # 1. Non-CSV file rejection
    res_non_csv = client.post("/api/upload", files={"file": ("test.txt", io.BytesIO(b"hello"), "text/plain")})
    assert res_non_csv.status_code == 400

    # 2. Missing required column
    invalid_csv_missing_col = "machine_id,air_temperature,process_temperature\nM-017,300.0,310.0\n"
    res1 = client.post("/api/upload", files={"file": ("test.csv", io.BytesIO(invalid_csv_missing_col.encode('utf-8')), "text/csv")})
    assert res1.status_code == 422
    assert "Missing required telemetry columns" in res1.json()["detail"]

    # 3. Out of range physical sensor values
    invalid_csv_out_of_range = (
        "air_temperature,process_temperature,rotational_speed,torque,tool_wear\n"
        "900.0,950.0,1500,40.0,50.0\n"
    )
    res2 = client.post("/api/upload", files={"file": ("test.csv", io.BytesIO(invalid_csv_out_of_range.encode('utf-8')), "text/csv")})
    assert res2.status_code == 422
    assert "Sensor range validation failed" in res2.json()["detail"]

    # 4. Valid CSV ingestion
    valid_csv = (
        "air_temperature,process_temperature,rotational_speed,torque,tool_wear,vibration,type\n"
        "300.1,310.2,1520,41.0,55.0,0.82,M\n"
    )
    res4 = client.post("/api/upload", files={"file": ("test.csv", io.BytesIO(valid_csv.encode('utf-8')), "text/csv")})
    assert res4.status_code == 200
    assert res4.json()["status"] == "VALIDATED_AND_INGESTED"
    assert res4.json()["valid_rows_count"] == 1

def test_full_end_to_end_deterministic_pipeline():
    """
    End-to-End Pipeline Hardening Verification:
    Stage 1: Baseline (Health ~94, Normal)
    Stage 2: Thermal Drift (Early Warning)
    Stage 3: Torque Spike / Critical Overload (Critical Alert + P1 Work Order with SLA < 2h)
    Stage 4: Copilot grounded inquiry verifies evidence
    Stage 5: Restoration (Maintenance recovery, alerts resolved, Healthy)
    """
    # 1. Baseline
    res1 = client.post("/api/demo/scenario/1")
    assert res1.status_code == 200
    d1 = res1.json()
    assert d1["step"] == 1
    assert d1["machine_id"] == "M-017"
    assert d1["prediction"]["risk_level"] in ["Healthy", "Stable"]

    # 2. Thermal Drift
    res2 = client.post("/api/demo/scenario/2")
    assert res2.status_code == 200
    d2 = res2.json()
    assert d2["step"] == 2

    # 3. Torque Spike / Critical Overload
    res3 = client.post("/api/demo/scenario/3")
    assert res3.status_code == 200
    d3 = res3.json()
    assert d3["step"] == 3
    assert d3["prediction"]["risk_level"] == "Critical"
    
    # Verify Alert Engine created a CRITICAL alert for M-017
    active_alerts = client.get("/api/alerts?resolved=false").json()
    m17_crit_alert = next((a for a in active_alerts if a["machine_id"] == "M-017" and a["severity"] == "CRITICAL"), None)
    assert m17_crit_alert is not None
    assert "Power Overload" in m17_crit_alert["reason"] or "Overload" in m17_crit_alert["reason"]

    # Verify Prescriptive Center created P1 Critical Work Order with SLA < 2 Hours
    recs = client.get("/api/recommendations?priority=P1-Critical").json()["recommendations"]
    m17_p1_rec = next((r for r in recs if r["machine_id"] == "M-017"), None)
    assert m17_p1_rec is not None
    assert m17_p1_rec["prescriptive_action"]["priority"] == "P1-Critical"
    assert "< 2 Hours" in m17_p1_rec["prescriptive_action"]["sla_window"]

    # 4. Copilot Grounded Query
    copilot_res = client.post("/api/copilot/query", json={"query": "Why is Machine M-017 at risk?"})
    assert copilot_res.status_code == 200
    c_data = copilot_res.json()
    assert "M-017" in c_data["referenced_machines"]
    assert c_data["has_insufficient_data"] == False
    assert len(c_data["grounded_evidence"]) >= 3

    # 5. Restoration
    res4 = client.post("/api/demo/scenario/4")
    assert res4.status_code == 200
    d4 = res4.json()
    assert d4["step"] == 4
    assert d4["prediction"]["risk_level"] == "Healthy"
    assert d4["prediction"]["health_score"] >= 90.0

    # Verify all alerts for M-017 are now resolved
    active_alerts_after_4 = [a for a in client.get("/api/alerts?resolved=false").json() if a["machine_id"] == "M-017"]
    assert len(active_alerts_after_4) == 0
