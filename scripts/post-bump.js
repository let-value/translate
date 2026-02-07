#!/usr/bin/env node

import { spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const runCommand = (command, args = []) => {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            stdio: "pipe",
            shell: true,
            cwd: process.cwd(),
        });

        let stdout = "";
        let stderr = "";

        child.stdout?.on("data", (data) => {
            stdout += data.toString();
        });

        child.stderr?.on("data", (data) => {
            stderr += data.toString();
        });

        child.on("close", (code) => {
            if (code === 0) {
                resolve(stdout);
            } else {
                reject(new Error(`Command failed with code ${code}: ${stderr}`));
            }
        });
    });
};

const getWorkspaceInfo = async () => {
    const output = await runCommand("npm", ["query", ".workspace"]);
    return JSON.parse(output);
};

const fixVersions = async () => {
    const workspacePackages = await getWorkspaceInfo();
    const rootPackageJson = JSON.parse(readFileSync("package.json", "utf8"));
    const rootVersion = rootPackageJson.version;

    // Get all workspace packages that start with @let-value/
    const letValuePackages = workspacePackages.filter((pkg) => pkg.name.startsWith("@let-value/"));

    for (const packageInfo of letValuePackages) {
        const packagePath = `${packageInfo.path}/package.json`;

        const originalContent = readFileSync(packagePath, "utf8");
        const packageContent = JSON.parse(originalContent);
        let hasChanges = false;

        // Fix package version
        if (packageContent.version !== rootVersion) {
            packageContent.version = rootVersion;
            hasChanges = true;
        }

        // Fix dependencies - check if this package uses other workspace packages
        if (packageContent.dependencies) {
            for (const [depName, depVersion] of Object.entries(packageContent.dependencies)) {
                const isWorkspacePackage = letValuePackages.some((pkg) => pkg.name === depName);
                if (isWorkspacePackage && depVersion !== rootVersion) {
                    packageContent.dependencies[depName] = `${rootVersion}`;
                    hasChanges = true;
                }
            }
        }

        // Fix devDependencies
        if (packageContent.devDependencies) {
            for (const [depName, depVersion] of Object.entries(packageContent.devDependencies)) {
                const isWorkspacePackage = letValuePackages.some((pkg) => pkg.name === depName);
                if (isWorkspacePackage && depVersion !== rootVersion) {
                    packageContent.devDependencies[depName] = `${rootVersion}`;
                    hasChanges = true;
                }
            }
        }

        if (hasChanges) {
            writeFileSync(packagePath, `${JSON.stringify(packageContent, null, 4)}\n`);
        }
    }
};

const main = async () => {
    try {
        await fixVersions();
        await runCommand("npm", ["install", "--ignore-scripts"]);
    } catch (error) {
        console.error("Post-bump failed:", error.message);
    }
};

main();
