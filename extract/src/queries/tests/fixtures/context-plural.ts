import { context, msg } from "@let-value/translate";

context("ctx").plural(msg("hello"), msg("hellos"), 1);

const count = 0;
// comment
context("company").plural(msg`${count} apple`, msg`${count} apples`, 2);

context("ctx").plural(
    msg({ id: "greeting", message: "Hello, world!" }),
    msg({ id: "greetings", message: "Hello, worlds!" }),
    3,
);

const name = "World";
context("ctx").plural(msg`Hello, ${name}!`, msg`Hello, ${name}!`, 1);

context("ctx").plural(msg`Hi, ${name.toUpperCase()}!`, msg`Hi, ${name}!`, 1);
