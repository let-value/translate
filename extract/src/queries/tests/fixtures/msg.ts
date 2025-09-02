import { msg } from "@let-value/translate";

msg("hello");

// comment
msg("hello comment");

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
