import type { GetTextTranslations } from "gettext-parser";

export function hasChanges(left: GetTextTranslations, right?: GetTextTranslations): boolean {
    const ignoredPaths = new Set(["headers.pot-creation-date", "headers.po-revision-date"]);
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
            const keys1 = Object.keys(left).filter((key) => {
                const newPath = currentPath ? `${currentPath}.${key}` : key;
                return !isPathIgnored(newPath);
            });
            const keys2 = Object.keys(right).filter((key) => {
                const newPath = currentPath ? `${currentPath}.${key}` : key;
                return !isPathIgnored(newPath);
            });

            if (keys1.length !== keys2.length) {
                return false;
            }

            return keys1.every((key) => {
                const newPath = currentPath ? `${currentPath}.${key}` : key;
                return deepEqual(left[key as never], right[key as never], newPath);
            });
        }

        return false;
    }

    return !deepEqual(left, right, "");
}
