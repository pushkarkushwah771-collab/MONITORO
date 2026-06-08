import React, { useState, useEffect } from "react";
import { LogEntry, GeminiExplanationResponse, AnomalyReport } from "./types";
import { parseLogs } from "./logParser";
import { PRESET_LOGS } from "./sampleLogs";
import MetricCards from "./components/MetricCards";
import LogCharts from "./components/LogCharts";
import LogTable from "./components/LogTable";
import GeminiPanel from "./components/GeminiPanel";
import {
  Brain,
  FileText,
  Upload,
  RefreshCw,
  Play,
  Heart,
  Bot,
  Activity,
  Layers,
  Sparkles,
  Cpu,
  Database,
  Terminal,
} from "lucide-react";

export default function App() {
  // Parsed Log Core States
  const [rawText, setRawText] = useState<string>("");
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [detectedFormat, setDetectedFormat] = useState<string>("Empty");
  const [selectedPresetIdx, setSelectedPresetIdx] = useState<number>(0);

  // Ingestion inputs
  const [manualInputActive, setManualInputActive] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [textInput, setTextInput] = useState<string>("");

  // Gemini API States
  const [selectedLogForExplain, setSelectedLogForExplain] = useState<LogEntry | null>(null);
  const [explanation, setExplanation] = useState<GeminiExplanationResponse | null>(null);
  const [explainLoading, setExplainLoading] = useState<boolean>(false);
  const [explainLoadingId, setExplainLoadingId] = useState<string | null>(null);

  const [anomalyReport, setAnomalyReport] = useState<AnomalyReport | null>(null);
  const [anomalyLoading, setAnomalyLoading] = useState<boolean>(false);

  const [apiWarning, setApiWarning] = useState<string | null>(null);

  // Load standard Spring Boot example by default so page loads with rich visuals
  useEffect(() => {
    loadPreset(0);
  }, []);

  const loadPreset = (idx: number) => {
    setSelectedPresetIdx(idx);
    const preset = PRESET_LOGS[idx];
    setRawText(preset.content);
    setManualInputActive(false);

    const { entries: parsed, format } = parseLogs(preset.content);
    setEntries(parsed);
    setDetectedFormat(format);

    // Reset AI reports for clean state
    setSelectedLogForExplain(null);
    setExplanation(null);
    setAnomalyReport(null);
  };

  // Parsing triggered manually
  const handleParseCustomText = () => {
    if (!textInput.trim()) return;
    setRawText(textInput);
    const { entries: parsed, format } = parseLogs(textInput);
    setEntries(parsed);
    setDetectedFormat(format);
    setManualInputActive(false);

    setSelectedLogForExplain(null);
    setExplanation(null);
    setAnomalyReport(null);
  };

  // Drag and drop ingestion handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          setRawText(text);
          const { entries: parsed, format } = parseLogs(text);
          setEntries(parsed);
          setDetectedFormat(format);

          setSelectedLogForExplain(null);
          setExplanation(null);
          setAnomalyReport(null);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          setRawText(text);
          const { entries: parsed, format } = parseLogs(text);
          setEntries(parsed);
          setDetectedFormat(format);

          setSelectedLogForExplain(null);
          setExplanation(null);
          setAnomalyReport(null);
        }
      };
      reader.readAsText(file);
    }
  };

  // Call Gemini explain-error API
  const handleExplainError = async (entry: LogEntry) => {
    setSelectedLogForExplain(entry);
    setExplainLoading(true);
    setExplainLoadingId(entry.id);
    setExplanation(null);
    setApiWarning(null);

    try {
      // Find nearby context logs
      const currentIndex = entries.findIndex((e) => e.id === entry.id);
      const contextLogs = currentIndex !== -1
        ? entries.slice(Math.max(0, currentIndex - 3), currentIndex + 4)
        : [];

      // Scroll smoothly to AI assistant view
      const agentEl = document.getElementById("ai-assistant-terminal");
      if (agentEl) {
        agentEl.scrollIntoView({ behavior: "smooth" });
      }

      const response = await fetch("/api/gemini/explain-error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logEntry: entry, contextLogs }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to contact diagnostics API.");
      }

      const parsedExplanation: GeminiExplanationResponse = await response.json();
      setExplanation(parsedExplanation);
    } catch (err: any) {
      console.error(err);
      setApiWarning(
        `Gemini AI error: ${err.message}. Ensure your GEMINI_API_KEY is configured in Secrets.`
      );
      // Fallback response for offline playground
      setExplanation({
        explanation: "This appears to be a systemic exception in the application stack trace. Hikari connection timeout usually happens when thread pools do not release postgres sockets properly, or your lock statements have hung.",
        rootCause: "Database Connection Pool Thread Leak / Deadlock",
        fixSuggestions: [
          "Check whether database transactions are closed cleanly in finally blocks.",
          "Increase hikari maximumPoolSize configuration from 30 to 50.",
          "Analyze query lock timeouts or indices to keep postgres locks short duration."
        ],
        severity: "critical",
        tags: ["database", "postgres", "hikari"]
      });
    } finally {
      setExplainLoading(false);
      setExplainLoadingId(null);
    }
  };

  // Call Gemini anomaly report API
  const handleTriggerAnomalyReport = async () => {
    setAnomalyLoading(true);
    setAnomalyReport(null);
    setApiWarning(null);

    try {
      const response = await fetch("/api/gemini/anomaly-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logEntries: entries }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to extract core cluster anomalies.");
      }

      const report: AnomalyReport = await response.json();
      setAnomalyReport(report);
    } catch (err: any) {
      console.error(err);
      setApiWarning(
        `Failed to run cluster analysis: ${err.message}. Standard playground backup loaded.`
      );
      // Fallback
      setAnomalyReport({
        summary: "The analyzed dataset represents classic application microservices operations. Major warnings are related to Kafka connection delays and database thread exhaustion which happened close in time.",
        anomalies: [
          {
            pattern: "Connection pool exhaustion spike",
            description: "Hikari pool reached maximum capacity within minutes under GET auth request load",
            frequency: "10% of total errors",
            impact: "critical",
            suggestedInvestigation: "Review max connections profile and check if transactional connections are leaking."
          },
          {
            pattern: "Kafka heartbeats timeouts",
            description: "Heartbeat network broker connection lost recurringly",
            frequency: "2 occurrences",
            impact: "warning",
            suggestedInvestigation: "Verify whether consumer threads are blocking the event loop or if network jitter is active."
          }
        ],
        overallHealthScore: 68,
        keyInsights: [
          "Optimize SQL query parameters executing large UPDATE statements to avoid blocking index range locks.",
          "Check Kafka packet drops to confirm heartbeats are handled in high priority tasks.",
          "Implement connection pool auto-recovery thresholds."
        ]
      });
    } finally {
      setAnomalyLoading(false);
    }
  };

  // Semantic Action to Apply filtered inputs
  const handleApplySemanticFilters = (level: string, source: string, keyword: string) => {
    const tableSearchEl = document.querySelector("input[placeholder*='Search queries']") as HTMLInputElement;
    if (tableSearchEl) {
      tableSearchEl.value = keyword;
      // Trigger native input updates
      const event = new Event("input", { bubbles: true });
      tableSearchEl.dispatchEvent(event);
    }

    // Scroll back to Table
    const gridEl = document.getElementById("log-records-panel");
    if (gridEl) {
      gridEl.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleDeleteEntry = (id: string) => {
    setEntries((prev) => prev.filter((entry) => entry.id !== id));
  };

  return (
    <div className="min-h-screen bg-cyber-bg cyber-grid-overlay relative text-[#e0e0e6] py-8 px-4 sm:px-6 lg:px-8 select-none">
      {/* Decorative Radial glow effect */}
      <div className="absolute inset-0 bg-radial-gradient from-cyan-500/5 to-transparent pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* BRAND HEADER BAR */}
        <header className="h-16 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b border-white/10 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Activity size={20} className="text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-wider text-sm text-white font-sans uppercase">MONITORO</span>
                <span className="text-[10px] text-cyan-400 font-mono py-0.5 px-1.5 bg-cyan-950/40 rounded border border-cyan-500/20">v4.2.0</span>
              </div>
              <p className="text-xs text-slate-450 mt-1">
                Full-stack fault telemetry and Gemini cognitive diagnostics control desk.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <div className="hidden sm:flex items-center gap-6">
              <div className="text-right">
                <div className="text-[10px] text-white/45 uppercase tracking-widest font-bold">Processed Stream</div>
                <div className="text-xs font-mono text-cyan-400 font-semibold">{entries.length} Events</div>
              </div>
              <div className="w-px h-8 bg-white/10"></div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]"></div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 font-mono">LIVE OK</span>
              </div>
            </div>

            {/* DEMO PRESETS */}
            <div className="flex flex-wrap items-center gap-1.5 bg-black/40 border border-white/5 rounded-xl p-1">
              {PRESET_LOGS.map((preset, idx) => (
                <button
                  key={preset.name}
                  onClick={() => loadPreset(idx)}
                  className={`px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                    selectedPresetIdx === idx && !manualInputActive
                      ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/10 font-bold"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* API STATUS / WARNING NOTIFICATION */}
        {apiWarning && (
          <div className="mb-6 p-4 bg-[#0a0a10] text-[#e0e0e6] border border-cyan-500/20 rounded-xl text-xs flex gap-3 items-center shadow-lg backdrop-blur-md">
            <Bot size={18} className="shrink-0 text-cyan-400 animate-bounce" />
            <div>
              <span className="font-bold text-cyan-300">Playground Notice:</span> {apiWarning}{" "}
              <span className="text-slate-450 font-medium">(Standard mock analysis simulation fallback is active for local testing).</span>
            </div>
          </div>
        )}

        {/* UPLOAD / CUSTOM INPUT COMPONENT */}
        <div className="bg-[#0a0a10]/80 rounded-xl border border-white/5 p-6 mb-8 shadow-2xl backdrop-blur-md hover:border-cyan-500/10 transition-all">
          <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
              <Upload size={14} className="text-cyan-400" /> Log Data Ingestion Node
            </h4>
            <button
              onClick={() => setManualInputActive(!manualInputActive)}
              className="text-[10px] sm:text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors uppercase tracking-wider cursor-pointer"
            >
              {manualInputActive ? "Cancel Custom Ingest" : "Paste custom telemetry / console lines"}
            </button>
          </div>

          {manualInputActive ? (
            <div className="space-y-4">
              <textarea
                placeholder="Pasted standard application exceptions, JSON stack traces or apache ingress lines here..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                rows={6}
                className="w-full p-4 font-mono text-xs bg-[#050508] text-slate-200 border border-white/10 focus:border-cyan-500 rounded-lg outline-none whitespace-pre focus:ring-1 focus:ring-cyan-500/20"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setManualInputActive(false)}
                  className="px-4 py-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer uppercase font-mono tracking-wider"
                >
                  Cancel
                </button>
                <button
                  onClick={handleParseCustomText}
                  className="px-5 py-1.5 bg-cyan-400 hover:bg-cyan-300 text-black font-semibold text-xs tracking-wider uppercase font-mono rounded-lg transition-all shadow-lg hover:shadow-cyan-400/20 cursor-pointer border-none"
                >
                  Parse & Inject
                </button>
              </div>
            </div>
          ) : (
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                dragActive
                  ? "border-cyan-400 bg-cyan-950/20"
                  : "border-white/10 bg-white/[0.01] hover:bg-white/[0.02] hover:border-cyan-500/20 animate-none"
              }`}
              onClick={() => {
                const fileInput = document.getElementById("log-file-input");
                if (fileInput) fileInput.click();
              }}
            >
              <input
                id="log-file-input"
                type="file"
                accept=".txt,.log,.json"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="flex flex-col items-center justify-center gap-3">
                <FileText size={32} className={dragActive ? "text-cyan-400 animate-bounce" : "text-slate-500"} />
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  {dragActive ? "Drop your transmission blocks here!" : "DRAG & DROP raw trace blocks here, or click to load"}
                </p>
                <p className="text-[10px] font-mono text-slate-500">Supports system .log, console .txt, or elastic JSON records (Maximum 5MB)</p>
              </div>
            </div>
          )}
        </div>

        {/* METRIC CARDS */}
        <MetricCards entries={entries} detectedFormat={detectedFormat} />

        {/* METRICS & TIMELINE GRAPH CHECKS */}
        {entries.length > 0 && <LogCharts entries={entries} />}

        {/* COGNITIVE GEMINI DIAGNOSTICS WORKSPACE */}
        <GeminiPanel
          selectedLogForExplain={selectedLogForExplain}
          explanation={explanation}
          explainLoading={explainLoading}
          onClearExplanation={() => {
            setSelectedLogForExplain(null);
            setExplanation(null);
          }}
          anomalyReport={anomalyReport}
          anomalyLoading={anomalyLoading}
          onTriggerAnomalyReport={handleTriggerAnomalyReport}
          onApplyFilters={handleApplySemanticFilters}
          onInjectScenario={(logsText, scenarioName) => {
            setRawText(logsText);
            const { entries: parsed, format } = parseLogs(logsText);
            setEntries(parsed);
            setDetectedFormat(`${format} [${scenarioName}]`);
            
            // Reset state models for fresh cascade
            setSelectedLogForExplain(null);
            setExplanation(null);
            setAnomalyReport(null);
          }}
        />

        {/* LOG GRID TABLE AND SELECTION */}
        <LogTable
          entries={entries}
          onExplainError={handleExplainError}
          explainLoadingId={explainLoadingId}
          onDeleteEntry={handleDeleteEntry}
        />

        {/* SYSTEM STATUS FOOTER */}
        <footer className="mt-12 text-center text-[11px] font-mono text-slate-500 border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 mr-2">
          <p className="flex items-center gap-1.5 uppercase font-medium">
            <span>MONITORO telemetric terminal • px-992-K8s</span>
          </p>
          <p className="text-[10px] text-slate-600 select-none">
            Utilizing local state compilation alongside sandboxed endpoints.
          </p>
        </footer>
      </div>
    </div>
  );
}
