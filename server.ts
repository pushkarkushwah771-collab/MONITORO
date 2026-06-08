import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

// Enable JSON bodies with limit for large pasted log batches
app.use(express.json({ limit: "15mb" }));

// Lazy-loaded Gemini AI client instance wrapper
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not configured in Secrets / environment variables.");
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Ensure server is healthy
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    geminiConfigured: !!process.env.GEMINI_API_KEY,
  });
});

// Endpoint: Explain specific Log Entry
app.post("/api/gemini/explain-error", async (req, res) => {
  try {
    const { logEntry, contextLogs } = req.body;
    if (!logEntry) {
      return res.status(400).json({ error: "Missing logEntry to analyze." });
    }

    const ai = getGeminiClient();
    
    // Provide some context lines around the error for better diagnostics
    const contextText = contextLogs && Array.isArray(contextLogs)
      ? contextLogs.map((c: any) => `[${c.timestamp}] [${c.level}] ${c.source}: ${c.message}`).join("\n")
      : "";

    const systemPrompt = `You are an expert devops and systems diagnostic engineer designed to pinpoint code failures, stack traces, and database exceptions.`;
    const prompt = `
Please analyze this log entry:
Timestamp: ${logEntry.timestamp}
Level: ${logEntry.level}
Source: ${logEntry.source}
Message: ${logEntry.message}
Raw Line: ${logEntry.raw}

${contextText ? `Here is the nearby log context that happened around the same time:\n${contextText}` : ""}

Provide:
1. A clear high-level human explanation of the error.
2. The direct technical root cause.
3. 3 core suggestions to resolve it.
4. An risk/severity rating (low, medium, high, critical).
5. Useful meta tags for categorization (e.g., db, network, auth, memory).
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["explanation", "rootCause", "fixSuggestions", "severity", "tags"],
          properties: {
            explanation: {
              type: Type.STRING,
              description: "Clear and user-friendly explanation of what went wrong.",
            },
            rootCause: {
              type: Type.STRING,
              description: "The underlying technical cause or origin of this log entry.",
            },
            fixSuggestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Actionable, numbered troubleshooting recommendations.",
            },
            severity: {
              type: Type.STRING,
              description: "Must be low, medium, high, or critical.",
            },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Relevant category tags (e.g. database, authentication, socket).",
            },
          },
        },
      },
    });

    const parsedData = JSON.parse(response.text?.trim() || "{}");
    res.json(parsedData);
  } catch (error: any) {
    console.error("Error explaining log entry:", error);
    res.status(500).json({
      error: error.message || "An error occurred during Gemini processing.",
      fallbackExplanation: true,
    });
  }
});

// Endpoint: Anomaly analysis on sample of logs
app.post("/api/gemini/anomaly-report", async (req, res) => {
  try {
    const { logEntries } = req.body;
    if (!logEntries || !Array.isArray(logEntries) || logEntries.length === 0) {
      return res.status(400).json({ error: "Missing logEntries or empty array." });
    }

    const ai = getGeminiClient();

    // Summarize the entries to send as a prompt context
    // Filter to errors, warns or a random sparse selection to fit in prompt easily
    const totalCount = logEntries.length;
    const errorsAndWarns = logEntries.filter((l: any) => l.level === "ERROR" || l.level === "WARN" || l.level === "FATAL");
    
    // Sample logs if there are too many, selecting up to 50 key logs
    const sampleSize = 50;
    let sampledLogs = errorsAndWarns.slice(0, sampleSize);
    if (sampledLogs.length < 15) {
      // mix some INFO logs
      const infoLogs = logEntries.filter((l: any) => l.level === "INFO").slice(0, sampleSize - sampledLogs.length);
      sampledLogs = [...sampledLogs, ...infoLogs];
    }
    
    const formattedLogs = sampledLogs.map((l: any) => 
      `[${l.timestamp}] [${l.level}] [Source: ${l.source}] ${l.message}`
    ).join("\n");

    const systemPrompt = `You are a system security and reliability review bot. Your goal is to run pattern analysis on server logs and generate anomaly reports.`;
    const prompt = `
Analyze this sample of ${sampledLogs.length} logs out of a total dataset of ${totalCount} items:

${formattedLogs}

Please detect any:
- Recurring failure cycles or cascading error spikes.
- Anomalous spikes from certain IP addresses, paths, classes, or keys.
- Strange timestamp gaps or unexpected debug chatter.
- High frequency failures.

Determine an overall log-based system Health Score from 0 to 100.
Provide an executive review summary, bulleted key insights, and list any structured anomalies.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["summary", "anomalies", "overallHealthScore", "keyInsights"],
          properties: {
            summary: {
              type: Type.STRING,
              description: "A comprehensive high-level review of the diagnostics findings.",
            },
            anomalies: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["pattern", "description", "frequency", "impact", "suggestedInvestigation"],
                properties: {
                  pattern: { type: Type.STRING, description: "Name of the anomalous pattern detected." },
                  description: { type: Type.STRING, description: "Detailed description of the pattern." },
                  frequency: { type: Type.STRING, description: "How often or what fraction of logs does it show up." },
                  impact: { type: Type.STRING, description: "Must be warning, error, or critical." },
                  suggestedInvestigation: { type: Type.STRING, description: "Actionable steps to search for or resolve." }
                }
              },
            },
            overallHealthScore: {
              type: Type.INTEGER,
              description: "An overall health score integer between 0 and 100 based on the severe logs.",
            },
            keyInsights: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Overall takeaways and optimizations for runtime systems.",
            }
          },
        },
      },
    });

    const parsedData = JSON.parse(response.text?.trim() || "{}");
    res.json(parsedData);
  } catch (error: any) {
    console.error("Error generating anomaly report:", error);
    res.status(500).json({ error: error.message || "An error occurred during Gemini process." });
  }
});

// Endpoint: AI Search and filter logic
app.post("/api/gemini/natural-query", async (req, res) => {
  try {
    const { query, logEntries } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Missing user query." });
    }

    const ai = getGeminiClient();

    // Sample error types, source values, and some sample logs
    const uniqueLevels = Array.from(new Set(logEntries.map((l: any) => l.level)));
    const uniqueSources = Array.from(new Set(logEntries.map((l: any) => l.source))).slice(0, 15);
    const sampleText = logEntries.slice(0, 30).map((l: any) => `[${l.level}] [${l.source}] ${l.message}`).join("\n");

    const systemPrompt = `You are a system assistant who maps visual search queries to specific search terms or provides helpful advice on logs.`;
    const prompt = `
The user is asking: "${query}"

Here is the log configuration metadata of the current files loaded:
Unique sources available: ${uniqueSources.join(", ")}
Log levels available: ${uniqueLevels.join(", ")}

Some sample rows from the file:
${sampleText}

Please guide the user. Answer:
1. An explanation of how to track this down or what logs match this request.
2. Suggested filter parameters that the frontend dashboard could apply:
   - "level" (e.g. "ERROR", "WARN" or "" if none)
   - "source" (e.g. database, main, standard IP, or "" if none)
   - "keyword" (suggested query filter string or regex or "" if none)
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["answer", "suggestedFilters"],
          properties: {
            answer: {
              type: Type.STRING,
              description: "Helpful assistant answer explaining what search terms or patterns match their query.",
            },
            suggestedFilters: {
              type: Type.OBJECT,
              required: ["level", "source", "keyword"],
              properties: {
                level: { type: Type.STRING, description: "A valid uppercase LogLevel, or matching subset" },
                source: { type: Type.STRING, description: "A suggested source name, or blank if not specific" },
                keyword: { type: Type.STRING, description: "A search string or exception term to look up" },
              },
            },
          },
        },
      },
    });

    const parsedData = JSON.parse(response.text?.trim() || "{}");
    res.json(parsedData);
  } catch (error: any) {
    console.error("Error in natural query parser:", error);
    res.status(500).json({ error: error.message || "An error occurred with Gemini." });
  }
});

// Endpoint: AI-driven Incident Simulation Sandbox Log Generation
app.post("/api/gemini/generate-scenario", async (req, res) => {
  const { scenarioType, customPrompt } = req.body;
  if (!scenarioType) {
    return res.status(400).json({ error: "Missing scenarioType parameter." });
  }

  // Pre-compiled high-fidelity fallback scenarios for uninterrupted local testing
  const getFallbackScenario = (type: string, promptText?: string) => {
    switch (type) {
      case "db-deadlock":
        return {
          scenarioName: "PostgreSQL Deadlock & Connection Pool Exhaustion [Local Fallback]",
          scenarioDescription: "A high-wait lock wait escalation on the 'orders' primary keys causes HikariCP connection pool threads to starve, culminating in database thread timeout exceptions and transactional rollbacks.",
          logsText: [
            "2026-06-08 14:00:00.000 INFO [main] org.postgresql.Driver - PostgreSQL JDBC Driver 42.6.0 loaded",
            "2026-06-08 14:00:02.150 INFO [main] com.zaxxer.hikari.HikariDataSource - HikariPool-1 - Starting...",
            "2026-06-08 14:00:03.440 INFO [main] com.zaxxer.hikari.pool.HikariPool - HikariPool-1 - Added connection org.postgresql.jdbc.PgConnection@6b38c2",
            "2026-06-08 14:00:04.100 INFO [main] com.zaxxer.hikari.HikariDataSource - HikariPool-1 - Start completed.",
            "2026-06-08 14:00:05.800 INFO [http-nio-3000-exec-1] com.example.service.OrderService - Context initialized. Server ready for traffic.",
            "2026-06-08 14:00:10.512 INFO [http-nio-3000-exec-2] com.example.service.OrderService - Received checkout request for item ID: prod_77182, qty: 1",
            "2026-06-08 14:00:11.950 INFO [http-nio-3000-exec-2] com.example.db.QueryLogger - Execution time: 145 ms (select * from products where id = 'prod_77182')",
            "2026-06-08 14:01:05.412 WARN [http-nio-3000-exec-3] org.postgresql.jdbc.PgStatement - Database lock wait exceeded 5000 ms: UPDATE inventory SET stock = stock - 1 WHERE id = 'prod_77182'",
            "2026-06-08 14:01:10.220 WARN [com.zaxxer.hikari.pool.HikariPool] HikariPool-1 - Connection pool usage spiked. Active connections: 20/20, Idle: 0, Pending Threads: 4",
            "2026-06-08 14:01:15.890 WARN [http-nio-3000-exec-4] com.example.service.OrderService - Database query latency executing (UPDATE orders SET status = 'FILLED'): 10244ms",
            "2026-06-08 14:01:25.109 ERROR [com.zaxxer.hikari.pool.HikariPool] HikariPool-1 - Connection is not available, request timed out after 30000ms.",
            "2026-06-08 14:01:25.111 ERROR [com.example.controller.OrderController] Failed to complete checkout: com.zaxxer.hikari.pool.PoolInitializationException: Connection wait timed out.",
            "2026-06-08 14:01:27.502 ERROR [org.postgresql.jdbc.PgConnection] PostgreSQL Deadlock Detected: Process 14801 waiting for ShareLock on transaction 38112; blocked by process 14820.",
            "2026-06-08 14:01:28.110 ERROR [org.postgresql.jdbc.PgConnection] PostgreSQL Deadlock Detail: Process 14820 waits for ExclusiveLock on relation 16422; blocked by process 14801.",
            "2026-06-08 14:01:30.900 ERROR [com.example.service.InvoiceService] org.postgresql.util.PSQLException: ERROR: deadlock detected. Details: Transaction 38112 rolled back.",
            "2026-06-08 14:01:40.412 FATAL [com.example.CoreUncaughtExceptionHandler] Thread http-nio-3000-exec-3 terminated due to uncaught exception PSQLException: Connection is closed.",
            "2026-06-08 14:01:45.312 FATAL [com.example.CoreUncaughtExceptionHandler] Thread http-nio-3000-exec-4 terminated due to uncaught exception PSQLException: Connection is closed.",
            "2026-06-08 14:02:00.120 WARN [com.zaxxer.hikari.pool.ProxyConnection] Connection org.postgresql.jdbc.PgConnection@6b38c2 marked as broken by application exception scavenger.",
            "2026-06-08 14:02:10.880 INFO [com.zaxxer.hikari.pool.HikariPool] HikariPool-1 - Cleaned up broken connection PgConnection@6b38c2. Active connections: 4/20.",
            "2026-06-08 14:02:15.540 INFO [com.example.service.OrderService] Connection pool scavenged successfully. Release lock contention. Status: OK."
          ].join("\n")
        };
      case "auth-oauth-failure":
        return {
          scenarioName: "OAuth Callback Signature Validation Cascade [Local Fallback]",
          scenarioDescription: "An unplanned certificate rotation in the upstream client identity platform forces local decryption failures on incoming authorization codes, resulting in invalid signatures and user login blackouts.",
          logsText: [
            "2026-06-08 15:00:00.000 INFO [main] com.example.auth.SecurityConfig - Configuring OAuth2 Login provider: Google Identity Platform",
            "2026-06-08 15:00:01.102 INFO [main] com.example.auth.JWTokenProvider - System security JWT keys initialized. Rotation interval: 24h",
            "2026-06-08 15:00:03.950 INFO [http-nio-3000-exec-1] com.example.auth.AuthController - Initiating state challenge validation on path /login/oauth2/code/google",
            "2026-06-08 15:00:05.412 INFO [http-nio-3000-exec-2] com.example.auth.AuthController - JWT Token issued for user ID \"admin-developer-01\" (Role: SRE)",
            "2026-06-08 15:01:10.512 WARN [http-nio-3000-exec-5] com.example.auth.OAuth2UserService - Callback signature validation mismatch. Retrying JWK key set retrieval from external endpoint...",
            "2026-06-08 15:01:12.780 WARN [http-nio-3000-exec-5] com.example.auth.OAuth2UserService - Upstream returned slow response (http status 200, latency: 4500ms) for jwk uri.",
            "2026-06-08 15:01:20.109 ERROR [http-nio-3000-exec-6] com.example.auth.TokenExchangeService - Exchange failed: HTTP 400 Bad Request. Description: \"invalid_grant\" - Code was already redeemed or expired.",
            "2026-06-08 15:01:21.840 ERROR [com.example.auth.OAuthException] org.springframework.security.oauth2.core.OAuth2AuthenticationException: [invalid_token_signature] An error occurred while validating the OAuth2 cryptosignature.",
            "2026-06-08 15:01:25.102 ERROR [http-nio-3000-exec-7] com.example.auth.AuthController - Failed to parse Google user attributes mapping. Unrecognized field nested in body: \"email_verified_status\"",
            "2026-06-08 15:01:26.540 ERROR [http-nio-3000-exec-8] com.example.auth.AuthController - Authentication sequence aborted: Failed to resolve authorization code from callback redirect parameter.",
            "2026-06-08 15:01:40.912 FATAL [http-nio-3000-exec-9] com.example.auth.SecurityConfig - Security context cleared. Repeated invalid token signatures from same subnet 185.22.181.12.",
            "2026-06-08 15:02:00.100 INFO [com.example.auth.JWKRotationTask] Executing manual force-fetch task for upstream JWKs signature set.",
            "2026-06-08 15:02:01.412 INFO [com.example.auth.JWKRotationTask] Upstream JWKs retrieved and cached successfully. Signatures updated. Security restored."
          ].join("\n")
        };
      case "kafka-lag-spike":
        return {
          scenarioName: "Kafka Partition Lag & Heartbeat Timeout Warning [Local Fallback]",
          scenarioDescription: "A poison pill record containing unparseable bytes triggers serialization exceptions in the Kafka worker thread. Heartbeats are starved during execution attempts, prompting consumer partition rebalancing loops.",
          logsText: [
            "2026-06-08 16:00:00.000 INFO [main] org.apache.kafka.clients.consumer.KafkaConsumer - Kafka consumer group ordering-group initialized. Bootstrap servers: kafka-broker-1:9092",
            "2026-06-08 16:00:01.540 INFO [main] org.apache.kafka.clients.consumer.internals.ConsumerCoordinator - [Consumer clientId=consumer-1, groupId=ordering-group] Discovered coordinator kafka-broker-1:9092",
            "2026-06-08 16:00:05.109 INFO [ordering-group-thread-1] com.example.worker.OrderConsumer - Listening for partition assignments on topic \"orders.events\"",
            "2026-06-08 16:00:06.880 INFO [ordering-group-thread-1] org.apache.kafka.clients.consumer.internals.ConsumerCoordinator - [Consumer clientId=consumer-1, groupId=ordering-group] Successfully joined group with generation 41",
            "2026-06-08 16:01:10.412 WARN [ordering-group-thread-1] org.apache.kafka.clients.consumer.internals.ConsumerCoordinator - [Consumer clientId=consumer-1, groupId=ordering-group] Heartbeat session expired. Session timeout is 45000ms. Coordinator marked as dead.",
            "2026-06-08 16:01:12.780 WARN [ordering-group-thread-2] com.example.worker.OrderConsumer - Consumer thread execution took too long (32100ms) processing message partition=2, offset=4120. Heartbeat missed.",
            "2026-06-08 16:01:15.910 WARN [ordering-group-thread-1] org.apache.kafka.clients.consumer.internals.ConsumerCoordinator - Revoking previously assigned partitions [orders.events-0, orders.events-1, orders.events-2]",
            "2026-06-08 16:01:25.102 ERROR [ordering-group-thread-2] com.example.worker.OrderConsumer - Fatal deserialization failure. Unable to map byte stream to Java record class OrderEvent on offset=4121.",
            "2026-06-08 16:01:25.109 ERROR [ordering-group-thread-2] org.apache.kafka.common.errors.SerializationException: Error deserializing key/value for partition orders.events-2 at offset 4121. Nested: Unrecognized token 'REBOOT'.",
            "2026-06-08 16:01:26.540 ERROR [ordering-group-thread-1] org.apache.kafka.clients.NetworkClient - [Consumer clientId=consumer-1] Connection to node -1 (kafka-broker-1/192.168.12.11:9092) could not be established. Broker may be down or unreachable.",
            "2026-06-08 16:01:30.912 FATAL [com.example.worker.ConsumerGroupStallMonitor] Kafka CONSUMER GROUP \"ordering-group\" ENCOUNTERED DEATH SPIRAL. Queue consumer lag checked: 144,912 pending events.",
            "2026-06-08 16:02:00.100 INFO [com.example.worker.OrderConsumer] Initiating partition deserialization error skip fallback handler. Poison pill packet safely moved to dead-letter-queue (DLQ) topic: \"orders.events.DLQ\".",
            "2026-06-08 16:02:05.412 INFO [ordering-group-thread-1] org.apache.kafka.clients.consumer.internals.ConsumerCoordinator - Rejoining group completed. Partitions reassigned cleanly. Processing rate resumed."
          ].join("\n")
        };
      case "ddos-attack":
        return {
          scenarioName: "Nginx Ingress Edge DDoS Attack Wave [Local Fallback]",
          scenarioDescription: "An external fast-firing botnet flood targets the authentication APIs, bloating Nginx connection pools and triggering widespread 504 Gateway Timeouts at the application ingress layer.",
          logsText: [
            "185.12.110.45 - - [08/Jun/2026:17:00:00 +0000] \"GET /health HTTP/1.1\" 200 45 \"-\" \"UptimeRobot/2.0\"",
            "185.12.110.45 - - [08/Jun/2026:17:00:03 +0000] \"GET /api/v1/meta HTTP/1.1\" 200 1204 \"-\" \"Mozilla/5.0\"",
            "82.44.150.12 - - [08/Jun/2026:17:01:10 +0000] \"POST /api/v1/auth/login HTTP/1.1\" 401 202 \"-\" \"Hydra/9.2 brute-forcer\"",
            "82.44.150.12 - - [08/Jun/2026:17:01:11 +0000] \"POST /api/v1/auth/login HTTP/1.1\" 401 202 \"-\" \"Hydra/9.2 brute-forcer\"",
            "82.44.150.13 - - [08/Jun/2026:17:01:11 +0000] \"POST /api/v1/auth/login HTTP/1.1\" 401 202 \"-\" \"Hydra/9.2 brute-forcer\"",
            "82.44.150.14 - - [08/Jun/2026:17:01:12 +0000] \"POST /api/v1/auth/login HTTP/1.1\" 401 202 \"-\" \"Hydra/9.2 brute-forcer\"",
            "82.44.150.15 - - [08/Jun/2026:17:01:12 +0000] \"POST /api/v1/auth/login HTTP/1.1\" 401 202 \"-\" \"Hydra/9.2 brute-forcer\"",
            "82.44.150.12 - - [08/Jun/2026:17:01:15 +0000] \"POST /api/v1/auth/login HTTP/1.1\" 401 202 \"-\" \"Hydra/9.2 brute-forcer\"",
            "185.12.110.45 - - [08/Jun/2026:17:01:20 +0000] \"POST /api/v1/auth/login HTTP/1.1\" 504 182 \"-\" \"Mozilla/5.0\"",
            "82.44.150.13 - - [08/Jun/2026:17:01:21 +0000] \"POST /api/v1/auth/login HTTP/1.1\" 504 182 \"-\" \"Hydra/9.2 brute-forcer\"",
            "82.44.150.14 - - [08/Jun/2026:17:01:22 +0000] \"POST /api/v1/auth/login HTTP/1.1\" 504 182 \"-\" \"Hydra/9.2 brute-forcer\"",
            "82.44.150.15 - - [08/Jun/2026:17:01:22 +0000] \"POST /api/v1/auth/login HTTP/1.1\" 504 182 \"-\" \"Hydra/9.2 brute-forcer\"",
            "185.12.110.45 - - [08/Jun/2026:17:01:23 +0000] \"GET /index.html HTTP/1.1\" 504 182 \"-\" \"Mozilla/5.0\"",
            "203.45.18.99 - - [08/Jun/2026:17:01:40 +0000] \"WARN: [nginx-ingress] Worker connections limit saturated (1024 connections/worker).\"",
            "203.45.18.99 - - [08/Jun/2026:17:01:50 +0000] \"ERROR: [nginx-ingress] Influx pool error: client connections buffer backlog overflow capacity.\"",
            "203.45.18.99 - - [08/Jun/2026:17:02:00 +0000] \"INFO: [security-daemon] Ingress rate-limit rule triggered: Applying iptables block for subnet 82.44.150.0/24.\"",
            "203.45.18.99 - - [08/Jun/2026:17:02:05 +0000] \"INFO: [nginx-ingress] Connections pool purged successfully. Purged 812 sockets. Normal traffic restored.\"",
            "185.12.110.45 - - [08/Jun/2026:17:02:10 +0000] \"GET /health HTTP/1.1\" 200 45 \"-\" \"UptimeRobot/2.0\""
          ].join("\n")
        };
      case "microservice-dns-outage":
        return {
          scenarioName: "Kubernetes CoreDNS Routing Lock Mismatch [Local Fallback]",
          scenarioDescription: "High load on CoreDNS instances inside the kube-system namespace triggers host lookup timeout exceptions, tripping client-side gateway circuit breakers for upstream API microservice communication.",
          logsText: [
            "2026-06-08 18:00:00.000 INFO [main] com.example.client.GatewayApplication - Loading Kubernetes Discovery Client bootstrap configs...",
            "2026-06-08 18:00:01.100 INFO [main] org.springframework.cloud.client.discovery.DiscoveryClient - Discovered services list mapping loaded: [payment-service, user-service, catalog-service]",
            "2026-06-08 18:00:05.412 INFO [main] com.example.client.GatewayApplication - Microservice Gateway started on port 3000",
            "2026-06-08 18:00:10.512 INFO [http-nio-3000-exec-1] com.example.client.CatalogClient - Querying catalog-service on internal route: http://catalog-service.prod.svc.cluster.local/items/active",
            "2026-06-08 18:01:10.412 WARN [http-nio-3000-exec-2] com.example.client.CatalogClient - Service lookup for \"catalog-service.prod.svc.cluster.local\" took abnormally long: 5500 ms (threshold 1000 ms)",
            "2026-06-08 18:01:15.890 WARN [http-nio-3000-exec-3] io.github.resilience4j.circuitbreaker.CircuitBreaker - CatalogService circuit breaker state is half-open. Retrying dependency connectivity...",
            "2026-06-08 18:01:20.109 ERROR [http-nio-3000-exec-3] com.example.client.CatalogClient - DNS Resolution Exception: UnknownHostException: \"catalog-service.prod.svc.cluster.local\"",
            "2026-06-08 18:01:21.412 ERROR [http-nio-3000-exec-4] com.example.client.PaymentClient - DNS Resolution Exception: UnknownHostException: \"payment-service.prod.svc.cluster.local\"",
            "2026-06-08 18:01:22.950 ERROR [http-nio-3000-exec-3] io.github.resilience4j.circuitbreaker.CircuitBreaker - CatalogService circuit breaker tripped: State is now OPEN. Running fallback static response index.",
            "2026-06-08 18:01:25.102 FATAL [com.example.client.GatewayApplication] Kube DNS outage detected. Total DNS failures count: 284 in the last 60 seconds.",
            "2026-06-08 18:01:30.840 ERROR [kube-system-coredns] CoreDNS - [ERROR] Plugin error execution: [coredns] upstream dns server 10.96.0.10 timed out resolving record.",
            "2026-06-08 18:02:00.100 INFO [kube-system-coredns] CoreDNS - CoreDNS scale event triggered by ReplicaSet cluster controller. Scaled CoreDNS from 2 to 5 instances.",
            "2026-06-08 18:02:05.540 INFO [http-nio-3000-exec-5] com.example.client.CatalogClient - DNS cache resolved. Recovered internal host catalog-service.prod.svc.cluster.local at IP 10.112.55.80. Status: healthy."
          ].join("\n")
        };
      default:
        return {
          scenarioName: `Custom Fault Trace Cascade: ${promptText ? promptText.slice(0, 30) : "Incident"} [Local Fallback]`,
          scenarioDescription: `A simulated failure event trace mapping user requests: ${promptText || "General System Error"}`,
          logsText: [
            "2026-06-08 19:00:00.100 INFO [main] com.example.CoreNode - Initializing SRE Simulation sandbox pipeline.",
            "2026-06-08 19:00:02.301 INFO [main] com.example.CoreNode - SRE Simulator loading system metadata constraints.",
            "2026-06-08 19:00:15.541 INFO [http-nio-3000-exec-1] com.example.controller.SystemController - GET /api/v1/metrics - 200 OK",
            "2026-06-08 19:00:40.925 WARN [http-nio-3000-exec-3] com.example.controller.SystemController - Outgoing endpoint latency tripped threshold (9500ms > 2000ms)",
            `2026-06-08 19:01:05.412 ERROR [http-nio-3000-exec-4] com.example.service.IncidentService - Simulated Crash: ${promptText || "Internal Thread saturation or Socket error limit reached"}`,
            "2026-06-08 19:01:10.890 ERROR [http-nio-3000-exec-5] com.example.service.IncidentService - Stacktrace: java.lang.RuntimeException: Operation refused by system governance sentinel",
            "2026-06-08 19:01:30.912 FATAL [com.example.CoreUncaughtExceptionHandler] Thread http-nio-3000-exec-4 killed by sentinel execution. Core leak warning.",
            "2026-06-08 19:02:00.100 INFO [com.example.service.IncidentService] Scavenging inactive socket loops and re-enabling standard system parameters.",
            "2026-06-08 19:02:10.540 INFO [http-nio-3000-exec-1] com.example.controller.SystemController - Reconnecting successfully. Ingestion thread pool status: OK."
          ].join("\n")
        };
    }
  };

  try {
    const ai = getGeminiClient();

    let scenarioFocus = "";
    if (scenarioType === "db-deadlock") {
      scenarioFocus = "a database deadlock cascade with transaction thread lockups in PostgreSQL HikariPool, causing connection timeouts, active query locks, and transaction rollbacks.";
    } else if (scenarioType === "auth-oauth-failure") {
      scenarioFocus = "an authentication and OAuth failure flood with oauth invalid callback codes, user profile fetch failures, and JSON authorization token decryption exceptions.";
    } else if (scenarioType === "kafka-lag-spike") {
      scenarioFocus = "a Kafka distributed messaging consumer queue lag spike. Show broker partition rebalancing wars, heartbeat timeouts, consumer thread starvation, and event drops.";
    } else if (scenarioType === "ddos-attack") {
      scenarioFocus = "an Apache/Nginx load balancer flood showing a high-frequency DDoS ingress attack with strange source IPs hitting '/api/v1/auth/login' at 50 requests/sec, resulting in HTTP 504 Gateway Timeouts.";
    } else if (scenarioType === "microservice-dns-outage") {
      scenarioFocus = "a Kubernetes microservice cluster DNS routing outage. Service discovery failures, DNS resolution timeouts, failed HTTP connection hands, and circuit breaker tripping alerts.";
    } else if (scenarioType === "custom") {
      scenarioFocus = customPrompt || "a general distributed system operational failure.";
    }

    const systemPrompt = `You are a high-fidelity system simulator and site reliability tool. Your goal is to synthesize extremely realistic application logs matching standard telemetry layouts.`;
    const prompt = `
Generate a chronological trace consisting of 30 to 45 log entries that tell the story of a system incident.
The incident to simulate is: ${scenarioFocus}

Guidelines:
1. Every log entry MUST be formatted under standard App server logs format or Nginx Access Log format. E.g.
"2026-06-08 03:01:00.100 ERROR [com.example.db.ConnectionFactory] HikariPool-1 - Connection is not available, request timed out after 30000ms."
"192.168.1.155 - - [08/Jun/2026:03:02:15 +0000] "POST /api/v1/payments/charge HTTP/1.1" 500 244 "-" "Mozilla/5.0""
Make sure timestamps are strictly chronological (incrementing smoothly by milliseconds or seconds). E.g. start at "2026-06-08 15:00:00.000" and end around "2026-06-08 15:05:00.000".
2. The trace MUST follow an incident lifecycle:
   - Phase 1: Normal system operations (8-10 lines of INFO logs: starting services, loading configs, standard requests)
   - Phase 2: Warning signals (4-6 lines of WARN logs: thread pool saturation alerts, retries, slow database responses)
   - Phase 3: Active Incident Outage (12-15 lines of severe ERROR/FATAL logs: exceptions, transaction failure stack traces, timeout events, cascading failures)
   - Phase 4: SRE Incident Mitigation / Recovery attempt (6-10 lines of SRE scaling actions, fallback activation, automatic reconnects, or manual traffic throttling)
3. Ensure there are realistic system terms, such as thread names, class names (e.g. com.example.service.OrderService), HTTP routes, raw socket pointers, lock hold details, or standard error codes.
4. Output the results as a single cohesive block of logs under the JSON response schema.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["scenarioName", "scenarioDescription", "logsText"],
          properties: {
            scenarioName: {
              type: Type.STRING,
              description: "A short, visual, descriptive title for this simulated scenario (e.g. 'Hikari DB Connection Pool Exhaustion')."
            },
            scenarioDescription: {
              type: Type.STRING,
              description: "A concise, high-level summary of the cascade we're looking at and why it is happening."
            },
            logsText: {
              type: Type.STRING,
              description: "A single multiline string containing the 30-45 generated log entries, separated by standard newlines."
            }
          }
        }
      }
    });

    const parsedData = JSON.parse(response.text?.trim() || "{}");
    res.json(parsedData);
  } catch (error: any) {
    console.warn("Falling back to local high-fidelity generator due to API constraints:", error.message);
    const fallbackData = getFallbackScenario(scenarioType, customPrompt);
    res.json({
      ...fallbackData,
      fallback: true,
      hint: "Configure a GEMINI_API_KEY secret in Settings to enable live deep AI synthesis.",
    });
  }
});

// Vite & Static Asset Handling Middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Development Mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production Mode
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Log Analysis Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
