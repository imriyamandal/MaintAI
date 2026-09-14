import React, { useState, useEffect } from 'react';
import { 
  Server, AlertTriangle, ShieldCheck, Activity, TrendingDown, 
  DollarSign, Clock, ArrowUpRight, Search, Filter, RefreshCw, Eye,
  Sparkles, Wrench, Shield, CheckCircle2, AlertOctagon, HelpCircle
} from 'lucide-react';
import { 
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from 'recharts';
import { api } from '../services/api';

export default function Dashboard({ 
  fleetSummary, 
  machines = [], 
  onSelectMachine, 
  onNavigateTab, 
  loading,
  onRefresh 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState('All');
  const [topRecommendations, setTopRecommendations] = useState([]);

  useEffect(() => {
    const fetchTopPrescriptions = async () => {
      try {
        const res = await api.getRecommendations(null, null, 3);
        setTopRecommendations(res.recommendations || []);
      } catch (e) {
        console.error("Failed to load top recommendations:", e);
      }
    };
    fetchTopPrescriptions();
  }, [fleetSummary]);

  const filteredMachines = machines.filter((m) => {
    const matchesSearch = m.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          m.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRisk = riskFilter === 'All' || m.risk_level.toLowerCase() === riskFilter.toLowerCase();
    return matchesSearch && matchesRisk;
  });

  const distributionData = fleetSummary ? [
    { name: 'Healthy (88-100)', value: fleetSummary.healthy_machines, color: '#10B981' },
    { name: 'Stable (70-87)', value: fleetSummary.stable_machines, color: '#06B6D4' },
    { name: 'Warning (45-69)', value: fleetSummary.warning_machines, color: '#F59E0B' },
    { name: 'Critical (0-44)', value: fleetSummary.critical_machines, color: '#EF4444' },
  ] : [];

  // Risk ranking top 7 lowest health machines
  const riskRankingData = [...machines]
    .sort((a, b) => a.health_score - b.health_score)
    .slice(0, 7)
    .map((m) => ({
      id: m.id,
      health: m.health_score,
      failureProb: Number((m.failure_probability * 100).toFixed(1)),
      risk: m.risk_level
    }));

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
      {/* Header Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center space-x-2 font-mono">
            <span>Fleet Command Center</span>
            <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              Active Telemetry Stream
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">Continuous AI health scoring, multi-factor confidence trust validation, and prescriptive maintenance directives.</p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onRefresh}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#141D30] hover:bg-[#1E2B45] text-slate-200 text-xs font-medium border border-[#223048] transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Refresh Telemetry</span>
          </button>
        </div>
      </div>

      {/* 4-Question Industrial Framework Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-gradient-to-r from-[#0E1526] via-[#141D30] to-[#0E1526] p-4 rounded-xl border border-cyan-500/30">
        <div className="flex items-start space-x-3 p-2">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex-shrink-0">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">1. WHAT is happening?</div>
            <div className="text-xs font-semibold text-white mt-0.5">Composite Health & Degradation</div>
            <div className="text-[11px] text-slate-400">Avg Fleet Health: <span className="text-emerald-400 font-mono font-bold">{fleetSummary?.average_health_score ?? 91.2}</span></div>
          </div>
        </div>

        <div className="flex items-start space-x-3 p-2">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 flex-shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">2. WHY is it happening?</div>
            <div className="text-xs font-semibold text-white mt-0.5">Physics SHAP Root Causes</div>
            <div className="text-[11px] text-slate-400">Tool wear, thermal drift, torque load</div>
          </div>
        </div>

        <div className="flex items-start space-x-3 p-2">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex-shrink-0">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">3. HOW CONFIDENT is AI?</div>
            <div className="text-xs font-semibold text-white mt-0.5">4-Factor Trust Index</div>
            <div className="text-[11px] text-slate-400">Bounds, variance, completeness & calibration</div>
          </div>
        </div>

        <div className="flex items-start space-x-3 p-2">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 flex-shrink-0">
            <Wrench className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">4. WHAT SHOULD WE DO?</div>
            <div className="text-xs font-semibold text-white mt-0.5">Prescriptive Action Orders</div>
            <div className="text-[11px] text-slate-400">Strict SLA windows, SOPs & spare parts</div>
          </div>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        {/* Total Machines */}
        <div className="industrial-panel p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-medium uppercase tracking-wider">Total Fleet</span>
            <Server className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-bold font-mono text-white">{fleetSummary?.total_machines ?? machines.length ?? 24}</div>
            <div className="text-[10px] text-slate-400">Monitored Assets</div>
          </div>
        </div>

        {/* Healthy Machines */}
        <div className="industrial-panel p-3.5 flex flex-col justify-between border-l-2 border-l-emerald-500">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-medium uppercase tracking-wider">Healthy</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">{fleetSummary?.healthy_machines ?? 18}</div>
            <div className="text-[10px] text-emerald-500/80">88–100 Health Score</div>
          </div>
        </div>

        {/* Stable Machines */}
        <div className="industrial-panel p-3.5 flex flex-col justify-between border-l-2 border-l-cyan-500">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-medium uppercase tracking-wider">Stable</span>
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-bold font-mono text-cyan-400">{fleetSummary?.stable_machines ?? 4}</div>
            <div className="text-[10px] text-cyan-500/80">70–87 Health Score</div>
          </div>
        </div>

        {/* Warning Machines */}
        <div className="industrial-panel p-3.5 flex flex-col justify-between border-l-2 border-l-amber-500">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-medium uppercase tracking-wider">Warning</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-bold font-mono text-amber-400">{fleetSummary?.warning_machines ?? 1}</div>
            <div className="text-[10px] text-amber-500/80">45–69 Degradation</div>
          </div>
        </div>

        {/* Critical Machines */}
        <div className="industrial-panel p-3.5 flex flex-col justify-between border-l-2 border-l-rose-500">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-medium uppercase tracking-wider">Critical</span>
            <AlertOctagon className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-bold font-mono text-rose-400">{fleetSummary?.critical_machines ?? 1}</div>
            <div className="text-[10px] text-rose-500/80">&lt;45 Failure Risk</div>
          </div>
        </div>

        {/* Average Health Score */}
        <div className="industrial-panel p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-medium uppercase tracking-wider">Avg Health</span>
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-bold font-mono text-cyan-300">{fleetSummary?.average_health_score ?? 91.2}</div>
            <div className="text-[10px] text-cyan-400/80">Fleet Composite Index</div>
          </div>
        </div>

        {/* Active Alerts */}
        <div className="industrial-panel p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-medium uppercase tracking-wider">Active Alerts</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-bold font-mono text-amber-300">{fleetSummary?.active_alerts_count ?? 4}</div>
            <div className="text-[10px] text-slate-400">Unresolved Events</div>
          </div>
        </div>

        {/* Avoidable Downtime & Savings */}
        <div className="industrial-panel p-3.5 flex flex-col justify-between bg-gradient-to-br from-[#0E1526] to-[#141A38] border-indigo-500/30">
          <div className="flex items-center justify-between text-indigo-300">
            <span className="text-[11px] font-medium uppercase tracking-wider">Avoided DT</span>
            <DollarSign className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="mt-2">
            <div className="text-lg sm:text-xl font-bold font-mono text-indigo-200">
              {fleetSummary?.avoidable_downtime_hours_est ?? 16.5}h
            </div>
            <div className="text-[9px] text-indigo-300/80 truncate">
              ${((fleetSummary?.cost_savings_est_usd ?? 46200) / 1000).toFixed(1)}k Saved (Est.)
            </div>
          </div>
        </div>
      </div>

      {/* Top Prescriptive Directives Widget */}
      {topRecommendations.length > 0 && (
        <div className="industrial-panel p-5 border-l-4 border-l-cyan-500">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
            <div className="flex items-center space-x-2">
              <Wrench className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                Top Prescriptive Directives (Urgent SLA Action Required)
              </h2>
            </div>
            <button
              onClick={() => onNavigateTab('prescriptive')}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 font-medium"
            >
              <span>Open Prescriptive Center</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {topRecommendations.map((rec) => {
              const act = rec.prescriptive_action || rec.prescriptive_plan || {};
              return (
                <div
                  key={rec.machine_id}
                  onClick={() => onSelectMachine(rec.machine_id)}
                  className="p-3.5 rounded-lg bg-[#0E1526] border border-[#223048] hover:border-cyan-500/50 cursor-pointer transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-white text-xs">{rec.machine_id} • {rec.machine_name}</span>
                    <span className="px-1.5 py-0.2 text-[10px] font-bold rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                      {act.priority || 'P1-Critical'}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-cyan-200 mt-2 line-clamp-1">
                    {act.action || act.recommended_action || 'Component Inspection'}
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#1E2B45] text-[11px]">
                    <span className="text-amber-400 font-mono flex items-center space-x-1">
                      <Clock className="w-3 h-3 inline mr-1" />
                      SLA: {act.sla_window || act.suggested_timeframe || '< 2h'}
                    </span>
                    <span className="text-emerald-400 font-mono font-semibold">
                      Conf: {rec.confidence_score}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Visual Analytics Grid: Distribution & Risk Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fleet Health Distribution Chart */}
        <div className="industrial-panel p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">Fleet Health Distribution</h2>
              <p className="text-xs text-slate-400">Equipment categorized by composite health score</p>
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#070A10" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(val, name) => [`${val} Units (${((val / (fleetSummary?.total_machines || 24)) * 100).toFixed(0)}%)`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-[#223048] text-xs">
            {distributionData.map((d) => (
              <div key={d.name} className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-slate-300 truncate">{d.name.split(' ')[0]}:</span>
                <span className="font-bold text-white font-mono">{d.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Machine Risk Ranking Chart */}
        <div className="industrial-panel p-5 lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">Asset Risk Ranking (Lowest Health Scores)</h2>
              <p className="text-xs text-slate-400">Real-time health index & failure probability forecast</p>
            </div>
            <button
              onClick={() => onNavigateTab('prescriptive')}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
            >
              <span>Prescriptive Queue</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskRankingData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1D2840" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} stroke="#64748B" fontSize={11} tickFormatter={(v) => `${v}`} />
                <YAxis dataKey="id" type="category" stroke="#94A3B8" fontSize={12} width={50} fontVariant="mono" />
                <Tooltip 
                  formatter={(val, name) => [
                    name === 'health' ? `${val}/100 Health Score` : `${val}% Failure Probability`,
                    name === 'health' ? 'Health Score' : 'Failure Risk'
                  ]}
                />
                <Bar dataKey="health" name="health" fill="#06B6D4" radius={[0, 4, 4, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Fleet Equipment Table */}
      <div className="industrial-panel p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <span>Monitored Industrial Fleet Status</span>
              <span className="text-xs font-mono text-slate-400 font-normal">({filteredMachines.length} assets)</span>
            </h2>
            <p className="text-xs text-slate-400">Click any machine to inspect real-time sensor streams, timeline, and SHAP explainability.</p>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 sm:w-56">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search Machine ID, type, bay..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-[#080C16] text-xs text-slate-200 pl-9 pr-3 py-2 rounded-lg border border-[#223048] focus:outline-none focus:border-cyan-500 w-full"
              />
            </div>

            <div className="flex items-center space-x-1.5 text-xs text-slate-400">
              <Filter className="w-3.5 h-3.5" />
              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className="bg-[#080C16] text-xs text-slate-200 px-2.5 py-2 rounded-lg border border-[#223048] focus:outline-none focus:border-cyan-500"
              >
                <option value="All">All Risk Levels</option>
                <option value="Healthy">Healthy</option>
                <option value="Stable">Stable</option>
                <option value="Warning">Warning</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
          </div>
        </div>

        {/* High Density Responsive Table */}
        <div className="overflow-x-auto rounded-lg border border-[#223048]">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead className="bg-[#0E1526] text-slate-400 uppercase tracking-wider font-semibold border-b border-[#223048]">
              <tr>
                <th className="py-3 px-4">Machine ID</th>
                <th className="py-3 px-4">Category & Bay</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Health Score</th>
                <th className="py-3 px-4">Failure Prob</th>
                <th className="py-3 px-4">Risk Level</th>
                <th className="py-3 px-4">AI Confidence</th>
                <th className="py-3 px-4">Top Risk Factor</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A263C] bg-[#0A0F1D]/80">
              {filteredMachines.map((m) => {
                const isM17 = m.id === 'M-017';
                return (
                  <tr
                    key={m.id}
                    id={`machine-row-${m.id}`}
                    onClick={() => onSelectMachine(m.id)}
                    className={`hover:bg-[#141D30] cursor-pointer transition ${
                      isM17 ? 'bg-cyan-950/20 border-l-2 border-l-cyan-400' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-mono font-bold text-white flex items-center space-x-2">
                      <span>{m.id}</span>
                      {isM17 && (
                        <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                          DEMO
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-200 font-medium">{m.name}</div>
                      <div className="text-slate-400 text-[11px]">{m.location}</div>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      <span className="px-2 py-0.5 rounded bg-[#141D30] text-slate-300 font-semibold border border-[#223048]">
                        Type {m.type}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-[#080C14] rounded-full h-2 overflow-hidden border border-[#223048]">
                          <div
                            className={`h-full rounded-full ${
                              m.health_score >= 88 ? 'bg-emerald-400' :
                              m.health_score >= 70 ? 'bg-cyan-400' :
                              m.health_score >= 45 ? 'bg-amber-400' : 'bg-rose-500'
                            }`}
                            style={{ width: `${m.health_score}%` }}
                          />
                        </div>
                        <span className="font-mono font-bold text-slate-100">{m.health_score}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      <span className={m.failure_probability > 0.4 ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                        {(m.failure_probability * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-4">{getRiskBadge(m.risk_level)}</td>
                    <td className="py-3 px-4 font-mono text-emerald-400 font-semibold">
                      {m.confidence_score ? `${m.confidence_score}%` : '94.0%'}
                    </td>
                    <td className="py-3 px-4 text-slate-300 max-w-xs truncate">
                      {m.top_risk_factor || 'Nominal'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectMachine(m.id);
                        }}
                        className="p-1.5 rounded-lg bg-[#141D30] hover:bg-cyan-500/20 hover:text-cyan-300 text-slate-400 transition border border-[#223048]"
                        title="View Detailed Telemetry"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
