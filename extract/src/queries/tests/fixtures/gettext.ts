import { message, Translator } from "@let-value/translate";

const t = new Translator("en", {});

t.gettext("hello");

// comment
t.gettext("hello comment");

// descriptor
t.gettext({ id: "greeting", message: "Hello, world!" });

/* multiline
 * comment */
t.gettext({ id: "greeting", message: "Hello, world!" });

const name = "World";
t.gettext`Hello, ${name}!`;

const helloMsg = message`Hi, ${name}!`;
t.gettext(helloMsg);

function getGreeting() {
    return helloMsg;
}
// deferred message via function call
t.gettext(getGreeting());

// @ts-expect-error invalid call
t.gettext("Hi, " + name);

t.gettext`Hi, ${getGreeting()}!`;

t.gettext`Hi, ${name.length}!`;

t.gettext(message`Hi, nested`);
