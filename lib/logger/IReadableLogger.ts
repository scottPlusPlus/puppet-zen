import ILogger from "./ILogger";

export default interface IReadableLogger extends ILogger {
  recentLogs(count: number): Promise<Array<string>>;
  grep(searchTerm: string): Promise<Array<string>>;
}
