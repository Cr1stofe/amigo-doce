import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const databaseUrl = process.env.INTEGRATION_DATABASE_URL;
if (!databaseUrl) throw new Error('INTEGRATION_DATABASE_URL must point to a dedicated disposable test database');
const env = { ...process.env, DATABASE_URL: databaseUrl, ADMIN_USERNAME: 'integration-admin', ADMIN_PASSWORD: 'integration-password', TOKEN_ENCRYPTION_KEY: randomBytes(32).toString('base64'), NODE_ENV: 'test' };
const migrate = spawnSync('./node_modules/.bin/prisma', ['migrate', 'deploy'], { env, stdio: 'inherit' });
if (migrate.status !== 0) throw new Error('Test database migration failed');
const listener = createServer();
await new Promise(resolve => listener.listen(0, '127.0.0.1', resolve));
const port = listener.address().port;
await new Promise(resolve => listener.close(resolve));
const server = spawn(process.execPath, ['dist/main.js'], { env: { ...env, PORT: String(port) }, stdio: ['ignore', 'ignore', 'inherit'] });
const root = `http://127.0.0.1:${port}`;
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
await prisma.loginRateLimit.deleteMany();
let cookie = '';
let eventId;
async function request(path, { method = 'GET', body, auth = true } = {}) {
  const response = await fetch(root + path, { method, headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(auth && cookie ? { cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const result = await response.json();
  return { response, result };
}
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error('API exited before becoming ready');
    try { if ((await fetch(`${root}/health`)).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.ok(ready, 'API did not start');
  assert.equal((await request('/api/events', { auth: false })).response.status, 401);
  for (const [method, path, body] of [
    ['POST', '/api/events', { title: 'Denied' }], ['GET', '/api/events/missing'],
    ['PATCH', '/api/events/missing', { title: 'Denied' }], ['DELETE', '/api/events/missing'],
    ['POST', '/api/events/missing/participants', { name: 'Denied' }],
    ['PATCH', '/api/events/missing/participants/missing', { name: 'Denied' }],
    ['DELETE', '/api/events/missing/participants/missing'], ['POST', '/api/events/missing/draw'],
    ['POST', '/api/events/missing/participants/missing/regenerate-link'],
  ]) assert.equal((await request(path, { method, body, auth: false })).response.status, 401, `${method} ${path}`);
  assert.equal((await request('/api/auth/login', { method: 'POST', body: { username: 'integration-admin', password: 'incorrect' } })).response.status, 401);
  const login = await request('/api/auth/login', { method: 'POST', body: { username: 'integration-admin', password: 'integration-password' } });
  assert.equal(login.response.status, 201);
  cookie = login.response.headers.get('set-cookie').split(';')[0];
  assert.match(login.response.headers.get('cache-control'), /no-store/);
  assert.equal((await request('/api/events', { method: 'POST', body: { title: '' } })).response.status, 400);
  const created = await request('/api/events', { method: 'POST', body: { title: 'Isolated integration test' } });
  assert.equal(created.response.status, 201);
  eventId = created.result.id;
  for (const name of ['Ada', 'Bea', 'Cleo']) assert.equal((await request(`/api/events/${eventId}/participants`, { method: 'POST', body: { name } })).response.status, 201);
  const draws = await Promise.all([request(`/api/events/${eventId}/draw`, { method: 'POST' }), request(`/api/events/${eventId}/draw`, { method: 'POST' })]);
  assert.deepEqual(draws.map(x => x.response.status).sort(), [201, 400]);
  const event = draws.find(x => x.response.status === 201).result;
  assert.equal((await request(`/api/events/${eventId}/participants`, { method: 'POST', body: { name: 'Late' } })).response.status, 400);
  const matches = [];
  for (const participant of event.participants) {
    const url = `/api/reveal/${participant.linkToken}`;
    const before = await request(url, { auth: false });
    assert.equal(before.result.revealed, false); assert.equal(before.result.match, undefined);
    assert.match(before.response.headers.get('cache-control'), /no-store/);
    const reveal = await request(url, { method: 'POST', auth: false });
    assert.notEqual(reveal.result.match.name, participant.name);
    assert.equal((await request(url, { auth: false })).result.match.name, reveal.result.match.name);
    matches.push(reveal.result.match.name);
  }
  assert.equal(new Set(matches).size, 3);
  const first = event.participants[0];
  const changed = await request(`/api/events/${eventId}/participants/${first.id}/regenerate-link`, { method: 'POST' });
  assert.equal((await request(`/api/reveal/${first.linkToken}`, { auth: false })).response.status, 404);
  assert.equal((await request(`/api/reveal/${changed.result.participants.find(p => p.id === first.id).linkToken}`, { auth: false })).response.status, 200);
  assert.equal((await request('/api/auth/logout', { method: 'POST' })).response.status, 201);
  assert.equal((await request('/api/auth/me')).response.status, 401);
  const secondLogin = await request('/api/auth/login', { method: 'POST', body: { username: 'integration-admin', password: 'integration-password' } });
  cookie = secondLogin.response.headers.get('set-cookie').split(';')[0];
  const sessionToken = decodeURIComponent(cookie.slice(cookie.indexOf('=') + 1));
  await prisma.session.update({ where: { id: createHash('sha256').update(sessionToken).digest('hex') }, data: { expiresAt: new Date(0) } });
  assert.equal((await request('/api/auth/me')).response.status, 401);
  cookie = '';
  for (let i = 0; i < 18; i++) await request('/api/auth/login', { method: 'POST', body: { username: 'bad', password: 'bad' } });
  const limited = await request('/api/auth/login', { method: 'POST', body: { username: 'bad', password: 'bad' } });
  assert.equal(limited.response.status, 429); assert.ok(limited.response.headers.get('retry-after'));
  console.log('Integration tests passed: authorization, draw concurrency, revelation, link rotation and login limit.');
} finally {
  server.kill('SIGTERM');
  await new Promise(resolve => server.once('exit', resolve));
  await prisma.$disconnect();
}
