/** A reference comment, split into the parts that order it. */
interface ParsedReference {
    path: string;
    line: number;
    column: number;
}

const referencePattern = /^(.*?):(\d+)(?::(\d+))?$/;

function parseReference(reference: string): ParsedReference {
    const match = referencePattern.exec(reference);
    if (!match) {
        return { path: reference, line: -1, column: -1 };
    }
    return { path: match[1], line: Number(match[2]), column: match[3] ? Number(match[3]) : -1 };
}

function comparePaths(left: string, right: string) {
    // Code unit order rather than localeCompare: the result must not depend on
    // the machine's locale.
    if (left === right) return 0;
    return left < right ? -1 : 1;
}

/**
 * Orders reference comments canonically — by file path, then line, then column —
 * so that a catalog does not record the order in which the module graph happened
 * to be walked.
 */
export function sortReferences(references: Iterable<string>): string[] {
    return [...references]
        .map((reference) => ({ reference, parsed: parseReference(reference) }))
        .sort((left, right) => {
            const byPath = comparePaths(left.parsed.path, right.parsed.path);
            if (byPath !== 0) return byPath;
            if (left.parsed.line !== right.parsed.line) return left.parsed.line - right.parsed.line;
            if (left.parsed.column !== right.parsed.column) return left.parsed.column - right.parsed.column;
            return comparePaths(left.reference, right.reference);
        })
        .map(({ reference }) => reference);
}

/** Orders message keys (contexts and msgids) canonically. */
export function sortKeys(keys: Iterable<string>): string[] {
    return [...keys].sort(comparePaths);
}
