import { copyFile } from "node:fs/promises";
import { join } from "node:path";

const src = join(import.meta.dirname, "../src/po.d.ts");
const dest = join(import.meta.dirname, "../dist/po.d.ts");

await copyFile(src, dest);
