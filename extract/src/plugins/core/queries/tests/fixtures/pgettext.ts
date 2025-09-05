import { Translator } from "@let-value/translate";

const t = new Translator({}).getLocale("en" as never);

t.pgettext("ctx", "hello");

// comment
t.pgettext("ctx", "hello comment");

// descriptor
t.pgettext("ctx", { id: "greeting", message: "Hello, world!" });

/* multiline
 * comment */
t.pgettext("ctx", { id: "greeting", message: "Hello, world!" });

const name = "World";
t.pgettext("ctx", `Hello, ${name}!`);

// @ts-expect-error invalid call
t.pgettext("ctx", "Hi, " + name);

function getGreeting() {
    return name;
}

t.pgettext("ctx", `Hi, ${getGreeting()}!`);

t.pgettext("ctx", `Hi, ${name.length}!`);
