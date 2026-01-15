import ConsoleLogger from "./ConsoleLogger";
import GrafanaLogger from "./GrafanaLogger";
import IReadableLogger from "./IReadableLogger";
import MultiLogger from "./MultiLogger";

const isServer = typeof window === "undefined";

export const logger: IReadableLogger =
  ((process.env.NODE_ENV === "production" || process.env.USE_PROD_LOGGER) && isServer)
    ? prodServerLogger()
    : new ConsoleLogger();

function prodServerLogger(): IReadableLogger {
  try {
    console.log("creating new production logger");
    const grafanaLogger = new GrafanaLogger("valid", true);
    const consoleLogger = new ConsoleLogger();
    const mainLoggers = [grafanaLogger, consoleLogger];

    return new MultiLogger(mainLoggers, mainLoggers, mainLoggers, mainLoggers);
  } catch (err: any) {
    console.log(`Failed to create production logger.  Will fallback to console logging.  error: ${err.message}`);
    return new ConsoleLogger();
  }

}
