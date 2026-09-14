import React, { useState } from 'react';
import { Settings, RotateCcw, ShieldCheck, CheckCircle2, AlertTriangle, RefreshCw, Save } from 'lucide-react';
import { api } from '../services/api';

export default function SettingsPage({ onResetFleet }) {
  const [healthyThreshold, setHealthyThreshold] = useState(88);
  const [stableThreshold, setStableThreshold] = useState(70);
  const [warningThreshold, setWarningThreshold] = useState(45);
  const [resetting, setResetting] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSaveThresholds = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleFullReset = async () => {
    if (!window.confirm("Are you sure you want to reset and re-seed the industrial database with clean telemetry?")) {
      return;
    }
    setResetting(true);
    try {
      if (onResetFleet) await onResetFleet();
    } catch (err) {
      alert(`Reset failed: ${err.message}`);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div className="flex items-center space-x-2">
        <Settings className="w-6 h-6 text-cyan-400" />
        <h1 className="text-2xl font-bold font-mono text-white">System Settings & Decision Thresholds</h1>
      </div>
      <p className="text-xs sm:text-sm text-slate-400">Configure prototype decision-support parameters, telemetry alert triggers, and maintenance dispatch rules.</p>

      {/* Decision-Support Thresholds Configuration */}
      <div className="industrial-panel p-6 space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">
          Configurable Equipment Health Score Thresholds
        </h2>
        <p className="text-xs text-slate-400">
          These bands represent prototype decision-support thresholds designed for operational triage and early anomaly detection.
        </p>

        <form onSubmit={handleSaveThresholds} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1">
                Healthy Lower Bound (pts)
              </label>
              <input
                type="number"
                value={healthyThreshold}
                onChange={(e) => setHealthyThreshold(Number(e.target.value))}
                className="w-full bg-[#080C16] border border-[#223048] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Default: 88–100 pts (Healthy)</span>
            </div>

            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1">
                Stable Lower Bound (pts)
              </label>
              <input
                type="number"
                value={stableThreshold}
                onChange={(e) => setStableThreshold(Number(e.target.value))}
                className="w-full bg-[#080C16] border border-[#223048] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Default: 70–87 pts (Stable)</span>
            </div>

            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1">
                Warning Lower Bound (pts)
              </label>
              <input
                type="number"
                value={warningThreshold}
                onChange={(e) => setWarningThreshold(Number(e.target.value))}
                className="w-full bg-[#080C16] border border-[#223048] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Default: 45–69 pts (&lt;45 = Critical)</span>
            </div>
          </div>

          <div className="flex items-center space-x-3 pt-2">
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition shadow-glow-cyan flex items-center space-x-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Configuration</span>
            </button>
            {saved && (
              <span className="text-xs text-emerald-400 flex items-center space-x-1 font-medium font-mono">
                <CheckCircle2 className="w-4 h-4" />
                <span>Thresholds saved successfully</span>
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Database Reset & Re-Seed */}
      <div className="industrial-panel p-6 border-l-4 border-l-rose-500 space-y-3">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">
          Fleet Telemetry Database Reset & Re-Seed
        </h2>
        <p className="text-xs text-slate-400">
          Resets all SQLite tables (`machines`, `sensor_readings`, `alert_events`, `maintenance_actions`, `health_history`) and re-seeds a fresh fleet of 24 machines.
        </p>

        <button
          onClick={handleFullReset}
          disabled={resetting}
          className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition shadow-glow-rose flex items-center space-x-2"
        >
          <RotateCcw className={`w-4 h-4 ${resetting ? 'animate-spin' : ''}`} />
          <span>{resetting ? 'Re-seeding Database...' : 'Reset Fleet & Re-Seed Database'}</span>
        </button>
      </div>
    </div>
  );
}
