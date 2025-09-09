import { marked, Marked } from 'marked';
import markedFootnote from 'marked-footnote'

const obsidianImageExtension = {
  name: 'obsidianImage',
  level: 'inline', // This is an inline-level rule
  start(src) { return src.indexOf('![['); }, // Fast way to check if rule applies
  tokenizer(src, tokens) {
    const rule = /^!\[\[([^\]]+)\]\]/; // Regex to find ![[filename.png]]
    const match = rule.exec(src);
    if (match) {
      const token = {
        type: 'obsidianImage',
        raw: match[0],
        text: match[1].trim(), // The filename inside the brackets
      };
      return token;
    }
  },
  renderer(token) {
    // Assumes all such images are in your assets folder
    // Uses the filename as alt text as a fallback
    return `<img src="/blog/assets/${token.text}" alt="${token.text}">`;
  }
};

const myMarked = new Marked();

// 3. APPLY your extensions to the new instance
myMarked.use(
  { extensions: [obsidianImageExtension] },
  markedFootnote() // Options are optional, can add them back later if you wish
);

// --- Theme Toggler Logic (Add this new section) ---
const themeToggle = document.getElementById('theme-toggle');
const docElement = document.documentElement;

// Function to apply the theme
const applyTheme = (theme) => {
  docElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
};

// Check for saved theme in localStorage or user's system preference
const savedTheme = localStorage.getItem('theme');
const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');

// Apply the initial theme on load
applyTheme(initialTheme);

// Event listener for the toggle button
themeToggle.addEventListener('click', () => {
  const currentTheme = docElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  applyTheme(newTheme);
});
// --- End of new theme logic section ---


// DOM Elements
const archiveContainer = document.getElementById('archive-links');
const contentContainer = document.querySelector('.blog-content');

// (The rest of your blog.js file remains the same)
// ...
let allPosts = [];

// --- Main function to initialize the blog ---
async function initBlog() {
  try {
    // 1. Fetch the list of all posts
    const response = await fetch('/blog/posts.json');
    if (!response.ok) throw new Error('Network response was not ok.');
    allPosts = await response.json();

    // 2. Sort posts by filename (date) descending
    allPosts.sort((a, b) => b.file.localeCompare(a.file));

    // 3. Generate the sidebar archive
    generateArchive(allPosts);
    
    // 4. Load the most recent post by default
    if (allPosts.length > 0) {
      loadPost(allPosts[0].file);
      // Mark the first link as active
      document.querySelector('#archive-links a').classList.add('active');
    }

  } catch (error) {
    console.error('Failed to initialize blog:', error);
    contentContainer.innerHTML = `<p>Error: Could not load blog posts. Please check the console for details.</p>`;
  }
}

// --- Generates the archive links in the sidebar ---
function generateArchive(posts) {
  const archive = posts.reduce((acc, post) => {
    const year = post.file.substring(0, 4);
    if (!acc[year]) {
      acc[year] = [];
    }
    acc[year].push(post);
    return acc;
  }, {});

  let archiveHTML = '';
  // Sort years in descending order
  const sortedYears = Object.keys(archive).sort((a, b) => b - a);

  for (const year of sortedYears) {
    archiveHTML += `<div class="year-section"><h3>${year}</h3>`;
    archive[year].forEach(post => {
      archiveHTML += `<a href="#" data-post-file="${post.file}">${post.title}</a>`;
    });
    archiveHTML += `</div>`;
  }
  archiveContainer.innerHTML = archiveHTML;

  // Add event listeners to the new links
  addArchiveLinkListeners();
}

// --- Adds click event listeners to all archive links ---
function addArchiveLinkListeners() {
  const links = document.querySelectorAll('#archive-links a');
  links.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();

      // Remove active class from all links
      links.forEach(l => l.classList.remove('active'));
      // Add active class to the clicked link
      e.target.classList.add('active');

      const postFile = e.target.getAttribute('data-post-file');
      loadPost(postFile);
    });
  });
}

// --- Fetches and renders a single post ---
async function loadPost(postFile) {
  try {
    contentContainer.innerHTML = `<p>Loading...</p>`;
    const response = await fetch(`/blog/posts/${postFile}`);
    if (!response.ok) throw new Error(`Could not fetch ${postFile}`);
    const markdown = await response.text();
    
    // Convert markdown to HTML and display it
    contentContainer.innerHTML = myMarked.parse(markdown);

  } catch (error) {
    console.error('Error loading post:', error);
    contentContainer.innerHTML = `<p>Sorry, could not load the selected post.</p>`;
  }
}

// --- Start the application ---
initBlog();
