import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Activity, ShieldCheck, AlertTriangle, Clock, 
  Thermometer, Gauge, Wrench, RefreshCw, Zap, Cpu, Sparkles, 
  CheckCircle2, Shield, Layers, FileText, CheckSquare, History,
  Calendar, RotateCcw, AlertOctagon, ArrowUpRight, Bot, Sliders, Info
} from 'lucide-react';
import { 
  ResponsiveContainer, LineChart, Line, AreaChart, Area, 
  XAxis, YAxis, CartesianGrid, Tooltip 
} from 'recharts';
import { api } from '../services/api';

export default function MachineDetail({ machineId, onBack, onNavigateTab }) {
  const [machineData, setMachineData] = useState(null);
  const [shapData, setShapData] = useState(null);
  const [historyTimeline, setHistoryTimeline] = useState(null);
  const [maintenanceMemory, setMaintenanceMemory] = useState(null);
  const [selectedInterval, setSelectedInterval] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadAllMachineData = async (interval = selectedInterval) => {
    try {
      setLoading(true);
      const [mDetail, mShap, mHistory, mMemory] = await Promise.all([
        api.getMachineDetail(machineId),
        api.getMachineSHAP(machineId).catch(() => null),
        api.getMachineHistory(machineId, interval).catch(() => null),
        api.getMachineMaintenance(machineId).catch(() => null),
      ]);
      setMachineData(mDetail);
      setShapData(mShap);
      setHistoryTimeline(mHistory);
      setMaintenanceMemory(mMemory);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllMachineData(selectedInterval);
  }, [machineId, selectedInterval]);

  if (loading && !machineData) {
    return (
      <div className="flex items-center justify-center min-h-[450px]">
        <div className="flex flex-col items-center space-y-3">
          <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
          <div className="text-sm font-mono text-slate-300">Loading Telemetry, Confidence & Digital Twin for {machineId}...</div>
        </div>
      </div>
    );
  }

  if (error || !machineData) {
    return (
      <div className="p-8 industrial-panel text-center max-w-xl mx-auto">
        <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-white">Machine Profile Unavailable</h2>
        <p className="text-sm text-slate-400 mb-4">{error || 'Could not find telemetry for this machine.'}</p>
        <button onClick={onBack} className="px-4 py-2 rounded-lg bg-[#141D30] hover:bg-[#1E2B45] text-slate-200 text-xs font-semibold transition border border-[#223048]">
          Return to Fleet
        </button>
      </div>
    );
  }

  const readings = machineData.recent_readings || [];
  const chartData = readings.map((r) => ({
    time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    airTemp: r.air_temperature,
    procTemp: r.process_temperature,
    tempDiff: Number((r.process_temperature - r.air_temperature).toFixed(1)),
    rpm: r.rotational_speed,
    torque: r.torque,
    toolWear: r.tool_wear,
    vibration: r.vibration,
    health: r.health_score,
    anomalyScore: Number((r.anomaly_score * 100).toFixed(1))
  }));

  const latest = readings[readings.length - 1] || machineData.current_readings || {};
  const confidence = machineData.confidence_breakdown || machineData.confidence_details || {};
  const prescription = machineData.prescriptive_plan || machineData.prescriptive_action || {};
  const twin = machineData.digital_twin || {};

  const getPriorityBadge = (p) => {
    switch (p) {
      case 'P1-Critical':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'P2-Urgent':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'P3-Scheduled':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      default:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    }
  };

  const getSubsystemStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case 'CRITICAL':
        return 'border-rose-500/50 bg-rose-500/10 text-rose-300 shadow-glow-rose';
      case 'DEGRADED':
      case 'WARNING':
        return 'border-amber-500/50 bg-amber-500/10 text-amber-300';
      default:
        return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Top Bar with Back Button and Quick Metadata */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg bg-[#141D30] hover:bg-[#1E2B45] text-slate-300 hover:text-white transition border border-[#223048]"
            title="Back to Fleet"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold font-mono text-white">{machineData.id}</h1>
              <span className="text-base text-slate-300 font-medium">• {machineData.name}</span>
              <span className="px-2 py-0.5 rounded text-xs font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                Type {machineData.type}
              </span>
              <span className="px-2 py-0.5 rounded text-xs bg-[#141D30] text-slate-300 border border-[#223048]">
                {machineData.location}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>STATUS: {machineData.operating_status}</span>
          </div>

          <button
            onClick={() => onNavigateTab('simulator')}
            className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition shadow-glow-cyan flex items-center space-x-1.5"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Simulate Stress</span>
          </button>

          <button
            onClick={() => onNavigateTab('copilot')}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition border border-indigo-400/30 flex items-center space-x-1.5"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Ask Copilot</span>
          </button>
        </div>
      </div>

      {/* Primary Status Scoreboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Health Score Dial */}
        <div className="industrial-panel p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wider">Health Score</div>
            <div className="text-3xl font-extrabold font-mono mt-1 text-white flex items-baseline space-x-1">
              <span>{machineData.health_score}</span>
              <span className="text-xs text-slate-400 font-normal">/ 100</span>
            </div>
            <div className={`text-xs font-semibold mt-1 ${
              machineData.risk_level === 'Healthy' ? 'text-emerald-400' :
              machineData.risk_level === 'Stable' ? 'text-cyan-400' :
              machineData.risk_level === 'Warning' ? 'text-amber-400' : 'text-rose-400'
            }`}>
              Condition: {machineData.risk_level}
            </div>
          </div>
          <Activity className="w-8 h-8 text-cyan-400" />
        </div>

        {/* Failure Probability */}
        <div className="industrial-panel p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wider">Failure Probability</div>
            <div className="text-3xl font-extrabold font-mono mt-1 text-rose-400">
              {(machineData.failure_probability * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-slate-400 mt-1">XGBoost Decision Threshold</div>
          </div>
          <AlertTriangle className="w-8 h-8 text-rose-400" />
        </div>

        {/* AI Confidence */}
        <div className="industrial-panel p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wider">AI Confidence Score</div>
            <div className="text-3xl font-extrabold font-mono mt-1 text-emerald-400">
              {machineData.confidence_score}%
            </div>
            <div className="text-xs text-slate-400 mt-1">4-Factor Trust Index</div>
          </div>
          <Shield className="w-8 h-8 text-emerald-400" />
        </div>

        {/* Physics-Informed Wear Life */}
        <div 
          className="industrial-panel p-4 flex items-center justify-between cursor-help relative group"
          title="Estimated equipment/tool wear life derived from the current wear and operating-stress model. This is a decision-support estimate and not a certified remaining-useful-life measurement."
        >
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wider flex items-center space-x-1">
              <span>Physics-Informed Wear Life</span>
              <Info className="w-3 h-3 text-slate-400" />
            </div>
            <div className="text-xl font-extrabold font-mono mt-1 text-amber-300">
              {Math.round(machineData.rul_minutes || 1440)} min
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              Estimated Time-to-Inspection (SLA: {prescription.sla_window || '< 48h'})
            </div>
          </div>
          <Clock className="w-8 h-8 text-amber-400" />
        </div>
      </div>

      {/* 5-Question Industrial Evidence Framework */}
      <div className="industrial-panel p-5 border-l-4 border-l-cyan-500 space-y-4">
        <div className="flex items-center justify-between border-b border-[#223048] pb-3">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white uppercase tracking-wider">
              5-Question Diagnostic Evidence Matrix
            </h2>
          </div>
          <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
            Trust & Audit Framework
          </span>
        </div>

        {/* Evidence Matrix Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* WHAT */}
          <div className="p-3.5 rounded-lg bg-[#0E1526] border border-[#223048] space-y-1.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 flex items-center space-x-1">
              <Activity className="w-3.5 h-3.5" />
              <span>1. WHAT is happening?</span>
            </div>
            <div className="text-slate-200 font-semibold text-sm">{machineData.risk_level} Condition</div>
            <div className="text-slate-400">Health: <span className="font-mono text-white font-bold">{machineData.health_score}/100</span></div>
            <div className="text-slate-400">Risk: <span className="font-mono text-rose-400 font-bold">{(machineData.failure_probability * 100).toFixed(1)}%</span></div>
          </div>

          {/* WHY */}
          <div className="p-3.5 rounded-lg bg-[#0E1526] border border-[#223048] space-y-1.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center space-x-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>2. WHY is it happening?</span>
            </div>
            <div className="text-slate-200 font-semibold text-xs truncate">{machineData.top_risk_factor || 'Nominal Operation'}</div>
            <div className="text-slate-400">SHAP Driver: <span className="text-amber-300 font-mono">{shapData?.contributions?.[0]?.feature || 'Thermal / Speed'}</span></div>
            <div className="text-slate-400">Attribution: <span className="text-rose-400 font-mono">+{shapData?.contributions?.[0]?.shap_value ? shapData.contributions[0].shap_value.toFixed(3) : '0.000'}</span></div>
          </div>

          {/* HOW CONFIDENT */}
          <div className="p-3.5 rounded-lg bg-[#0E1526] border border-[#223048] space-y-1.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>3. HOW CONFIDENT?</span>
            </div>
            <div className="text-emerald-300 font-bold text-sm font-mono">{machineData.confidence_score}% Trust</div>
            <div className="text-slate-400">Data Quality: <span className="text-cyan-300 font-mono">{confidence.data_completeness_pct ?? 100}%</span></div>
            <div className="text-slate-400">Stability: <span className="text-indigo-300 font-mono">{confidence.sensor_stability_index_pct ?? 92}%</span></div>
          </div>

          {/* WHAT TO DO */}
          <div className="p-3.5 rounded-lg bg-[#0E1526] border border-[#223048] space-y-1.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-rose-400 flex items-center space-x-1">
              <Wrench className="w-3.5 h-3.5" />
              <span>4. WHAT SHOULD WE DO?</span>
            </div>
            <div className="text-white font-semibold text-xs line-clamp-1">{prescription.action || prescription.recommended_action || 'Routine Inspection'}</div>
            <div className="text-slate-400">Priority: <span className={`font-mono font-bold ${prescription.priority === 'P1-Critical' ? 'text-rose-400' : 'text-amber-300'}`}>{prescription.priority || 'P4-Advisory'}</span></div>
            <div className="text-slate-400">SLA Window: <span className="text-amber-300 font-mono">{prescription.sla_window || prescription.suggested_timeframe || '< 48h'}</span></div>
          </div>

          {/* WHAT EVIDENCE */}
          <div className="p-3.5 rounded-lg bg-[#0E1526] border border-[#223048] space-y-1.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 flex items-center space-x-1">
              <Layers className="w-3.5 h-3.5" />
              <span>5. WHAT EVIDENCE?</span>
            </div>
            <div className="text-slate-200 text-xs">6 Active Telemetry Channels</div>
            <div className="text-slate-400">Temp Dev: <span className="text-cyan-300 font-mono">{latest.process_temperature ? (latest.process_temperature - 308.0).toFixed(1) : 0} K</span></div>
            <div className="text-slate-400">Vibration Dev: <span className="text-cyan-300 font-mono">{latest.vibration ? (latest.vibration - 0.75).toFixed(2) : 0} mm/s</span></div>
          </div>
        </div>
      </div>

      {/* Sensor Baseline vs Current Telemetry Evidence Panel */}
      <div className="industrial-panel p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#223048] pb-3 gap-2">
          <div className="flex items-center space-x-2">
            <Gauge className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Physical Sensor Evidence • Baseline vs Current Deviation
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">Calibrated against Nominal Operating Baseline</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Process Temperature */}
          <div className="p-3.5 rounded-lg bg-[#0E1526] border border-[#223048]">
            <div className="text-xs text-slate-400 font-medium">Process Temperature</div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-lg font-bold font-mono text-white">{latest.process_temperature ?? 308.6} K</span>
              <span className={`text-xs font-mono font-bold ${(latest.process_temperature - 308.0) > 2.0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {((latest.process_temperature ?? 308.6) - 308.0) >= 0 ? `+${((latest.process_temperature ?? 308.6) - 308.0).toFixed(1)}` : ((latest.process_temperature ?? 308.6) - 308.0).toFixed(1)} K
              </span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-400 mt-1 border-t border-[#1A263C] pt-1">
              <span>Nominal Baseline:</span>
              <span className="font-mono text-slate-300">308.0 K</span>
            </div>
          </div>

          {/* Spindle Vibration */}
          <div className="p-3.5 rounded-lg bg-[#0E1526] border border-[#223048]">
            <div className="text-xs text-slate-400 font-medium">Spindle Vibration</div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-lg font-bold font-mono text-white">{latest.vibration ?? 0.82} mm/s</span>
              <span className={`text-xs font-mono font-bold ${(latest.vibration - 0.75) > 0.3 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {((latest.vibration ?? 0.82) - 0.75) >= 0 ? `+${((latest.vibration ?? 0.82) - 0.75).toFixed(2)}` : ((latest.vibration ?? 0.82) - 0.75).toFixed(2)} mm/s
              </span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-400 mt-1 border-t border-[#1A263C] pt-1">
              <span>Nominal Baseline:</span>
              <span className="font-mono text-slate-300">0.75 mm/s</span>
            </div>
          </div>

          {/* Rotational Speed (RPM) */}
          <div className="p-3.5 rounded-lg bg-[#0E1526] border border-[#223048]">
            <div className="text-xs text-slate-400 font-medium">Rotational Speed (RPM)</div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-lg font-bold font-mono text-white">{latest.rotational_speed ?? 1551} RPM</span>
              <span className={`text-xs font-mono font-bold ${Math.abs((latest.rotational_speed ?? 1551) - 1538) > 200 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {((latest.rotational_speed ?? 1551) - 1538) >= 0 ? `+${(latest.rotational_speed ?? 1551) - 1538}` : `${(latest.rotational_speed ?? 1551) - 1538}`} RPM
              </span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-400 mt-1 border-t border-[#1A263C] pt-1">
              <span>Nominal Baseline:</span>
              <span className="font-mono text-slate-300">1538 RPM</span>
            </div>
          </div>

          {/* Spindle Torque */}
          <div className="p-3.5 rounded-lg bg-[#0E1526] border border-[#223048]">
            <div className="text-xs text-slate-400 font-medium">Spindle Torque (Nm)</div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-lg font-bold font-mono text-white">{latest.torque ?? 42.8} Nm</span>
              <span className={`text-xs font-mono font-bold ${(latest.torque - 40.0) > 15 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {((latest.torque ?? 42.8) - 40.0) >= 0 ? `+${((latest.torque ?? 42.8) - 40.0).toFixed(1)}` : ((latest.torque ?? 42.8) - 40.0).toFixed(1)} Nm
              </span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-400 mt-1 border-t border-[#1A263C] pt-1">
              <span>Nominal Baseline:</span>
              <span className="font-mono text-slate-300">40.0 Nm</span>
            </div>
          </div>

          {/* Tool Wear */}
          <div className="p-3.5 rounded-lg bg-[#0E1526] border border-[#223048]">
            <div className="text-xs text-slate-400 font-medium">Tool Wear Time</div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-lg font-bold font-mono text-white">{latest.tool_wear ?? 60} min</span>
              <span className={`text-xs font-mono font-bold ${(latest.tool_wear ?? 60) > 180 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {(latest.tool_wear ?? 60) > 180 ? 'HIGH WEAR' : 'NOMINAL'}
              </span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-400 mt-1 border-t border-[#1A263C] pt-1">
              <span>Limit Baseline:</span>
              <span className="font-mono text-slate-300">240 min Max</span>
            </div>
          </div>
        </div>
      </div>

      {/* Two Pillar Section: Defensible AI Confidence & Prescriptive Action Order */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Defensible AI Confidence Breakdown Card */}
        <div className="industrial-panel p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#223048] pb-3">
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Defensible AI Confidence Trust Index</h2>
            </div>
            <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              {machineData.confidence_score}% Trust
            </span>
          </div>

          <div className="bg-[#0E1526] p-3.5 rounded-lg border border-[#223048] space-y-2">
            <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Why this confidence? (Independent of Failure Risk)</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-mono">
              {confidence.explanation || "All 6 sensor streams active and calibrated within physical operational envelope."}
            </p>
            <div className="text-[11px] text-slate-400 border-t border-[#1A263C] pt-1.5">
              Confidence measures data completeness, physical sensor quality, inference stability, and calibration margin.
            </div>
          </div>

          <div className="space-y-3">
            {/* 1. Data Completeness */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">1. Data Stream Completeness (Weight: 30%)</span>
                <span className="text-cyan-300 font-mono font-semibold">{confidence.data_completeness_pct ?? 100}%</span>
              </div>
              <div className="w-full bg-[#080C14] rounded-full h-2 overflow-hidden border border-[#223048]">
                <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${confidence.data_completeness_pct ?? 100}%` }} />
              </div>
            </div>

            {/* 2. Physical Bound Adherence */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">2. Physical Bound Adherence (Weight: 25%)</span>
                <span className="text-emerald-300 font-mono font-semibold">{confidence.physical_bound_adherence_pct ?? 96}%</span>
              </div>
              <div className="w-full bg-[#080C14] rounded-full h-2 overflow-hidden border border-[#223048]">
                <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${confidence.physical_bound_adherence_pct ?? 96}%` }} />
              </div>
            </div>

            {/* 3. Sensor Stability Index */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">3. Sensor Stability Index (Weight: 25%)</span>
                <span className="text-indigo-300 font-mono font-semibold">{confidence.sensor_stability_index_pct ?? 92}%</span>
              </div>
              <div className="w-full bg-[#080C14] rounded-full h-2 overflow-hidden border border-[#223048]">
                <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${confidence.sensor_stability_index_pct ?? 92}%` }} />
              </div>
            </div>

            {/* 4. Model Calibration */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">4. Model Calibration Margin (Weight: 20%)</span>
                <span className="text-amber-300 font-mono font-semibold">{confidence.model_calibration_pct ?? 90}%</span>
              </div>
              <div className="w-full bg-[#080C14] rounded-full h-2 overflow-hidden border border-[#223048]">
                <div className="h-full bg-amber-400 rounded-full" style={{ width: `${confidence.model_calibration_pct ?? 90}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Prescriptive Action Order Card */}
        <div className="industrial-panel p-5 space-y-4 border-l-4 border-l-cyan-500">
          <div className="flex items-center justify-between border-b border-[#223048] pb-3">
            <div className="flex items-center space-x-2">
              <Wrench className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Prescriptive Action Directive</h2>
            </div>
            <span className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase border ${getPriorityBadge(prescription.priority)}`}>
              {prescription.priority || 'P4-Advisory'}
            </span>
          </div>

          <div className="bg-gradient-to-r from-[#0E1526] to-[#141D30] p-4 rounded-lg border border-cyan-500/30">
            <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Prescribed Action:</div>
            <div className="text-sm font-bold text-white mt-1">{prescription.action || prescription.recommended_action || 'Routine Inspection & Calibration'}</div>
            <div className="flex items-center space-x-2 mt-2 text-xs font-mono text-amber-300">
              <Clock className="w-3.5 h-3.5" />
              <span>Execution SLA Window: {prescription.sla_window || prescription.suggested_timeframe || 'Next 48 Hours'}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-[#0E1526] border border-[#223048]">
              <span className="text-slate-400">Target Subsystem:</span>
              <div className="font-semibold text-white mt-1">{prescription.target_component || 'Spindle Assembly'}</div>
            </div>
            <div className="p-3 rounded-lg bg-[#0E1526] border border-[#223048]">
              <span className="text-slate-400">Spare Parts Required:</span>
              <div className="font-semibold text-emerald-300 mt-1 truncate">
                {prescription.parts_required && prescription.parts_required.length > 0 ? prescription.parts_required.join(', ') : 'Standard Toolset'}
              </div>
            </div>
          </div>

          {/* SOP Checklist */}
          {prescription.sop_steps && (
            <div className="space-y-1.5">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                <FileText className="w-3.5 h-3.5 text-cyan-400" />
                <span>Standard Operating Procedure (SOP Checklist)</span>
              </div>
              <div className="space-y-2 bg-[#0E1526] p-3 rounded-lg border border-[#223048]">
                {prescription.sop_steps.map((step, idx) => (
                  <div key={idx} className="flex items-start space-x-2 text-xs text-slate-300">
                    <CheckSquare className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 mt-0.5" />
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {prescription.safety_fallback && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-start space-x-2">
              <AlertOctagon className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span><strong>Safety Interlock:</strong> {prescription.safety_fallback}</span>
            </div>
          )}
        </div>
      </div>

      {/* Digital Twin Lite Subsystem Visualizer */}
      <div className="industrial-panel p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Digital Twin Lite • Subsystem Diagnostics</h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">Live Subsystem Telemetry Mapping</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Subsystem 1: Spindle Bearing */}
          <div className={`p-4 rounded-xl border ${getSubsystemStatusColor(twin.spindle_bearing_status)}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider">Spindle Bearing Assembly</span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded border">{twin.spindle_bearing_status || 'NOMINAL'}</span>
            </div>
            <div className="mt-3 text-xs space-y-1 text-slate-300">
              <div className="flex justify-between"><span>Speed:</span> <span className="font-mono text-white">{latest.rotational_speed ?? 1551} RPM</span></div>
              <div className="flex justify-between"><span>Vibration:</span> <span className="font-mono text-white">{latest.vibration ?? 0.82} mm/s</span></div>
            </div>
          </div>

          {/* Subsystem 2: Thermal Dissipation */}
          <div className={`p-4 rounded-xl border ${getSubsystemStatusColor(twin.thermal_dissipation_status)}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider">Cooling & Heat Sink</span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded border">{twin.thermal_dissipation_status || 'NOMINAL'}</span>
            </div>
            <div className="mt-3 text-xs space-y-1 text-slate-300">
              <div className="flex justify-between"><span>Process Temp:</span> <span className="font-mono text-white">{latest.process_temperature ?? 308.6} K</span></div>
              <div className="flex justify-between"><span>Delta Temp:</span> <span className="font-mono text-white">{Number(((latest.process_temperature ?? 308.6) - (latest.air_temperature ?? 298.1)).toFixed(1))} K</span></div>
            </div>
          </div>

          {/* Subsystem 3: Drive Motor */}
          <div className={`p-4 rounded-xl border ${getSubsystemStatusColor(twin.motor_drive_status)}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider">Motor & Inverter</span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded border">{twin.motor_drive_status || 'NOMINAL'}</span>
            </div>
            <div className="mt-3 text-xs space-y-1 text-slate-300">
              <div className="flex justify-between"><span>Torque:</span> <span className="font-mono text-white">{latest.torque ?? 42.8} Nm</span></div>
              <div className="flex justify-between"><span>Power Index:</span> <span className="font-mono text-white">{Number((((latest.rotational_speed ?? 1551) * (latest.torque ?? 42.8)) / 1000).toFixed(1))} kW</span></div>
            </div>
          </div>

          {/* Subsystem 4: Tool Assembly */}
          <div className={`p-4 rounded-xl border ${getSubsystemStatusColor(twin.tool_cutting_status)}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider">Tool Cutting Assembly</span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded border">{twin.tool_cutting_status || 'NOMINAL'}</span>
            </div>
            <div className="mt-3 text-xs space-y-1 text-slate-300">
              <div className="flex justify-between"><span>Tool Wear:</span> <span className="font-mono text-white">{latest.tool_wear ?? 60} min</span></div>
              <div className="flex justify-between"><span>Wear Limit:</span> <span className="font-mono text-slate-400">240 min Max</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Degradation Health Timeline with Multi-Interval Trend Insights */}
      <div className="industrial-panel p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>Machine Health Timeline & Multi-Interval Degradation</span>
            </h2>
            <p className="text-xs text-slate-400">Historical telemetry tracking degradation drift and threshold breaches.</p>
          </div>

          <div className="flex items-center space-x-1 bg-[#080C16] p-1 rounded-lg border border-[#223048]">
            {['24h', '7d', '14d', '30d'].map((iv) => (
              <button
                key={iv}
                onClick={() => setSelectedInterval(iv)}
                className={`px-3 py-1 text-xs font-mono font-medium rounded transition ${
                  selectedInterval === iv
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-glow-cyan'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {iv}
              </button>
            ))}
          </div>
        </div>

        {/* Automated Trend Insights Card */}
        {historyTimeline?.trend_insights && historyTimeline.trend_insights.length > 0 && (
          <div className="bg-[#0E1526] p-3.5 rounded-lg border border-cyan-500/30 mb-4 flex items-start space-x-3">
            <Sparkles className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 space-y-0.5">
              <span className="font-bold text-cyan-300 uppercase tracking-wider mr-2">AI Trend Insight:</span>
              {historyTimeline.trend_insights.map((insight, idx) => (
                <div key={idx} className="text-slate-300">{insight}</div>
              ))}
            </div>
          </div>
        )}

        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={historyTimeline?.timeline_points?.map(h => ({
              time: h.time_label || h.timestamp,
              health: h.health_score,
              prob: Number((h.failure_probability * 100).toFixed(1)),
              vibration: h.vibration,
              torque: h.torque
            })) || chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1D2840" />
              <XAxis dataKey="time" stroke="#64748B" fontSize={10} />
              <YAxis domain={[0, 100]} stroke="#64748B" fontSize={10} />
              <Tooltip />
              <Area type="monotone" dataKey="health" name="Health Score" stroke="#10B981" fill="#10B981" fillOpacity={0.15} />
              <Area type="monotone" dataKey="prob" name="Failure Risk %" stroke="#F43F5E" fill="#F43F5E" fillOpacity={0.10} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Machine Maintenance Memory */}
      <div className="industrial-panel p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
          <div className="flex items-center space-x-2">
            <History className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Machine Maintenance Memory</h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Operating Cycles: <span className="text-white font-bold">{machineData.operating_cycles ?? 1420}</span>
          </span>
        </div>

        {/* Component Age Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="p-3 rounded-lg bg-[#0E1526] border border-[#223048]">
            <span className="text-xs text-slate-400">Commission Date</span>
            <div className="text-xs font-mono font-bold text-white mt-1">2023-01-15</div>
          </div>
          <div className="p-3 rounded-lg bg-[#0E1526] border border-[#223048]">
            <span className="text-xs text-slate-400">Last Bearing Replace</span>
            <div className="text-xs font-mono font-bold text-cyan-300 mt-1">{machineData.bearing_replacement_days_ago ?? 42} days ago</div>
          </div>
          <div className="p-3 rounded-lg bg-[#0E1526] border border-[#223048]">
            <span className="text-xs text-slate-400">Last Tool Replace</span>
            <div className="text-xs font-mono font-bold text-amber-300 mt-1">{machineData.tool_replacement_days_ago ?? 5} days ago</div>
          </div>
          <div className="p-3 rounded-lg bg-[#0E1526] border border-[#223048]">
            <span className="text-xs text-slate-400">Logged Work Orders</span>
            <div className="text-xs font-mono font-bold text-emerald-400 mt-1">{machineData.maintenance_history?.length ?? 2} completed</div>
          </div>
        </div>

        {/* Historical Events Timeline */}
        <div className="space-y-2">
          {machineData.maintenance_history && machineData.maintenance_history.length > 0 ? (
            machineData.maintenance_history.map((evt) => (
              <div key={evt.id} className="p-3 rounded-lg bg-[#0E1526] border border-[#223048] flex items-start justify-between text-xs">
                <div className="flex items-start space-x-3">
                  <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-white">{evt.action_type || evt.action_taken}</div>
                    <div className="text-slate-400 mt-0.5">Component: <span className="text-slate-200">{evt.component}</span> • Parts: <span className="text-slate-300 font-mono">{evt.parts_replaced}</span></div>
                    {evt.notes && <div className="text-slate-400 mt-0.5 italic">{evt.notes}</div>}
                  </div>
                </div>
                <span className="font-mono text-slate-400 text-[11px]">{new Date(evt.timestamp).toLocaleDateString()}</span>
              </div>
            ))
          ) : (
            <div className="p-3 text-center text-xs text-slate-400">No previous maintenance incidents logged for this asset.</div>
          )}
        </div>
      </div>

      {/* SHAP Explanation Summary for this Machine */}
      {shapData && (
        <div className="industrial-panel p-5 border-l-4 border-l-cyan-500">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-white flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>XAI Root Cause Analysis (SHAP TreeExplainer Attribution)</span>
            </h2>
            <button
              onClick={() => onNavigateTab('analytics')}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
            >
              <span>Full Analytics Hub</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed mb-4 bg-[#0E1526] p-3 rounded-lg border border-[#223048] font-mono">
            {shapData.narrative_explanation}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {shapData.contributions?.slice(0, 4).map((c) => (
              <div key={c.feature} className="p-3 rounded-lg bg-[#141D30] border border-[#223048]">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-mono">{c.feature}</span>
                  <span className={`font-bold font-mono ${c.shap_value > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {c.shap_value > 0 ? `+${c.shap_value.toFixed(3)}` : c.shap_value.toFixed(3)}
                  </span>
                </div>
                <div className="text-xs text-slate-200 mt-1 font-semibold">Value: {c.value}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{c.impact?.replace('_', ' ')}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
