import React, { useState, useEffect } from 'react';
import { 
  Wrench, AlertOctagon, Clock, ShieldAlert, CheckCircle2, 
  ChevronRight, Filter, RefreshCw, Cpu, Layers, FileText, 
  ArrowUpRight, AlertTriangle, CheckSquare, Sparkles, Send
} from 'lucide-react';
import { api } from '../services/api';

export default function PrescriptiveCenter({ onSelectMachine }) {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [selectedAction, setSelectedAction] = useState(null);
  const [actionStatuses, setActionStatuses] = useState({});

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      const res = await api.getRecommendations(null, priorityFilter === 'All' ? null : priorityFilter);
      const list = res.recommendations || [];
      setRecommendations(list);
      if (list.length > 0) {
        if (!selectedAction || !list.find(r => r.machine_id === selectedAction.machine_id)) {
          setSelectedAction(list[0]);
        }
      } else {
        setSelectedAction(null);
      }
    } catch (err) {
      console.error("Failed to load prescriptive actions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, [priorityFilter]);

  const handleStatusChange = (machineId, newStatus) => {
    setActionStatuses(prev => ({
      ...prev,
      [machineId]: newStatus
    }));
  };

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

  const p1Count = recommendations.filter(r => (r.prescriptive_action?.priority || r.prescriptive_plan?.priority || r.priority) === 'P1-Critical').length;
  const p2Count = recommendations.filter(r => (r.prescriptive_action?.priority || r.prescriptive_plan?.priority || r.priority) === 'P2-Urgent').length;
  const p3Count = recommendations.filter(r => (r.prescriptive_action?.priority || r.prescriptive_plan?.priority || r.priority) === 'P3-Scheduled').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Wrench className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold font-mono text-white tracking-tight">Prescriptive Maintenance Center</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Defensible, AI-prescribed work orders with strict SLA execution windows, target components, spare parts, and SOPs.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchRecommendations}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#141D30] hover:bg-[#1E2B45] text-slate-300 border border-[#223048] text-xs font-medium transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="industrial-panel p-4 border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">P1-Critical Orders</span>
            <AlertOctagon className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-400 mt-1">{p1Count}</div>
          <div className="text-[11px] text-slate-400 mt-1">SLA: Immediate / &lt; 2h</div>
        </div>

        <div className="industrial-panel p-4 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">P2-Urgent Orders</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-1">{p2Count}</div>
          <div className="text-[11px] text-slate-400 mt-1">SLA: Within 12 Hours</div>
        </div>

        <div className="industrial-panel p-4 border-l-4 border-l-cyan-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">P3-Scheduled</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">{p3Count}</div>
          <div className="text-[11px] text-slate-400 mt-1">SLA: Next 48-72 Hours</div>
        </div>

        <div className="industrial-panel p-4 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Fleet Coverage</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">100%</div>
          <div className="text-[11px] text-slate-400 mt-1">24 Monitored Assets</div>
        </div>
      </div>

      {/* Main Content Layout: Orders List & Deep Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Work Orders List */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Priority Filter</span>
            </div>
            <div className="flex space-x-1 bg-[#080C16] p-1 rounded-lg border border-[#223048]">
              {['All', 'P1-Critical', 'P2-Urgent', 'P3-Scheduled', 'P4-Advisory'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPriorityFilter(p)}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition ${
                    priorityFilter === p
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {p.replace('-Critical', '').replace('-Urgent', '').replace('-Scheduled', '').replace('-Advisory', '')}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
            {loading ? (
              <div className="industrial-panel p-8 text-center text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cyan-400 mb-2" />
                <span>Evaluating fleet prescriptive intelligence...</span>
              </div>
            ) : recommendations.length === 0 ? (
              <div className="industrial-panel p-8 text-center text-slate-400">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="font-semibold text-white">No Prescriptive Orders for Selected Filter</p>
                <p className="text-xs mt-1">All machines in this category are operating within nominal parameters.</p>
              </div>
            ) : (
              recommendations.map((rec) => {
                const action = rec.prescriptive_action || rec.prescriptive_plan || {};
                const isSelected = selectedAction?.machine_id === rec.machine_id;
                const status = actionStatuses[rec.machine_id] || 'DISPATCH_READY';

                return (
                  <div
                    key={rec.machine_id}
                    onClick={() => setSelectedAction(rec)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#0E1526] border-cyan-500 shadow-glow-cyan'
                        : 'bg-[#0A0F1D] border-[#223048] hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-white text-sm">{rec.machine_id}</span>
                        <span className="text-xs text-slate-400">• {rec.machine_name}</span>
                      </div>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase border ${getPriorityBadge(action.priority || rec.priority)}`}>
                        {action.priority || rec.priority || 'P4-Advisory'}
                      </span>
                    </div>

                    <div className="mt-2.5">
                      <div className="text-sm font-semibold text-cyan-200">
                        {action.action || action.recommended_action || 'Routine Maintenance'}
                      </div>
                      <div className="text-xs text-slate-400 mt-1 line-clamp-2">
                        Target: <span className="text-slate-200 font-medium">{action.target_component || 'General Assembly'}</span>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-[#1E2B45] flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-1.5 text-amber-400 font-mono font-medium">
                        <Clock className="w-3.5 h-3.5" />
                        <span>SLA: {action.sla_window || action.suggested_timeframe || 'Next Shift'}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-slate-400 font-mono">
                        <span>AI Conf:</span>
                        <span className="text-emerald-400 font-bold">{rec.confidence_score || action.confidence_score || 94}%</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Selected Work Order Details */}
        <div className="lg:col-span-6">
          {selectedAction ? (
            <div className="industrial-panel p-5 sm:p-6 space-y-5 sticky top-20">
              {/* Card Header */}
              <div className="flex items-start justify-between pb-4 border-b border-[#223048]">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-1 text-xs font-mono font-bold rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                      {selectedAction.machine_id}
                    </span>
                    <span className="text-base font-bold text-white">{selectedAction.machine_name}</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Health Score: <span className="font-mono text-white font-bold">{selectedAction.health_score}/100</span> • Risk: <span className="text-rose-400 font-mono font-bold">{(selectedAction.failure_probability * 100).toFixed(1)}%</span>
                  </div>
                </div>

                <button
                  onClick={() => onSelectMachine(selectedAction.machine_id)}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-[#141D30] hover:bg-[#1E2B45] text-cyan-300 border border-[#223048] text-xs font-medium transition"
                >
                  <span>Open Twin</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Action & SLA Callout */}
              <div className="bg-gradient-to-r from-[#0E1526] to-[#141D30] p-4 rounded-xl border border-cyan-500/30">
                <div className="flex items-center justify-between text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1">
                  <div className="flex items-center space-x-1.5">
                    <Sparkles className="w-4 h-4" />
                    <span>AI Prescribed Directive</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] border ${getPriorityBadge(selectedAction.prescriptive_action?.priority || selectedAction.priority)}`}>
                    {selectedAction.prescriptive_action?.priority || selectedAction.priority}
                  </span>
                </div>
                <div className="text-base font-bold text-white mt-1">
                  {selectedAction.prescriptive_action?.action || selectedAction.prescriptive_action?.recommended_action || 'Routine Maintenance'}
                </div>
                <div className="flex items-center space-x-2 mt-2 text-xs font-mono text-amber-300">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Execution SLA Window: {selectedAction.prescriptive_action?.sla_window || selectedAction.prescriptive_action?.suggested_timeframe}</span>
                </div>
              </div>

              {/* Target Component & Required Spare Parts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-[#0E1526] p-4 rounded-xl border border-[#223048]">
                  <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300 mb-2">
                    <Cpu className="w-4 h-4 text-indigo-400" />
                    <span>Target Subsystem</span>
                  </div>
                  <div className="text-sm font-semibold text-white">
                    {selectedAction.prescriptive_action?.target_component || 'Spindle Assembly'}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Diagnosed Root Cause: <span className="text-cyan-300 font-mono">{selectedAction.predicted_failure_type || 'Mechanical Degradation'}</span>
                  </div>
                </div>

                <div className="bg-[#0E1526] p-4 rounded-xl border border-[#223048]">
                  <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300 mb-2">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    <span>Required Spare Parts</span>
                  </div>
                  <div className="space-y-1">
                    {selectedAction.prescriptive_action?.parts_required && selectedAction.prescriptive_action.parts_required.length > 0 ? (
                      selectedAction.prescriptive_action.parts_required.map((part, idx) => (
                        <div key={idx} className="text-xs font-mono text-slate-300 bg-[#141D30] px-2 py-1 rounded border border-[#223048]">
                          • {part}
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400">Standard factory toolkit</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Standard Operating Procedure (SOP) Checklist */}
              {selectedAction.prescriptive_action?.sop_steps && (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
                    <FileText className="w-4 h-4 text-cyan-400" />
                    <span>Standard Operating Procedure (SOP Checklist)</span>
                  </div>
                  <div className="space-y-2 bg-[#0E1526] p-4 rounded-xl border border-[#223048]">
                    {selectedAction.prescriptive_action.sop_steps.map((step, idx) => (
                      <div key={idx} className="flex items-start space-x-3 text-xs text-slate-300">
                        <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center justify-center font-mono font-bold flex-shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span className="leading-relaxed">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Safety Fallback */}
              {selectedAction.prescriptive_action?.safety_fallback && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start space-x-3">
                  <ShieldAlert className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-rose-300 uppercase tracking-wider">Safety Interlock Fallback</div>
                    <div className="text-xs text-slate-300 mt-0.5">
                      {selectedAction.prescriptive_action.safety_fallback}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Dispatcher Footer */}
              <div className="pt-4 border-t border-[#223048] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs text-slate-400">
                  Status: <span className="font-semibold text-cyan-300">{actionStatuses[selectedAction.machine_id] || 'Ready for Dispatch'}</span>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleStatusChange(selectedAction.machine_id, 'IN_PROGRESS')}
                    className="px-3 py-1.5 rounded-lg bg-[#141D30] hover:bg-[#1E2B45] text-slate-200 border border-[#223048] text-xs font-medium transition"
                  >
                    Mark In Progress
                  </button>
                  <button
                    onClick={() => handleStatusChange(selectedAction.machine_id, 'DISPATCHED_TO_TECHNICIAN')}
                    className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold shadow-glow-cyan transition flex items-center space-x-1.5"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Dispatch Work Order</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="industrial-panel p-12 text-center text-slate-400">
              <Wrench className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-300">Select a Prescriptive Action Order</p>
              <p className="text-xs text-slate-500 mt-1">Click on any work order on the left to view detailed SOPs, required spare parts, and execution SLAs.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
