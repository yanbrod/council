const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { sanitize } = require('../server/services/sanitizer');

describe('sanitizer', () => {
  it('strips ANSI escape codes', () => {
    const input = '\x1B[31mHello\x1B[0m World';
    assert.equal(sanitize(input), 'Hello World');
  });

  it('strips complex ANSI sequences', () => {
    const input = '\x1B[1;32;40mBold Green\x1B[0m';
    assert.equal(sanitize(input), 'Bold Green');
  });

  it('trims leading and trailing whitespace', () => {
    assert.equal(sanitize('  hello  '), 'hello');
  });

  it('collapses 3+ newlines into 2', () => {
    assert.equal(sanitize('a\n\n\n\nb'), 'a\n\nb');
  });

  it('normalizes \\r\\n to \\n', () => {
    assert.equal(sanitize('line1\r\nline2'), 'line1\nline2');
  });

  it('returns empty string for null/undefined', () => {
    assert.equal(sanitize(null), '');
    assert.equal(sanitize(undefined), '');
    assert.equal(sanitize(''), '');
  });
});
