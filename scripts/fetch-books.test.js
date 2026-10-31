import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fetchBooks as fetchBooksImpl, parseBook, updateBooks as updateBooksImpl } from './fetch-books.js';
import { escapeHtml, ratingStars } from '../books-format.js';

// Capture simulated failures instead of sending workflow commands to the runner.
const quietLogger = { log() {}, warn() {} };
const fetchBooks = options => fetchBooksImpl({ logger: quietLogger, ...options });
const updateBooks = options => updateBooksImpl({ logger: quietLogger, ...options });

// Representative responses based on Hardcover's documented GraphQL schema.
const fixture = JSON.parse(fs.readFileSync(new URL('./fixtures/hardcover-read-books.json', import.meta.url)));
const token = 'test-token-not-a-real-secret';
const noWait = async () => {};
const rows = fixture.data.user_books;
const expected = rows.map(parseBook);
const me = { data: { me: [{ id: 42 }] } };

function savedShelf(t, contents = JSON.stringify(expected)) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'books-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const outputPath = path.join(dir, 'books.json');
  if (contents !== null) fs.writeFileSync(outputPath, contents);
  return outputPath;
}

const json = value => new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } });
function fixtureFetch(payload = fixture) {
  return async (_url, options) => json(JSON.parse(options.body).query.includes('BookshelfOwner') ? me : payload);
}

test('maps Hardcover titles, links, authors, half-star ratings, covers, and actual read dates', () => {
  assert.deepEqual(expected[0], {
    title: 'Example & Another Story',
    link: 'https://hardcover.app/books/example-and-another-story',
    author: 'First Author, Second Author',
    rating: 4.5,
    coverUrl: 'https://assets.hardcover.app/example-cover.jpg',
    dateRead: Date.parse('2026-10-29T00:00:00Z'),
    dateAdded: Date.parse('2025-01-01T00:00:00Z'),
  });
  assert.equal(expected[1].rating, 0);
  assert.equal(expected[1].dateRead, 0);
  assert.equal(expected[1].dateAdded, Date.parse('2026-10-01T00:00:00Z'));
  assert.equal(expected[1].author, 'Unknown author');
  assert.equal(expected[1].coverUrl, '/book-placeholder.svg');
});

test('rejects malformed book metadata, unsafe links, ratings, dates and cover URLs', () => {
  for (const entry of [
    { ...rows[0], book: null },
    { ...rows[0], book: { ...rows[0].book, slug: '../bad' } },
    { ...rows[0], rating: 7 },
    { ...rows[0], rating: 'invalid' },
    { ...rows[0], last_read_date: 'not-a-date' },
    { ...rows[0], book: { ...rows[0].book, image: { url: 'javascript:alert(1)' } } },
  ]) assert.throws(() => parseBook(entry));
});

test('fetches the token owner and only their public read books, without publishing the token', async () => {
  let calls = 0;
  const books = await fetchBooks({
    token: `Bearer ${token}`,
    fetchImpl: async (url, options) => {
      calls++;
      assert.equal(url, 'https://api.hardcover.app/v1/graphql');
      assert.equal(options.method, 'POST');
      assert.equal(options.headers.Authorization, `Bearer ${token}`);
      assert.ok(options.signal instanceof AbortSignal);
      const body = JSON.parse(options.body);
      assert.ok(!body.query.includes('private_notes'));
      if (body.query.includes('BookshelfOwner')) return json(me);
      assert.deepEqual(body.variables, { userId: 42, afterId: 0, limit: 100 });
      assert.match(body.query, /status_id: \{_eq: 3\}/);
      assert.match(body.query, /privacy_setting_id: \{_eq: 1\}/);
      return json(fixture);
    },
  });
  assert.equal(calls, 2);
  assert.deepEqual(books, expected);
  assert.ok(!JSON.stringify(books).includes(token));
});

test('paginates until the aggregate count is reached, even when the server returns small pages', async () => {
  const afterIds = [];
  const books = await fetchBooks({
    token,
    fetchImpl: async (_url, options) => {
      const body = JSON.parse(options.body);
      if (body.query.includes('BookshelfOwner')) return json(me);
      afterIds.push(body.variables.afterId);
      return json({ data: {
        user_books: body.variables.afterId === 0 ? [rows[0]] : [rows[1]],
        user_books_aggregate: { aggregate: { count: 2 } },
      } });
    },
  });
  assert.deepEqual(afterIds, [0, 101]);
  assert.deepEqual(books, expected);
});

test('writes a complete shelf atomically, replacing the old Goodreads data', async t => {
  const outputPath = savedShelf(t, JSON.stringify([{ ...expected[0], link: 'https://www.goodreads.com/review/show/123' }]));
  await updateBooks({ outputPath, token, fetchImpl: fixtureFetch() });
  assert.deepEqual(JSON.parse(fs.readFileSync(outputPath, 'utf8')), expected);
  assert.equal(fs.existsSync(outputPath + '.tmp'), false);
});

test('retries rate limiting and transient server failures', async () => {
  let calls = 0;
  const books = await fetchBooks({
    token, wait: noWait,
    fetchImpl: async (...args) => {
      calls++;
      if (calls === 1) return new Response('', { status: 429 });
      if (calls === 2) return new Response('', { status: 503 });
      return fixtureFetch()(...args);
    },
  });
  assert.equal(calls, 4);
  assert.deepEqual(books, expected);
});

for (const [name, fetchImpl] of [
  ['HTTP 503', async () => new Response('', { status: 503 })],
  ['network failure', async () => { throw new TypeError('fetch failed'); }],
  ['timeout', async () => { throw new DOMException('Timed out', 'TimeoutError'); }],
  ['invalid JSON', async () => new Response('<html>Unavailable</html>')],
  ['empty shelf', fixtureFetch({ data: { user_books: [], user_books_aggregate: { aggregate: { count: 0 } } } })],
  ['incomplete shelf', fixtureFetch({ data: { user_books: [], user_books_aggregate: { aggregate: { count: 2 } } } })],
  ['duplicate entries', fixtureFetch({ data: { ...fixture.data, user_books: [rows[0], rows[0]] } })],
  ['invalid response', fixtureFetch({ data: { user_books: [] } })],
]) {
  test(`${name} preserves saved books byte for byte`, async t => {
    const original = JSON.stringify(expected, null, 2) + '\n';
    const outputPath = savedShelf(t, original);
    await updateBooks({ outputPath, token, wait: noWait, fetchImpl });
    assert.equal(fs.readFileSync(outputPath, 'utf8'), original);
  });
}

test('a failure on a later page cannot overwrite the saved shelf with partial data', async t => {
  const original = JSON.stringify(expected);
  const outputPath = savedShelf(t, original);
  let pages = 0;
  await updateBooks({
    outputPath, token, wait: noWait,
    fetchImpl: async (_url, options) => {
      const body = JSON.parse(options.body);
      if (body.query.includes('BookshelfOwner')) return json(me);
      if (++pages > 1) return new Response('', { status: 503 });
      return json({ data: { user_books: [rows[0]], user_books_aggregate: { aggregate: { count: 2 } } } });
    },
  });
  assert.equal(fs.readFileSync(outputPath, 'utf8'), original);
});

test('rejects a library count that changes between pages', async () => {
  let pages = 0;
  await assert.rejects(fetchBooks({
    token,
    fetchImpl: async (_url, options) => {
      if (JSON.parse(options.body).query.includes('BookshelfOwner')) return json(me);
      return json({ data: { user_books: [rows[pages++]], user_books_aggregate: { aggregate: { count: pages === 1 ? 2 : 3 } } } });
    },
  }), /changed during sync/);
});

for (const status of [401, 403]) {
  test(`HTTP ${status} fails without retries, retains the cache, and does not expose remote error bodies`, async t => {
    const original = JSON.stringify(expected);
    const outputPath = savedShelf(t, original);
    let calls = 0;
    await assert.rejects(updateBooks({
      outputPath, token,
      fetchImpl: async () => { calls++; return new Response(token, { status }); },
    }), error => error.message.includes(String(status)) && !error.message.includes(token));
    assert.equal(calls, 1);
    assert.equal(fs.readFileSync(outputPath, 'utf8'), original);
  });
}

test('GraphQL errors with HTTP 200 reject partial data without exposing response contents', async t => {
  const original = JSON.stringify(expected);
  const outputPath = savedShelf(t, original);
  await assert.rejects(updateBooks({
    outputPath, token,
    fetchImpl: async () => json({ ...fixture, errors: [{ message: token }] }),
  }), error => /GraphQL/.test(error.message) && !error.message.includes(token));
  assert.equal(fs.readFileSync(outputPath, 'utf8'), original);
});

test('missing token fails with setup instructions even when cached books exist', async t => {
  const outputPath = savedShelf(t);
  await assert.rejects(updateBooks({ outputPath, token: '' }), /HARDCOVER_API_TOKEN/);
});

for (const [name, contents] of [
  ['missing', null], ['corrupt', '{'], ['empty', '[]'], ['invalid', '[{"title":"Bad cache"}]'],
]) {
  test(`network failure still fails with ${name} saved data`, async t => {
    const outputPath = savedShelf(t, contents);
    await assert.rejects(updateBooks({
      outputPath, token, wait: noWait,
      fetchImpl: async () => { throw new TypeError('fetch failed'); },
    }), /fetch failed/);
  });
}

test('renders five stars with a half-filled star for 4.5 without rounding the rating', () => {
  const markup = ratingStars(4.5);
  assert.equal((markup.match(/class="rating-star"/g) || []).length, 5);
  assert.equal((markup.match(/width:100%/g) || []).length, 4);
  assert.equal((markup.match(/width:50%/g) || []).length, 1);
  assert.match(ratingStars(0), /Not rated/);
  assert.equal(escapeHtml('A & B <book> "quote"'), 'A &amp; B &lt;book&gt; &quot;quote&quot;');
});

test('real sync warnings remain enabled while tests capture their output', async t => {
  const outputPath = savedShelf(t);
  const warnings = [];
  await updateBooksImpl({
    outputPath, token, wait: noWait,
    logger: { log() {}, warn(message) { warnings.push(message); } },
    fetchImpl: async () => new Response('', { status: 503 }),
  });
  assert.equal(warnings.length, 3);
  assert.match(warnings[2], /retained 2 saved books/);
  if (process.env.GITHUB_ACTIONS === 'true') {
    assert.match(warnings[2], /^::warning::/);
  }
});
