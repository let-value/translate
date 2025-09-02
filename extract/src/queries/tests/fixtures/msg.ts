import { msg, plural, Translator } from "@let-value/translate";

const t = new Translator("en", {});

msg("hello");

// comment
t.msg("hello comment");

// descriptor
msg({ id: "greeting", message: "Hello, world!" });

/* multiline
 * comment */
msg({ id: "greeting", message: "Hello, world!" });

const name = "World";
msg`Hello, ${name}!`;

// biome-ignore lint/style/useConst: true
let greeting = "Hello";
function getGreeting() {
    return greeting;
}

// @ts-expect-error invalid call
msg(greeting);
// @ts-expect-error invalid call
msg(getGreeting());
// @ts-expect-error invalid call
// biome-ignore lint/style/useTemplate: true
msg("Hi, " + greeting);

msg`Hi, ${getGreeting()}!`;

msg`Hi, ${greeting.length}!`;

t.gettext(msg`Hi, nested`);

plural(msg("hello"), msg("hellos"), 1);
