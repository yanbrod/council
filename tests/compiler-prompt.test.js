const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { buildCompilerPrompt } = require('../server/services/compiler-prompt');

describe('buildCompilerPrompt', () => {
  it('includes user prompt', () => {
    const result = buildCompilerPrompt('test question', [
      { label: 'Ответ A', text: 'answer A' },
    ]);
    assert.ok(result.includes('test question'));
  });

  it('includes all response labels and texts', () => {
    const result = buildCompilerPrompt('q', [
      { label: 'Ответ A', text: 'first' },
      { label: 'Ответ B', text: 'second' },
      { label: 'Ответ C', text: 'third' },
    ]);
    assert.ok(result.includes('Ответ A:\nfirst'));
    assert.ok(result.includes('Ответ B:\nsecond'));
    assert.ok(result.includes('Ответ C:\nthird'));
  });

  it('includes compiler instructions', () => {
    const result = buildCompilerPrompt('q', [
      { label: 'Ответ A', text: 'a' },
    ]);
    assert.ok(result.includes('Удали повторы'));
    assert.ok(result.includes('Не упоминай A/B/C'));
  });

  it('works with single response', () => {
    const result = buildCompilerPrompt('q', [
      { label: 'Ответ A', text: 'only one' },
    ]);
    assert.ok(result.includes('Ответ A:\nonly one'));
    assert.ok(!result.includes('Ответ B'));
  });
});
