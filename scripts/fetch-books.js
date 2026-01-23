import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const RSS_URL = 'https://www.goodreads.com/review/list_rss/172764601?key=wExbcxeflLcFhgeItq3NpzBKLCUwXbdbKCyN5-_rh__Nmn2g&shelf=read&per_page=100';

async function main() {
  try {
    console.log("Fetching Goodreads RSS...");
    const response = await fetch(RSS_URL);
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    
    const xmlText = await response.text();
    const items = xmlText.split('<item>').slice(1);
    
    const books = items.map(item => {
      const extract = (tag) => {
        const match = item.match(new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, 's'));
        return match ? match[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() : '';
      };

      const title = extract('title');
      const link = extract('link');
      const author = extract('author_name');
      const description = extract('description');
      const rawDate = extract('user_read_at') || extract('pubDate');

      // Image Fix
      const imgMatch = description.match(/src="([^"]+)"/);
      let coverUrl = imgMatch ? imgMatch[1] : 'https://via.placeholder.com/150x200?text=No+Cover';
      coverUrl = coverUrl.replace(/\._S[XY]\d+_/, ''); 

      const ratingMatch = description.match(/<br\s*\/?>\s*rating:\s*(\d)/);
      const rating = ratingMatch ? parseInt(ratingMatch[1]) : 0;

      return {
        title,
        link,
        author,
        rating,
        coverUrl,
        dateRead: rawDate ? new Date(rawDate).getTime() : 0
      };
    });

    console.log(`Found ${books.length} books.`);

    const publicDir = path.join(__dirname, '../public');
    
    // 2. Create it if it doesn't exist
    if (!fs.existsSync(publicDir)){
        fs.mkdirSync(publicDir);
    }

    // 3. Save the file there
    const outputPath = path.join(publicDir, 'books.json');
    fs.writeFileSync(outputPath, JSON.stringify(books, null, 2));
    
    console.log(`Successfully saved to ${outputPath}`);

  } catch (error) {
    console.error("Error updating books:", error);
    process.exit(1);
  }
}

main();
