import React, { useState } from 'react';
import { 
  Activity, Play, RotateCcw, FastForward, Radio, Menu, X, 
  Search, ShieldCheck, CheckCircle2, ChevronDown
} from 'lucide-react';

export default function Header({ 
  currentStep, 
  onStepChange, 
  onReset, 
  simSpeed,
  setSimSpeed,
  mobileMenuOpen,
  setMobileMenuOpen,
  machines = [],
  selectedMachineId,
  onSelectMachine,
  apiOnline = true
}) {
  const [resetting, setResetting] = useState(false);

  const steps = [
    { num: 1, label: "1. Baseline", short: "1", desc: "Healthy Nominal (94)", badge: "Healthy" },
    { num: 2, label: "2. Thermal Drift", short: "2", desc: "Thermal Drift Warning (64)", badge: "Warning" },
    { num: 3, label: "3. Torque Spike", short: "3", desc: "Critical Overload (22)", badge: "Critical" },
    { num: 4, label: "4. Restored", short: "4", desc: "Post-Maintenance Restored (95)", badge: "Restored" },
  ];

  const handleResetClick = async () => {
    setResetting(true);
    await onReset();
    setResetting(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0A0F1D]/95 backdrop-blur-md industrial-header-border px-4 lg:px-6 py-2.5">
      <div className="flex items-center justify-between gap-3">
        {/* Left: Hamburger (Mobile) + Brand */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-1.5 rounded-lg bg-[#141D30] hover:bg-[#1E2B45] text-slate-300 hover:text-white border border-[#223048] transition"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-cyan-400" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center space-x-2.5 cursor-pointer" onClick={() => onStepChange && onStepChange(currentStep)}>
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 via-indigo-600 to-indigo-700 flex items-center justify-center shadow-glow-cyan flex-shrink-0">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-lg font-extrabold tracking-tight text-white font-mono">
                  Maint<span className="text-cyan-400">AI</span>
                </span>
                <span className="hidden sm:inline-block px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  PS-19
                </span>
              </div>
              <p className="hidden md:block text-[11px] text-slate-400 leading-tight">Predictive & Prescriptive Health Platform</p>
            </div>
          </div>
        </div>

        {/* Center: Live Demo Simulation Controller */}
        <div className="flex items-center gap-1.5 sm:gap-2 bg-[#0E1526] px-2 sm:px-3 py-1.5 rounded-xl border border-[#223048] shadow-inner">
          <div className="hidden xl:flex items-center space-x-1.5 mr-1 text-left">
            <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <div>
              <div className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider">DEMO SCENARIO</div>
              <div className="text-[9px] text-slate-400">Asset: M-017</div>
            </div>
          </div>

          {/* Scenario Step Buttons */}
          <div className="flex items-center space-x-1 bg-[#080C16] p-1 rounded-lg border border-[#1A263C]">
            {steps.map((s) => {
              const active = currentStep === s.num;
              return (
                <button
                  key={s.num}
                  id={`demo-step-${s.num}-btn`}
                  onClick={() => onStepChange(s.num)}
                  className={`px-2 sm:px-2.5 py-1 text-xs font-mono font-medium rounded transition-all flex items-center space-x-1 ${
                    active 
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-glow-cyan' 
                      : 'text-slate-300 hover:text-white hover:bg-[#1E2B45]'
                  }`}
                  title={s.desc}
                >
                  <span className="hidden md:inline">{s.label}</span>
                  <span className="md:hidden font-bold">{s.short}</span>
                </button>
              );
            })}
          </div>

          {/* Next Step Action Button */}
          <button
            id="demo-next-step-btn"
            onClick={() => onStepChange(currentStep < 4 ? currentStep + 1 : 1)}
            className="px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center space-x-1 border border-indigo-400/30 transition shadow-sm flex-shrink-0"
            title="Advance Scenario"
          >
            <Play className="w-3 h-3 fill-current" />
            <span className="hidden sm:inline">Next</span>
          </button>

          {/* Speed Multiplier */}
          <div className="hidden sm:flex items-center space-x-1 text-xs text-slate-400 bg-[#080C16] px-2 py-1 rounded border border-[#1A263C]">
            <FastForward className="w-3 h-3 text-slate-400" />
            <select
              value={simSpeed}
              onChange={(e) => setSimSpeed(Number(e.target.value))}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer text-xs"
              aria-label="Simulation speed"
            >
              <option value={1} className="bg-[#0E1526]">1x</option>
              <option value={2} className="bg-[#0E1526]">2x</option>
              <option value={5} className="bg-[#0E1526]">5x</option>
            </select>
          </div>

          {/* Reset Scenario Button */}
          <button
            id="demo-reset-btn"
            onClick={handleResetClick}
            disabled={resetting}
            className="p-1.5 rounded-lg bg-[#141D30] hover:bg-[#1E2B45] text-slate-300 hover:text-white border border-[#223048] transition"
            title="Reset Fleet Telemetry"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>

        {/* Right: Quick Machine Selector & Status Badge */}
        <div className="flex items-center space-x-2">
          {machines && machines.length > 0 && onSelectMachine && (
            <div className="hidden lg:flex items-center space-x-1.5 text-xs bg-[#0E1526] px-2.5 py-1 rounded-lg border border-[#223048]">
              <span className="text-slate-400 text-[11px]">Asset:</span>
              <select
                value={selectedMachineId || 'M-017'}
                onChange={(e) => onSelectMachine(e.target.value)}
                className="bg-transparent text-cyan-300 font-mono font-bold focus:outline-none cursor-pointer text-xs"
                aria-label="Quick select machine"
              >
                {machines.map((m) => (
                  <option key={m.id} value={m.id} className="bg-[#0E1526] text-white">
                    {m.id} • Health {m.health_score} ({m.risk_level})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center space-x-1 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono">
            <span className={`w-2 h-2 rounded-full ${apiOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
            <span className="hidden sm:inline">{apiOnline ? 'LIVE ML' : 'DISCONNECTED'}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
