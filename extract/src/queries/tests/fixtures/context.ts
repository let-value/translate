// @ts-nocheck
import { context } from "@let-value/translate";

context("ctx").msg("hello");

// comment
context("ctx").msg("hello comment");

// descriptor
context("ctx").msg({ id: "greeting", message: "Hello, world!" });

/* multiline
 * comment */
context("ctx").msg({ id: "greeting", message: "Hello, world!" });

const name = "World";
context("ctx").msg`Hello, ${name}!`;

context("ctx").msg`Hi, ${name.toUpperCase()}!`;
context("ctx").msg`Hi, ${name.length}!`;
