import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { load } from 'cheerio';

const OUTPUT_PATH = fileURLToPath(new URL('../public/books.json', import.meta.url));
const USER_ID = '172764601';

async function request(url, { fetchImpl = fetch, wait = delay } = {}) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetchImpl(url, {
        signal: AbortSignal.timeout(20_000),
        headers: { 'User-Agent': 'ArseniBookshelf/1.0 (+https://arseniivanov.github.io/books.html)' },
      });
      if (!response.ok) throw new Error(`Goodreads returned HTTP ${response.status}`);
      if (response.url && new URL(response.url).pathname.includes('/sign_in')) {
        throw new Error('Goodreads redirected to sign-in');
      }
      return await response.text();
    } catch (error) {
      if (attempt === 3) throw error;
      console.warn(`Goodreads request failed (attempt ${attempt}/3): ${error.message}. Retrying...`);
      await wait(attempt * 2_000);
    }
  }
}

export function parseShelfCount(html, userId) {
  const $ = load(html);
  const shelf = $('a.userShowPageShelfListItem').filter((_, node) => {
    const url = new URL($(node).attr('href'), 'https://www.goodreads.com');
    return url.pathname === `/review/list/${userId}` && url.searchParams.get('shelf') === 'read';
  });
  const count = shelf.text().match(/\(([\d,]+)\)/);
  if (!count) throw new Error('Cannot find the read-shelf count on the Goodreads profile');
  return Number(count[1].replaceAll(',', ''));
}

// Decode only the widget's string literal. Never execute JavaScript from Goodreads.
function widgetHtml(script) {
  const match = script.match(/\bvar\s+widget_code\s*=\s*'((?:\\[\s\S]|[^'\\])*)'\s*(?:;|\r?\n)/);
  if (!match) throw new Error('Goodreads widget markup is missing or truncated');
  const escapes = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', v: '\v', '\\': '\\', "'": "'", '"': '"', '/': '/' };
  return match[1].replace(/\\(u[\da-f]{4}|x[\da-f]{2}|[\s\S])/gi, (_, escape) => {
    if (/^(u[\da-f]{4}|x[\da-f]{2})$/i.test(escape)) {
      return String.fromCharCode(parseInt(escape.slice(1), 16));
    }
    if (!(escape in escapes)) throw new Error('Unrecognized escape in Goodreads widget');
    return escapes[escape];
  });
}

export function parseBooks(script) {
  const $ = load(widgetHtml(script));
  const books = $('[class^="gr_custom_each_container_"]').map((_, node) => {
    const row = $(node);
    const titleLink = row.find('[class^="gr_custom_title_"] a');
    const href = titleLink.attr('href');
    if (!href) throw new Error('Missing Goodreads book link');
    const url = new URL(href, 'https://www.goodreads.com');
    if (url.origin !== 'https://www.goodreads.com' || !/^\/review\/show\/\d+$/.test(url.pathname)) {
      throw new Error('Unexpected Goodreads book link');
    }
    const stars = row.find('[class^="gr_custom_rating_"] img');
    if (stars.length !== 5) throw new Error('Missing Goodreads rating stars');
    const cover = new URL(row.find('[class^="gr_custom_book_container_"] img').attr('src'));
    if (cover.protocol !== 'https:' || !cover.hostname.endsWith('.gr-assets.com')) {
      throw new Error('Unexpected Goodreads cover URL');
    }
    return {
      title: (row.find('[class^="gr_custom_book_container_"] a').attr('title') || titleLink.text()).trim(),
      link: `${url.origin}${url.pathname}`,
      author: row.find('[class^="gr_custom_author_"] a').text().trim(),
      rating: stars.filter((_, img) => /star_active\./.test($(img).attr('src') || '')).length,
      coverUrl: cover.href.replace(/\._S[XY]\d+_/, ''),
      dateRead: 0,
    };
  }).get();
  if (!isUsableBooks(books) || books.some(book => !book.author.trim())) {
    throw new Error('Goodreads widget contains no usable books or has changed format');
  }
  if (new Set(books.map(book => book.link)).size !== books.length) {
    throw new Error('Goodreads widget contains duplicate reviews');
  }
  return books;
}

export async function fetchBooks(userId = USER_ID, options = {}) {
  if (!/^\d+$/.test(userId)) throw new Error('GOODREADS_USER_ID must be numeric');
  const profile = await request(`https://www.goodreads.com/user/show/${userId}`, options);
  const count = parseShelfCount(profile, userId);
  if (!count) throw new Error('Goodreads read shelf is empty; keeping the saved bookshelf');
  const url = new URL(`https://www.goodreads.com/review/custom_widget/${userId}.bookshelf`);
  url.search = new URLSearchParams({
    shelf: 'read', num_books: String(Math.max(100, count)), sort: 'date_read', order: 'd',
    show_title: '1', show_author: '1', show_cover: '1', show_rating: '1',
    show_review: '0', show_tags: '0', cover_size: 'medium', widget_id: '1',
  });
  const books = parseBooks(await request(url.href, options));
  // Detect widget limits, partial responses, and markup changes before replacing any data.
  if (books.length !== count) {
    throw new Error(`Goodreads profile lists ${count} read books but the widget returned ${books.length}`);
  }
  return books;
}

function isUsableBooks(books) {
  return Array.isArray(books) && books.length > 0 && books.every(book =>
    book && typeof book.title === 'string' && book.title.trim() &&
    typeof book.link === 'string' && /^https:\/\/www\.goodreads\.com\/review\/show\/\d+(?:\?|$)/.test(book.link) &&
    typeof book.author === 'string' && typeof book.coverUrl === 'string' &&
    Number.isInteger(book.rating) && book.rating >= 0 && book.rating <= 5 &&
    Number.isFinite(book.dateRead)
  );
}

export function preserveDates(books, savedBooks, now = Date.now()) {
  const reviewId = book => book.link.match(/\/review\/show\/(\d+)/)[1];
  const saved = new Map(savedBooks.map(book => [reviewId(book), book]));
  return books.map(book => {
    const previous = saved.get(reviewId(book));
    // The public widget has no dates. Preserve RSS history without inventing read dates.
    return {
      ...book,
      dateRead: previous?.dateRead || 0,
      ...(!previous?.dateRead ? { dateAdded: previous?.dateAdded || now } : {}),
    };
  });
}

export async function updateBooks({
  userId = process.env.GOODREADS_USER_ID || USER_ID,
  outputPath = OUTPUT_PATH,
  ...fetchOptions
} = {}) {
  let savedBooks = [];
  try {
    const saved = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
    if (isUsableBooks(saved)) savedBooks = saved;
  } catch {
    // A successful scrape can create or repair the saved bookshelf.
  }
  let books;
  try {
    console.log('Scraping public Goodreads bookshelf...');
    books = preserveDates(await fetchBooks(userId, fetchOptions), savedBooks);
  } catch (error) {
    if (!savedBooks.length) throw error;
    const message = `${error.message}. Goodreads update skipped; retained ${savedBooks.length} saved books.`;
    if (process.env.GITHUB_ACTIONS === 'true') {
      const escaped = message.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
      console.warn(`::warning::${escaped}`);
    } else {
      console.warn(message);
    }
    return;
  }
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  // Replace only after a complete scrape has been validated.
  const temporaryPath = `${outputPath}.tmp`;
  fs.writeFileSync(temporaryPath, JSON.stringify(books, null, 2));
  fs.renameSync(temporaryPath, outputPath);
  console.log(`Successfully saved ${books.length} books to ${outputPath}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  updateBooks().catch(error => {
    console.error('Error updating books:', error);
    process.exitCode = 1;
  });
}
