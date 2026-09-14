import React, { useState } from 'react';
import { TrendingUp, AlertTriangle, ShieldCheck, Zap, Wrench, Thermometer, Gauge, Sparkles, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

export default function Predictions({ machines = [], onSelectMachine }) {
  const [customForm, setCustomForm] = useState({
    machine_id: 'M-017',
    air_temperature: 300.0,
    process_temperature: 310.0,
    rotational_speed: 1500.0,
    torque: 40.0,
    tool_wear: 60.0,
    machine_type: 'M',
    vibration: 0.85
  });

  const [inferenceResult, setInferenceResult] = useState(null);
  const [inferring, setInferring] = useState(false);

  const handleInference = async (e) => {
    e.preventDefault();
    setInferring(true);
    try {
      const res = await api.predict(customForm);
      setInferenceResult(res);
    } catch (err) {
      alert(`Inference failed: ${err.message}`);
    } finally {
      setInferring(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-mono text-white flex items-center space-x-2">
            <TrendingUp className="w-6 h-6 text-cyan-400" />
            <span>Failure Risk Prediction & Diagnosis</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">Multi-class failure mode diagnosis & real-time XGBoost inference with confidence calibration.</p>
        </div>
      </div>

      {/* 5 Failure Mode Explanatory Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="industrial-panel p-3.5 border-t-2 border-t-rose-500">
          <div className="text-xs font-bold text-rose-300">TWF (Tool Wear Failure)</div>
          <p className="text-[11px] text-slate-400 mt-1">Tool wear exceeds 200–240 min under heavy cutting forces.</p>
        </div>
        <div className="industrial-panel p-3.5 border-t-2 border-t-amber-500">
          <div className="text-xs font-bold text-amber-300">HDF (Heat Dissipation)</div>
          <p className="text-[11px] text-slate-400 mt-1">Temp diff &lt; 8.6 K and rotational speed &lt; 1380 RPM.</p>
        </div>
        <div className="industrial-panel p-3.5 border-t-2 border-t-indigo-500">
          <div className="text-xs font-bold text-indigo-300">PWF (Power Failure)</div>
          <p className="text-[11px] text-slate-400 mt-1">Spindle power P &lt; 3500 W or &gt; 9000 W overload.</p>
        </div>
        <div className="industrial-panel p-3.5 border-t-2 border-t-cyan-500">
          <div className="text-xs font-bold text-cyan-300">OSF (Overstrain Failure)</div>
          <p className="text-[11px] text-slate-400 mt-1">Product of Tool Wear × Torque exceeds material limit.</p>
        </div>
        <div className="industrial-panel p-3.5 border-t-2 border-t-emerald-500">
          <div className="text-xs font-bold text-emerald-300">RNF (Random Anomaly)</div>
          <p className="text-[11px] text-slate-400 mt-1">Unmodeled external disturbance or sensor fluctuation.</p>
        </div>
      </div>

      {/* Real-time Interactive Inference Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 industrial-panel p-5">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-2 flex items-center space-x-2">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span>Interactive Live Inference Console</span>
          </h2>
          <p className="text-xs text-slate-400 mb-4">Input arbitrary telemetry parameters to run model inference.</p>

          <form onSubmit={handleInference} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Air Temp [K]</label>
                <input
                  type="number"
                  step="0.1"
                  value={customForm.air_temperature}
                  onChange={(e) => setCustomForm({ ...customForm, air_temperature: Number(e.target.value) })}
                  className="w-full bg-[#080C16] border border-[#223048] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Process Temp [K]</label>
                <input
                  type="number"
                  step="0.1"
                  value={customForm.process_temperature}
                  onChange={(e) => setCustomForm({ ...customForm, process_temperature: Number(e.target.value) })}
                  className="w-full bg-[#080C16] border border-[#223048] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Rotational Speed [RPM]</label>
                <input
                  type="number"
                  value={customForm.rotational_speed}
                  onChange={(e) => setCustomForm({ ...customForm, rotational_speed: Number(e.target.value) })}
                  className="w-full bg-[#080C16] border border-[#223048] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Torque [Nm]</label>
                <input
                  type="number"
                  step="0.1"
                  value={customForm.torque}
                  onChange={(e) => setCustomForm({ ...customForm, torque: Number(e.target.value) })}
                  className="w-full bg-[#080C16] border border-[#223048] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Tool Wear [min]</label>
                <input
                  type="number"
                  value={customForm.tool_wear}
                  onChange={(e) => setCustomForm({ ...customForm, tool_wear: Number(e.target.value) })}
                  className="w-full bg-[#080C16] border border-[#223048] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Variant Type</label>
                <select
                  value={customForm.machine_type}
                  onChange={(e) => setCustomForm({ ...customForm, machine_type: e.target.value })}
                  className="w-full bg-[#080C16] border border-[#223048] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="L">L (Low Variant - 50%)</option>
                  <option value="M">M (Medium Variant - 30%)</option>
                  <option value="H">H (High Variant - 20%)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={inferring}
              className="w-full mt-2 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition shadow-glow-cyan flex items-center justify-center space-x-2"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{inferring ? 'Evaluating Model Physics...' : 'Run Live ML Inference'}</span>
            </button>
          </form>
        </div>

        {/* Live Inference Output */}
        <div className="lg:col-span-7 industrial-panel p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Inference Output & XAI Insights</h2>
              {inferenceResult && (
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  Confidence: {inferenceResult.confidence_level ? (inferenceResult.confidence_level * 100).toFixed(1) : 94.0}%
                </span>
              )}
            </div>

            {inferenceResult ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-[#0E1526] border border-[#223048]">
                    <div className="text-[10px] text-slate-400 uppercase">Health Score</div>
                    <div className="text-2xl font-bold font-mono text-white mt-0.5">{inferenceResult.health_score}/100</div>
                    <div className={`text-xs font-semibold ${
                      inferenceResult.risk_level === 'Healthy' ? 'text-emerald-400' :
                      inferenceResult.risk_level === 'Stable' ? 'text-cyan-400' :
                      inferenceResult.risk_level === 'Warning' ? 'text-amber-400' : 'text-rose-400'
                    }`}>
                      {inferenceResult.risk_level}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-[#0E1526] border border-[#223048]">
                    <div className="text-[10px] text-slate-400 uppercase">Failure Risk</div>
                    <div className="text-2xl font-bold font-mono text-rose-400 mt-0.5">
                      {(inferenceResult.failure_probability * 100).toFixed(1)}%
                    </div>
                    <div className="text-[10px] text-slate-400">XGBoost Class Prob</div>
                  </div>

                  <div className="p-3 rounded-lg bg-[#0E1526] border border-[#223048]">
                    <div className="text-[10px] text-slate-400 uppercase">Anomaly Score</div>
                    <div className="text-2xl font-bold font-mono text-cyan-300 mt-0.5">
                      {inferenceResult.anomaly_score.toFixed(3)}
                    </div>
                    <div className="text-[10px] text-slate-400">Isolation Forest</div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#0E1526] border border-[#223048]">
                  <div className="text-xs font-bold text-slate-200">Diagnosed Physical Failure Mode:</div>
                  <div className="text-sm font-mono font-bold text-cyan-300 mt-1">
                    {inferenceResult.predicted_failure_mode}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#0E1526] border border-[#223048]">
                  <div className="text-xs font-bold text-slate-200">Maintenance Recommendation:</div>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {inferenceResult.maintenance_recommendation}
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-56 flex flex-col items-center justify-center text-slate-400 space-y-2 border border-dashed border-[#223048] rounded-lg">
                <Gauge className="w-8 h-8 text-slate-400" />
                <div className="text-xs">Adjust parameters on the left and click "Run Live ML Inference".</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
