import assert from "node:assert/strict";
import { test } from "node:test";

import { msgDescriptorQuery, msgStringQuery, msgTemplateQuery } from "../msg.ts";
import { getMatches } from "./utils.ts";

test("should extract string message", () => {
    const matches = getMatches(`msg('hello')`, msgStringQuery);

    assert.equal(matches.length, 1);
    assert.deepEqual(matches, [{
        msgid: "hello",
        msgstr: ["hello"],
    }]);
});

test("should extract descriptor message", () => {
    const matches = getMatches(`msg({ id: 'greeting', message: 'Hello, world!' })`, msgDescriptorQuery);

    assert.equal(matches.length, 1);
    assert.deepEqual(matches, [{
        msgid: "greeting",
        msgstr: ["Hello, world!"],
    }]);
});

test("should extract template message", () => {
    const matches = getMatches(`msg(\`Hello, \${name}!\`)`, msgTemplateQuery);

    assert.equal(matches.length, 1);
    assert.deepEqual(matches, [{
        msgid: "Hello, ${name}!",
        msgstr: ["Hello, ${name}!"],
    }]);
});
