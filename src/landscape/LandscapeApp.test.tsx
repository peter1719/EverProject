/**
 * Regression tests for LandscapeApp route-sync on portrait→landscape rotation.
 *
 * Bug: When rotating from portrait (createBrowserRouter, pathname-based) to
 * landscape (createHashRouter, hash-based), window.location.hash is empty.
 * The old code fell back to '/library', causing the active Timer page to vanish.
 * Fix: Fall back to window.location.pathname when hash is absent.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(
  path.resolve(__dirname, './LandscapeApp.tsx'),
  'utf-8',
);

describe('LandscapeApp route sync (portrait → landscape rotation)', () => {
  it('reads window.location.pathname as fallback when hash is empty', () => {
    // Must use pathname (not just '/library') so portrait routes like /timer are preserved
    expect(source).toContain('window.location.pathname');
  });

  it('only uses hash when it has an actual path (length > 1)', () => {
    // Regression: bare '#' (empty hash) must NOT be treated as a valid path
    expect(source).toMatch(/hash\.startsWith\('#'\)\s*&&\s*hash\.length\s*>\s*1/);
  });

  it('does not hard-code /library as the sole fallback for empty hash', () => {
    // Old bug: `hash.startsWith('#') ? hash.slice(1) : '/library'`
    // That caused portrait /timer to become /library on rotation.
    // Ensure the fallback path goes through pathname, not straight to '/library'.
    const oldFallbackPattern = /hash\.startsWith\('#'\)\s*\?\s*hash\.slice\(1\)\s*:\s*['"]\/library['"]/;
    expect(source).not.toMatch(oldFallbackPattern);
  });
});
