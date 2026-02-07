const { existsSync } = require("node:fs");
const { resolve } = require("node:path");

const postinstallPath = resolve(__dirname, "dist", "scripts", "postinstall.cjs");

if (existsSync(postinstallPath)) {
    require(postinstallPath);
}
