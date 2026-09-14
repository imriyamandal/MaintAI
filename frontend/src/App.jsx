import React, { useState, useEffect } from 'react';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './pages/Dashboard';
import Machines from './pages/Machines';
import MachineDetail from './pages/MachineDetail';
import PrescriptiveCenter from './pages/PrescriptiveCenter';
import Alerts from './pages/Alerts';
import Analytics from './pages/Analytics';
import Simulator from './pages/Simulator';
import MaintenanceCopilot from './pages/MaintenanceCopilot';
import Predictions from './pages/Predictions';
import ModelPerformance from './pages/ModelPerformance';
import DataManagement from './pages/DataManagement';
import SettingsPage from './pages/Settings';
import { api } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedMachineId, setSelectedMachineId] = useState('M-017');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Fleet and System State
  const [fleetSummary, setFleetSummary] = useState(null);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiOnline, setApiOnline] = useState(true);

  // Live Demo Scenario State
  const [demoStep, setDemoStep] = useState(1);
  const [simSpeed, setSimSpeed] = useState(1);
  const [toastMessage, setToastMessage] = useState(null);

  const loadFleetData = async () => {
    try {
      const [summary, mList, health] = await Promise.all([
        api.getFleetSummary(),
        api.getMachines(),
        api.getHealth().catch(() => ({ status: 'OFFLINE' }))
      ]);
      setFleetSummary(summary);
      setMachines(mList || []);
      setApiOnline(health.status === 'ONLINE');
    } catch (err) {
      console.error("Fleet sync error:", err);
      setApiOnline(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFleetData();
    const interval = setInterval(loadFleetData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleStepChange = async (stepNum) => {
    try {
      setDemoStep(stepNum);
      await api.executeDemoStep(stepNum);
      await loadFleetData();
      
      const stepNames = {
        1: "Scenario Step 1: Nominal Baseline Loaded (M-017 Healthy 94/100)",
        2: "Scenario Step 2: Thermal Drift & Tool Wear (M-017 Warning 64/100)",
        3: "Scenario Step 3: CRITICAL OVERLOAD & P1 WORK ORDER TRIGGERED (M-017 22/100)",
        4: "Scenario Step 4: Maintenance Dispatched & Health Restored (M-017 95/100)"
      };
      
      showToast(stepNames[stepNum] || `Scenario Step ${stepNum} active`);
    } catch (err) {
      console.error("Scenario execution error:", err);
      showToast(`Error executing step: ${err.message}`);
    }
  };

  const handleResetFleet = async () => {
    try {
      await api.resetDatabase();
      setDemoStep(1);
      await loadFleetData();
      showToast("Fleet Telemetry Database Reset to Nominal Baseline");
    } catch (err) {
      showToast(`Reset failed: ${err.message}`);
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  const handleSelectMachine = (mId) => {
    setSelectedMachineId(mId);
    setActiveTab('machine-detail');
    if (mobileMenuOpen) setMobileMenuOpen(false);
  };

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            fleetSummary={fleetSummary}
            machines={machines}
            onSelectMachine={handleSelectMachine}
            onNavigateTab={setActiveTab}
            loading={loading}
            onRefresh={loadFleetData}
          />
        );
      case 'machines':
        return (
          <Machines
            machines={machines}
            onSelectMachine={handleSelectMachine}
            onNavigateTab={setActiveTab}
          />
        );
      case 'machine-detail':
        return (
          <MachineDetail
            machineId={selectedMachineId}
            onBack={() => setActiveTab('machines')}
            onNavigateTab={setActiveTab}
          />
        );
      case 'prescriptive':
        return (
          <PrescriptiveCenter
            onSelectMachine={handleSelectMachine}
          />
        );
      case 'alerts':
        return (
          <Alerts
            onSelectMachine={handleSelectMachine}
          />
        );
      case 'analytics':
        return (
          <Analytics
            machines={machines}
            selectedMachineId={selectedMachineId}
            onSelectMachine={handleSelectMachine}
          />
        );
      case 'simulator':
        return (
          <Simulator
            machines={machines}
            selectedMachineId={selectedMachineId}
            onSelectMachine={handleSelectMachine}
          />
        );
      case 'copilot':
        return (
          <MaintenanceCopilot
            selectedMachineId={selectedMachineId}
            onSelectMachine={handleSelectMachine}
          />
        );
      case 'predictions':
        return (
          <Predictions
            machines={machines}
            onSelectMachine={handleSelectMachine}
          />
        );
      case 'model-perf':
        return (
          <ModelPerformance />
        );
      case 'data':
        return (
          <DataManagement 
            onResetFleet={handleResetFleet} 
          />
        );
      case 'settings':
        return (
          <SettingsPage 
            onResetFleet={handleResetFleet} 
          />
        );
      default:
        return (
          <Dashboard
            fleetSummary={fleetSummary}
            machines={machines}
            onSelectMachine={handleSelectMachine}
            onNavigateTab={setActiveTab}
            loading={loading}
            onRefresh={loadFleetData}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#070A10] text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <Header
        currentStep={demoStep}
        onStepChange={handleStepChange}
        onReset={handleResetFleet}
        simSpeed={simSpeed}
        setSimSpeed={setSimSpeed}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        machines={machines}
        selectedMachineId={selectedMachineId}
        onSelectMachine={handleSelectMachine}
        apiOnline={apiOnline}
      />

      {/* Main Container: Sidebar + Content Canvas */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          activeTab={activeTab === 'machine-detail' ? 'machines' : activeTab}
          setActiveTab={setActiveTab}
          activeAlertCount={fleetSummary?.active_alerts_count || 0}
          mobileOpen={mobileMenuOpen}
          setMobileOpen={setMobileMenuOpen}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {renderActiveView()}
        </main>
      </div>

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in max-w-md">
          <div className="px-4 py-3 rounded-xl bg-[#0B1728] border border-cyan-500/60 text-cyan-200 text-xs font-mono font-bold shadow-glow-cyan flex items-center space-x-2.5 backdrop-blur-md">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping flex-shrink-0" />
            <span className="leading-snug">{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
}
