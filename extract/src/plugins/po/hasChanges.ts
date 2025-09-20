import type { GetTextTranslations } from "gettext-parser";

export function hasChanges(left: GetTextTranslations, right?: GetTextTranslations): boolean {
    const ignoredPaths = new Set(["headers.pot-creation-date", "headers.po-revision-date"]);
    const caseInsensitiveStringPaths = new Set(["headers.content-type", "headers.language"]);
    const emptyMessagePattern = /^translations\.\.$|^translations\.\.\./;

    function isPathIgnored(currentPath: string): boolean {
        const normalizedPath = currentPath.toLowerCase();

        if (ignoredPaths.has(normalizedPath)) {
            return true;
        }

        if (emptyMessagePattern.test(normalizedPath)) {
            return true;
        }

        return false;
    }

    function isCaseInsensitivePath(currentPath: string): boolean {
        return caseInsensitiveStringPaths.has(currentPath.toLowerCase());
    }

    function getCanonicalKey(currentPath: string, key: string): string {
        if (currentPath.toLowerCase() === "headers") {
            return key.toLowerCase();
        }

        return key;
    }

    function deepEqual(left: unknown, right: unknown, currentPath = ""): boolean {
        if (left === right) {
            return true;
        }

        if (left == null || right == null) {
            return false;
        }

        if (typeof left !== typeof right) {
            return false;
        }

        if (typeof left === "string") {
            if (typeof right !== "string") {
                return false;
            }

            if (isCaseInsensitivePath(currentPath)) {
                return left.toLowerCase() === right.toLowerCase();
            }

            return false;
        }

        if (Array.isArray(left)) {
            if (!Array.isArray(right) || left.length !== right.length) {
                return false;
            }

            return left.every((item, index) => {
                const newPath = `${currentPath}[${index}]`;
                return deepEqual(item, right[index], newPath);
            });
        }

        if (typeof left === "object") {
            const leftObj = left as Record<string, unknown>;
            const rightObj = right as Record<string, unknown>;

            const leftEntries = Object.keys(leftObj)
                .map((key) => {
                    const path = currentPath ? `${currentPath}.${key}` : key;
                    if (isPathIgnored(path)) {
                        return undefined;
                    }
                    return { key, canonical: getCanonicalKey(currentPath, key) };
                })
                .filter((value): value is { key: string; canonical: string } => Boolean(value));

            const rightEntries = Object.keys(rightObj)
                .map((key) => {
                    const path = currentPath ? `${currentPath}.${key}` : key;
                    if (isPathIgnored(path)) {
                        return undefined;
                    }
                    return { key, canonical: getCanonicalKey(currentPath, key) };
                })
                .filter((value): value is { key: string; canonical: string } => Boolean(value));

            if (leftEntries.length !== rightEntries.length) {
                return false;
            }

            const rightMap = new Map<string, string>();
            for (const entry of rightEntries) {
                if (rightMap.has(entry.canonical)) {
                    return false;
                }
                rightMap.set(entry.canonical, entry.key);
            }

            for (const entry of leftEntries) {
                if (!rightMap.has(entry.canonical)) {
                    return false;
                }
                const rightKey = rightMap.get(entry.canonical) as string;
                const newPath = currentPath ? `${currentPath}.${entry.key}` : entry.key;
                if (!deepEqual(leftObj[entry.key], rightObj[rightKey], newPath)) {
                    return false;
                }
                rightMap.delete(entry.canonical);
            }

            return rightMap.size === 0;
        }

        return false;
    }

    return !deepEqual(left, right, "");
}
