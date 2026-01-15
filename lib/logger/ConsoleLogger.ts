import IReadableLogger from "./IReadableLogger";

export default class ConsoleLogger implements IReadableLogger {
  debug(message?: string, ...optionalParams: any[]): void {
    console.debug(message, ...optionalParams);
  }

  info(message?: string, ...optionalParams: any[]): void {
    console.info(message, ...optionalParams);
  }

  warn(message?: string, ...optionalParams: any[]): void {
    console.warn(message, ...optionalParams);
  }

  error(message?: string, ...optionalParams: any[]): void {
    console.error(message, ...optionalParams);
  }

  fatal(message?: string, ...optionalParams: any[]): void {
    console.error(message, ...optionalParams);
  }

  async recentLogs(count: number): Promise<string[]> {
    console.warn("recentLogs is not available in ConsoleLogger");
    return [];
  }

  async grep(searchTerm: string): Promise<string[]> {
    console.warn("grep is not available in ConsoleLogger");
    return [];
  }
}
