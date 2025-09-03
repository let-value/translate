import { assert, type StrictStaticString } from "./utils.ts";

export interface MessageDescriptor {
    id?: string;
    message?: string;
}

export interface Message {
    msgid: string;
    msgstr: string;
    // biome-ignore lint/suspicious/noExplicitAny: true
    values?: any[];
}

export interface PluralMessage {
    forms: Message[];
    n: number;
}

export interface ContextMessage {
    context: string;
    id: Message;
}

export interface ContextPluralMessage {
    context: string;
    id: PluralMessage;
}

function buildFromTemplate(strings: TemplateStringsArray): string {
    let result = "";
    for (let i = 0; i < strings.length; i++) {
        result += strings[i];
        if (i < strings.length - 1) result += `\${${i}}`;
    }
    return result;
}

export type MessageArgs<T extends string> =
    | [id: StrictStaticString<T>]
    | [descriptor: MessageDescriptor]
    | [strings: TemplateStringsArray, ...values: unknown[]];

export type MessageFunction = <T extends string>(...args: MessageArgs<T>) => Message;

export function message<T extends string>(...args: MessageArgs<T>): Message {
    const [source, ...values] = args as [MessageDescriptor | TemplateStringsArray, ...unknown[]];

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

export type PluralArgs = [...forms: Message[], n: number];

export function plural(...args: PluralArgs): PluralMessage {
    assert(args.length > 1, "At least one plural form and n are required");

    const n = args[args.length - 1] as number;
    assert(typeof n === "number", "The last argument must be a number");

    const forms = args.slice(0, -1) as Message[];

    return { forms, n };
}

export type PluralFunction = (...args: PluralArgs) => PluralMessage;
export type MessageInput<T extends string = string> = [Message] | MessageArgs<T>;
export type PluralInput = [PluralMessage] | PluralArgs;

export type ContextMessageFunction = <T extends string>(...args: MessageArgs<T>) => ContextMessage;

export type ContextPluralFunction = (...args: PluralArgs) => ContextPluralMessage;

export interface ContextBuilder {
    message: ContextMessageFunction;
    plural: ContextPluralFunction;
}

const baseMessage = message;
const basePlural = plural;

export function context<T extends string>(context: StrictStaticString<T>): ContextBuilder;
export function context(strings: TemplateStringsArray, ...values: never[]): ContextBuilder;
export function context<T extends string>(
    ...args: [StrictStaticString<T>] | [TemplateStringsArray, ...never[]]
): ContextBuilder {
    const [source] = args as [StrictStaticString<T> | TemplateStringsArray];

    const ctx = typeof source === "string" ? source : source[0];

    function message<T extends string>(...args: MessageArgs<T>): ContextMessage {
        return { id: baseMessage(...args), context: ctx };
    }

    function plural(...forms: PluralArgs): ContextPluralMessage {
        return { id: basePlural(...forms), context: ctx };
    }

    return {
        message,
        plural,
    };
}
