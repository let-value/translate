import chalk, { type ChalkInstance } from "chalk";
import log, { type Logger, type LogLevelNames } from "loglevel";
import prefix from "loglevel-plugin-prefix";

export type LogLevel = LogLevelNames;

const colors: Record<LogLevel, ChalkInstance> = {
    trace: chalk.magenta,
    debug: chalk.cyan,
    info: chalk.blue,
    warn: chalk.yellow,
    error: chalk.red,
};

prefix.reg(log);
prefix.apply(log, {
    format(level, name) {
        const color = colors[level as LogLevelNames] ?? ((value: string) => value);
        const scope = name ? ` ${chalk.green(`${name}:`)}` : "";

        return `${color(level)}${scope}`;
    },
});

export const logger = log;
export type { Logger, LogLevelNames };
