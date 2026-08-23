import { playwright } from "vite-plus/test/browser-playwright";
import type { TestProjectConfiguration } from "vite-plus/test/config";

/**
 * Test projects of the react package.
 *
 * Both this package's config and the workspace root config build from this
 * function: Vitest ignores projects nested inside a referenced project's
 * config, so a root run that only pointed at `react/` would lose the browser
 * project and run the `.tsx` tests — which hydrate real DOM — in Node.
 *
 * @param root - absolute path of the react package.
 */
export function reactProjects(root: string): TestProjectConfiguration[] {
    return [
        {
            root,
            test: {
                name: "translate-react",
                include: ["test/**/*.test.ts"],
            },
        },
        {
            root,
            test: {
                name: "translate-react-browser",
                include: ["test/**/*.test.tsx"],
                browser: {
                    enabled: true,
                    provider: playwright(),
                    instances: [{ browser: "chromium" }],
                },
            },
        },
    ];
}
