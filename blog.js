import { marked, Marked } from 'marked';
import markedFootnote from 'marked-footnote';

const obsidianImageExtension = {
  name: 'obsidianImage',
  level: 'inline',
  start(src) { return src.indexOf('![['); },
  tokenizer(src, tokens) {
    const rule = /^!\[\[([^\]]+)\]\]/;
    const match = rule.exec(src);
    if (match) {
      return {
        type: 'obsidianImage',
        raw: match[0],
        text: match[1].trim(),
      };
    }
  },
  renderer(token) {
    return `<img src="/blog/assets/${token.text}" alt="${token.text}">`;
  }
};

const myMarked = new Marked();
myMarked.use({ extensions: [obsidianImageExtension] }, markedFootnote());

const themeToggle = document.getElementById('theme-toggle');
const docElement = document.documentElement;

const applyTheme = (theme) => {
  docElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
};

const savedTheme = localStorage.getItem('theme');
const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
applyTheme(initialTheme);

themeToggle.addEventListener('click', () => {
  const newTheme = docElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
  applyTheme(newTheme);
});

const archiveContainer = document.getElementById('archive-links');
const contentContainer = document.querySelector('.blog-content');
const tagsContainer = document.getElementById('tags-container');

let allPosts = [];

async function initBlog() {
  try {
    const response = await fetch('/blog/posts.json');
    if (!response.ok) throw new Error('Network response was not ok.');
    allPosts = await response.json();
    allPosts.sort((a, b) => new Date(b.date) - new Date(a.date));

    generateArchive(allPosts);
    generateTags(allPosts);
    
    handleRouting(); // Handle initial page load
    window.addEventListener('hashchange', handleRouting); // Handle back/forward navigation

  } catch (error) {
    console.error('Failed to initialize blog:', error);
    contentContainer.innerHTML = `<p>Error: Could not load blog posts.</p>`;
  }
}

function generateArchive(posts) {
  const archive = posts.reduce((acc, post) => {
    const postDate = new Date(post.date);
    const year = postDate.getFullYear();
    const month = postDate.toLocaleString('default', { month: 'long' });
    const yearMonth = `${month} ${year}`;
    
    if (!acc[yearMonth]) {
      acc[yearMonth] = [];
    }
    acc[yearMonth].push(post);
    return acc;
  }, {});

  let archiveHTML = '';
  const sortedMonths = Object.keys(archive).sort((a, b) => new Date(b) - new Date(a));

  for (const month of sortedMonths) {
    archiveHTML += `<div class="month-section"><h3>${month}</h3>`;
    archive[month].forEach(post => {
      archiveHTML += `<a href="#${post.id}" data-post-file="${post.file}" data-post-id="${post.id}">${post.title}</a>`;
    });
    archiveHTML += `</div>`;
  }
  archiveContainer.innerHTML = archiveHTML;
  addArchiveLinkListeners();
}

function generateTags(posts) {
  const allTags = new Set();
  posts.forEach(post => post.tags.forEach(tag => allTags.add(tag)));

  let tagsHTML = '<a href="#" class="tag" data-tag="all">All Posts</a>';
  Array.from(allTags).sort().forEach(tag => {
    tagsHTML += `<a href="#" class="tag" data-tag="${tag}">${tag}</a>`;
  });
  tagsContainer.innerHTML = tagsHTML;
  addTagLinkListeners();
}

function addArchiveLinkListeners() {
  document.querySelectorAll('#archive-links a').forEach(link => {
    link.addEventListener('click', (e) => {
      window.location.hash = e.target.getAttribute('data-post-id');
    });
  });
}

function addTagLinkListeners() {
  document.querySelectorAll('#tags-container a').forEach(tagLink => {
    tagLink.addEventListener('click', (e) => {
      e.preventDefault();
      const selectedTag = e.target.getAttribute('data-tag');
      
      document.querySelectorAll('#tags-container a.active').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');

      if (selectedTag === 'all') {
        generateArchive(allPosts);
      } else {
        const filteredPosts = allPosts.filter(post => post.tags.includes(selectedTag));
        generateArchive(filteredPosts);
      }
    });
  });
  // Activate "All Posts" tag by default
  document.querySelector('#tags-container a[data-tag="all"]').classList.add('active');
}

async function loadPost(postFile) {
  try {
    contentContainer.innerHTML = `<p>Loading...</p>`;
    const response = await fetch(`/blog/posts/${postFile}`);
    if (!response.ok) throw new Error(`Could not fetch ${postFile}`);
    const markdown = await response.text();
    contentContainer.innerHTML = myMarked.parse(markdown);
  } catch (error) {
    console.error('Error loading post:', error);
    contentContainer.innerHTML = `<p>Sorry, could not load the selected post.</p>`;
  }
}

function handleRouting() {
  const postId = window.location.hash.substring(1);
  let postToLoad = allPosts[0]; // Default to the latest post

  if (postId) {
    const foundPost = allPosts.find(p => p.id === postId);
    if (foundPost) {
      postToLoad = foundPost;
    }
  }

  if (postToLoad) {
    loadPost(postToLoad.file);
    // Update active link in the sidebar
    document.querySelectorAll('#archive-links a').forEach(l => l.classList.remove('active'));
    const activeLink = document.querySelector(`#archive-links a[data-post-id="${postToLoad.id}"]`);
    if (activeLink) {
      activeLink.classList.add('active');
    }
  }
}

initBlog();
