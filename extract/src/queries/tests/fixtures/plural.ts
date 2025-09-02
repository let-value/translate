import { msg, plural } from "@let-value/translate";

plural(msg("hello"), msg("hellos"), 1);

const count = 0;
// comment
plural(msg`${count} apple`, msg`${count} apples`, 2);

plural(msg({ id: "greeting", message: "Hello, world!" }), msg({ id: "greetings", message: "Hello, worlds!" }), 3);

const name = "World";
plural(msg`Hello, ${name}!`, msg`Hello, ${name}!`, 1);

plural(msg`Hi, ${name.toUpperCase()}!`, msg`Hi, ${name}!`, 1);
