import React, { useState } from "react";
import {
  GeminiExplanationResponse,
  AnomalyReport,
  LogEntry,
} from "../types";
import {
  Brain,
  Search,
  Sparkles,
  Bot,
  AlertTriangle,
  Heart,
  Lightbulb,
  CheckCircle2,
  RefreshCw,
  Send,
  Sliders,
  Maximize2,
  Zap,
  Terminal
} from "lucide-react";

interface GeminiPanelProps {
  // Explanations state
  selectedLogForExplain: LogEntry | null;
  explanation: GeminiExplanationResponse | null;
  explainLoading: boolean;
  onClearExplanation: () => void;

  // Anomalies state
  anomalyReport: AnomalyReport | null;
  anomalyLoading: boolean;
  onTriggerAnomalyReport: () => void;

  // Search filter setter
  onApplyFilters: (level: string, source: string, keyword: string) => void;

  // Scenario Simulator callback
  onInjectScenario: (logsText: string, scenarioName: string) => void;
}

export default function GeminiPanel({
  selectedLogForExplain,
  explanation,
  explainLoading,
  onClearExplanation,
  anomalyReport,
  anomalyLoading,
  onTriggerAnomalyReport,
  onApplyFilters,
  onInjectScenario,
}: GeminiPanelProps) {
  const [activeTab, setActiveTab] = useState<"explain" | "anomaly" | "query" | "scenario">("explain");

  // Scenario simulation states
  const [selectedScenario, setSelectedScenario] = useState<string>("db-deadlock");
  const [customScenarioPrompt, setCustomScenarioPrompt] = useState<string>("");
  const [scenarioLoading, setScenarioLoading] = useState<boolean>(false);
  const [scenarioResponse, setScenarioResponse] = useState<{
    scenarioName: string;
    scenarioDescription: string;
    logsText: string;
    fallback?: boolean;
    hint?: string;
  } | null>(null);
  const [scenarioError, setScenarioError] = useState<string | null>(null);

  // Submit Scenario Generation
  const handleGenerateScenario = async (e: React.FormEvent) => {
    e.preventDefault();
    setScenarioLoading(true);
    setScenarioError(null);
    setScenarioResponse(null);

    try {
      const response = await fetch("/api/gemini/generate-scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenarioType: selectedScenario,
          customPrompt: selectedScenario === "custom" ? customScenarioPrompt : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate simulated logs cascade with Gemini.");
      }

      const data = await response.json();
      setScenarioResponse(data);
      if (data.logsText) {
        onInjectScenario(data.logsText, data.scenarioName);
      }
    } catch (err: any) {
      setScenarioError(err.message || "Something went wrong.");
    } finally {
      setScenarioLoading(false);
    }
  };

  const scenariosList = [
    { id: "db-deadlock", name: "PostgreSQL Deadlock Loop", desc: "HikariCP pool saturation, locked transactions, connection wait timeouts" },
    { id: "auth-oauth-failure", name: "OAuth Identity Callback Outage", desc: "Cryptographic signature validation failure, state token invalidation" },
    { id: "kafka-lag-spike", name: "Kafka Partition Queue Lag", desc: "Heartbeat execution timeouts, rebalance storm on consumer threads" },
    { id: "ddos-attack", name: "Access Log Ingress DDoS", desc: "Botnet surge hitting login API, Nginx worker thread congestion, HTTP 504s" },
    { id: "microservice-dns-outage", name: "K8s Cluster CoreDNS Mismatch", desc: "UnknownHostExceptions, broken RPC paths, open circuit breakers" },
    { id: "custom", name: "Custom Scenario (Describe path...)", desc: "Describe any systems outage for Gemini to dynamically synthesize" },
  ];

  // Query state
  const [naturalQuery, setNaturalQuery] = useState("");
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryResponse, setQueryResponse] = useState<{
    answer: string;
    suggestedFilters: { level: string; source: string; keyword: string };
  } | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);

  // Submit Natural Query
  const handleNaturalQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!naturalQuery.trim()) return;

    setQueryLoading(true);
    setQueryError(null);
    setQueryResponse(null);

    try {
      const response = await fetch("/api/gemini/natural-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: naturalQuery,
          logEntries: [], // server-side pulls metadata or samples based on state if needed
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to process natural query with Gemini.");
      }

      const data = await response.json();
      setQueryResponse(data);
    } catch (err: any) {
      setQueryError(err.message || "Something went wrong.");
    } finally {
      setQueryLoading(false);
    }
  };

  const getSeverityStyles = (sev: string) => {
    switch (sev?.toLowerCase()) {
      case "critical":
        return "bg-red-500/20 text-red-400 border-red-500/30 ring-2 ring-red-500/10";
      case "high":
        return "bg-rose-500/20 text-rose-400 border-rose-500/30 ring-2 ring-rose-500/10";
      case "medium":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30 ring-2 ring-amber-500/10";
      default:
        return "bg-cyan-500/20 text-cyan-400 border-cyan-500/30 ring-2 ring-cyan-500/10";
    }
  };

  return (
    <div id="ai-assistant-terminal" className="bg-[#0a0a10]/85 border border-white/5 rounded-xl shadow-2xl overflow-hidden mb-8 backdrop-blur-md">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-cyan-950/40 via-purple-950/20 to-blue-950/40 p-5 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20">
            <Brain size={22} className="animate-pulse cyber-glow-cyan" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">Gemini AI Cognitive Troubleshooting</h3>
              <span className="bg-cyan-500/10 text-cyan-300 font-bold text-[9px] px-2 py-0.5 rounded-full border border-cyan-500/20 tracking-wider">COGNITIVE ACTIVE</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Advanced structural trace modeling & failure cascade isolation</p>
          </div>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex bg-black/40 p-2 gap-1 border-b border-white/5">
        <button
          onClick={() => setActiveTab("explain")}
          className={`flex items-center gap-2 px-4 py-2 text-[10px] uppercase font-bold tracking-wider rounded-lg transition-all cursor-pointer ${
            activeTab === "explain"
              ? "bg-white/10 text-cyan-400 border border-cyan-500/20 shadow-md shadow-cyan-500/5"
              : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
          }`}
        >
          <Bot size={13} />
          Error Explainer
          {selectedLogForExplain && (
            <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0 shadow-[0_0_8px_#22d3ee]" />
          )}
        </button>

        <button
          onClick={() => setActiveTab("anomaly")}
          className={`flex items-center gap-2 px-4 py-2 text-[10px] uppercase font-bold tracking-wider rounded-lg transition-all cursor-pointer ${
            activeTab === "anomaly"
              ? "bg-white/10 text-cyan-400 border border-cyan-500/20 shadow-md shadow-cyan-500/5"
              : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
          }`}
        >
          <AlertTriangle size={13} />
          Cluster Anomaly Scan
          {anomalyReport && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_8px_#34d399]" />
          )}
        </button>

        <button
          onClick={() => setActiveTab("query")}
          className={`flex items-center gap-2 px-4 py-2 text-[10px] uppercase font-bold tracking-wider rounded-lg transition-all cursor-pointer ${
            activeTab === "query"
              ? "bg-white/10 text-cyan-400 border border-cyan-500/20 shadow-md shadow-cyan-500/5"
              : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
          }`}
        >
          <Search size={13} />
          Semantic Filter Agent
        </button>

        <button
          onClick={() => setActiveTab("scenario")}
          className={`flex items-center gap-2 px-4 py-2 text-[10px] uppercase font-bold tracking-wider rounded-lg transition-all cursor-pointer ${
            activeTab === "scenario"
              ? "bg-white/10 text-cyan-400 border border-cyan-500/20 shadow-md shadow-cyan-500/5"
              : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
          }`}
        >
          <Zap size={13} />
          Chaos Sandbox
          {scenarioResponse && (
            <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0 shadow-[0_0_8px_#22d3ee]" />
          )}
        </button>
      </div>

      {/* TAB CONTENT PANELS */}
      <div className="p-6">
        {/* TAB 1: LOG EXPLAINER */}
        {activeTab === "explain" && (
          <div id="ai-panel-explain">
            {!selectedLogForExplain && !explainLoading && (
              <div className="py-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2.5">
                <div className="p-3 bg-white/5 text-slate-400 rounded-xl border border-white/5">
                  <Maximize2 size={22} className="text-cyan-400" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-slate-300">No Target Entry Selected</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-2 leading-relaxed">
                    Click the <span className="font-bold text-cyan-400 underline decoration-dotted">"AI Explain"</span> command trigger on any error/warn line in the system grid below to diagnose technical details.
                  </p>
                </div>
              </div>
            )}

            {explainLoading && (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <RefreshCw size={28} className="text-cyan-400 animate-spin" />
                <span className="text-xs font-mono font-semibold text-cyan-300 tracking-widest">
                  ALGORITHM IS COLLATING FAULT TRACES...
                </span>
                <p className="text-[10px] text-slate-500 font-mono">Querying @google/genai pipeline context stack</p>
              </div>
            )}

            {selectedLogForExplain && !explainLoading && (
              <div className="space-y-6">
                {/* Target Information */}
                <div className="bg-[#050508] p-4 rounded-xl border border-white/10 font-mono text-xs max-h-36 overflow-y-auto">
                  <div className="flex justify-between items-center mb-2 pb-2 border-b border-white/5 select-none text-[10px] font-bold text-slate-500 tracking-wider">
                    <span>INGESTED EVENT FOCUS</span>
                    <button
                      onClick={onClearExplanation}
                      className="text-cyan-450 hover:text-cyan-300 cursor-pointer font-bold uppercase tracking-wider"
                    >
                      Dismiss Target
                    </button>
                  </div>
                  <div className="text-cyan-400 flex gap-2 mb-1">
                    <span>[{selectedLogForExplain.level}]</span>
                    <span>{selectedLogForExplain.timestamp}</span>
                  </div>
                  <div className="text-slate-200 font-semibold mb-1">
                    Source: {selectedLogForExplain.source}
                  </div>
                  <div className="text-slate-400 line-clamp-2 select-all">
                    {selectedLogForExplain.message}
                  </div>
                </div>

                {/* AI Explanation Result */}
                {explanation ? (
                  <div className="grid grid-cols-1 gap-4">
                    {/* Severity Rating */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white/[0.02] border border-white/5 p-4 rounded-xl">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Threat Priority:</span>
                        <span
                          className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md border tracking-wider font-mono ${getSeverityStyles(
                            explanation.severity
                          )}`}
                        >
                          {explanation.severity}
                        </span>
                      </div>
                      {/* Classification tags */}
                      <div className="flex flex-wrap gap-1">
                        {explanation.tags?.map((tag) => (
                          <span
                            key={tag}
                            className="bg-white/5 border border-white/10 text-cyan-300 px-2 py-0.5 text-[9px] font-semibold tracking-wider uppercase font-mono rounded-md"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Human Explanation */}
                    <div className="bg-white/[0.02] border border-white/5 p-5 rounded-xl">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-[#06b6d5] mb-2.5 flex items-center gap-1.5 border-b border-white/5 pb-2">
                        <Bot size={13} />
                        Human Diagnostics Summary
                      </h4>
                      <p className="text-xs text-slate-350 leading-relaxed font-sans">
                        {explanation.explanation}
                      </p>
                    </div>

                    {/* Root technical cause */}
                    <div className="bg-white/[0.02] border border-white/5 p-5 rounded-xl font-mono">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-amber-500 mb-2.5 flex items-center gap-1.5 border-b border-white/5 pb-2">
                        <AlertTriangle size={13} />
                        Technical Root Cause
                      </h4>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {explanation.rootCause}
                      </p>
                    </div>

                    {/* Troubleshooting Suggestions */}
                    <div className="bg-white/[0.02] border border-white/5 p-5 rounded-xl">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-3.5 flex items-center gap-1.5 border-b border-white/5 pb-2">
                        <CheckCircle2 size={13} />
                        Recommended Action Plan
                      </h4>
                      <ul className="space-y-3">
                        {explanation.fixSuggestions?.map((item, idx) => (
                          <li key={idx} className="flex gap-3 items-start text-xs text-slate-300 leading-relaxed">
                            <span className="font-bold text-center font-mono text-emerald-450 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded text-[10px] shrink-0">
                              0{idx + 1}
                            </span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-500 font-mono text-xs">
                    Target parsed successfully. Waiting for Gemini model parameters.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ANOMALY CLUSTER REPORT */}
        {activeTab === "anomaly" && (
          <div id="ai-panel-anomaly">
            {!anomalyReport && !anomalyLoading && (
              <div className="py-8 text-center text-slate-400 flex flex-col items-center justify-center gap-4">
                <div className="p-3 bg-cyan-500/5 border border-cyan-500/10 text-cyan-400 rounded-xl">
                  <AlertTriangle size={24} className="cyber-glow-cyan" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Generate Cluster Instability Scan</h4>
                  <p className="text-xs text-slate-500 max-w-sm mt-2 mx-auto leading-relaxed">
                    This filters current ingested telemetry blocks, locating hidden server cascading outages, network thread leaks, and microservice anomalies.
                  </p>
                </div>
                <button
                  onClick={onTriggerAnomalyReport}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-bold uppercase tracking-widest rounded-lg transition-all shadow-lg hover:shadow-cyan-500/20 cursor-pointer border border-transparent"
                >
                  <Sparkles size={13} />
                  Initiate Scan
                </button>
              </div>
            )}

            {anomalyLoading && (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <RefreshCw size={28} className="text-cyan-400 animate-spin" />
                <span className="text-xs font-mono font-semibold text-cyan-300 tracking-widest">
                  COLLIBRATING STATE DEVIATIONS...
                </span>
                <p className="text-[10px] text-slate-500 font-mono">Running cluster anomaly filter algorithm</p>
              </div>
            )}

            {anomalyReport && !anomalyLoading && (
              <div className="space-y-6">
                {/* Health Score Shield */}
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between p-5 bg-black/40 rounded-xl border border-white/5">
                  <div className="flex items-center gap-4">
                    <div className="relative shrink-0 select-none">
                      <div className="w-16 h-16 rounded-full border-2 border-cyan-500/20 bg-cyan-500/5 flex items-center justify-center font-bold font-mono text-lg text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
                        {anomalyReport.overallHealthScore}%
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                        <Heart size={13} className="text-rose-500" />
                        Cluster Security Score
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Weighted health score based on system outliers and failure chains
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onTriggerAnomalyReport}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold rounded-lg border border-white/10 cursor-pointer"
                  >
                    <RefreshCw size={12} />
                    RE-ENGAGE SCAN
                  </button>
                </div>

                {/* Summary text */}
                <div className="bg-white/[0.02] border border-white/5 p-5 rounded-xl">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-450 border-b border-white/5 pb-2 mb-3">
                    EXECUTIVE SECURITY REVIEW
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    {anomalyReport.summary}
                  </p>
                </div>

                {/* Structured Anomalies */}
                <div id="ai-anomalies-list" className="space-y-3">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-rose-450">
                    DETECTED CLUSTER OUTLIER PATTERNS
                  </h4>
                  {anomalyReport.anomalies?.length === 0 ? (
                    <div className="text-center py-4 bg-[#050508] p-4 border border-white/5 rounded-xl text-xs text-slate-500 font-mono">
                      No outliers or dangerous thread lock metrics discovered. Cluster health is green.
                    </div>
                  ) : (
                    anomalyReport.anomalies?.map((item, idx) => (
                      <div key={idx} className="bg-black/30 border border-white/5 p-4 rounded-xl flex gap-3 items-start">
                        <div className="p-1.5 bg-rose-500/10 text-rose-400 rounded-md shrink-0 border border-rose-500/20">
                          <AlertTriangle size={14} />
                        </div>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                              {item.pattern}
                            </span>
                            <span className="text-[8px] uppercase font-bold text-rose-400 bg-rose-400/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                              {item.impact}
                            </span>
                          </div>
                          <p className="text-xs text-slate-350">{item.description}</p>
                          <div className="text-[10px] text-slate-500 font-mono">
                            Event frequency: {item.frequency}
                          </div>
                          <div className="mt-2.5 text-xs text-cyan-300 bg-black/40 p-3 rounded-lg border border-white/5 leading-relaxed">
                            <span className="font-bold text-[9px] uppercase tracking-wider text-emerald-400 block mb-1">
                              ISOLATION PROTOCOL SUGGESTED:
                            </span>
                            {item.suggestedInvestigation}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Takeaways Key insights */}
                <div className="bg-white/[0.02] border border-white/5 p-5 rounded-xl">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#06b6d5] mb-3.5 flex items-center gap-1 border-b border-white/5 pb-2">
                    <Lightbulb size={13} /> Cognitive Key Insights
                  </h4>
                  <ul className="space-y-2.5">
                    {anomalyReport.keyInsights?.map((insight, idx) => (
                      <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                        <span className="text-cyan-400 mt-1 shrink-0">•</span>
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: NATURAL QUERY FILTER AGENT */}
        {activeTab === "query" && (
          <div id="ai-panel-query" className="space-y-6">
            {/* Input Form */}
            <form onSubmit={handleNaturalQuery} className="flex gap-2">
              <input
                type="text"
                placeholder="Ask e.g. 'Show me hikari pool limits' or 'Identify user credential failures'..."
                value={naturalQuery}
                onChange={(e) => setNaturalQuery(e.target.value)}
                className="flex-1 px-4 py-2.5 text-sm bg-black/45 border border-white/10 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 text-white outline-none rounded-xl"
              />
              <button
                type="submit"
                disabled={queryLoading || !naturalQuery.trim()}
                className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 rounded-xl transition-all font-bold text-xs flex items-center justify-center text-black cursor-pointer shadow-md shadow-cyan-500/20 border-none"
              >
                {queryLoading ? (
                  <RefreshCw size={13} className="animate-spin" />
                ) : (
                  <Send size={13} />
                )}
              </button>
            </form>

            {/* Quick Idea helpers */}
            <div className="flex flex-wrap gap-2 items-center select-none">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-550">Analyst Suggestions:</span>
              {[
                "Connection pool failures",
                "HTTP Status failures",
                "Cache latency anomalies",
                "Suspicious scanner bots",
              ].map((idea) => (
                <button
                  key={idea}
                  type="button"
                  onClick={() => setNaturalQuery(idea)}
                  className="bg-[#050508] hover:bg-white/10 px-3 py-1 rounded-full border border-white/5 text-[10px] text-slate-400 hover:text-white transition-all cursor-pointer font-mono"
                >
                  {idea}
                </button>
              ))}
            </div>

            {queryError && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-405 text-xs rounded-xl font-mono">
                {queryError}
              </div>
            )}

            {queryResponse && (
              <div className="space-y-5">
                <div className="bg-white/[0.02] border border-white/5 p-5 rounded-xl">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#06b6d5] mb-2.5 flex items-center gap-1.5 border-b border-white/5 pb-2">
                    <Bot size={13} /> Natural Language Query Verdict
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    {queryResponse.answer}
                  </p>
                </div>

                {/* Suggested CTA Box */}
                <div className="bg-cyan-500/5 p-4 rounded-xl border border-cyan-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <h5 className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                      <Sliders size={12} /> Suggested Dashboard Filters
                    </h5>
                    <div className="flex flex-wrap gap-2 text-[10px] font-mono">
                      {queryResponse.suggestedFilters.level && (
                        <span className="bg-[#050508] border border-white/10 text-cyan-300 px-2.5 py-0.5 rounded-md uppercase">
                          LEVEL: {queryResponse.suggestedFilters.level}
                        </span>
                      )}
                      {queryResponse.suggestedFilters.source && (
                        <span className="bg-[#050508] border border-white/10 text-cyan-300 px-2.5 py-0.5 rounded-md">
                          SOURCE: {queryResponse.suggestedFilters.source}
                        </span>
                      )}
                      {queryResponse.suggestedFilters.keyword && (
                        <span className="bg-[#050508] border border-white/10 text-cyan-300 px-2.5 py-0.5 rounded-md">
                          KEYWORD: "{queryResponse.suggestedFilters.keyword}"
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onApplyFilters(
                        queryResponse.suggestedFilters.level,
                        queryResponse.suggestedFilters.source,
                        queryResponse.suggestedFilters.keyword
                      );
                    }}
                    className="px-4 py-2 bg-cyan-400 hover:bg-cyan-300 text-black font-bold text-xs uppercase tracking-widest rounded-lg transition-transform hover:scale-[1.02] shadow-md shadow-cyan-500/20 border-none cursor-pointer font-mono"
                  >
                    Apply Filter Config
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: CHAOS SCENARIO SIMULATOR */}
        {activeTab === "scenario" && (
          <div id="ai-panel-scenario" className="space-y-6">
            <div className="flex flex-col gap-3.5 border-b border-white/5 pb-5">
              <h3 className="font-mono text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                <Zap className="text-cyan-400 animate-pulse" size={16} />
                Chaos Sandbox Incident Generator
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans max-w-xl">
                Inject production-grade failures into your log-viewer workspace. Choose an incident cascade model or write any customized distributed system failure prompt. Our AI or local micro-simulator will generate and feed authentic chronological traces instantly.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* SELECTOR & CONTROLS */}
              <div className="lg:col-span-5 space-y-4">
                <form onSubmit={handleGenerateScenario} className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">
                      Select Target Incident Profile
                    </label>
                    <div className="space-y-2">
                      {scenariosList.map((scen) => (
                        <button
                          key={scen.id}
                          type="button"
                          onClick={() => {
                            setSelectedScenario(scen.id);
                            if (scen.id !== "custom") {
                              setScenarioResponse(null);
                            }
                          }}
                          className={`w-full text-left p-3 rounded-lg border transition-all flex flex-col gap-1 cursor-pointer group ${
                            selectedScenario === scen.id
                              ? "bg-cyan-500/10 border-cyan-500/40 shadow-sm shadow-cyan-500/10"
                              : "bg-[#050508]/60 border-white/5 hover:border-white/10 hover:bg-white/5"
                          }`}
                        >
                          <span className={`text-xs font-semibold uppercase tracking-wide font-mono ${
                            selectedScenario === scen.id ? "text-cyan-400" : "text-white group-hover:text-cyan-300"
                          }`}>
                            {scen.name}
                          </span>
                          <span className="text-[10px] text-slate-400 leading-normal font-sans">
                            {scen.desc}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedScenario === "custom" && (
                    <div className="space-y-2.5 bg-black/40 p-3 rounded-lg border border-white/5">
                      <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">
                        Describe System Fault Details
                      </label>
                      <textarea
                        rows={3}
                        value={customScenarioPrompt}
                        onChange={(e) => setCustomScenarioPrompt(e.target.value)}
                        placeholder="e.g. JVM garbage collection memory leaks on com.api.Storefront endpoints with full safe-safeguard thread restarts..."
                        className="w-full text-xs bg-[#030305] border border-white/10 rounded-lg p-2.5 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/40 font-mono focus:border-cyan-500"
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={scenarioLoading || (selectedScenario === "custom" && !customScenarioPrompt.trim())}
                    className="w-full py-3 bg-gradient-to-r from-red-500/80 to-pink-500/80 hover:from-red-500 hover:to-pink-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 disabled:pointer-events-none text-white font-mono text-xs uppercase font-bold tracking-widest rounded-lg transition-all shadow-md shadow-red-500/10 border-none flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {scenarioLoading ? (
                      <>
                        <RefreshCw className="animate-spin text-white" size={14} />
                        Injecting Sandbox Anomaly...
                      </>
                    ) : (
                      <>
                        <Zap size={14} />
                        Launch Chaos Injection
                      </>
                    )}
                  </button>
                </form>

                {scenarioError && (
                  <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs font-mono leading-relaxed">
                    🚨 ERROR: {scenarioError}
                  </div>
                )}
              </div>

              {/* OUTPUT DISPLAY PANEL */}
              <div className="lg:col-span-7 flex flex-col h-full min-h-[300px]">
                {scenarioLoading ? (
                  <div className="flex-1 flex flex-col items-center justify-center bg-[#030305] border border-white/5 rounded-xl p-6 text-center space-y-4">
                    <div className="relative">
                      <div className="w-14 h-14 rounded-full border-2 border-red-500/20 border-t-red-500 animate-spin" />
                      <Zap className="absolute inset-x-0 inset-y-0 m-auto text-red-500 animate-pulse" size={18} />
                    </div>
                    <div className="space-y-1.5 max-w-xs">
                      <h4 className="text-xs uppercase tracking-widest text-red-400 font-mono font-bold animate-pulse">
                        Chaos Protocol Engaged
                      </h4>
                      <p className="text-[10px] text-slate-400 leading-relaxed font-mono">
                        [SRE CORE]: SYNTHESIZING SIMULATION PARADOX ON PORT 3000...
                      </p>
                      <div className="text-[9px] text-[#22D3EE] font-mono select-none overflow-hidden h-4 flex items-center justify-center opacity-70">
                        <span className="animate-pulse">
                          =&gt; SYNTHESIZING OPERATIONAL TRACE LOGS
                        </span>
                      </div>
                    </div>
                  </div>
                ) : scenarioResponse ? (
                  <div className="flex-grow flex flex-col bg-[#030305]/80 border border-white/5 rounded-xl p-5 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[8px] tracking-wider uppercase font-bold font-mono rounded">
                            COGNITIVE ATTACK VECTOR
                          </span>
                          {scenarioResponse.fallback && (
                            <span className="px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-[8px] tracking-wider uppercase font-bold font-mono rounded">
                              LOCAL PRESCRIPTION
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-semibold text-white uppercase tracking-wider font-mono">
                          {scenarioResponse.scenarioName}
                        </h4>
                      </div>
                      <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] uppercase font-bold font-mono tracking-wide rounded-full">
                        <CheckCircle2 size={11} /> Loaded
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed font-sans bg-white/5 p-3 rounded-lg border border-white/5 shadow-inner">
                      {scenarioResponse.scenarioDescription}
                    </p>

                    <div className="space-y-1.5">
                      <span className="block text-[9px] uppercase font-bold tracking-wider text-slate-500 font-mono flex items-center gap-1 font-mono">
                        <Terminal size={10} /> Produced Telemetry Logs ({scenarioResponse.logsText.split("\n").length} rows)
                      </span>
                      <div className="bg-[#050508] border border-white/5 rounded-lg p-3 max-h-[160px] overflow-y-auto font-mono text-[9px] text-[#22D3EE] leading-relaxed break-all relative">
                        <pre className="whitespace-pre-wrap select-text selection:bg-cyan-500/30">
                          {scenarioResponse.logsText}
                        </pre>
                      </div>
                    </div>

                    {scenarioResponse.fallback && (
                      <div className="p-3.5 bg-yellow-400/5 border border-yellow-400/20 rounded-lg space-y-1 flex items-start gap-2.5">
                        <AlertTriangle className="text-yellow-400 shrink-0 mt-0.5" size={14} />
                        <div className="space-y-0.5">
                          <p className="text-[10px] font-bold uppercase text-yellow-400 font-mono tracking-wider">
                            Demonstration Fallback Warning
                          </p>
                          <p className="text-[10px] text-slate-400 leading-relaxed font-sans">
                            {scenarioResponse.hint} Add a GEMINI_API_KEY secret to customize unlimited scenario prompt definitions on the fly!
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex-grow flex flex-col items-center justify-center bg-[#030305]/30 border border-dashed border-white/5 rounded-xl p-6 text-center text-slate-500">
                    <Terminal className="text-slate-500/30 mb-2.5" size={24} />
                    <p className="text-xs font-mono font-bold uppercase tracking-wider">Telemetry Generator Idle</p>
                    <p className="text-[10px] text-slate-500 mt-1 font-sans">
                      Trigger Chaos Injection to simulate real cloud service disruptions.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
