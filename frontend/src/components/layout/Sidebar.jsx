import React from 'react';
import { 
  LayoutDashboard, Server, Wrench, AlertTriangle, 
  BarChart3, Sliders, Bot, Database, ChevronRight,
  TrendingUp, Gauge, Settings, ShieldCheck, X
} from 'lucide-react';

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  activeAlertCount = 0,
  mobileOpen = false,
  setMobileOpen = () => {}
}) {
  const navItems = [
    { id: 'dashboard', label: 'Fleet Dashboard', icon: LayoutDashboard },
    { id: 'machines', label: 'Fleet Inventory', icon: Server },
    { id: 'prescriptive', label: 'Prescriptive Center', icon: Wrench, badge: 'SLA' },
    { id: 'alerts', label: 'Alert Intelligence', icon: AlertTriangle, count: activeAlertCount },
    { id: 'analytics', label: 'Analytics & XAI', icon: BarChart3 },
    { id: 'simulator', label: 'Digital Twin & Sim', icon: Sliders, badge: 'What-If' },
    { id: 'copilot', label: 'Maintenance Copilot', icon: Bot, badge: 'AI' },
    { id: 'predictions', label: 'Live Inference Console', icon: TrendingUp },
    { id: 'model-perf', label: 'Model Benchmarks', icon: Gauge },
    { id: 'data', label: 'Data Ingestion & Reset', icon: Database },
    { id: 'settings', label: 'Decision Thresholds', icon: Settings },
  ];

  const handleNavClick = (tabId) => {
    setActiveTab(tabId);
    if (mobileOpen) {
      setMobileOpen(false);
    }
  };

  const navContent = (
    <div className="flex flex-col justify-between h-full select-none">
      <div className="p-3 space-y-1 overflow-y-auto">
        <div className="flex items-center justify-between px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          <span>Control Room Navigation</span>
          {mobileOpen && (
            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden p-1 rounded hover:bg-[#1E2B45] text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`nav-${item.id}-btn`}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all group ${
                isActive
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-glow-cyan'
                  : 'text-slate-300 hover:text-white hover:bg-[#141D30] border border-transparent'
              }`}
            >
              <div className="flex items-center space-x-2.5 truncate">
                <Icon className={`w-4 h-4 flex-shrink-0 transition ${isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-cyan-300'}`} />
                <span className="truncate">{item.label}</span>
              </div>
              
              <div className="flex items-center space-x-1 flex-shrink-0 ml-1">
                {item.badge && (
                  <span className="px-1.5 py-0.2 text-[9px] font-bold uppercase rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {item.badge}
                  </span>
                )}
                {item.count > 0 && (
                  <span className="px-1.5 py-0.2 text-[9px] font-bold rounded-full bg-rose-500 text-white animate-pulse">
                    {item.count}
                  </span>
                )}
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-cyan-400" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Industrial Plant Facility Metadata */}
      <div className="p-3.5 m-3 rounded-xl bg-[#0E1526] border border-[#223048]">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span>Plant Facility</span>
          <span className="text-emerald-400 font-mono font-medium">Jamshedpur Unit 4</span>
        </div>
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>AI Architecture</span>
          <span className="text-cyan-400 font-mono font-medium">XGBoost + SHAP</span>
        </div>
        <div className="mt-2 pt-2 border-t border-[#1E2B45] text-[10px] text-slate-400 text-center font-mono">
          MaintAI v2.0 • PS-19 Hackathon
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex w-64 bg-[#0A0F1D] border-r border-[#223048] flex-col justify-between select-none min-h-[calc(100vh-57px)] flex-shrink-0">
        {navContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          
          {/* Drawer Canvas */}
          <div className="relative w-72 max-w-[80vw] bg-[#0A0F1D] border-r border-[#223048] h-full z-50 flex flex-col shadow-2xl">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}
