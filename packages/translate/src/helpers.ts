import { assert, StrictStaticString } from "./utils";

export interface MessageDescriptor {
	id?: string;
	message?: string;
}

export interface MessageId {
	msgid: string;
	msgstr: string;
	values?: any[];
}

export interface PluralMessageId {
	forms: MessageId[];
	n: number;
}

export interface ContextMessageId {
	context: string;
	id: MessageId;
}

export interface ContextPluralMessageId {
	context: string;
	id: PluralMessageId;
}

function buildFromTemplate(strings: TemplateStringsArray): string {
	let result = "";
	for (let i = 0; i < strings.length; i++) {
		result += strings[i];
		if (i < strings.length - 1) result += "${" + i + "}";
	}
	return result;
}

export function msg<T extends string>(id: StrictStaticString<T>): MessageId;
export function msg(descriptor: MessageDescriptor): MessageId;
export function msg(
	strings: TemplateStringsArray,
	...values: unknown[]
): MessageId;
export function msg(
	source: string | MessageDescriptor | TemplateStringsArray,
	...values: unknown[]
): MessageId {
	if (typeof source === "string") {
		return { msgid: source, msgstr: source };
	}

	if (typeof source === "object" && "reduce" in source) {
		const id = buildFromTemplate(source);
		return { msgid: id, msgstr: id, values };
	}

	const id = source.id ?? source.message ?? "";
	const message = source.message ?? source.id ?? "";
	return { msgid: id, msgstr: message };
}

export type MessageFunction = typeof msg;

export function plural(
	...args: [...forms: MessageId[], n: number]
): PluralMessageId {
	assert(args.length > 1, "At least one plural form and n are required");

	const n = args[args.length - 1] as number;
	assert(typeof n === "number", "The last argument must be a number");

	const forms = args.slice(0, -1) as MessageId[];

	return { forms, n };
}

export type PluralFunction = typeof plural;

export interface ContextBuilder {
	msg<T extends string>(id: StrictStaticString<T>): ContextMessageId;
	msg(...args: Parameters<MessageFunction>): ContextMessageId;
	plural(...args: Parameters<PluralFunction>): ContextPluralMessageId;
}

const basePlural = plural;

export function context(context: string): ContextBuilder {
	return {
		msg: (...args: Parameters<MessageFunction>) => {
			return { id: msg(...args), context };
		},
		plural(...forms: Parameters<PluralFunction>) {
			return { id: basePlural(...forms), context };
		},
	};
}
