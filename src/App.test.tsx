import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.resolve(__dirname, './App.tsx'), 'utf-8');

describe('App phone-frame scroll containment', () => {
  it('phone-frame has overflow-hidden class', () => {
    // Verify the phone-frame element has overflow-hidden in its className
    expect(source).toMatch(/id="phone-frame"[^>]*overflow-hidden/);
  });

  it('phone-frame does NOT have overflow-y-auto or overflow-auto class', () => {
    // Regression guard: ensure overflow-hidden was not replaced with overflow-y-auto
    expect(source).not.toMatch(/id="phone-frame"[^>]*overflow-y-auto/);
    expect(source).not.toMatch(/id="phone-frame"[^>]*\boverflow-auto\b/);
  });
});
