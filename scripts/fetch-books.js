const fs = require('fs');
const path = require('path');

// Configuration
// We use the direct Goodreads URL (Node.js doesn't have CORS issues, so no proxy needed!)
const RSS_URL = 'https://www.goodreads.com/review/list_rss/172764601?key=wExbcxeflLcFhgeItq3NpzBKLCUwXbdbKCyN5-_rh__Nmn2g&shelf=read&per_page=100';

async function main() {
  try {
    console.log("Fetching Goodreads RSS...");
    const response = await fetch(RSS_URL);
    const xmlText = await response.text();

    // Simple Regex Parsing (since Node.js doesn't have DOMParser built-in)
    // 1. Split into items
    const items = xmlText.split('<item>').slice(1);
    
    const books = items.map(item => {
      // Helper to extract text between tags
      const extract = (tag) => {
        const match = item.match(new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, 's'));
        return match ? match[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() : '';
      };

      const title = extract('title');
      const link = extract('link');
      const author = extract('author_name');
      const description = extract('description');
      const rawDate = extract('user_read_at') || extract('pubDate');

      // Extract Cover Image (High Res Fix)
      const imgMatch = description.match(/src="([^"]+)"/);
      let coverUrl = imgMatch ? imgMatch[1] : 'https://via.placeholder.com/150x200?text=No+Cover';
      coverUrl = coverUrl.replace(/\._S[XY]\d+_/, ''); 

      // Extract Rating (Your specific rating, not average)
      // Matches "rating: 5" specifically
      const ratingMatch = description.match(/rating:\s*(\d)/);
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

    // Save to the root of the project as books.json
    const outputPath = path.join(__dirname, '../books.json');
    fs.writeFileSync(outputPath, JSON.stringify(books, null, 2));
    
    console.log("Successfully saved books.json");

  } catch (error) {
    console.error("Error updating books:", error);
    process.exit(1);
  }
}

main();
