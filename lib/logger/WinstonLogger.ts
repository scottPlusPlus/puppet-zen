import IReadableLogger from "./IReadableLogger";

let winston: any;
let DailyRotateFile: any;
let fs: any;
let path: any;

if (typeof window === "undefined") {
  winston = require("winston");
  DailyRotateFile = require("winston-daily-rotate-file");
  fs = require("fs");
  path = require("path");
}

const createWinstonLogger = (domain: string) => {
  if (typeof window === "undefined") {
    let logDir = process.env.LOG_DIR || path.join(process.cwd(), "logs");

    // Try creating the log directory, but don't fallback to "/logs" as it's likely inaccessible
    try {
      if (!fs.existsSync(logDir)) {
        console.log(
          `Log directory ${logDir} does not exist. Attempting to create it.`
        );
        fs.mkdirSync(logDir, { recursive: true });
      }
    } catch (error) {
      console.error(
        `Failed to create log directory at ${logDir}. Logging only to console.`,
        error
      );
      logDir = null; // Set logDir to null to skip file logging
    }

    const transports = [];

    if (logDir) {
      // Add file transport only if the log directory exists
      transports.push(
        new DailyRotateFile({
          dirname: logDir,
          filename: `%DATE%-${domain}.log`,
          datePattern: "YYYY-MM-DD",
          zippedArchive: true,
          maxSize: "20m",
          maxFiles: "14d",
        })
      );
    }

    return winston.createLogger({
      level: "info",
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports,
    });
  }
  return null;
};

export default class WinstonLogger implements IReadableLogger {
  private domain: string;
  private logDir: string;
  private winstonLogger:any;

  constructor(domain: string, showDebug: boolean) {
    this.domain = domain;
    this.logDir =
      typeof window === "undefined"
        ? process.env.LOG_DIR || path.join(process.cwd(), "logs")
        : "";
    if (!this.winstonLogger && typeof window === "undefined") {
      this.winstonLogger = createWinstonLogger(domain);
    }
    if (!showDebug) {
      this.debug = this.skip;
    }
  }

  skip(message?: string, ...optionalParams: any[]): void {
  }

  debug(message?: string, ...optionalParams: any[]): void {
    this.winstonLogger?.debug(message, ...optionalParams);
  }

  info(message?: string, ...optionalParams: any[]): void {
    this.winstonLogger?.info(message, ...optionalParams);
  }

  warn(message?: string, ...optionalParams: any[]): void {
    this.winstonLogger?.warn(message, ...optionalParams);
  }

  error(message?: string, ...optionalParams: any[]): void {
    this.winstonLogger?.error(message, ...optionalParams);
  }

  fatal(message?: string, ...optionalParams: any[]): void {
    this.winstonLogger?.fatal(message, ...optionalParams);
  }

  async recentLogs(count: number): Promise<string[]> {
    if (typeof window !== "undefined") {
      return [];
    }

    try {
      const files = await this.getRecentLogFiles();
      let logs: string[] = [];

      for (const file of files) {
        const fileContent = await fs.promises.readFile(
          path.join(this.logDir, file),
          "utf-8"
        );
        logs = [...logs, ...fileContent.split("\n")];
      }

      return logs.filter((log) => log.trim() !== "").slice(-count);
    } catch (error) {
      console.error("Error retrieving recent logs:", error);
      return [];
    }
  }

  async grep(searchTerm: string): Promise<string[]> {
    if (typeof window !== "undefined") {
      return [];
    }

    try {
      const recentLogs = await this.recentLogs(1000);
      return recentLogs.filter((log) => log.includes(searchTerm));
    } catch (error) {
      console.error("Error searching logs:", error);
      return [];
    }
  }

  private async getRecentLogFiles(): Promise<string[]> {
    const files = await fs.promises.readdir(this.logDir);
    const logFiles = files.filter(
      (file: string) => file.endsWith(".log") && file.includes(this.domain)
    );

    const sortedFiles = await Promise.all(
      logFiles.map(async (file: string) => {
        const stats = await fs.promises.stat(path.join(this.logDir, file));
        return { file, mtime: stats.mtime };
      })
    );

    sortedFiles.sort((a: any, b: any) => b.mtime.getTime() - a.mtime.getTime());

    return sortedFiles.map((file: any) => file.file);
  }
}
