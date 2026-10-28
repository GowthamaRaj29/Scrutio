import assert from 'node:assert/strict';
import test from 'node:test';
import { LoginRateLimiter, createPasswordHash } from './auth-service.js';
import { verifyPassword } from './password-hasher.js';

void test('password hashes verify without storing the plaintext', async () => {
  const hash = await createPasswordHash('correct horse battery staple');
  assert.notEqual(hash, 'correct horse battery staple');
  assert.equal(await verifyPassword('correct horse battery staple', hash), true);
  assert.equal(await verifyPassword('wrong password', hash), false);
});

void test('login rate limiter blocks after the configured attempts', () => {
  const limiter = new LoginRateLimiter(2, 1_000);
  assert.equal(limiter.allow('user@example.test', 0), true);
  assert.equal(limiter.allow('user@example.test', 1), true);
  assert.equal(limiter.allow('user@example.test', 2), false);
  assert.equal(limiter.allow('user@example.test', 1_001), true);
});
