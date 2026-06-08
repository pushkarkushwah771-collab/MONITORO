import { LogEntry, LogLevel } from "./types";

// Generate a random stable-looking ID
function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

// Simple helper to parse generic date strings
function parseDateStringToMs(dateStr: string): number {
  try {
    const parsed = Date.parse(dateStr);
    if (!isNaN(parsed)) return parsed;
  } catch (e) {
    // Treat as invalid
  }
  return Date.now(); // fallback
}

// Regex definitions
const CLIENT_IP_REGEX = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;

export function parseLogs(rawText: string): { entries: LogEntry[]; format: string } {
  const lines = rawText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) {
    return { entries: [], format: "Empty" };
  }

  // Detect dominant format from the first 5 non-empty lines
  const sampleLines = lines.slice(0, 5);
  let jsonScore = 0;
  let nginxScore = 0;
  let standardBracketScore = 0;

  const nginxRegex = /^(\S+)\s+(\S+)\s+(\S+)\s+\[([^\]]+)\]\s+"([^"]+)"\s+(\d+)\s+(\d+|-)(?:\s+"([^"]*)"\s+"([^"]*)")?/;
  const standardBracketRegex = /(?:^|\[)(20\d{2}[-T\/\d\s:.]{8,25})(?:\]|\s+)(\[?[A-Z]{3,8}\]?)(\s+\[?([\w.-]+)\]?)?\s*[:-]\s*(.*)/i;

  sampleLines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        JSON.parse(trimmed);
        jsonScore++;
      } catch (_) {}
    }
    if (nginxRegex.test(trimmed)) {
      nginxScore++;
    }
    if (standardBracketRegex.test(trimmed)) {
      standardBracketScore++;
    }
  });

  let detectedFormat = "Unstructured Standard";
  if (jsonScore >= 3 || (sampleLines.length > 0 && jsonScore === sampleLines.length)) {
    detectedFormat = "Structured JSON";
  } else if (nginxScore >= 2 || (sampleLines.length > 0 && nginxScore === sampleLines.length)) {
    detectedFormat = "Nginx/Apache Access Logs";
  } else if (standardBracketScore >= 2 || (sampleLines.length > 0 && standardBracketScore === sampleLines.length)) {
    detectedFormat = "App server logs (Spring/Node/Log4j)";
  }

  const entries: LogEntry[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    let currentEntry: LogEntry | null = null;

    if (detectedFormat === "Structured JSON") {
      try {
        const parsed = JSON.parse(trimmed);
        // Look for common keys
        const levelRaw = String(parsed.level || parsed.severity || parsed.lvl || "INFO").toUpperCase();
        let level = LogLevel.INFO;
        if (levelRaw.includes("ERR") || levelRaw.includes("FAIL")) level = LogLevel.ERROR;
        else if (levelRaw.includes("WARN")) level = LogLevel.WARN;
        else if (levelRaw.includes("DEBUG")) level = LogLevel.DEBUG;
        else if (levelRaw.includes("FATAL") || levelRaw.includes("CRIT")) level = LogLevel.FATAL;

        const timestamp = parsed.time || parsed.timestamp || parsed.date || new Date().toISOString();
        const source = parsed.source || parsed.logger || parsed.category || parsed.service || "system";
        const message = parsed.message || parsed.msg || parsed.text || JSON.stringify(parsed);

        currentEntry = {
          id: `json-${i}-${generateId()}`,
          timestamp,
          timestampParsed: parseDateStringToMs(timestamp),
          level,
          source,
          message,
          raw: line,
          metadata: parsed
        };
      } catch (e) {
        // Fallback for this line
      }
    } else if (detectedFormat === "Nginx/Apache Access Logs") {
      const match = trimmed.match(nginxRegex);
      if (match) {
        const [_, ip, ruser, rname, timestampRaw, request, status, bytes, referer, userAgent] = match;
        const statusCode = parseInt(status, 10);
        let level = LogLevel.INFO;
        if (statusCode >= 500) level = LogLevel.ERROR;
        else if (statusCode >= 400) level = LogLevel.WARN;

        // Parse path from GET /path HTTP/1.1
        const pathPart = request.split(" ")[1] || request;

        currentEntry = {
          id: `nginx-${i}-${generateId()}`,
          timestamp: timestampRaw,
          timestampParsed: parseNginxDateToMs(timestampRaw),
          level,
          source: ip,
          message: `${request} -> HTTP ${statusCode} (${bytes} bytes)`,
          raw: line,
          metadata: {
            ip,
            request,
            statusCode,
            bytes,
            referer,
            userAgent,
            path: pathPart
          }
        };
      }
    } else if (detectedFormat === "App server logs (Spring/Node/Log4j)") {
      const match = trimmed.match(standardBracketRegex);
      if (match) {
        let [_, timestampRaw, levelRaw, __, sourceRaw, message] = match;
        levelRaw = levelRaw.replace(/[\[\]]/g, "").toUpperCase();
        sourceRaw = sourceRaw ? sourceRaw.replace(/[\[\]]/g, "") : "App";

        let level = LogLevel.INFO;
        if (levelRaw.includes("ERR") || levelRaw.includes("FAIL")) level = LogLevel.ERROR;
        else if (levelRaw.includes("WARN")) level = LogLevel.WARN;
        else if (levelRaw.includes("DEBUG")) level = LogLevel.DEBUG;
        else if (levelRaw.includes("FATAL")) level = LogLevel.FATAL;

        currentEntry = {
          id: `app-${i}-${generateId()}`,
          timestamp: timestampRaw,
          timestampParsed: parseDateStringToMs(timestampRaw),
          level,
          source: sourceRaw,
          message,
          raw: line
        };
      }
    }

    // Default unstructured/fallback parsing
    if (!currentEntry) {
      // Find level keywords
      let level = LogLevel.INFO;
      let levelFound = "INFO";
      if (trimmed.match(/\b(ERROR|FAIL|SEVERE|EXCEPTION)\b/i)) {
        level = LogLevel.ERROR;
        levelFound = "ERROR";
      } else if (trimmed.match(/\b(WARN|WARNING)\b/i)) {
        level = LogLevel.WARN;
        levelFound = "WARN";
      } else if (trimmed.match(/\b(DEBUG|TRACE)\b/i)) {
        level = LogLevel.DEBUG;
        levelFound = "DEBUG";
      } else if (trimmed.match(/\b(FATAL|CRITICAL)\b/i)) {
        level = LogLevel.FATAL;
        levelFound = "FATAL";
      }

      // Look for a date prefix
      const dateMatch = trimmed.match(/^\[?(20\d{2}[-\/\d\s:T.,Z+]{5,25})\]?/);
      let timestamp = new Date().toISOString();
      let msg = trimmed;

      if (dateMatch) {
        timestamp = dateMatch[1];
        // Clean up message
        msg = trimmed.replace(dateMatch[0], "").trim();
        // Remove level word if starting right after
        msg = msg.replace(new RegExp(`^\\[?${levelFound}\\]?\\s*[:-]?`, "i"), "").trim();
      }

      // Try extraction of bracket source e.g. [DatabasePool] or [main]
      const sourceMatch = msg.match(/^\[([\w.-]+)\]/);
      let source = "main";
      if (sourceMatch) {
        source = sourceMatch[1];
        msg = msg.replace(sourceMatch[0], "").trim().replace(/^[:-]/, "").trim();
      }

      currentEntry = {
        id: `raw-${i}-${generateId()}`,
        timestamp,
        timestampParsed: parseDateStringToMs(timestamp),
        level,
        source,
        message: msg,
        raw: line
      };
    }

    entries.push(currentEntry);
  }

  // Sort chronological based on timestampParsed so visualizations are correct
  entries.sort((a, b) => (a.timestampParsed || 0) - (b.timestampParsed || 0));

  return { entries, format: detectedFormat };
}

// Convert nginx date e.g. "10/Oct/2000:13:55:36 -0700"
function parseNginxDateToMs(nginxStr: string): number {
  try {
    const parts = nginxStr.split(":");
    if (parts.length >= 4) {
      const datePart = parts[0]; // e.g. "10/Oct/2000"
      const timePart = `${parts[1]}:${parts[2]}:${parts[3]}`; // e.g. "13:55:36 -0700"
      
      const dateSubparts = datePart.split("/");
      if (dateSubparts.length === 3) {
        const day = dateSubparts[0];
        const month = dateSubparts[1];
        const year = dateSubparts[2];
        const normalStr = `${day} ${month} ${year} ${timePart}`;
        const parsed = Date.parse(normalStr);
        if (!isNaN(parsed)) return parsed;
      }
    }
  } catch (e) {}
  return Date.now();
}
