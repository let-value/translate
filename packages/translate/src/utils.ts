import { getNPlurals, getPluralFunc } from "plural-forms";

export type IsUnion<T, U = T> = (T extends any ? (x: T) => 0 : never) extends (
	x: U,
) => 0
	? false
	: true;

export type StrictStaticString<T extends string> = string extends T
	? never
	: IsUnion<T> extends true
		? never
		: T;

export function assert<T>(value: T, message?: string): asserts value is T {
	if (!value) {
		throw new Error(message || "Assertion failed");
	}
}

export function memo<T extends (...args: any[]) => any>(fn: T): T {
	const cache = new Map<string, ReturnType<T>>();
	return ((...args: Parameters<T>): ReturnType<T> => {
		const key = JSON.stringify(args);
		if (cache.has(key)) {
			return cache.get(key)!;
		}
		const result = fn(...args);
		cache.set(key, result);
		return result;
	}) as T;
}

export function substitute(text: string, values: any[] = []): string {
	return text.replace(/\$\{(\d+)\}/g, (_, i) => String(values[Number(i)]));
}

const defaultPluralFunc = (n: number) => (n !== 1 ? 1 : 0);

export const pluralFunc = memo(function pluralFunc(locale: string) {
	try {
		const length = Number(getNPlurals(locale));
		const pluralFunc = getPluralFunc(locale);
		const forms = Array.from({ length }, (_, i) => String(i));
		return (n: number) => {
			const idx = Number(pluralFunc(n, forms));
			if (idx < 0) return 0;
			if (idx >= length) return length - 1;
			return idx;
		};
	} catch {
		return defaultPluralFunc;
	}
});
