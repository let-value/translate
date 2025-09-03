import { context } from "@let-value/translate";

context("ctx").message("hello");

// comment
context("ctx").message("hello comment");

// descriptor
context("ctx").message({ id: "greeting", message: "Hello, world!" });

/* multiline
 * comment */
context("ctx").message({ id: "greeting", message: "Hello, world!" });

const name = "World";
context("ctx").message`Hello, ${name}!`;

context("ctx").message`Hi, ${name.toUpperCase()}!`;
context("ctx").message`Hi, ${name.length}!`;

const ctx = context("fruit");
ctx.message("apple");
