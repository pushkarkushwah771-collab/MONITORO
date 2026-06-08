import React from "react";
import { LogEntry, LogLevel } from "../types";
import { Terminal, AlertTriangle, XCircle, Info, Activity } from "lucide-react";

interface MetricCardsProps {
  entries: LogEntry[];
  detectedFormat: string;
}

export default function MetricCards({ entries, detectedFormat }: MetricCardsProps) {
  const total = entries.length;
  const errors = entries.filter((e) => e.level === LogLevel.ERROR || e.level === LogLevel.FATAL).length;
  const warnings = entries.filter((e) => e.level === LogLevel.WARN).length;
  const infoAndDebug = entries.filter((e) => e.level === LogLevel.INFO || e.level === LogLevel.DEBUG).length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      {/* Total Logs */}
      <div id="stat-total" className="relative bg-white/[0.03] border border-white/5 hover:border-cyan-500/30 p-5 rounded-xl shadow-lg transition-all hover:scale-[1.01] flex flex-col justify-between overflow-hidden group">
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-cyan-400 group-hover:h-full transition-all"></div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Processed Logs</span>
          <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-md border border-cyan-500/20">
            <Terminal size={16} />
          </div>
        </div>
        <div>
          <h3 className="text-3xl font-bold text-white tracking-tight font-mono cyber-glow-cyan">{total}</h3>
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mt-1">lines ingested</p>
        </div>
      </div>

      {/* Extreme Errors */}
      <div id="stat-errors" className="relative bg-white/[0.03] border border-white/5 hover:border-rose-500/30 p-5 rounded-xl shadow-lg transition-all hover:scale-[1.01] flex flex-col justify-between overflow-hidden group">
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-rose-500"></div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-semibold tracking-wider text-rose-400 uppercase">Errors & Fatal</span>
          <div className="p-2 bg-rose-500/10 text-rose-400 rounded-md border border-rose-500/20">
            <XCircle size={16} />
          </div>
        </div>
        <div>
          <h3 className="text-3xl font-bold text-rose-500 tracking-tight font-mono cyber-glow-rose">{errors}</h3>
          <p className="text-[10px] text-rose-400/70 uppercase font-bold tracking-wider mt-1">
            {total > 0 ? ((errors / total) * 100).toFixed(1) : 0}% failure rate
          </p>
        </div>
      </div>

      {/* Warnings */}
      <div id="stat-warnings" className="relative bg-white/[0.03] border border-white/5 hover:border-amber-500/30 p-5 rounded-xl shadow-lg transition-all hover:scale-[1.01] flex flex-col justify-between overflow-hidden group">
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-amber-500"></div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-semibold tracking-wider text-amber-400 uppercase">Warnings</span>
          <div className="p-2 bg-amber-500/10 text-amber-400 rounded-md border border-amber-500/20">
            <AlertTriangle size={16} />
          </div>
        </div>
        <div>
          <h3 className="text-3xl font-bold text-amber-500 tracking-tight font-mono">{warnings}</h3>
          <p className="text-[10px] text-amber-400/70 uppercase font-bold tracking-wider mt-1">potential drift risks</p>
        </div>
      </div>

      {/* Clean Operations */}
      <div id="stat-clean" className="relative bg-white/[0.03] border border-white/5 hover:border-emerald-500/30 p-5 rounded-xl shadow-lg transition-all hover:scale-[1.01] flex flex-col justify-between overflow-hidden group">
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-emerald-500"></div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-semibold tracking-wider text-emerald-400 uppercase">Healthy Events</span>
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-md border border-emerald-500/20">
            <Info size={16} />
          </div>
        </div>
        <div>
          <h3 className="text-3xl font-bold text-emerald-500 tracking-tight font-mono">{infoAndDebug}</h3>
          <p className="text-[10px] text-emerald-400/70 uppercase font-bold tracking-wider mt-1">standard info & debugs</p>
        </div>
      </div>

      {/* Format Detection */}
      <div id="stat-format" className="relative bg-[#0a0a10] border border-cyan-500/20 p-5 rounded-xl shadow-lg transition-all hover:scale-[1.01] flex flex-col justify-between text-white lg:col-span-1 md:col-span-2 group">
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-cyan-400"></div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-semibold tracking-wider text-cyan-300 uppercase">File Signature</span>
          <div className="p-2 bg-cyan-400/20 text-cyan-300 rounded-md border border-cyan-400/30">
            <Activity size={16} />
          </div>
        </div>
        <div>
          <h3 className="text-base font-semibold text-cyan-100 truncate tracking-tight uppercase font-mono">{detectedFormat}</h3>
          <p className="text-[10px] text-cyan-400/70 uppercase font-bold tracking-wider mt-1">auto-detected format</p>
        </div>
      </div>
    </div>
  );
}
