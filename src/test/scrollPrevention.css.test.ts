import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const css = fs.readFileSync(path.resolve(__dirname, '../index.css'), 'utf-8');

describe('index.css scroll prevention rules', () => {
  it('html/body/#root block has overflow: hidden', () => {
    expect(css).toMatch(/html\s*,\s*\n\s*body\s*,\s*\n\s*#root\s*\{[^}]*overflow\s*:\s*hidden/s);
  });

  it('body block has overscroll-behavior: none', () => {
    expect(css).toMatch(/\bbody\s*\{[^}]*overscroll-behavior\s*:\s*none/s);
  });
});
