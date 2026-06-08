import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { LogEntry, LogLevel } from "../types";
import {
  Search,
  ChevronDown,
  ChevronUp,
  Download,
  AlertCircle,
  FileText,
  Brain,
  Info,
  Calendar,
  Layers,
  Sparkles,
  Trash2,
} from "lucide-react";

interface LogTableProps {
  entries: LogEntry[];
  onExplainError: (entry: LogEntry) => void;
  explainLoadingId: string | null;
  onDeleteEntry?: (id: string) => void;
}

export default function LogTable({
  entries,
  onExplainError,
  explainLoadingId,
  onDeleteEntry,
}: LogTableProps) {
  const [levelFilter, setLevelFilter] = useState<LogLevel | "ALL">("ALL");
  const [sourceFilter, setSourceFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 50;

  // Toggle expanded states
  const toggleRow = (id: string) => {
    const next = new Set(expandedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedIds(next);
  };

  // Get unique sources
  const sources = useMemo(() => {
    const list = new Set(entries.map((e) => e.source));
    return Array.from(list).sort();
  }, [entries]);

  // Filter entry checklist
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      // 1. Level Filter
      if (levelFilter !== "ALL" && entry.level !== levelFilter) return false;

      // 2. Source Filter
      if (sourceFilter !== "ALL" && entry.source !== sourceFilter) return false;

      // 3. Search Query (Message, Raw or Source)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const msg = (entry.message || "").toLowerCase();
        const src = (entry.source || "").toLowerCase();
        const raw = (entry.raw || "").toLowerCase();
        const isInMeta = entry.metadata
          ? JSON.stringify(entry.metadata).toLowerCase().includes(query)
          : false;

        if (!msg.includes(query) && !src.includes(query) && !raw.includes(query) && !isInMeta) {
          return false;
        }
      }

      return true;
    });
  }, [entries, levelFilter, sourceFilter, searchQuery]);

  // Reset page when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [levelFilter, sourceFilter, searchQuery]);

  // Pagination bounds
  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / itemsPerPage));
  const paginatedEntries = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredEntries.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredEntries, currentPage]);

  const LevelBadge = ({ level }: { level: LogLevel }) => {
    const styles: Record<LogLevel, string> = {
      [LogLevel.DEBUG]: "bg-slate-500/10 text-slate-400 border-slate-500/20",
      [LogLevel.INFO]: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
      [LogLevel.WARN]: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      [LogLevel.ERROR]: "bg-rose-500/15 text-rose-400 border-rose-500/25",
      [LogLevel.FATAL]: "bg-red-500/25 text-red-400 border-red-500/35 font-bold",
      [LogLevel.UNKNOWN]: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    };

    return (
      <span className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider font-mono rounded-md border ${styles[level]}`}>
        {level}
      </span>
    );
  };

  // Export functions
  const downloadJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredEntries, null, 2));
    const dlAnchorElem = document.createElement("a");
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `log_analysis_export_${Date.now()}.json`);
    dlAnchorElem.click();
  };

  const downloadCSV = () => {
    const headers = ["Timestamp", "Level", "Source", "Message", "Raw"];
    const rows = filteredEntries.map((e) => [
      e.timestamp,
      e.level,
      e.source,
      e.message.replace(/"/g, '""'),
      e.raw.replace(/"/g, '""'),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.map((val) => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const dlAnchorElem = document.createElement("a");
    dlAnchorElem.setAttribute("href", encodedUri);
    dlAnchorElem.setAttribute("download", `log_analysis_export_${Date.now()}.csv`);
    dlAnchorElem.click();
  };

  return (
    <div id="log-records-panel" className="bg-[#0a0a10]/80 rounded-xl border border-white/5 shadow-2xl backdrop-blur-md p-6 mb-8">
      {/* Table Title and Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h3 className="text-base font-bold text-white uppercase tracking-wider">Diagnostics Log Grid</h3>
          <p className="text-xs text-slate-400">
            Filtered: {filteredEntries.length} of {entries.length} log lines matching parameters
          </p>
        </div>

        {/* Exports */}
        <div id="buttons-export" className="flex items-center gap-2">
          <button
            onClick={downloadJSON}
            disabled={entries.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded-lg transition-all border border-white/10 cursor-pointer"
          >
            <Download size={13} className="text-cyan-400" />
            JSON Export
          </button>
          <button
            onClick={downloadCSV}
            disabled={entries.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded-lg transition-all border border-white/10 cursor-pointer"
          >
            <Download size={13} className="text-cyan-400" />
            CSV Export
          </button>
        </div>
      </div>

      {/* SEARCH AND FILTERS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* Search */}
        <div className="relative md:col-span-2">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
            <Search size={15} />
          </span>
          <input
            type="text"
            placeholder="Search queries, trace IDs, source metrics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white/5 border border-white/10 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 text-white outline-none rounded-xl transition-all focus:bg-slate-900/60 font-mono"
          />
        </div>

        {/* Level Filters */}
        <div>
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value as any)}
            className="w-full px-3 py-2 text-sm bg-white/5 border border-white/10 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 text-slate-300 outline-none rounded-xl transition-all font-mono"
          >
            <option value="ALL" className="bg-[#0f0f18] text-white">All Severity Levels</option>
            {Object.values(LogLevel).map((lvl) => (
              <option key={lvl} value={lvl} className="bg-[#0f0f18] text-white">
                Level: {lvl}
              </option>
            ))}
          </select>
        </div>

        {/* Source Filters */}
        <div>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white/5 border border-white/10 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 text-slate-300 outline-none rounded-xl transition-all font-mono"
          >
            <option value="ALL" className="bg-[#0f0f18] text-white">All Sources ({sources.length})</option>
            {sources.map((src) => (
              <option key={src} value={src} className="bg-[#0f0f18] text-white">
                Source: {src}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* QUICK SELECT LEVEL BUTTONS */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mr-2">Quick Filter:</span>
        <button
          onClick={() => setLevelFilter("ALL")}
          className={`px-3 py-1 text-[10px] font-bold font-mono tracking-wider rounded-md border transition-all ${
            levelFilter === "ALL"
              ? "bg-cyan-500 text-black border-cyan-500 shadow-md shadow-cyan-500/25"
              : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
          }`}
        >
          ALL (DIRECT)
        </button>
        {Object.values(LogLevel).map((lvl) => {
          const count = entries.filter((e) => e.level === lvl).length;
          if (count === 0) return null;
          return (
            <button
              key={lvl}
              onClick={() => setLevelFilter(lvl)}
              className={`px-3 py-1 text-[10px] font-semibold font-mono tracking-wider rounded-md border transition-all ${
                levelFilter === lvl
                  ? "bg-cyan-500 text-black border-cyan-500 shadow-md shadow-cyan-500/25"
                  : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10"
              }`}
            >
              {lvl} [{count}]
            </button>
          );
        })}
      </div>

      {/* LOG DATA TABLE */}
      <div className="overflow-x-auto border border-white/5 rounded-xl mb-4 custom-scrollbar">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-white/[0.02] border-b border-white/10 text-slate-400 font-mono">
              <th className="py-3 px-4 w-10"></th>
              <th className="py-3 px-4 w-40 font-semibold tracking-wider text-[10px] uppercase">Timestamp</th>
              <th className="py-3 px-4 w-28 font-semibold tracking-wider text-[10px] uppercase">Severity</th>
              <th className="py-3 px-4 w-48 font-semibold tracking-wider text-[10px] uppercase">Service / Source</th>
              <th className="py-3 px-4 font-semibold tracking-wider text-[10px] uppercase">Console Message</th>
              <th className="py-3 px-4 w-28 text-right font-semibold tracking-wider text-[10px] uppercase">Cognitive</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 relative">
            <AnimatePresence initial={false}>
              {paginatedEntries.length === 0 ? (
                <motion.tr
                  key="empty-state"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <td colSpan={6} className="py-12 text-center text-slate-500 font-mono">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileText size={32} className="text-white/10" />
                      <span>No diagnostic logs match query arguments.</span>
                    </div>
                  </td>
                </motion.tr>
              ) : (
                paginatedEntries.flatMap((entry) => {
                  const isExpanded = expandedIds.has(entry.id);
                  const isSevere =
                    entry.level === LogLevel.ERROR ||
                    entry.level === LogLevel.FATAL;

                  return [
                    /* Primary Row */
                    <motion.tr
                      key={entry.id}
                      layout="position"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -15, scale: 0.98 }}
                      transition={{ duration: 0.2 }}
                      className={`transition-all align-top cursor-pointer ${
                        isSevere 
                          ? "bg-rose-500/5 hover:bg-rose-500/10 border-l-2 border-l-rose-500" 
                          : "hover:bg-white/5 border-l-2 border-l-transparent"
                      }`}
                      onClick={() => toggleRow(entry.id)}
                    >
                      <td className="py-3 px-4 text-slate-500 text-center select-none">
                        {isExpanded ? <ChevronUp size={13} className="text-[#e0e0e6]" /> : <ChevronDown size={13} className="text-[#e0e0e6]/60" />}
                      </td>
                      <td className="py-3 px-4 text-[11px] font-mono text-slate-400 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={11} className="text-cyan-400/60" />
                          {entry.timestamp}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <LevelBadge level={entry.level} />
                      </td>
                      <td className="py-3 px-4 text-[11px] font-mono text-cyan-300/80 font-medium max-w-[190px] truncate">
                        <div className="flex items-center gap-1">
                          <Layers size={11} className="text-slate-500 shrink-0" />
                          <span title={entry.source}>{entry.source}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[#e0e0e6]/90 font-mono text-[11px] break-all leading-relaxed pr-4">
                        {entry.message}
                      </td>
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          {isSevere || entry.level === LogLevel.WARN ? (
                            <button
                              onClick={() => onExplainError(entry)}
                              disabled={explainLoadingId !== null}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase font-mono text-black bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 rounded-md transition-all shadow-md shadow-cyan-500/10 cursor-pointer animate-none"
                              title="Diagnose fault event with Gemini"
                            >
                              <Brain size={11} className="shrink-0" />
                              {explainLoadingId === entry.id ? "Working..." : "AI Explain"}
                            </button>
                          ) : (
                            <button
                              onClick={() => onExplainError(entry)}
                              disabled={explainLoadingId !== null}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase font-mono text-slate-300 bg-white/5 hover:bg-white/10 disabled:opacity-40 rounded-md transition-all border border-white/10 cursor-pointer"
                            >
                              <Sparkles size={11} className="shrink-0 text-cyan-400" />
                              {explainLoadingId === entry.id ? "Working..." : "Explain"}
                            </button>
                          )}

                          {onDeleteEntry && (
                            <button
                              onClick={() => onDeleteEntry(entry.id)}
                              className="p-1.5 text-slate-550 hover:text-rose-400 hover:bg-[#e11d48]/10 rounded-lg transition-colors cursor-pointer shrink-0"
                              title="Delete log record"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>,

                    /* Explorable Metadata & Detail Row */
                    isExpanded && (
                      <motion.tr
                        key={`${entry.id}-detail`}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.15 }}
                        className="bg-black/40"
                      >
                        <td colSpan={6} className="py-3 px-6 select-text">
                          <div className="bg-[#050508] text-slate-300 p-4 rounded-xl font-mono text-xs overflow-x-auto border border-white/10 shadow-inner">
                            <h5 className="text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-3 flex items-center gap-1.5 border-b border-white/5 pb-2">
                              <Info size={11} className="text-cyan-400" /> RAW LOG STREAM EXCREPT
                            </h5>
                            <div className="text-slate-100 leading-relaxed whitespace-pre-wrap select-all bg-[#0a0a10] p-3 rounded-lg border border-white/5">
                              {entry.raw}
                            </div>

                            {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                              <div className="mt-4 pt-3 border-t border-white/5">
                                <h5 className="text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-2">
                                  EXTRACTED SERVICE TOPOLOGY METRIC OBJECTS
                                </h5>
                                <pre className="text-cyan-300 leading-relaxed overflow-x-auto whitespace-pre-wrap bg-[#0a0a10] p-3 rounded-lg border border-white/5">
                                  {JSON.stringify(entry.metadata, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    )
                  ].filter(Boolean) as React.ReactElement[];
                })
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* PAGINATION STATUS CONTROLS */}
      {totalPages > 1 && (
        <div id="table-pagination" className="flex items-center justify-between border-t border-white/5 pt-4 text-xs font-mono font-semibold">
          <span className="text-slate-500">
            PAGE {currentPage} OF {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-30 rounded-lg transition-all cursor-pointer select-none"
            >
              PREVIOUS
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-30 rounded-lg transition-all cursor-pointer select-none"
            >
              NEXT
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
