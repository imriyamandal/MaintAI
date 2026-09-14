import React, { useState, useEffect } from 'react';
import { Brain, Sparkles, HelpCircle, ArrowUpRight, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, Cell 
} from 'recharts';
import { api } from '../services/api';

export default function Explainability({ machines, selectedMachineId, onSelectMachine }) {
  const [activeMachineId, setActiveMachineId] = useState(selectedMachineId || 'M-017');
  const [shapData, setShapData] = useState(null);
  const [globalShap, setGlobalShap] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchXAI() {
      try {
        setLoading(true);
        const [localRes, globalRes] = await Promise.all([
          api.getMachineSHAP(activeMachineId),
          api.getGlobalSHAP(),
        ]);
        setShapData(localRes);
        setGlobalShap(globalRes);
      } catch (err) {
        console.error("SHAP load error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchXAI();
  }, [activeMachineId]);

  const waterfallData = shapData?.contributions?.map((c) => ({
    feature: c.feature,
    value: c.value,
    shap: c.shap_value,
    impact: c.impact,
    color: c.shap_value > 0 ? '#EF4444' : '#10B981',
  })) || [];

  const globalRankingData = globalShap?.global_feature_importance?.slice(0, 8) || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-mono text-white flex items-center space-x-2">
            <Brain className="w-6 h-6 text-cyan-400" />
            <span>Explainable AI (XAI) & SHAP Intelligence Hub</span>
          </h1>
          <p className="text-sm text-slate-400">Exact Shapley value contributions decomposing XGBoost decision boundaries into human-interpretable engineering factors.</p>
        </div>

        {/* Machine Selector */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400">Target Asset:</span>
          <select
            value={activeMachineId}
            onChange={(e) => setActiveMachineId(e.target.value)}
            className="bg-industrial-850 text-xs font-mono font-bold text-cyan-300 px-3 py-1.5 rounded-lg border border-industrial-700 focus:outline-none focus:border-cyan-500"
          >
            {machines.map((m) => (
              <option key={m.id} value={m.id}>{m.id} - Health {m.health_score} ({m.risk_level})</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[350px]">
          <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
        </div>
      ) : (
        <>
          {/* Spotlight Hero: "WHY IS MACHINE AT RISK?" */}
          <div className="industrial-panel p-6 border-l-4 border-l-cyan-400 bg-gradient-to-r from-industrial-900 to-industrial-850">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  <Sparkles className="w-4 h-4" />
                  <span>XAI Root Cause Diagnosis</span>
                </div>
                <h2 className="text-xl font-extrabold font-mono text-white mt-1">
                  WHY IS MACHINE {activeMachineId} AT RISK?
                </h2>
                <p className="text-xs text-slate-300 leading-relaxed mt-2 max-w-3xl">
                  {shapData?.narrative_explanation}
                </p>
              </div>

              <div className="flex items-center space-x-4 bg-industrial-900/80 p-3 rounded-xl border border-industrial-750">
                <div className="text-right">
                  <div className="text-[10px] uppercase text-slate-400">Failure Probability</div>
                  <div className="text-xl font-bold font-mono text-rose-400">
                    {((shapData?.failure_probability || 0) * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="text-right border-l border-industrial-750 pl-4">
                  <div className="text-[10px] uppercase text-slate-400">Baseline Mean</div>
                  <div className="text-xl font-bold font-mono text-slate-300">
                    {((shapData?.base_value || 0.185) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>

            {/* Top Positive & Negative Drivers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-5 border-t border-industrial-750">
              {/* Positive Contributors (Increases Risk) */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Top Risk-Increasing Drivers (+ SHAP)</span>
                </div>
                {shapData?.contributions?.filter(c => c.shap_value > 0).slice(0, 3).map((c) => (
                  <div key={c.feature} className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-mono font-bold text-slate-100">{c.feature}</span>
                      <span className="text-slate-400 ml-2">({c.value})</span>
                    </div>
                    <span className="font-mono font-bold text-rose-400">+{c.shap_value.toFixed(4)}</span>
                  </div>
                ))}
              </div>

              {/* Negative Contributors (Reduces Risk) */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Top Risk-Mitigating Drivers (- SHAP)</span>
                </div>
                {shapData?.contributions?.filter(c => c.shap_value <= 0).slice(0, 3).map((c) => (
                  <div key={c.feature} className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-mono font-bold text-slate-100">{c.feature}</span>
                      <span className="text-slate-400 ml-2">({c.value})</span>
                    </div>
                    <span className="font-mono font-bold text-emerald-400">{c.shap_value.toFixed(4)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Local SHAP Waterfall Plot & Global Feature Importance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Local SHAP Waterfall */}
            <div className="industrial-panel p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Local SHAP Feature Attribution ({activeMachineId})
                  </h3>
                  <p className="text-xs text-slate-400">Positive values increase risk (Red), negative values decrease risk (Green)</p>
                </div>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={waterfallData} layout="vertical" margin={{ top: 5, right: 30, left: 30, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1D2840" horizontal={false} />
                    <XAxis type="number" stroke="#64748B" fontSize={10} />
                    <YAxis dataKey="feature" type="category" stroke="#94A3B8" fontSize={10} width={110} />
                    <Tooltip 
                      formatter={(val, name, item) => [
                        `SHAP: ${val > 0 ? '+' : ''}${val} (Actual Value: ${item.payload.value})`,
                        'Feature Attribution'
                      ]}
                    />
                    <Bar dataKey="shap" radius={[0, 4, 4, 0]}>
                      {waterfallData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Global SHAP Importance */}
            <div className="industrial-panel p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Global Feature Importance (TreeExplainer)
                  </h3>
                  <p className="text-xs text-slate-400">Mean absolute Shapley value across entire industrial dataset</p>
                </div>
                <span className="text-xs font-mono text-cyan-400">Selected Model: XGBoost</span>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={globalRankingData} layout="vertical" margin={{ top: 5, right: 30, left: 30, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1D2840" horizontal={false} />
                    <XAxis type="number" stroke="#64748B" fontSize={10} />
                    <YAxis dataKey="feature" type="category" stroke="#94A3B8" fontSize={10} width={110} />
                    <Tooltip formatter={(val) => [`${val} Mean |SHAP|`, 'Importance']} />
                    <Bar dataKey="importance" fill="#06B6D4" radius={[0, 4, 4, 0]} barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
