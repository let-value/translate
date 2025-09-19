import chalk from "chalk";
import log, { type Logger } from "loglevel";
import prefix from "loglevel-plugin-prefix";

const colors: Record<string, (value: string) => string> = {
    TRACE: chalk.magenta,
    DEBUG: chalk.cyan,
    INFO: chalk.blue,
    LOG: chalk.blue,
    WARN: chalk.yellow,
    ERROR: chalk.red,
};

let configured = false;

function configure() {
    if (configured) return;

    prefix.reg(log);
    log.enableAll();

    prefix.apply(log, {
        format(level, name, timestamp) {
            const color = colors[level.toUpperCase()] ?? ((value: string) => value);
            const scope = name ? ` ${chalk.green(`${name}:`)}` : "";
            const formattedTimestamp =
                timestamp instanceof Date ? timestamp.toISOString() : String(timestamp);
            return `${chalk.gray(`[${formattedTimestamp}]`)} ${color(level)}${scope}`;
        },
    });

    configured = true;
}

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "silent";

export function createLogger(level: LogLevel = "info"): Logger {
    configure();
    log.setLevel(level);
    return log;
}

export type { Logger };
