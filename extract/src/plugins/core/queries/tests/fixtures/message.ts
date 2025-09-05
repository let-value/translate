import { message, plural, Translator } from "@let-value/translate";

const t = new Translator({}).getLocale("en" as never);

message("hello");

// comment
t.message("hello comment");

// descriptor
message({ id: "greeting", message: "Hello, world!" });

/* multiline
 * comment */
message({ id: "greeting", message: "Hello, world!" });

const name = "World";
message`Hello, ${name}!`;

let greeting = "Hello";
function getGreeting() {
    return greeting;
}

// @ts-expect-error invalid call
message(greeting);
// @ts-expect-error invalid call
message(getGreeting());
// @ts-expect-error invalid call
message("Hi, " + greeting);

message`Hi, ${getGreeting()}!`;

message`Hi, ${greeting.length}!`;

t.gettext(message`Hi, nested`);

plural(message("hello"), message("hellos"), 1);
