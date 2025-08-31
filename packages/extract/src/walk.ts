import path from "node:path";
import resolver from "oxc-resolver";

/**
 * Resolve a list of import specifiers relative to a file.
 *
 * @param file - Absolute or relative path to the importing file.
 * @param imports - Raw import specifiers collected from that file.
 * @returns Absolute paths to resolved modules.
 */
export function resolveImports(file: string, imports: string[]): string[] {
	const dir = path.dirname(path.resolve(file));
	const resolved: string[] = [];
	for (const spec of imports) {
		const res = resolver.sync(dir, spec) as { path?: string };
		if (res.path) {
			resolved.push(res.path);
		}
	}
	return resolved;
}
