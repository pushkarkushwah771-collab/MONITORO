export interface PresetOption {
  name: string;
  description: string;
  content: string;
}

export const PRESET_LOGS: PresetOption[] = [
  {
    name: "Spring Boot Microservice Suite",
    description: "App server logs containing multi-tier operations, database connections, and unexpected severe exceptions.",
    content: `2026-06-08 02:45:10 [INFO] [com.payments.ServiceApplication] Starting ServiceApplication v2.4.1 under JVM 17.0.2
2026-06-08 02:45:12 [INFO] [com.payments.db.DatabaseConfig] Initializing Hikari connection pool for RDS PostgreSQL...
2026-06-08 02:45:15 [INFO] [com.payments.db.DatabaseConfig] Hikari connection pool successfully created. Max connections: 30
2026-06-08 02:45:18 [INFO] [com.payments.web.AuthController] Loaded secret keystore client token successfully. MD5 verified.
2026-06-08 02:46:01 [INFO] [com.payments.web.AuthController] GET /api/v1/auth/login [IP: 192.168.1.104] - Request accepted
2026-06-08 02:46:02 [DEBUG] [com.payments.service.UserConfig] Fetching salt profile configuration for user id: auth_f793b
2026-06-08 02:46:03 [INFO] [com.payments.service.UserConfig] User verified. JWT generated with expiry: 3600 seconds.
2026-06-08 02:47:11 [INFO] [com.payments.web.OrderController] POST /api/v1/checkout - Initiating lock on order_id: #94031
2026-06-08 02:47:12 [DEBUG] [com.payments.service.LedgerKeeper] Reserving ledger balance of 49.99 USD in cache segment.
2026-06-08 02:47:13 [WARN] [com.payments.service.LedgerKeeper] Cache read took 780ms (exceeded soft limit of 200ms)
2026-06-08 02:47:15 [INFO] [com.payments.web.OrderController] POST /api/v1/checkout - Order finalized for client_id: cli_775a
2026-06-08 02:48:33 [INFO] [org.apache.kafka.clients.Producer] [Producer clientId=auth-event-producer] Cluster meta updated.
2026-06-08 02:49:05 [WARN] [com.payments.service.LedgerKeeper] DB pool connections near capacity (Active: 28, Idle: 2)
2026-06-08 02:49:06 [ERROR] [com.payments.db.QueryRunner] Exec: UPDATE "accounts" SET "balance" = "balance" - 49.99 WHERE "id" = 'user_883'
2026-06-08 02:49:06 [ERROR] [com.payments.db.QueryRunner] java.sql.SQLException: Connection pool exhausted. Failed to acquire connection in 15000ms
	at com.zaxxer.hikari.pool.HikariPool.getConnection(HikariPool.java:218)
	at com.zaxxer.hikari.pool.HikariDataSource.getConnection(HikariDataSource.java:100)
	at com.payments.db.QueryRunner.executeUpdate(QueryRunner.java:142)
2026-06-08 02:49:07 [ERROR] [com.payments.web.OrderController] Order failed rollback execution. Transaction marked lost.
2026-06-08 02:49:44 [WARN] [org.apache.kafka.clients.NetworkClient] [Producer clientId=auth-event-producer] Heartbeat connection lost with broker-1. Retrying in 2000ms.
2026-06-08 02:50:12 [INFO] [org.apache.kafka.clients.NetworkClient] Reconnected to broker-1. Status active.
2026-06-08 02:51:00 [DEBUG] [com.payments.cleanup.SessionExpire] Running database cleanup task. Elapsed: 12ms.
2026-06-08 02:51:22 [INFO] [com.payments.web.AuthController] GET /api/v1/auth/status - Server OK
2026-06-08 02:52:15 [DEBUG] [com.payments.cleanup.SessionExpire] Expired 0 active developer transient user login keys.`
  },
  {
    name: "Nginx Gateway & API Traffic (Access Logs)",
    description: "Standard combined server traffic entries detailing REST route statuses, referral links, and bad gateways.",
    content: `127.0.0.1 - - [08/Jun/2026:02:40:01 +0000] "GET / HTTP/1.1" 200 4882 "-" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/103.0.0.0"
127.0.0.1 - - [08/Jun/2026:02:40:15 +0000] "GET /assets/index.js HTTP/1.1" 200 120531 "-" "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36"
192.168.1.55 - - [08/Jun/2026:02:41:10 +0000] "GET /api/v1/inventory?category=books HTTP/1.1" 200 1520 "https://my-store.com/home" "Mozilla/5.0"
192.168.1.55 - - [08/Jun/2026:02:41:12 +0000] "POST /api/v1/cart/add HTTP/1.1" 201 120 "https://my-store.com/home" "Mozilla/5.0"
172.16.8.99 - - [08/Jun/2026:02:42:01 +0000] "GET /api/v1/user/profile HTTP/1.1" 401 55 "-" "PostmanRuntime/7.29.0"
172.16.8.99 - - [08/Jun/2026:02:42:44 +0000] "GET /api/v1/user/profile HTTP/1.1" 200 880 "-" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/115.0.0"
54.210.12.87 - - [08/Jun/2026:02:43:08 +0000] "GET /phpmyadmin/index.php HTTP/1.1" 404 120 "-" "Zgrab/2.0 Security Research Bot"
12.180.203.44 - - [08/Jun/2026:02:44:00 +0000] "POST /api/v1/payment/charge HTTP/1.1" 500 412 "https://my-store.com/checkout" "Mozilla/5.0"
12.180.203.44 - - [08/Jun/2026:02:44:05 +0000] "POST /api/v1/payment/charge HTTP/1.1" 503 98 "https://my-store.com/checkout" "Mozilla/5.0"
192.168.1.18 - - [08/Jun/2026:02:45:12 +0000] "GET /api/v1/banners HTTP/1.1" 200 48292 "-" "Mozilla/5.0"
192.168.1.18 - - [08/Jun/2026:02:45:15 +0000] "GET /api/v1/deals HTTP/1.1" 504 316 "-" "Mozilla/5.0 (iPhone; CPU iPhone OS 15_5 like Mac OS X)"
127.0.0.1 - - [08/Jun/2026:02:46:01 +0000] "GET /health-check HTTP/1.1" 200 22 "-" "internal-uptime-monitor"
54.210.12.87 - - [08/Jun/2026:02:47:00 +0000] "POST /wp-login.php HTTP/1.1" 404 120 "-" "MaliciousBot/3.0"`
  },
  {
    name: "JSON Production Server Logs",
    description: "Cloud-native structured log files (Kubernetes stdout) with JSON properties, tracing fields, and process IDs.",
    content: `{"time":"2026-06-08T02:30:10.112Z","level":"info","source":"payment-service","message":"Service listener started successfully on port 8080","pid":1}
{"time":"2026-06-08T02:30:12.441Z","level":"debug","source":"payment-service","message":"Connecting to Redis cache at redisMaster:6379","pid":1}
{"time":"2026-06-08T02:30:12.781Z","level":"info","source":"payment-service","message":"Redis cache connected cleanly. Pool size: 10","pid":1}
{"time":"2026-06-08T02:31:01.002Z","level":"info","source":"payment-service","message":"POST /api/v1/charge - Card processing initiated","traceId":"tr_8841a02b","clientId":"cl_8841","pid":1}
{"time":"2026-06-08T02:31:02.122Z","level":"warn","source":"payment-service","message":"Visa API gateway took 1120ms to respond for correlation token. Retrying routing...","traceId":"tr_8841a02b","pid":1}
{"time":"2026-06-08T02:31:04.551Z","level":"error","source":"payment-service","message":"Third-party payment connector timed out. SocketException: Connection refused (104)","traceId":"tr_8841a02b","errorCode":"ERR_CONNECTOR_TIMEOUT","pid":1}
{"time":"2026-06-08T02:32:00.010Z","level":"info","source":"scheduler-service","message":"Starting recurring micro-invoice generator job #331","pid":4}
{"time":"2026-06-08T02:32:01.551Z","level":"info","source":"scheduler-service","message":"Successfully aggregated 12 invoices under segment: batch_west","pid":4}
{"time":"2026-06-08T02:32:15.901Z","level":"fatal","source":"payment-service","message":"Uncaught RuntimeException: OutOfMemoryError in thread pool size tracker","pid":1}`
  }
];
