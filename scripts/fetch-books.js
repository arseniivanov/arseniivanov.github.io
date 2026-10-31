import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const OUTPUT_PATH = fileURLToPath(new URL('../public/books.json', import.meta.url));
const API_URL = 'https://api.hardcover.app/v1/graphql';
const PAGE_SIZE = 100;
const ME_QUERY = 'query BookshelfOwner { me { id } }';
const BOOKS_QUERY = `
  query ReadBooks($userId: Int!, $afterId: Int!, $limit: Int!) {
    user_books(
      where: {
        user_id: {_eq: $userId}, status_id: {_eq: 3},
        privacy_setting_id: {_eq: 1}, id: {_gt: $afterId}
      },
      order_by: {id: asc}, limit: $limit
    ) {
      id
      rating
      date_added
      last_read_date
      book {
        title
        slug
        image { url }
        contributions { author { name } }
      }
    }
    user_books_aggregate(where: {
      user_id: {_eq: $userId}, status_id: {_eq: 3}, privacy_setting_id: {_eq: 1}
    }) { aggregate { count } }
  }
`;

async function queryApi(query, variables, { token, fetchImpl = fetch, wait = delay }) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetchImpl(API_URL, {
        method: 'POST',
        signal: AbortSignal.timeout(20_000),
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'ArseniBookshelf/1.0 (+https://arseniivanov.github.io/books.html)',
        },
        body: JSON.stringify({ query, variables }),
      });
      if (!response.ok) {
        const error = new Error(`Hardcover API returned HTTP ${response.status}`);
        error.permanent = response.status < 500 && ![408, 429].includes(response.status);
        throw error;
      }
      const payload = await response.json();
      // GraphQL may return HTTP 200 together with errors and partial data.
      if (payload.errors?.length || !payload.data) {
        const error = new Error('Hardcover GraphQL request failed; check the query and API token scopes');
        error.permanent = true;
        throw error;
      }
      return payload.data;
    } catch (error) {
      if (error.permanent || attempt === 3) throw error;
      // Do not log remote response bodies or request headers containing the token.
      console.warn(`Hardcover request failed (attempt ${attempt}/3). Retrying...`);
      await wait(attempt * 2_000);
    }
  }
}

function timestamp(value) {
  if (!value) return 0;
  const result = Date.parse(value);
  if (!Number.isFinite(result)) throw new Error('Hardcover returned an invalid book date');
  return result;
}

export function parseBook(entry) {
  const book = entry.book;
  if (!book || typeof book.title !== 'string' || !book.title.trim() ||
      typeof book.slug !== 'string' || !/^[\w-]+$/.test(book.slug)) {
    throw new Error('Hardcover returned an invalid book');
  }
  const rating = entry.rating == null ? 0 : Number(entry.rating);
  if (!Number.isFinite(rating) || rating < 0 || rating > 5) {
    throw new Error('Hardcover returned an invalid rating');
  }
  const authors = [...new Set((book.contributions || []).map(item => item.author?.name?.trim()).filter(Boolean))];
  let coverUrl = '/book-placeholder.svg';
  if (book.image?.url) {
    const url = new URL(book.image.url);
    if (url.protocol !== 'https:') throw new Error('Hardcover returned an invalid cover URL');
    coverUrl = url.href;
  }
  return {
    title: book.title.trim(),
    link: `https://hardcover.app/books/${book.slug}`,
    author: authors.join(', ') || 'Unknown author',
    rating,
    coverUrl,
    dateRead: timestamp(entry.last_read_date),
    dateAdded: timestamp(entry.date_added),
  };
}

export async function fetchBooks({ token = process.env.HARDCOVER_API_TOKEN, ...options } = {}) {
  // Accept either a raw token or the Authorization value copied from the API page.
  token = token?.trim().replace(/^Bearer\s+/i, '');
  if (!token) {
    const error = new Error('Set the HARDCOVER_API_TOKEN Actions secret before syncing books');
    error.permanent = true;
    throw error;
  }
  const requestOptions = { ...options, token };
  const owner = await queryApi(ME_QUERY, {}, requestOptions);
  const userId = owner.me?.[0]?.id;
  if (!Number.isInteger(userId) || userId <= 0) throw new Error('Hardcover did not return the account owner');

  const books = [];
  let afterId = 0;
  let expectedCount;
  for (let page = 0; page < 1000; page++) {
    const data = await queryApi(BOOKS_QUERY, { userId, afterId, limit: PAGE_SIZE }, requestOptions);
    const count = data.user_books_aggregate?.aggregate?.count;
    if (!Number.isInteger(count) || count < 0 || !Array.isArray(data.user_books)) {
      throw new Error('Hardcover returned an invalid bookshelf response');
    }
    if (expectedCount === undefined) expectedCount = count;
    if (count !== expectedCount) throw new Error('Hardcover library changed during sync; keeping saved books');
    if (!count) throw new Error('Hardcover has no public read books; keeping the saved bookshelf');
    if (!data.user_books.length) throw new Error('Hardcover returned an incomplete bookshelf');
    for (const entry of data.user_books) {
      if (!Number.isInteger(entry.id) || entry.id <= afterId) {
        throw new Error('Hardcover returned duplicate or unordered library entries');
      }
      afterId = entry.id;
      books.push(parseBook(entry));
    }
    if (books.length === count) {
      if (new Set(books.map(book => book.link)).size !== books.length) {
        throw new Error('Hardcover returned duplicate books');
      }
      return books;
    }
    if (books.length > count) throw new Error('Hardcover returned an inconsistent book count');
  }
  throw new Error('Hardcover bookshelf exceeded the pagination limit');
}

function readSavedBooks(outputPath) {
  try {
    const books = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
    if (Array.isArray(books) && books.length && books.every(book =>
      book && typeof book.title === 'string' && typeof book.link === 'string' &&
      typeof book.author === 'string' && typeof book.coverUrl === 'string' &&
      Number.isFinite(book.rating) && Number.isFinite(book.dateRead)
    )) return books;
  } catch {
    // A successful sync can create or repair the saved bookshelf.
  }
  return [];
}

export async function updateBooks({ outputPath = OUTPUT_PATH, ...options } = {}) {
  let books;
  try {
    console.log('Fetching public read books from Hardcover...');
    books = await fetchBooks(options);
  } catch (error) {
    if (error.permanent) throw error;
    const saved = readSavedBooks(outputPath);
    if (!saved.length) throw error;
    const message = `${error.message}. Hardcover update skipped; retained ${saved.length} saved books.`;
    if (process.env.GITHUB_ACTIONS === 'true') {
      const escaped = message.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
      console.warn(`::warning::${escaped}`);
    } else {
      console.warn(message);
    }
    return;
  }
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const temporaryPath = `${outputPath}.tmp`;
  fs.writeFileSync(temporaryPath, JSON.stringify(books, null, 2));
  fs.renameSync(temporaryPath, outputPath);
  console.log(`Successfully saved ${books.length} Hardcover books to ${outputPath}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  updateBooks().catch(error => {
    console.error('Error updating books:', error.message);
    process.exitCode = 1;
  });
}
