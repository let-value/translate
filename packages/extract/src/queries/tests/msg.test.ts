import assert from "node:assert/strict";
import { test } from "node:test";

import { msgDescriptorQuery, msgStringQuery, msgTemplateQuery } from "../msg";
import { getMatches } from "./utils";

const path = "test.js";

test("should extract string message", () => {
    const { tree, query, matches } = getMatches(`msg('hello')`, path, msgStringQuery);
    try {
        assert.equal(matches.length, 1);
        assert.deepEqual(matches, [{
            msgid: "hello",
            msgstr: ["hello"],
        }]);
    } catch (error) {
        console.log({
            tree: tree.rootNode.toString(),
            query: query.toString(),
            matches,
        });
        throw error;
    }
});

test("should extract descriptor message", () => {
    const { tree, query, matches } = getMatches(`msg({ id: 'greeting', message: 'Hello, world!' })`, path, msgDescriptorQuery);
    try {
        assert.equal(matches.length, 1);
        assert.deepEqual(matches, [{
            msgid: "greeting",
            msgstr: ["Hello, world!"],
        }]);
    } catch (error) {
        console.log({
            tree: tree.rootNode.toString(),
            query: query.toString(),
            matches,
        });
        throw error;
    }
});

test("should extract template message", () => {
    const { tree, query, matches } = getMatches(`msg(\`Hello, \${name}!\`)`, path, msgTemplateQuery);
    try {
        assert.equal(matches.length, 1);
        assert.deepEqual(matches, [{
            msgid: "Hello, ${name}!",
            msgstr: ["Hello, ${name}!"],
        }]);

    } catch (error) {
        console.log({
            tree: tree.rootNode.toString(),
            query: query.toString(),
            matches,
        })
        throw error;
    }
});