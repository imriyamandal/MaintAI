const API_BASE_URL = 'http://localhost:8000/api';

async function handleResponse(response) {
  if (!response.ok) {
    let errorMsg = `HTTP Error ${response.status}: ${response.statusText}`;
    try {
      const errorJson = await response.json();
      if (errorJson && errorJson.detail) {
        errorMsg = typeof errorJson.detail === 'string' ? errorJson.detail : JSON.stringify(errorJson.detail);
      }
    } catch (_) {}
    throw new Error(errorMsg);
  }
  return response.json();
}

export const api = {
  // System Health
  async getHealth() {
    const res = await fetch(`${API_BASE_URL}/health`);
    return handleResponse(res);
  },

  // Fleet Summary
  async getFleetSummary() {
    const res = await fetch(`${API_BASE_URL}/fleet/summary`);
    return handleResponse(res);
  },

  // Machines List
  async getMachines(search = '', riskLevel = '', category = '') {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (riskLevel && riskLevel !== 'All') params.append('risk_level', riskLevel);
    if (category && category !== 'All') params.append('category', category);

    const res = await fetch(`${API_BASE_URL}/machines?${params.toString()}`);
    return handleResponse(res);
  },

  // Machine Detail
  async getMachineDetail(machineId) {
    const res = await fetch(`${API_BASE_URL}/machines/${machineId}`);
    return handleResponse(res);
  },

  // Machine Degradation Health History
  async getMachineHistory(machineId, interval = '7d') {
    const params = new URLSearchParams({ interval });
    const res = await fetch(`${API_BASE_URL}/machines/${machineId}/history?${params.toString()}`);
    return handleResponse(res);
  },

  // Machine Maintenance Memory & Logs
  async getMachineMaintenance(machineId) {
    const res = await fetch(`${API_BASE_URL}/machines/${machineId}/maintenance`);
    return handleResponse(res);
  },

  // Prescriptive Maintenance Recommendations / Work Orders
  async getRecommendations(machineId = null, priority = null, limit = 50) {
    const params = new URLSearchParams();
    if (machineId) params.append('machine_id', machineId);
    if (priority && priority !== 'All') params.append('priority', priority);
    if (limit) params.append('limit', limit);

    const res = await fetch(`${API_BASE_URL}/recommendations?${params.toString()}`);
    return handleResponse(res);
  },

  // Data Quality Metrics
  async getDataQuality() {
    const res = await fetch(`${API_BASE_URL}/data-quality`);
    return handleResponse(res);
  },

  // Prediction
  async predict(payload) {
    const res = await fetch(`${API_BASE_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  // What-If Simulation
  async simulate(payload) {
    const res = await fetch(`${API_BASE_URL}/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  // Explainability (Machine SHAP)
  async getMachineSHAP(machineId) {
    const res = await fetch(`${API_BASE_URL}/explain/${machineId}`);
    return handleResponse(res);
  },

  // Explainability (Global SHAP)
  async getGlobalSHAP() {
    const res = await fetch(`${API_BASE_URL}/explain/global`);
    return handleResponse(res);
  },

  // Model Performance
  async getModelPerformance() {
    const res = await fetch(`${API_BASE_URL}/model-performance`);
    return handleResponse(res);
  },

  // Alerts List
  async getAlerts(severity = '', resolved = null, activeOnly = false) {
    const params = new URLSearchParams();
    if (severity && severity !== 'All') params.append('severity', severity);
    if (resolved !== null) params.append('resolved', resolved);
    if (activeOnly) params.append('active_only', 'true');

    const res = await fetch(`${API_BASE_URL}/alerts?${params.toString()}`);
    return handleResponse(res);
  },

  // Alerts Summary
  async getAlertsSummary() {
    const res = await fetch(`${API_BASE_URL}/alerts/summary`);
    return handleResponse(res);
  },

  // Alert Lifecycle Actions (Acknowledge, Resolve, Suppress)
  async updateAlert(alertId, data) {
    const res = await fetch(`${API_BASE_URL}/alerts/${alertId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async acknowledgeAlert(alertId, acknowledged = true, resolved = false) {
    return this.updateAlert(alertId, { acknowledged, resolved });
  },

  // AI Maintenance Copilot
  async queryCopilot(query, machineId = null) {
    const res = await fetch(`${API_BASE_URL}/copilot/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, machine_id: machineId }),
    });
    return handleResponse(res);
  },

  // Demo Scenario
  async getDemoScenarioInfo() {
    const res = await fetch(`${API_BASE_URL}/demo/scenario`);
    return handleResponse(res);
  },

  async executeDemoStep(step) {
    const res = await fetch(`${API_BASE_URL}/demo/scenario/${step}`, {
      method: 'POST',
    });
    return handleResponse(res);
  },

  // Reset & Reseed Database
  async resetDatabase() {
    const res = await fetch(`${API_BASE_URL}/seed/reset`, {
      method: 'POST',
    });
    return handleResponse(res);
  },

  // CSV Upload
  async uploadCSV(file) {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse(res);
  }
};
