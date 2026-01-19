import IReadableLogger from "./IReadableLogger";

// Always on server in Express (no client-side rendering)
const winston = require("winston");
const LokiTransport = require("winston-loki");

function createGrafanaLogger(domain: string) {
    const lokiHost = process.env.GRAFANA_LOKI_HOST || "";
    const lokiUsername = process.env.GRAFANA_LOKI_USERNAME || "";
    const lokiPassword = process.env.GRAFANA_LOKI_PASSWORD || "";

    if (!lokiUsername || !lokiPassword) {
      throw new Error(
        "GRAFANA_LOKI_USERNAME or GRAFANA_LOKI_PASSWORD not set."
      );
    }

    const lokiTransport = new LokiTransport({
      host: lokiHost,
      basicAuth: `${lokiUsername}:${lokiPassword}`,
      labels: {
        app: "validate-my-saas",
        domain: domain,
        environment: process.env.NODE_ENV || "production",
      },
      json: true,
      batching: false,
      onConnectionError: (err: any) => {
        console.error("Loki connection error:", err);
      },
    });

    return winston.createLogger({
      level: "debug",
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        lokiTransport,
        // Keep console transport for local debugging
        new winston.transports.Console(),
      ],
    });
};

export default class GrafanaLogger implements IReadableLogger {
  private domain: string;
  private grafanaLogger: any;

  constructor(domain: string, showDebug: boolean) {
    this.domain = domain;
    if (!this.grafanaLogger) {
      this.grafanaLogger = createGrafanaLogger(domain);
    }
    if (!showDebug) {
      this.debug = this.skip;
    }
  }

  skip(message?: string, ...optionalParams: any[]): void {
    // Do nothing for skipped debug logs
  }

  debug(message?: string, ...optionalParams: any[]): void {
    const logData = {
      level: "debug",
      message,
      params: optionalParams,
      domain: this.domain,
      timestamp: new Date().toISOString(),
    };
    this.grafanaLogger?.debug(logData);
  }

  info(message?: string, ...optionalParams: any[]): void {
    const logData = {
      level: "info",
      message,
      params: optionalParams,
      domain: this.domain,
      timestamp: new Date().toISOString(),
    };
    this.grafanaLogger?.info(logData);
  }

  warn(message?: string, ...optionalParams: any[]): void {
    const logData = {
      level: "warn",
      message,
      params: optionalParams,
      domain: this.domain,
      timestamp: new Date().toISOString(),
    };
    this.grafanaLogger?.warn(logData);
  }

  error(message?: string, ...optionalParams: any[]): void {
    const logData = {
      level: "error",
      message,
      params: optionalParams,
      domain: this.domain,
      timestamp: new Date().toISOString(),
      stack: new Error().stack,
    };
    this.grafanaLogger?.error(logData);
  }

  fatal(message?: string, ...optionalParams: any[]): void {
    const logData = {
      level: "fatal",
      message,
      params: optionalParams,
      domain: this.domain,
      timestamp: new Date().toISOString(),
      stack: new Error().stack,
    };
    this.grafanaLogger?.error(logData);
  }

  async recentLogs(count: number): Promise<string[]> {
    console.warn(
      "recentLogs is not directly available with Grafana Cloud. Use Grafana dashboard to query recent logs."
    );
    return [];
  }

  async grep(searchTerm: string): Promise<string[]> {
    console.warn(
      "grep is not directly available with Grafana Cloud. Use LogQL queries in Grafana dashboard to search logs."
    );
    return [];
  }
} 