import ILogger from "./ILogger";


export default class ExternalLogger implements ILogger {

    private domain: string;

    constructor(domain: string) {
      this.domain = domain;
    }

    private savedLogs = new Array<string>();
    // to view logs: http://24.199.102.59/spp/externalLogs/valid
    private externalEndpoint = "http://24.199.102.59/api/submitLogs";
    private pendingSend:Promise<void>|null = null;

    private saveLog(
        level: string,
        message?: string,
        suffix?: string,
        ...optionalParams: any[]
    ): void {
        let savedMsg = `${Math.floor(
            new Date().getTime() / 1000
        )}: ${level}: ${message}`;
        if (optionalParams.length > 0) {
            savedMsg +=
                " " +
                optionalParams.map((param) => JSON.stringify(param)).join(" ");
        }
        savedMsg += suffix;
        this.savedLogs.push(savedMsg);
        if (this.pendingSend == null) {
            this.pendingSend = new Promise<void>((resolve) => {
              setTimeout(() => {
                this.sendLogs(); // Move this line inside the setTimeout callback
                resolve();
              }, 1000);
            });
          }
    }

    private async sendLogs() {
        if (this.savedLogs.length == 0){
            return;
        }
        const readyLogs = this.savedLogs;
        this.savedLogs = [];
       
        const params = {
            domain: this.domain,
            logs: readyLogs,
        };
        const options = {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(params),
        };
        await fetch(this.externalEndpoint, options);
        this.pendingSend = null;
    }

    private getStackTrace(): string {
        try {
            throw new Error("Getting stack trace");
        } catch (error: any) {
            const stack = error.stack;
            const spl = stack.split("\n");
            return spl.slice(3).join("\n");
        }
    }

    public debug(message?: string, ...optionalParams: any[]): void {
        this.saveLog("debug", message, "", optionalParams);
    }

    public info(message?: string, ...optionalParams: any[]): void {
        this.saveLog("info", message, "", optionalParams);
    }

    public warn(message?: string, ...optionalParams: any[]): void {
        this.saveLog("warn", message, "", optionalParams);
    }

    public error(message?: string, ...optionalParams: any[]): void {
        const stackTrace = "\n" + this.getStackTrace();
        this.saveLog("error", message, stackTrace, ...optionalParams);
    }

    public fatal(message?: string, ...optionalParams: any[]): void {
        const stackTrace = "\n" + this.getStackTrace();
        this.saveLog("fatal", message, stackTrace, ...optionalParams);
    }
}
