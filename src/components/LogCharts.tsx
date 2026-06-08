import React from "react";
import { LogEntry, LogLevel } from "../types";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";

interface LogChartsProps {
  entries: LogEntry[];
}

export default function LogCharts({ entries }: LogChartsProps) {
  // 1. Level Distribution Data
  const levels = Object.values(LogLevel);
  const distributionData = levels
    .map((level) => {
      const count = entries.filter((e) => e.level === level).length;
      return { name: level, value: count };
    })
    .filter((d) => d.value > 0);

  // Immersive Theme Colors
  const COLORS: Record<string, string> = {
    [LogLevel.DEBUG]: "#475569", // slate
    [LogLevel.INFO]: "#06b6d4",  // Neon Cyan
    [LogLevel.WARN]: "#eab308",  // Amber Warn
    [LogLevel.ERROR]: "#f43f5e", // Neon Rose
    [LogLevel.FATAL]: "#be123c", // Crimson Outage
    [LogLevel.UNKNOWN]: "#64748b",
  };

  // 2. Timeline Aggregator (Buckets)
  const validEntries = entries.filter((e) => e.timestampParsed !== undefined);

  let timelineData: any[] = [];

  if (validEntries.length > 0) {
    const times = validEntries.map((e) => e.timestampParsed as number);
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const rangeMs = maxTime - minTime;

    // Determine interval size: aiming for around 6 to 12 intervals
    let intervalMs = 60000; // 1 minute default
    if (rangeMs > 24 * 3600 * 1000) {
      intervalMs = 4 * 3600 * 1000; // 4 hours
    } else if (rangeMs > 4 * 3600 * 1000) {
      intervalMs = 30 * 60 * 1000; // 30 minutes
    } else if (rangeMs > 30 * 60 * 1000) {
      intervalMs = 5 * 60 * 1000; // 5 minutes
    } else if (rangeMs > 5 * 60 * 1000) {
      intervalMs = 30000; // 30 seconds
    } else if (rangeMs > 0) {
      intervalMs = Math.max(1000, Math.floor(rangeMs / 10)); // adjust dynamically
    }

    // Generate buckets
    const bucketCount = Math.max(1, Math.ceil(rangeMs / intervalMs)) + 1;
    const buckets = Array.from({ length: bucketCount }).map((_, idx) => {
      const bucketStart = minTime + idx * intervalMs;
      const date = new Date(bucketStart);
      const label = formatTimeLabel(date, intervalMs);
      return {
        timestampStart: bucketStart,
        label,
        [LogLevel.DEBUG]: 0,
        [LogLevel.INFO]: 0,
        [LogLevel.WARN]: 0,
        [LogLevel.ERROR]: 0,
        [LogLevel.FATAL]: 0,
      };
    });

    // Populate buckets
    validEntries.forEach((entry) => {
      const t = entry.timestampParsed as number;
      const bucketIdx = Math.floor((t - minTime) / intervalMs);
      if (bucketIdx >= 0 && bucketIdx < buckets.length) {
        buckets[bucketIdx][entry.level]++;
      }
    });

    timelineData = buckets;
  } else {
    // Fallback: group sequentially in blocks of logs
    const blockSize = Math.max(1, Math.ceil(entries.length / 10));
    const blocksCount = Math.ceil(entries.length / blockSize);
    timelineData = Array.from({ length: blocksCount }).map((_, idx) => {
      const slice = entries.slice(idx * blockSize, (idx + 1) * blockSize);
      const label = `Block ${idx + 1}`;
      return {
        label,
        [LogLevel.DEBUG]: slice.filter((e) => e.level === LogLevel.DEBUG).length,
        [LogLevel.INFO]: slice.filter((e) => e.level === LogLevel.INFO).length,
        [LogLevel.WARN]: slice.filter((e) => e.level === LogLevel.WARN).length,
        [LogLevel.ERROR]: slice.filter((e) => e.level === LogLevel.ERROR).length,
        [LogLevel.FATAL]: slice.filter((e) => e.level === LogLevel.FATAL).length,
      };
    });
  }

  function formatTimeLabel(date: Date, intervalMs: number): string {
    const pad = (n: number) => n.toString().padStart(2, "0");
    if (intervalMs >= 3600 * 1000) {
      return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }
    return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  return (
    <div id="diagnostics-charts" className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      {/* 1. Timeline Frequency Chart */}
      <div className="lg:col-span-2 bg-[#0a0a10]/80 rounded-xl border border-white/5 p-6 shadow-2xl backdrop-blur-md flex flex-col justify-between">
        <div>
          <h4 className="text-sm font-bold text-white uppercase tracking-wider">Telemetry Frequency Timeline</h4>
          <p className="text-xs text-slate-400 mb-4">Traffic occurrences categorized by log intensity level</p>
        </div>
        <div className="h-64 w-full">
          {timelineData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorInfo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS[LogLevel.INFO]} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={COLORS[LogLevel.INFO]} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorWarn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS[LogLevel.WARN]} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={COLORS[LogLevel.WARN]} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorErr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS[LogLevel.ERROR]} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={COLORS[LogLevel.ERROR]} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
                <XAxis dataKey="label" stroke="rgba(255, 255, 255, 0.4)" fontSize={11} tickLine={false} />
                <YAxis stroke="rgba(255, 255, 255, 0.4)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0d0d14",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: "8px",
                    color: "#e0e0e6",
                    fontSize: "12px",
                  }}
                  itemStyle={{ color: "#e0e0e6" }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "11px", paddingTop: "10px", color: "#a1a1aa" }} />
                <Area
                  type="monotone"
                  dataKey={LogLevel.INFO}
                  stroke={COLORS[LogLevel.INFO]}
                  fillOpacity={1}
                  fill="url(#colorInfo)"
                  name="Info Logs"
                  stackId="1"
                />
                <Area
                  type="monotone"
                  dataKey={LogLevel.WARN}
                  stroke={COLORS[LogLevel.WARN]}
                  fillOpacity={1}
                  fill="url(#colorWarn)"
                  name="Warning Logs"
                  stackId="1"
                />
                <Area
                  type="monotone"
                  dataKey={LogLevel.ERROR}
                  stroke={COLORS[LogLevel.ERROR]}
                  fillOpacity={1}
                  fill="url(#colorErr)"
                  name="Error Logs"
                  stackId="1"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 font-mono text-xs">Waiting for telemetry data...</div>
          )}
        </div>
      </div>

      {/* 2. Severity Share Pie */}
      <div className="bg-[#0a0a10]/80 rounded-xl border border-white/5 p-6 shadow-2xl backdrop-blur-md flex flex-col justify-between">
        <div>
          <h4 className="text-sm font-bold text-white uppercase tracking-wider">Severity Breakdown</h4>
          <p className="text-xs text-slate-400 mb-4">Percentage share of active telemetry levels</p>
        </div>
        <div className="h-44 w-full relative flex items-center justify-center">
          {distributionData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[entry.name] || "#475569"} stroke="rgba(5,5,8,0.8)" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => [`${value} entries`, "Count"]}
                  contentStyle={{
                    backgroundColor: "#0d0d14",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: "6px",
                    color: "#e0e0e6",
                    fontSize: "12px"
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-slate-500 font-mono text-xs">Waiting for telemetry parse stream</div>
          )}
          {distributionData.length > 0 && (
            <div className="absolute flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold font-mono text-white tracking-tighter cyber-glow-cyan">{entries.length}</span>
              <span className="text-[9px] uppercase font-bold text-slate-500 tracking-widest mt-0.5">Entries</span>
            </div>
          )}
        </div>
        {/* Color Legend Row */}
        <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center mt-3 text-[11px] font-mono">
          {distributionData.map((d) => (
            <div key={d.name} className="flex items-center gap-1.5 font-medium text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[d.name] }} />
              <span className="text-[10px] uppercase. tracking-tight">
                {d.name}: {((d.value / entries.length) * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
