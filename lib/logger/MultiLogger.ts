import IReadableLogger from "./IReadableLogger";

export default class MultiLogger implements IReadableLogger {
  constructor(
    private debugLoggers: IReadableLogger[],
    private infoLoggers: IReadableLogger[],
    private warnLoggers: IReadableLogger[],
    private errorLoggers: IReadableLogger[]
  ) {}

  debug(message?: string, ...optionalParams: any[]): void {
    this.debugLoggers.forEach((logger) =>
      logger.debug(message, ...optionalParams)
    );
  }

  info(message?: string, ...optionalParams: any[]): void {
    this.infoLoggers.forEach((logger) =>
      logger.info(message, ...optionalParams)
    );
  }

  warn(message?: string, ...optionalParams: any[]): void {
    this.warnLoggers.forEach((logger) =>
      logger.warn(message, ...optionalParams)
    );
  }

  error(message?: string, ...optionalParams: any[]): void {
    this.errorLoggers.forEach((logger) =>
      logger.error(message, ...optionalParams)
    );
  }

  fatal(message?: string, ...optionalParams: any[]): void {
    this.errorLoggers.forEach((logger) =>
      logger.error(message, ...optionalParams)
    );
  }

  async recentLogs(count: number): Promise<string[]> {
    for (const logger of this.debugLoggers) {
      try {
        return await logger.recentLogs(count);
      } catch (error) {
        console.error("Error in recentLogs:", error);
      }
    }
    return [];
  }

  async grep(searchTerm: string): Promise<string[]> {
    for (const logger of this.debugLoggers) {
      try {
        return await logger.grep(searchTerm);
      } catch (error) {
        console.error("Error in grep:", error);
      }
    }
    return [];
  }
}
