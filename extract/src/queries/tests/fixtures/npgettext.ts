import { msg, Translator } from "@let-value/translate";

const t = new Translator("en", {});

t.npgettext("ctx", msg("hello"), msg("hellos"), 1);

const count = 0;
// comment
t.npgettext("company", msg`${count} apple`, msg`${count} apples`, 2);

t.npgettext(
    "ctx",
    msg({ id: "greeting", message: "Hello, world!" }),
    msg({ id: "greetings", message: "Hello, worlds!" }),
    3,
);

const name = "World";
t.npgettext("ctx", msg`Hello, ${name}!`, msg`Hello, ${name}!`, 1);

t.npgettext("ctx", msg`Hi, ${name.toUpperCase()}!`, msg`Hi, ${name}!`, 1);
