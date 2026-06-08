export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
  FATAL = "FATAL",
  UNKNOWN = "UNKNOWN"
}

export interface LogEntry {
  id: string;
  timestamp: string;
  timestampParsed?: number; // Epoch milliseconds for timeline aggregation
  level: LogLevel;
  source: string;
  message: string;
  raw: string;
  metadata?: Record<string, any>; // Parsed JSON, IP, HTTP Status, etc.
}

export interface LogAnalysisSummary {
  totalCount: number;
  levelCounts: Record<LogLevel, number>;
  sourceCounts: Record<string, number>;
  detectedFormat: string;
}

export interface GeminiExplanationResponse {
  explanation: string;
  rootCause: string;
  fixSuggestions: string[];
  severity: "low" | "medium" | "high" | "critical";
  tags: string[];
}

export interface AnomalyReport {
  summary: string;
  anomalies: Array<{
    pattern: string;
    description: string;
    frequency: string;
    impact: "warning" | "error" | "critical";
    suggestedInvestigation: string;
  }>;
  overallHealthScore: number; // 0 - 100
  keyInsights: string[];
}
