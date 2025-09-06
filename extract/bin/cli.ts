#!/usr/bin/env node
import fs from "node:fs";
import { extractPo } from "../src/index.ts";

async function main() {
    const [, , entry, locale = "en", out] = process.argv;
    if (!entry) {
        console.error("Usage: translate-extract <entry> [locale] [out]");
        process.exit(1);
    }

    const po = await extractPo(entry, locale);
    if (out) {
        fs.writeFileSync(out, po);
    } else {
        process.stdout.write(po);
    }
}

void main();
