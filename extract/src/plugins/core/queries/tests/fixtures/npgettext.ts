import { message, Translator } from "@let-value/translate";

const t = new Translator({}).getLocale("en" as never);

t.npgettext("ctx", message("hello"), message("hellos"), 1);

const count = 0;
// comment
t.npgettext("company", message`${count} apple`, message`${count} apples`, 2);

t.npgettext(
    "ctx",
    message({ id: "greeting", message: "Hello, world!" }),
    message({ id: "greetings", message: "Hello, worlds!" }),
    3,
);

const name = "World";
t.npgettext("ctx", message`Hello, ${name}!`, message`Hello, ${name}!`, 1);

t.npgettext(
    "ctx",
    message("one"),
    message("few"),
    message("many"),
    message("other"),
    5,
);

t.npgettext("ctx", message`Hi, ${name.toUpperCase()}!`, message`Hi, ${name}!`, 1);
