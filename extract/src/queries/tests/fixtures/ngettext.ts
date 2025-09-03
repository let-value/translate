import { message, Translator } from "@let-value/translate";

const t = new Translator("en", {});

t.ngettext(message("hello"), message("hellos"), 1);

const count = 0;
// comment
t.ngettext(message`${count} apple`, message`${count} apples`, 2);

t.ngettext(message({ id: "greeting", message: "Hello, world!" }), message({ id: "greetings", message: "Hello, worlds!" }), 3);

const name = "World";
t.ngettext(message`Hello, ${name}!`, message`Hello, ${name}!`, 1);

t.ngettext(message`Hi, ${name.toUpperCase()}!`, message`Hi, ${name}!`, 1);
