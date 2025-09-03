import { context, message } from "@let-value/translate";

context("ctx").plural(message("hello"), message("hellos"), 1);

const count = 0;
// comment
context("company").plural(message`${count} apple`, message`${count} apples`, 2);

context("ctx").plural(
    message({ id: "greeting", message: "Hello, world!" }),
    message({ id: "greetings", message: "Hello, worlds!" }),
    3,
);

const name = "World";
context("ctx").plural(message`Hello, ${name}!`, message`Hello, ${name}!`, 1);

context("ctx").plural(message`Hi, ${name.toUpperCase()}!`, message`Hi, ${name}!`, 1);
