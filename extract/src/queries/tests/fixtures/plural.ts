import { message, plural } from "@let-value/translate";

plural(message("hello"), message("hellos"), 1);

const count = 0;
// comment
plural(message`${count} apple`, message`${count} apples`, 2);

plural(message({ id: "greeting", message: "Hello, world!" }), message({ id: "greetings", message: "Hello, worlds!" }), 3);

const name = "World";
plural(message`Hello, ${name}!`, message`Hello, ${name}!`, 1);

plural(message`Hi, ${name.toUpperCase()}!`, message`Hi, ${name}!`, 1);
