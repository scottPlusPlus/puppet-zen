export default interface ILogger {
    /* eslint-disable semi */
    debug(message?: string, ...optionalParams: any[]): void;
    info(message?: string, ...optionalParams: any[]): void;
    warn(message?: string, ...optionalParams: any[]): void;
    error(message?: string, ...optionalParams: any[]): void;
    fatal(message?: string, ...optionalParams: any[]): void;
}

export enum LogLevel {
    DEBUG = 'debug',
    INFO = 'info',
    WARN = 'warn',
    ERROR = 'error'
}