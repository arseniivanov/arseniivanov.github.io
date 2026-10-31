import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fetchBooks, parseBooks, parseShelfCount, preserveDates, updateBooks } from './fetch-books.js';

const widget = fs.readFileSync(new URL('./fixtures/goodreads-widget.js.txt', import.meta.url), 'utf8');
const profile = fs.readFileSync(new URL('./fixtures/goodreads-profile.html', import.meta.url), 'utf8');
const userId = '172764601';
const noWait = async () => {};
const parsed = parseBooks(widget);
const saved = parsed.map((book, i) => ({ ...book, dateRead: 1_700_000_000_000 + i }));

function savedShelf(t, contents = JSON.stringify(saved)) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'books-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const outputPath = path.join(dir, 'books.json');
  if (contents !== null) fs.writeFileSync(outputPath, contents);
  return outputPath;
}

const fetchFixture = async url => new Response(String(url).includes('/user/show/') ? profile : widget);

test('parses captured widget markup, including escaped apostrophes and unrated books', () => {
  assert.equal(parsed.length, 4);
  assert.deepEqual(parsed[0], {
    title: 'Axiomatic',
    link: 'https://www.goodreads.com/review/show/7090316809',
    author: 'Greg Egan',
    rating: 5,
    coverUrl: 'https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1287341765l/156783.jpg',
    dateRead: 0,
  });
  assert.equal(parsed[2].title, "Breakneck: China's Quest to Engineer the Future");
  assert.equal(parsed[2].rating, 4);
  assert.equal(parsed[3].rating, 0);
});

test('decodes HTML entities without evaluating the remote script', () => {
  const malicious = widget.replaceAll('Axiomatic', 'A &amp; B &#x2014; C') + '\nthrow new Error("must never execute")';
  assert.equal(parseBooks(malicious)[0].title, 'A & B — C');
});

test('uses the full cover title when Goodreads shortens the displayed title', () => {
  assert.equal(parseBooks(widget.replace('>Axiomatic<', '>Short title<'))[0].title, 'Axiomatic');
});

test('finds only the requested user’s read-shelf count', () => {
  assert.equal(parseShelfCount(profile, userId), 4);
  assert.throws(() => parseShelfCount(profile, '123'), /read-shelf count/);
  assert.throws(() => parseShelfCount('<html>Sign in</html>', userId), /read-shelf count/);
});

test('fetches profile and widget with explicit fields, a timeout, and no credentials', async () => {
  const urls = [];
  const books = await fetchBooks(userId, {
    fetchImpl: async (url, options) => {
      urls.push(new URL(url));
      assert.ok(options.signal instanceof AbortSignal);
      assert.ok(!options.headers.Cookie);
      return fetchFixture(url);
    },
  });
  assert.deepEqual(books, parsed);
  assert.equal(urls.length, 2);
  assert.equal(urls[1].searchParams.get('shelf'), 'read');
  assert.equal(urls[1].searchParams.get('show_rating'), '1');
  assert.equal(urls[1].searchParams.get('num_books'), '100');
});

test('preserves historical dates across tracking URL changes; records new books’ first sync once', () => {
  const previous = [{ ...saved[0], link: saved[0].link + '?utm_source=rss' }];
  const first = preserveDates(parsed, previous, 12345);
  assert.equal(first[0].dateRead, saved[0].dateRead);
  assert.equal(first[0].dateAdded, undefined);
  assert.equal(first[1].dateRead, 0);
  assert.equal(first[1].dateAdded, 12345);
  assert.deepEqual(preserveDates(parsed, first, 99999), first);
});

test('writes a complete shelf, updates ratings, adds new books, and removes absent books', async t => {
  const previous = [
    { ...saved[0], rating: 1 },
    { ...saved[0], link: 'https://www.goodreads.com/review/show/999' },
  ];
  const outputPath = savedShelf(t, JSON.stringify(previous));
  await updateBooks({ outputPath, fetchImpl: fetchFixture });
  const books = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
  assert.equal(books.length, 4);
  assert.equal(books[0].rating, 5);
  assert.equal(books[0].dateRead, saved[0].dateRead);
  assert.ok(books[1].dateAdded > 0);
  assert.ok(!books.some(book => book.link.endsWith('/999')));
  assert.equal(fs.existsSync(outputPath + '.tmp'), false);
});

test('retries transient errors and recovers', async () => {
  let calls = 0;
  const books = await fetchBooks(userId, {
    wait: noWait,
    fetchImpl: async url => ++calls === 1 ? new Response('', { status: 503 }) : fetchFixture(url),
  });
  assert.equal(calls, 3);
  assert.deepEqual(books, parsed);
});

for (const [name, fetchImpl] of [
  ['HTTP 404', async () => new Response('', { status: 404 })],
  ['network failure', async () => { throw new TypeError('fetch failed'); }],
  ['timeout', async () => { throw new DOMException('Timed out', 'TimeoutError'); }],
  ['sign-in redirect', async () => ({ ok: true, url: 'https://www.goodreads.com/user/sign_in' })],
  ['HTML with HTTP 200', async () => new Response('<html>Sign in</html>')],
  ['empty shelf', async () => new Response(profile.replace('(4)', '(0)'))],
  ['partial shelf', async url => new Response(String(url).includes('/user/show/') ? profile.replace('(4)', '(5)') : widget)],
  ['changed widget', async url => new Response(String(url).includes('/user/show/') ? profile : 'var widget_code = \'<div>Unknown markup</div>\';')],
  ['truncated widget', async url => new Response(String(url).includes('/user/show/') ? profile : widget.slice(0, 300))],
]) {
  test(`${name} preserves the saved bookshelf byte for byte`, async t => {
    const original = JSON.stringify(saved, null, 2) + '\n';
    const outputPath = savedShelf(t, original);
    await updateBooks({ outputPath, wait: noWait, fetchImpl });
    assert.equal(fs.readFileSync(outputPath, 'utf8'), original);
  });
}

for (const [name, contents] of [
  ['missing', null], ['corrupt', '{'], ['empty', '[]'], ['invalid', '[{"title":"Bad cache"}]'],
]) {
  test(`HTTP 404 still fails with ${name} saved data`, async t => {
    const outputPath = savedShelf(t, contents);
    await assert.rejects(updateBooks({
      outputPath, wait: noWait,
      fetchImpl: async () => new Response('', { status: 404 }),
    }), /HTTP 404/);
  });
}

test('rejects missing rating markup and duplicate reviews', () => {
  assert.throws(() => parseBooks(widget.replaceAll('gr_custom_rating_', 'changed_rating_')), /rating stars/);
  assert.throws(() => parseBooks(widget.replaceAll('/show/8412941529', '/show/7090316809')), /duplicate/);
});
