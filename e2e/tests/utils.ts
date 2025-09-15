import { Writable } from "node:stream";
import type { ReactNode } from "react";
import { renderToPipeableStream } from "react-dom/server";

export class StringWritable extends Writable {
    chunks: Buffer[];
    result = "";
    promise: Promise<string>;
    resolve!: (value: string) => void;

    constructor() {
        super();
        this.chunks = [];
        this.promise = new Promise<string>((resolve) => {
            this.resolve = resolve;
        });
    }

    _write(chunk: Buffer, _encoding: BufferEncoding, callback: (error?: Error | null) => void) {
        this.chunks.push(chunk);
        callback();
    }

    _final(callback: () => void) {
        this.result = Buffer.concat(this.chunks).toString("utf-8");
        this.resolve(this.result);
        callback();
    }

    override end(chunk?: unknown, encodingOrCb?: BufferEncoding | (() => void), cb?: () => void): this {
        let encoding: BufferEncoding | undefined;
        let callback: (() => void) | undefined;

        if (typeof encodingOrCb === "function") {
            callback = encodingOrCb;
        } else {
            encoding = encodingOrCb;
            callback = cb;
        }

        if (chunk !== undefined) {
            if (encoding) {
                this.write(chunk, encoding);
            } else {
                this.write(chunk);
            }
        }

        process.nextTick(() => {
            if (!this.destroyed) {
                this.result = Buffer.concat(this.chunks).toString("utf-8");
                this.resolve(this.result);
            }
        });

        return super.end(callback);
    }
}

export async function render(node: ReactNode) {
    const { pipe } = renderToPipeableStream(node);
    return await pipe(new StringWritable()).promise;
}
