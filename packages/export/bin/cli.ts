#!/usr/bin/env node
import fs from 'node:fs';
import { extractToPot } from '../src/index';

const [, , entry, out] = process.argv;
if (!entry) {
  console.error('Usage: translate-export <entry> [out]');
  process.exit(1);
}

const pot = extractToPot(entry);
if (out) {
  fs.writeFileSync(out, pot);
} else {
  process.stdout.write(pot);
}


