import { test } from "vite-plus/test";

// @ts-expect-error assert is an internal utility and must not be exported from the package root.
import type { assert as leakedAssert } from "../src/index.ts";

test("public API keeps internal assert private", () => {
    const assertIsNotExported: undefined = undefined;
    void assertIsNotExported;
    void (undefined as unknown as typeof leakedAssert);
});
