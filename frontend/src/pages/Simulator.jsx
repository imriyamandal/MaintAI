import React, { useState, useEffect } from 'react';
import { 
  Sliders, Activity, AlertTriangle, ArrowRight, RotateCcw, Sparkles, 
  ShieldCheck, Zap, Shield, Wrench, Clock, FileText, CheckCircle2 
} from 'lucide-react';
import { api } from '../services/api';

export default function Simulator({ machines = [], selectedMachineId, onSelectMachine }) {
  const [machineId, setMachineId] = useState(selectedMachineId || 'M-017');
  
  // Slider states
  const [airTemp, setAirTemp] = useState(300.0);
  const [procTemp, setProcTemp] = useState(310.0);
  const [rpm, setRpm] = useState(1500);
  const [torque, setTorque] = useState(40.0);
  const [toolWear, setToolWear] = useState(60);
  const [mType, setMType] = useState('M');

  const [simResult, setSimResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // Load baseline values when machine changes
  useEffect(() => {
    async function loadBaseline() {
      try {
        const mDetail = await api.getMachineDetail(machineId);
        if (mDetail && mDetail.recent_readings && mDetail.recent_readings.length > 0) {
          const r = mDetail.recent_readings[mDetail.recent_readings.length - 1];
          setAirTemp(r.air_temperature);
          setProcTemp(r.process_temperature);
          setRpm(r.rotational_speed);
          setTorque(r.torque);
          setToolWear(r.tool_wear);
          setMType(mDetail.type || 'M');
        }
      } catch (err) {
        console.error("Baseline load error:", err);
      }
    }
    loadBaseline();
  }, [machineId]);

  // Run simulation on parameter changes
  useEffect(() => {
    async function runSim() {
      try {
        setLoading(true);
        const payload = {
          machine_id: machineId,
          air_temperature: airTemp,
          process_temperature: procTemp,
          rotational_speed: rpm,
          torque: torque,
          tool_wear: toolWear,
          machine_type: mType
        };
        const res = await api.simulate(payload);
        setSimResult(res);
      } catch (err) {
        console.error("Simulation calculation error:", err);
      } finally {
        setLoading(false);
      }
    }

    const timer = setTimeout(runSim, 150);
    return () => clearTimeout(timer);
  }, [machineId, airTemp, procTemp, rpm, torque, toolWear, mType]);

  const handleResetBaseline = () => {
    setAirTemp(300.0);
    setProcTemp(310.0);
    setRpm(1500);
    setTorque(40.0);
    setToolWear(60);
  };

  const getRiskBadge = (level) => {
    switch (level?.toLowerCase()) {
      case 'healthy':
        return <span className="badge-healthy px-2.5 py-0.5 rounded-full text-xs font-semibold">Healthy</span>;
      case 'stable':
        return <span className="badge-stable px-2.5 py-0.5 rounded-full text-xs font-semibold">Stable</span>;
      case 'warning':
        return <span className="badge-warning px-2.5 py-0.5 rounded-full text-xs font-semibold">Warning</span>;
      case 'critical':
        return <span className="badge-critical px-2.5 py-0.5 rounded-full text-xs font-semibold">Critical</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-300">{level}</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-mono text-white flex items-center space-x-2">
            <Sliders className="w-6 h-6 text-cyan-400" />
            <span>Digital Twin What-If Stress Simulator</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">Stress-test industrial parameters with real-time XGBoost inference, confidence shift, and prescriptive output.</p>
        </div>

        {/* Machine Selector */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400">Target Asset:</span>
          <select
            value={machineId}
            onChange={(e) => setMachineId(e.target.value)}
            className="bg-[#080C16] text-xs text-slate-200 px-3 py-1.5 rounded-lg border border-[#223048] focus:outline-none focus:border-cyan-500 font-mono font-bold"
          >
            {machines.map((m) => (
              <option key={m.id} value={m.id}>{m.id} ({m.name})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Decision Support Disclaimer Banner */}
      <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-start space-x-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Operational Safety Interlock: </span>
          <span>Simulation evaluates live mathematical models to forecast degradation. Do not alter physical machine PLC setpoints without senior engineering authorization.</span>
        </div>
      </div>

      {/* Main Grid: Controls vs Before/After Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Sliders */}
        <div className="lg:col-span-6 industrial-panel p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              <span>Adjust Telemetry Inputs</span>
            </h2>
            <button
              onClick={handleResetBaseline}
              className="text-xs text-slate-400 hover:text-cyan-400 flex items-center space-x-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Nominal</span>
            </button>
          </div>

          {/* Air Temperature Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Air Temperature:</span>
              <span className="font-mono text-cyan-300 font-bold">{airTemp.toFixed(1)} K ({(airTemp - 273.15).toFixed(1)} °C)</span>
            </div>
            <input
              type="range"
              min="295"
              max="308"
              step="0.1"
              value={airTemp}
              onChange={(e) => setAirTemp(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-[#080C16] rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>295 K</span>
              <span>Nominal: ~300 K</span>
              <span>308 K</span>
            </div>
          </div>

          {/* Process Temperature Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Process Temperature:</span>
              <span className="font-mono text-cyan-300 font-bold">{procTemp.toFixed(1)} K ({(procTemp - 273.15).toFixed(1)} °C)</span>
            </div>
            <input
              type="range"
              min="302"
              max="318"
              step="0.1"
              value={procTemp}
              onChange={(e) => setProcTemp(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-[#080C16] rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>302 K</span>
              <span>Temp Diff: {(procTemp - airTemp).toFixed(1)} K (&lt;8.6 K triggers HDF)</span>
              <span>318 K</span>
            </div>
          </div>

          {/* Rotational Speed (RPM) Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Rotational Speed (RPM):</span>
              <span className="font-mono text-cyan-300 font-bold">{rpm} RPM</span>
            </div>
            <input
              type="range"
              min="1160"
              max="2880"
              step="10"
              value={rpm}
              onChange={(e) => setRpm(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-[#080C16] rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>1160 RPM</span>
              <span>Nominal: ~1538 RPM</span>
              <span>2880 RPM</span>
            </div>
          </div>

          {/* Spindle Torque Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Spindle Torque (Nm):</span>
              <span className="font-mono text-cyan-300 font-bold">{torque.toFixed(1)} Nm</span>
            </div>
            <input
              type="range"
              min="10"
              max="76"
              step="0.5"
              value={torque}
              onChange={(e) => setTorque(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-[#080C16] rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>10 Nm</span>
              <span>Nominal: ~40 Nm</span>
              <span>76 Nm (Overload)</span>
            </div>
          </div>

          {/* Tool Wear Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Tool Wear (Operating Minutes):</span>
              <span className="font-mono text-cyan-300 font-bold">{toolWear} min</span>
            </div>
            <input
              type="range"
              min="0"
              max="250"
              step="1"
              value={toolWear}
              onChange={(e) => setToolWear(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-[#080C16] rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>0 min (Fresh Tool)</span>
              <span>Warning: &gt;180 min</span>
              <span>250 min (TWF Failure)</span>
            </div>
          </div>
        </div>

        {/* Right Column: Before vs After State Comparison Card */}
        <div className="lg:col-span-6 industrial-panel p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Simulation Impact Analysis
              </h2>
              {simResult && (
                <span className={`px-2 py-0.5 text-xs font-bold rounded uppercase ${
                  simResult.risk_direction === 'DEGRADED' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-glow-rose' :
                  simResult.risk_direction === 'IMPROVED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-glow-emerald' :
                  'bg-slate-800 text-slate-300'
                }`}>
                  Condition: {simResult.risk_direction}
                </span>
              )}
            </div>

            {/* Before vs After Dual Cards */}
            {simResult && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Current State */}
                <div className="p-4 rounded-xl bg-[#0E1526] border border-[#223048]">
                  <div className="text-[10px] uppercase font-bold text-slate-400">CURRENT BASELINE</div>
                  <div className="mt-2 space-y-2">
                    <div>
                      <div className="text-xs text-slate-400">Health Score</div>
                      <div className="text-2xl font-bold font-mono text-white">
                        {simResult.current_state.health_score}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Failure Risk</div>
                      <div className="text-lg font-bold font-mono text-slate-200">
                        {(simResult.current_state.failure_probability * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">AI Confidence</div>
                      <div className="text-sm font-bold font-mono text-emerald-400">
                        {simResult.current_state.confidence_score ?? 94}%
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Risk Level</div>
                      <div className="mt-0.5">{getRiskBadge(simResult.current_state.risk_level)}</div>
                    </div>
                  </div>
                </div>

                {/* Simulated State */}
                <div className={`p-4 rounded-xl border ${
                  simResult.risk_direction === 'DEGRADED' 
                    ? 'bg-rose-950/20 border-rose-500/40 shadow-glow-rose' 
                    : 'bg-cyan-950/20 border-cyan-500/40 shadow-glow-cyan'
                }`}>
                  <div className="text-[10px] uppercase font-bold text-cyan-300 flex items-center justify-between">
                    <span>SIMULATED STATE (Estimate)</span>
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  <div className="mt-2 space-y-2">
                    <div>
                      <div className="text-xs text-slate-400">Simulated Health</div>
                      <div className="text-2xl font-bold font-mono text-white flex items-baseline space-x-1.5">
                        <span>{simResult.simulated_state.health_score}</span>
                        <span className={`text-xs font-bold ${simResult.delta_health_score < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          ({simResult.delta_health_score > 0 ? '+' : ''}{simResult.delta_health_score})
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Simulated Failure Risk</div>
                      <div className="text-lg font-bold font-mono text-rose-400 flex items-baseline space-x-1.5">
                        <span>{(simResult.simulated_state.failure_probability * 100).toFixed(1)}%</span>
                        <span className="text-xs font-normal">
                          ({simResult.delta_failure_probability > 0 ? '+' : ''}{(simResult.delta_failure_probability * 100).toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Simulated Confidence</div>
                      <div className="text-sm font-bold font-mono text-cyan-300">
                        {simResult.simulated_state.confidence_score ?? 91}%
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Simulated Risk Level</div>
                      <div className="mt-0.5">{getRiskBadge(simResult.simulated_state.risk_level)}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* "What Changed?" Top 3 Driver Variables Panel */}
            {simResult && simResult.what_changed && simResult.what_changed.length > 0 && (
              <div className="mt-4 p-4 rounded-xl bg-[#0E1526] border border-cyan-500/30">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2 text-xs font-bold text-cyan-300 uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <span>What Changed? (Top Degradation Drivers)</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Ranked by Absolute Shift</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
                  {simResult.what_changed.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-[#141D30] border border-[#223048] text-xs">
                      <div className="text-slate-400 font-mono truncate">{item.feature}</div>
                      <div className="flex items-baseline justify-between mt-1">
                        <span className="font-mono text-white font-bold">{item.simulated}</span>
                        <span className={`font-mono text-[11px] font-bold ${item.delta > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {item.delta > 0 ? `+${item.pct_shift}%` : `${item.pct_shift}%`}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Baseline: <span className="font-mono text-slate-300">{item.baseline}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Prescriptive Guidance */}
            {simResult && (
              <div className="mt-4 p-4 rounded-xl bg-[#0E1526] border border-[#223048]">
                <div className="flex items-center space-x-2 text-xs font-bold text-slate-200 uppercase tracking-wider mb-1">
                  <Wrench className="w-4 h-4 text-cyan-400" />
                  <span>Prescriptive Maintenance Guidance (Simulation Estimate):</span>
                </div>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  {simResult.recommendation}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
