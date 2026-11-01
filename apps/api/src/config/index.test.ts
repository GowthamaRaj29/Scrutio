import assert from 'node:assert/strict';
import test from 'node:test';
import { loadConfig } from './index.js';

const valid = {
  NODE_ENV: 'test',
  BURST_FAILURE_WINDOW_HOURS: '1',
  BURST_FAILURE_COUNT_THRESHOLD: '5',
  WEBHOOK_STORM_WINDOW_MINUTES: '10',
  WEBHOOK_STORM_COUNT_THRESHOLD: '12',
  FAILURE_RATE_THRESHOLD_PCT: '50',
};

void test('rule configuration accepts valid boundary percentage values', () => {
  assert.equal(
    loadConfig({ ...valid, FAILURE_RATE_THRESHOLD_PCT: '100' }).failureRateThresholdPct,
    100,
  );
});

void test('rule configuration rejects missing, zero, negative, and invalid values', () => {
  for (const [name, value] of [
    ['BURST_FAILURE_WINDOW_HOURS', undefined],
    ['BURST_FAILURE_COUNT_THRESHOLD', '0'],
    ['WEBHOOK_STORM_WINDOW_MINUTES', '-1'],
    ['WEBHOOK_STORM_COUNT_THRESHOLD', 'not-a-number'],
    ['FAILURE_RATE_THRESHOLD_PCT', '101'],
  ] as const) {
    const environment = { ...valid };
    if (value === undefined) {
      const withoutValue = Object.fromEntries(
        Object.entries(environment).filter(([key]) => key !== name),
      );
      assert.throws(() => loadConfig(withoutValue), { name: 'ZodError' });
      continue;
    } else {
      environment[name] = value;
    }
    assert.throws(() => loadConfig(environment), { name: 'ZodError' });
  }
});
