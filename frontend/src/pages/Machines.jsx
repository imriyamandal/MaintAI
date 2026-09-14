import React, { useState } from 'react';
import { Server, Search, Filter, Eye, Activity, ShieldCheck, AlertTriangle, LayoutGrid, List, Info } from 'lucide-react';

export default function Machines({ machines = [], onSelectMachine, onNavigateTab }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'

  const categories = ['All', ...new Set(machines.map((m) => m.category).filter(Boolean))];

  const filteredMachines = machines.filter((m) => {
    const matchesSearch = m.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          m.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRisk = riskFilter === 'All' || m.risk_level.toLowerCase() === riskFilter.toLowerCase();
    const matchesCat = categoryFilter === 'All' || m.category === categoryFilter;
    return matchesSearch && matchesRisk && matchesCat;
  });

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
            <Server className="w-6 h-6 text-cyan-400" />
            <span>Industrial Equipment Fleet Registry</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">Complete multi-axis telemetry registry for CNC machining centers, stamping presses, and lathe stations.</p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center space-x-1 bg-[#080C16] p-1 rounded-lg border border-[#223048]">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded transition ${viewMode === 'grid' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
            title="Card Grid View"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`p-1.5 rounded transition ${viewMode === 'table' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
            title="High-Density Table View"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="industrial-panel p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3 flex-1 min-w-[240px]">
          <div className="relative w-full max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by Machine ID, model, location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#080C16] text-xs text-slate-200 pl-9 pr-3 py-2 rounded-lg border border-[#223048] focus:outline-none focus:border-cyan-500 w-full"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-1.5 text-xs text-slate-400">
            <span>Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-[#080C16] text-xs text-slate-200 px-2.5 py-1.5 rounded-lg border border-[#223048] focus:outline-none focus:border-cyan-500"
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-1.5 text-xs text-slate-400">
            <span>Risk:</span>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="bg-[#080C16] text-xs text-slate-200 px-2.5 py-1.5 rounded-lg border border-[#223048] focus:outline-none focus:border-cyan-500"
            >
              <option value="All">All Risks</option>
              <option value="Healthy">Healthy</option>
              <option value="Stable">Stable</option>
              <option value="Warning">Warning</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
        </div>
      </div>

      {/* View Mode: Card Grid */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMachines.map((m) => {
            const isM17 = m.id === 'M-017';
            return (
              <div
                key={m.id}
                onClick={() => onSelectMachine(m.id)}
                className={`industrial-card p-4 cursor-pointer hover:border-cyan-500/50 flex flex-col justify-between ${
                  isM17 ? 'border-cyan-500/60 bg-cyan-950/15 shadow-glow-cyan' : ''
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-white text-base">{m.id}</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#141D30] text-slate-300 font-mono border border-[#223048]">
                        Type {m.type}
                      </span>
                      {isM17 && (
                        <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                          DEMO TARGET
                        </span>
                      )}
                    </div>
                    {getRiskBadge(m.risk_level)}
                  </div>

                  <div className="text-sm font-semibold text-slate-200">{m.name}</div>
                  <div className="text-xs text-slate-400">{m.category} • {m.location}</div>

                  <div className="mt-4 pt-3 border-t border-[#223048] grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <div className="text-slate-400 text-[10px] uppercase">Health</div>
                      <div className="font-mono font-bold text-slate-100 text-sm">{m.health_score}/100</div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-[10px] uppercase">Failure Prob</div>
                      <div className="font-mono font-bold text-rose-400 text-sm">{(m.failure_probability * 100).toFixed(1)}%</div>
                    </div>
                    <div title="Estimated equipment/tool wear life derived from the current wear and operating-stress model. This is a decision-support estimate and not a certified remaining-useful-life measurement.">
                      <div className="text-slate-400 text-[10px] uppercase cursor-help flex items-center space-x-0.5">
                        <span>Wear Life</span>
                        <Info className="w-2.5 h-2.5 text-slate-500" />
                      </div>
                      <div className="font-mono font-bold text-cyan-300 text-sm">{Math.round(m.rul_minutes || 1440)}m</div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-2 border-t border-[#223048] flex items-center justify-between text-xs text-slate-400">
                  <span className="truncate max-w-[170px]">Driver: {m.top_risk_factor || 'Nominal'}</span>
                  <span className="text-cyan-400 hover:text-cyan-300 font-medium flex items-center space-x-1">
                    <span>Inspect</span>
                    <Eye className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* View Mode: Table */
        <div className="industrial-panel p-5 overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead className="bg-[#0E1526] text-slate-400 uppercase tracking-wider font-semibold border-b border-[#223048]">
              <tr>
                <th className="py-3 px-4">Machine ID</th>
                <th className="py-3 px-4">Category & Location</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Health Score</th>
                <th className="py-3 px-4">Failure Prob</th>
                <th className="py-3 px-4">Risk Level</th>
                <th className="py-3 px-4">AI Confidence</th>
                <th className="py-3 px-4">Top Driver</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A263C] bg-[#0A0F1D]/80">
              {filteredMachines.map((m) => (
                <tr
                  key={m.id}
                  onClick={() => onSelectMachine(m.id)}
                  className="hover:bg-[#141D30] cursor-pointer transition"
                >
                  <td className="py-3 px-4 font-mono font-bold text-white">{m.id}</td>
                  <td className="py-3 px-4">
                    <div className="text-slate-200 font-medium">{m.name}</div>
                    <div className="text-slate-400 text-[11px]">{m.location}</div>
                  </td>
                  <td className="py-3 px-4 font-mono">Type {m.type}</td>
                  <td className="py-3 px-4 font-mono font-bold">{m.health_score}/100</td>
                  <td className="py-3 px-4 font-mono text-rose-400">{(m.failure_probability * 100).toFixed(1)}%</td>
                  <td className="py-3 px-4">{getRiskBadge(m.risk_level)}</td>
                  <td className="py-3 px-4 font-mono text-emerald-400">{m.confidence_score}%</td>
                  <td className="py-3 px-4 text-slate-300 max-w-xs truncate">{m.top_risk_factor || 'Nominal'}</td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectMachine(m.id);
                      }}
                      className="p-1.5 rounded-lg bg-[#141D30] hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 transition"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
