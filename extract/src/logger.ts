import pino, { type LevelWithSilent, type Logger } from "pino";

export function createLogger(level: LevelWithSilent = "info"): Logger {
    return pino({
        level,
        transport: {
            target: "pino-pretty",
            options: {
                colorize: true,
                ignore: "time,pid,hostname",
            },
        },
    });
}

export type { Logger, LevelWithSilent };
