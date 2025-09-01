import { msg } from "@let-value/translate";

msg("hello");
msg({ id: "greeting", message: "Hello, world!" });

const name = "World";
msg`Hello, ${name}!`;
