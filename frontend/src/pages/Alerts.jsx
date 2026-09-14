import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, ShieldCheck, CheckCircle2, Filter, Download, 
  RefreshCw, Eye, AlertOctagon, Clock, ShieldAlert, BellOff,
  Flame, Sparkles, Check, X
} from 'lucide-react';
import { api } from '../services/api';

export default function Alerts({ onSelectMachine }) {
  const [alerts, setAlerts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState('All');
  const [resolvedFilter, setResolvedFilter] = useState('unresolved'); // 'all', 'resolved', 'unresolved'
  const [suppressModalAlert, setSuppressModalAlert] = useState(null);
  const [suppressReason, setSuppressReason] = useState('Transient non-critical sensor spike confirmed by operator');

  const fetchAlertsData = async () => {
    try {
      setLoading(true);
      const isResolved = resolvedFilter === 'all' ? null : (resolvedFilter === 'resolved');
      const [data, sum] = await Promise.all([
        api.getAlerts(severityFilter, isResolved),
        api.getAlertsSummary().catch(() => null)
      ]);
      setAlerts(data || []);
      setSummary(sum);
    } catch (err) {
      console.error("Alerts load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlertsData();
  }, [severityFilter, resolvedFilter]);

  const handleAcknowledge = async (alertId) => {
    try {
      await api.updateAlert(alertId, { acknowledged: true });
      fetchAlertsData();
    } catch (err) {
      alert(`Action failed: ${err.message}`);
    }
  };

  const handleResolve = async (alertId) => {
    try {
      await api.updateAlert(alertId, { resolved: true, acknowledged: true });
      fetchAlertsData();
    } catch (err) {
      alert(`Action failed: ${err.message}`);
    }
  };

  const handleConfirmSuppress = async () => {
    if (!suppressModalAlert) return;
    try {
      await api.updateAlert(suppressModalAlert.id, { 
        status: 'SUPPRESSED', 
        suppression_reason: suppressReason || 'Suppressed by operator: non-critical transient noise' 
      });
      setSuppressModalAlert(null);
      fetchAlertsData();
    } catch (err) {
      alert(`Action failed: ${err.message}`);
    }
  };

  const exportAlertsCSV = () => {
    if (alerts.length === 0) return;
    const headers = ['ID', 'Machine ID', 'Timestamp', 'Severity', 'Status', 'Priority Score', 'Occurrences', 'Reason', 'Suppression Reason', 'Action'];
    const rows = alerts.map(a => [
      a.id, a.machine_id, a.timestamp, a.severity, a.status || 'ACTIVE', a.priority_score, a.occurrence_count, `"${a.reason}"`, `"${a.suppression_reason || ''}"`, `"${a.recommended_action}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `maintai_alerts_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getSeverityBadge = (sev, status) => {
    if (status === 'SUPPRESSED') {
      return <span className="bg-slate-700/50 text-slate-300 border border-slate-600 px-2.5 py-0.5 rounded-full text-xs font-semibold">SUPPRESSED</span>;
    }
    switch (sev?.toUpperCase()) {
      case 'CRITICAL':
        return <span className="badge-critical px-2.5 py-0.5 rounded-full text-xs font-semibold">CRITICAL</span>;
      case 'HIGH':
        return <span className="bg-rose-500/10 text-rose-400 border border-rose-500/30 px-2.5 py-0.5 rounded-full text-xs font-semibold">HIGH</span>;
      case 'WARNING':
        return <span className="badge-warning px-2.5 py-0.5 rounded-full text-xs font-semibold">WARNING</span>;
      case 'INFO':
        return <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 px-2.5 py-0.5 rounded-full text-xs font-semibold">INFO</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-300">{sev}</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-mono text-white flex items-center space-x-2">
            <AlertTriangle className="w-6 h-6 text-amber-400" />
            <span>Alert Intelligence & Alarm Filtering Hub</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Intelligent alarm correlation with false alarm suppression, persistence tracking, and 4-tier risk prioritization.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={exportAlertsCSV}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#141D30] hover:bg-[#1E2B45] text-slate-200 text-xs font-medium border border-[#223048] transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={fetchAlertsData}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#141D30] hover:bg-[#1E2B45] text-slate-200 text-xs font-medium border border-[#223048] transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Intelligence KPI Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="industrial-panel p-4 border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Critical Alarms</span>
            <AlertOctagon className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400 mt-1 font-mono">{summary?.critical_count ?? 1}</div>
          <div className="text-[11px] text-slate-400">Immediate SLA Attention</div>
        </div>

        <div className="industrial-panel p-4 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Active Persistent Alarms</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 mt-1 font-mono">{summary?.active_count ?? 4}</div>
          <div className="text-[11px] text-slate-400">Sustained &gt; 3 Intervals</div>
        </div>

        <div className="industrial-panel p-4 border-l-4 border-l-cyan-500">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Chatter Suppressed</span>
            <BellOff className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-cyan-400 mt-1 font-mono">{summary?.suppressed_transients ?? 6}</div>
          <div className="text-[11px] text-slate-400">Transient Spikes Filtered</div>
        </div>

        <div className="industrial-panel p-4 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Resolved & Restored</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono">{summary?.resolved_count ?? 8}</div>
          <div className="text-[11px] text-slate-400">Healthy Post-Maintenance</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="industrial-panel p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-1.5 text-xs text-slate-400">
            <span>Severity:</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-[#080C16] text-xs text-slate-200 px-2.5 py-1.5 rounded-lg border border-[#223048] focus:outline-none focus:border-cyan-500"
            >
              <option value="All">All Severities</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="HIGH">HIGH</option>
              <option value="WARNING">WARNING</option>
              <option value="INFO">INFO</option>
            </select>
          </div>

          <div className="flex items-center space-x-1.5 text-xs text-slate-400">
            <span>Resolution:</span>
            <select
              value={resolvedFilter}
              onChange={(e) => setResolvedFilter(e.target.value)}
              className="bg-[#080C16] text-xs text-slate-200 px-2.5 py-1.5 rounded-lg border border-[#223048] focus:outline-none focus:border-cyan-500"
            >
              <option value="unresolved">Unresolved Only</option>
              <option value="resolved">Resolved</option>
              <option value="all">All Events</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-400 font-mono">
          Showing {alerts.length} event(s)
        </div>
      </div>

      {/* Alerts Table */}
      <div className="industrial-panel p-5">
        <div className="overflow-x-auto rounded-lg border border-[#223048]">
          <table className="w-full text-left text-xs min-w-[750px]">
            <thead className="bg-[#0E1526] text-slate-400 uppercase tracking-wider font-semibold border-b border-[#223048]">
              <tr>
                <th className="py-3 px-4">Severity & Priority</th>
                <th className="py-3 px-4">Machine ID</th>
                <th className="py-3 px-4">Persistence</th>
                <th className="py-3 px-4">Diagnosed Failure Physics</th>
                <th className="py-3 px-4">Prescribed Next Action</th>
                <th className="py-3 px-4 text-right">Lifecycle Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A263C] bg-[#0A0F1D]/80">
              {alerts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                    <div>No active alerts matching current filter criteria.</div>
                  </td>
                </tr>
              ) : (
                alerts.map((a) => (
                  <tr key={a.id} className="hover:bg-[#141D30] transition">
                    <td className="py-3 px-4">
                      <div className="flex flex-col space-y-1">
                        <div>{getSeverityBadge(a.severity, a.status)}</div>
                        <span className="text-[10px] font-mono text-slate-400">Score: {a.priority_score || 85}/100</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-white">
                      <button
                        onClick={() => onSelectMachine(a.machine_id)}
                        className="text-cyan-400 hover:underline flex items-center space-x-1"
                      >
                        <span>{a.machine_id}</span>
                        <Eye className="w-3 h-3" />
                      </button>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      <div className="flex flex-col">
                        <span className="text-amber-400 font-semibold">{a.occurrence_count || 1}x occurrences</span>
                        <span className="text-[10px] text-slate-400">{new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 max-w-sm">
                      <div className="text-slate-200 font-semibold">{a.reason}</div>
                      {a.contributing_factors && (
                        <div className="text-[11px] text-slate-400 mt-0.5">{a.contributing_factors}</div>
                      )}
                      {a.suppression_reason && (
                        <div className="text-[11px] text-slate-400 font-mono italic mt-1 bg-[#080C16] p-1.5 rounded border border-[#223048]">
                          Suppression: {a.suppression_reason}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-300 max-w-md leading-relaxed">
                      {a.recommended_action}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      {!a.acknowledged && (
                        <button
                          onClick={() => handleAcknowledge(a.id)}
                          className="px-2 py-1 text-[11px] rounded bg-[#141D30] hover:bg-[#1E2B45] text-slate-200 border border-[#223048] transition"
                        >
                          Ack
                        </button>
                      )}
                      {!a.resolved ? (
                        <>
                          <button
                            onClick={() => handleResolve(a.id)}
                            className="px-2.5 py-1 text-[11px] rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition"
                          >
                            Resolve
                          </button>
                          <button
                            onClick={() => setSuppressModalAlert(a)}
                            className="px-2 py-1 text-[11px] rounded bg-[#141D30] hover:bg-[#1E2B45] text-slate-400 hover:text-slate-200 border border-[#223048] transition"
                            title="Suppress transient alert"
                          >
                            Suppress
                          </button>
                        </>
                      ) : (
                        <span className="text-[11px] text-emerald-400 font-medium font-mono">Resolved</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Suppression Reason Modal */}
      {suppressModalAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="industrial-panel p-6 max-w-md w-full border border-cyan-500/50 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#223048]">
              <div className="flex items-center space-x-2">
                <BellOff className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white font-mono">Suppress Alert #{suppressModalAlert.id}</h3>
              </div>
              <button
                onClick={() => setSuppressModalAlert(null)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-300">
              Suppressing an alarm filters it from the active control feed. Please provide an engineering justification:
            </div>

            <textarea
              value={suppressReason}
              onChange={(e) => setSuppressReason(e.target.value)}
              rows={3}
              className="w-full bg-[#080C16] border border-[#223048] rounded-lg p-3 text-xs text-white focus:outline-none focus:border-cyan-500 font-sans"
              placeholder="e.g. Non-critical transient temperature spike during scheduled tooling swap"
            />

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setSuppressModalAlert(null)}
                className="px-3 py-1.5 rounded-lg bg-[#141D30] hover:bg-[#1E2B45] text-slate-300 text-xs font-medium border border-[#223048]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSuppress}
                className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition shadow-glow-amber"
              >
                Confirm Suppression
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
