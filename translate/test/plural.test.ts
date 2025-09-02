import assert from "node:assert/strict";
import { test } from "node:test";

import { msg, plural } from "../src/helpers.ts";

test("msg with string returns id and message", () => {
    assert.deepEqual(plural(msg("hello"), 1), {
        forms: [{ msgid: "hello", msgstr: "hello" }],
        n: 1,
    });
});

test("plural supports arbitrary number of forms", () => {
    const forms = plural(msg`${0} apple`, msg`${0} apples`, msg`${0} many apples`, 3);
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
