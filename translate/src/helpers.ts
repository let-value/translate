import { assert, type StrictStaticString } from "./utils.ts";

export interface MessageDescriptor {
    id?: string;
    message?: string;
}

export interface MessageId {
    msgid: string;
    msgstr: string;
    // biome-ignore lint/suspicious/noExplicitAny: true
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
        if (i < strings.length - 1) result += `\${${i}}`;
    }
    return result;
}

export type MessageArgs<T extends string> =
    | [id: StrictStaticString<T>]
    | [descriptor: MessageDescriptor]
    | [strings: TemplateStringsArray, ...values: unknown[]];

export type MessageFunction = <T extends string>(...args: MessageArgs<T>) => MessageId;

export function msg<T extends string>(...args: MessageArgs<T>): MessageId {
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

export type PluralArgs = [...forms: MessageId[], n: number];

export function plural(...args: PluralArgs): PluralMessageId {
    assert(args.length > 1, "At least one plural form and n are required");

    const n = args[args.length - 1] as number;
    assert(typeof n === "number", "The last argument must be a number");

    const forms = args.slice(0, -1) as MessageId[];

    return { forms, n };
}

export type PluralFunction = (...args: PluralArgs) => PluralMessageId;
export type MessageInit<T extends string = string> = [MessageId] | MessageArgs<T>;
export type PluralInit = [PluralMessageId] | PluralArgs;

export type ContextMessageFunction = <T extends string>(
    ...args: MessageArgs<T>
) => ContextMessageId;

export type ContextPluralFunction = (
    ...args: PluralArgs
) => ContextPluralMessageId;

export interface ContextBuilder {
    msg: ContextMessageFunction;
    plural: ContextPluralFunction;
}

const baseMsg = msg;
const basePlural = plural;

export function context(context: string): ContextBuilder {
    function msg<T extends string>(...args: MessageArgs<T>): ContextMessageId {
        return { id: baseMsg(...args), context };
    }

    function plural(...forms: PluralArgs): ContextPluralMessageId {
        return { id: basePlural(...forms), context };
    }

    return {
        msg,
        plural,
    };
}
