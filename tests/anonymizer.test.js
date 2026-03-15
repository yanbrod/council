const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { anonymize } = require('../server/services/anonymizer');

describe('anonymizer', () => {
  it('returns only successful responses', () => {
    const responses = [
      { id: 1, status: 'success', response_text: 'A' },
      { id: 2, status: 'error', response_text: 'B' },
      { id: 3, status: 'success', response_text: 'C' },
    ];
    const result = anonymize(responses);
    assert.equal(result.length, 2);
    assert.ok(result.every((r) => ['Ответ A', 'Ответ B'].includes(r.label)));
  });

  it('assigns correct labels', () => {
    const responses = [
      { id: 1, status: 'success', response_text: 'One' },
      { id: 2, status: 'success', response_text: 'Two' },
      { id: 3, status: 'success', response_text: 'Three' },
    ];
    const result = anonymize(responses);
    assert.equal(result.length, 3);
    const labels = result.map((r) => r.label);
    assert.ok(labels.includes('Ответ A'));
    assert.ok(labels.includes('Ответ B'));
    assert.ok(labels.includes('Ответ C'));
  });

  it('preserves response text', () => {
    const responses = [
      { id: 1, status: 'success', response_text: 'Hello' },
    ];
    const result = anonymize(responses);
    assert.equal(result.length, 1);
    assert.equal(result[0].text, 'Hello');
    assert.equal(result[0].label, 'Ответ A');
  });

  it('returns empty array when no successes', () => {
    const responses = [
      { id: 1, status: 'error', response_text: 'fail' },
      { id: 2, status: 'timeout', response_text: '' },
    ];
    const result = anonymize(responses);
    assert.equal(result.length, 0);
  });

  it('includes responseId for traceability', () => {
    const responses = [
      { id: 42, status: 'success', response_text: 'text' },
    ];
    const result = anonymize(responses);
    assert.equal(result[0].responseId, 42);
  });
});
