import assert from "node:assert/strict";
import { test } from "node:test";

import { message, plural } from "../src/messages.ts";

test("message with string returns id and message", () => {
    assert.deepEqual(plural(message("hello"), 1), {
        forms: [{ msgid: "hello", msgstr: "hello" }],
        n: 1,
    });
});

test("plural supports arbitrary number of forms", () => {
    const forms = plural(message`${0} apple`, message`${0} apples`, message`${0} many apples`, 3);
    assert.deepEqual(forms.forms[0], {
        msgid: "${0} apple",
        msgstr: "${0} apple",
        values: [0],
    });
    assert.deepEqual(forms.forms[1], {
        msgid: "${0} apples",
        msgstr: "${0} apples",
        values: [0],
    });
    assert.deepEqual(forms.forms[2], {
        msgid: "${0} many apples",
        msgstr: "${0} many apples",
        values: [0],
    });
    assert.equal(forms.n, 3);
});
