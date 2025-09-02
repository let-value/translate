import { msg, Translator } from "@let-value/translate";

const t = new Translator("en", {});

t.ngettext(msg("hello"), msg("hellos"), 1);

const count = 0;
// comment
t.ngettext(msg`${count} apple`, msg`${count} apples`, 2);

t.ngettext(msg({ id: "greeting", message: "Hello, world!" }), msg({ id: "greetings", message: "Hello, worlds!" }), 3);

const name = "World";
t.ngettext(msg`Hello, ${name}!`, msg`Hello, ${name}!`, 1);

t.ngettext(msg`Hi, ${name.toUpperCase()}!`, msg`Hi, ${name}!`, 1);
