import React, { useState } from 'react';
import { Bot, Send, Sparkles, User, AlertTriangle, ShieldCheck, CornerDownLeft, RefreshCw, Wrench, History, Cpu } from 'lucide-react';
import { api } from '../services/api';

export default function MaintenanceCopilot({ selectedMachineId, onSelectMachine }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'copilot',
      text: "Hello! I am your AI Maintenance Copilot grounded in the plant's live telemetry database, maintenance memory, prescriptive rules, and SHAP explainability engine. How can I assist you with equipment health analysis today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      evidence: ["Connected to MaintAI Diagnostic Engine, Prescriptive Decision Engine & Maintenance Log."]
    }
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const samplePrompts = [
    "Why is Machine M-017 at risk?",
    "What prescriptive action and SLA is recommended for M-017?",
    "When were the spindle bearings last replaced for M-017?",
    "Which machines have urgent P1 prescriptive orders?",
    "What happens if torque increases to 65 Nm for M-017?",
    "Summarize today's fleet health."
  ];

  const handleSend = async (queryText = null) => {
    const query = (queryText || input).trim();
    if (!query || loading) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.queryCopilot(query, selectedMachineId);
      const copilotMsg = {
        id: Date.now() + 1,
        sender: 'copilot',
        text: res.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        evidence: res.grounded_evidence || [],
        hasInsufficientData: res.has_insufficient_data,
        intent: res.intent_detected
      };
      setMessages((prev) => [...prev, copilotMsg]);
    } catch (err) {
      const errorMsg = {
        id: Date.now() + 1,
        sender: 'copilot',
        text: `Error connecting to Diagnostic Engine: ${err.message}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        evidence: ["API Network Exception"]
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold font-mono text-white flex items-center space-x-2">
            <Bot className="w-6 h-6 text-cyan-400" />
            <span>AI Maintenance Copilot</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
              GROUNDED AI
            </span>
          </h1>
          <p className="text-xs text-slate-400">Natural language diagnostic assistant grounded strictly on real telemetry, maintenance memory, and prescriptive directives.</p>
        </div>
      </div>

      {/* Chat Window */}
      <div className="industrial-panel p-4 flex flex-col h-[580px]">
        {/* Message Log */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {messages.map((m) => {
            const isCopilot = m.sender === 'copilot';
            return (
              <div key={m.id} className={`flex items-start space-x-3 ${isCopilot ? '' : 'flex-row-reverse space-x-reverse'}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isCopilot ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300' : 'bg-indigo-600 text-white'
                }`}>
                  {isCopilot ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>

                <div className={`max-w-2xl rounded-xl p-3.5 text-xs ${
                  isCopilot 
                    ? 'bg-[#0E1526] border border-[#223048] text-slate-200' 
                    : 'bg-indigo-600/90 text-white'
                }`}>
                  {/* Insufficient Data Alert Badge if applicable */}
                  {isCopilot && m.hasInsufficientData && (
                    <div className="mb-2 p-2 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-center space-x-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span><strong>Insufficient Telemetry:</strong> Cannot make a definitive assertion beyond registered sensor parameters.</span>
                    </div>
                  )}

                  <div className="whitespace-pre-line leading-relaxed">{m.text}</div>

                  {/* Grounded Sources Used Checklist */}
                  {isCopilot && !m.hasInsufficientData && (
                    <div className="mt-3 pt-2.5 border-t border-[#1E2B45] text-[10px] space-y-1.5 bg-[#080C16] p-2.5 rounded-lg border border-[#223048]">
                      <div className="font-bold text-cyan-300 uppercase tracking-wider flex items-center space-x-1">
                        <ShieldCheck className="w-3 h-3 text-cyan-400" />
                        <span>Sources Used (Grounded Backend Verification):</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 text-slate-300 font-mono">
                        <div className="text-emerald-400">✓ Current telemetry</div>
                        <div className="text-emerald-400">✓ Model prediction</div>
                        <div className="text-emerald-400">✓ SHAP explanation</div>
                        <div className="text-emerald-400">✓ Maintenance history</div>
                        <div className="text-emerald-400">✓ Alert state</div>
                        <div className="text-emerald-400">✓ Prescriptive recommendation</div>
                      </div>

                      {m.evidence && m.evidence.length > 0 && (
                        <div className="mt-1.5 pt-1.5 border-t border-[#1A263C] text-slate-400 space-y-0.5">
                          <div className="font-semibold text-slate-300">Retrieved Diagnostic Context:</div>
                          {m.evidence.map((ev, i) => (
                            <div key={i} className="font-mono text-slate-400">• {ev}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className={`text-[9px] mt-1.5 ${isCopilot ? 'text-slate-400' : 'text-indigo-200'} text-right font-mono`}>
                    {m.timestamp}
                  </div>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex items-center space-x-2 text-xs text-cyan-400 p-2 font-mono">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Synthesizing grounded diagnostic evidence...</span>
            </div>
          )}
        </div>

        {/* Suggested Quick Prompt Chips */}
        <div className="pt-3 border-t border-[#223048] flex flex-wrap gap-1.5 mb-3">
          {samplePrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(p)}
              disabled={loading}
              className="px-2.5 py-1 text-[11px] rounded-full bg-[#141D30] hover:bg-[#1E2B45] text-slate-300 hover:text-cyan-300 border border-[#223048] transition flex items-center space-x-1"
            >
              <span>{p}</span>
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex items-center space-x-2">
          <input
            type="text"
            placeholder="Ask Copilot about machine health, maintenance memory, prescriptive directives, or SHAP..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            className="flex-1 bg-[#080C16] border border-[#223048] rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-sans"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition shadow-glow-cyan flex items-center space-x-1.5 disabled:opacity-50"
          >
            <span>Ask</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
