# Translation Framework for JavaScript/TypeScript

This is a monorepo containing a complete internationalization (i18n) framework for JavaScript and TypeScript applications. It includes core translation libraries, extraction tools, React integration, and bundler plugins.

**ALWAYS reference these instructions first** and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## Working Effectively

### Prerequisites and Setup
- **CRITICAL**: Requires Node.js >= 22. Current environment has Node.js v20 which works but shows warnings.
- Install dependencies: `npm ci`

### Build Process
- Build all packages: `npm run build`
- **TIMING**: Build takes ~11 seconds. NEVER CANCEL. Set timeout to 60+ minutes for safety.
- **NEVER CANCEL BUILDS OR LONG-RUNNING COMMANDS** - wait for completion.

### Testing
- **CRITICAL**: Tests require tsx loader to run TypeScript files.
- Run all tests: `find . -name "*.test.ts" -not -path "./node_modules/*" | xargs npx tsx --test`
- **TIMING**: All tests take ~9 seconds with 174/176 passing (2 known failing tests). NEVER CANCEL. Set timeout to 30+ minutes.
- Individual test files: `npx tsx --test path/to/test.test.ts`
- **VALIDATION REQUIREMENT**: ALWAYS run tests after making code changes.

### Code Quality
- Type checking: `npm run typecheck` -- takes ~7 seconds
- Formatting: `npm run format` (uses Biome)
- Linting: `npm run check --workspaces` (uses Biome)
- **ALWAYS run `npm run format` and `npm run check --workspaces` before committing or CI will fail.**

### CLI Tool Validation
- Extract tool: `extract/dist/bin/cli.js -l info` (requires translate.config.js in working directory)
- **MANUAL VALIDATION**: Always test the extract CLI with a sample configuration:

```bash
# Create test files in /tmp/test-extract/
mkdir -p /tmp/test-extract
cat > /tmp/test-extract/test.ts << 'EOF'
import { gettext, ngettext, pgettext } from "@let-value/translate";
console.log(gettext("Hello World"));
console.log(ngettext("apple", "${count} apples", 5));
console.log(pgettext("button", "Save"));
EOF

cat > /tmp/test-extract/translate.config.js << 'EOF'
import { defineConfig } from "/absolute/path/to/extract/dist/src/index.js";
export default defineConfig({
    entrypoints: "./test.ts",
    locales: ["en", "es", "fr"],
    defaultLocale: "en"
});
EOF

cd /tmp/test-extract && /absolute/path/to/extract/dist/bin/cli.js -l info
# Verify translations/ directory is created with .po files for each locale
```

## Project Structure

### Workspaces (npm workspaces)
- `translate/`: Core translation library (`@let-value/translate`)
- `extract/`: Translation extraction CLI tool (`@let-value/translate-extract`)
- `react/`: React integration (`@let-value/translate-react`)
- `loader/`: Bundler plugins for webpack, vite, etc. (`@let-value/translate-loader`)
- `e2e/`: End-to-end tests

### Key Files
- `package.json`: Root workspace configuration
- `biome.json`: Code formatting and linting configuration
- `tsconfig.base.json`: Base TypeScript configuration
- Each workspace has its own `package.json`, `tsconfig.json`, and `tsdown.config.ts`

## Common Tasks

### Adding New Features
1. ALWAYS build first: `npm run build`
2. Run relevant tests: `npx tsx --test workspace/path/to/tests/`
3. Test CLI functionality if touching extract workspace
4. Run typecheck: `npm run typecheck`
5. Format and lint: `npm run format && npm run check --workspaces`

### Working with Tests
- Tests use Node.js built-in test runner but require tsx for TypeScript
- Test files follow pattern: `*.test.ts`
- ALWAYS use tsx to run tests: `npx tsx --test file.test.ts`
- DO NOT use `node --test` directly on TypeScript files

### Working with Extract CLI
- CLI requires configuration file (translate.config.js or similar)
- Use absolute paths in config when testing locally
- CLI generates .po files in translations/ directory
- **MANUAL SCENARIO**: After changes to extract, always:
  1. Create test TypeScript file with gettext/ngettext calls
  2. Create translate.config.js with defineConfig
  3. Run CLI and verify .po files are generated correctly
  4. Check .po files contain expected msgid/msgstr entries

### Working with React Components
- React package provides hooks and components for i18n
- Test React components by running e2e tests
- **MANUAL SCENARIO**: After React changes, verify:
  1. Components render translated text correctly
  2. Locale switching works
  3. Plural forms work with different counts

## Validation Scenarios

### Complete End-to-End Validation
**ALWAYS perform these validation steps after making changes:**

1. **Build Validation**: 
   ```bash
   npm run build  # Must complete without errors in ~11 seconds
   ```

2. **Test Validation**:
   ```bash
   find . -name "*.test.ts" -not -path "./node_modules/*" | xargs npx tsx --test
   # Must show 174+ passing tests in ~9 seconds
   ```

3. **CLI Validation**:
   ```bash
   # Create test files in /tmp/test-extract/
   mkdir -p /tmp/test-extract
   echo 'import { gettext, ngettext } from "@let-value/translate"; console.log(gettext("Hello")); console.log(ngettext("item", "${count} items", 2));' > /tmp/test-extract/test.ts
   echo 'import { defineConfig } from "/absolute/path/to/extract/dist/src/index.js"; export default defineConfig({ entrypoints: "./test.ts", locales: ["en", "es"] });' > /tmp/test-extract/translate.config.js
   cd /tmp/test-extract && /absolute/path/to/extract/dist/bin/cli.js -l info
   # Verify translations/test.en.po and test.es.po are created
   # Check that .po files contain msgid "Hello" and plural forms
   ls -la translations/ && head -20 translations/test.en.po
   ```

4. **Code Quality Validation**:
   ```bash
   npm run typecheck  # Must pass in ~7 seconds
   npm run format     # Must complete without changes
   npm run check --workspaces  # Must pass without errors
   ```

## Troubleshooting

### Common Issues
- **"Unknown file extension .ts"**: Use `npx tsx --test` instead of `node --test`
- **"config.plugins is not iterable"**: Ensure translate.config.js uses `defineConfig()` properly
- **Node version warnings**: Expected with Node v20, framework requires v22+
- **Test failures**: 2 tests are known to fail (snapshot and react extraction), this is expected

### Build Artifacts
- Built files go to `dist/` directories in each workspace
- Use `.gitignore` to exclude: `node_modules/`, `dist/`, `tsconfig.tsbuildinfo`
- Build uses tsdown (powered by rolldown) for fast compilation

## Performance Expectations
- **Build**: ~11 seconds total for all workspaces
- **Tests**: ~9 seconds for 176 tests across all workspaces  
- **Typecheck**: ~7 seconds for all workspaces
- **Formatting/Linting**: <1 second per workspace

**CRITICAL REMINDER**: NEVER CANCEL long-running commands. All operations complete quickly but set generous timeouts (60+ minutes) to prevent premature cancellation.