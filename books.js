const DATA_SOURCE = './books.json';

const container = document.getElementById('books-grid');
const statsContainer = document.getElementById('book-stats');
const btnRating = document.getElementById('sort-rating');
const btnDate = document.getElementById('sort-date');

let libraryData = [];

async function fetchBooks() {
  try {
    const response = await fetch(DATA_SOURCE);
    if (!response.ok) throw new Error('Failed to load books.json');
    
    libraryData = await response.json();

    if (libraryData.length > 0) {
      renderStats(libraryData);
      handleSort('rating'); // Default sort
    } else {
      container.innerHTML = '<p>No books found.</p>';
    }
  } catch (error) {
    console.error('Error fetching books:', error);
    container.innerHTML = `
      <div style="text-align:center; padding: 2rem;">
        <p>Could not load library.</p>
        <small>If this is the first time you are running this, please wait for the GitHub Action to finish generating the data.</small>
      </div>`;
  }
}

// Sorting Logic
function handleSort(criteria) {
  if (criteria === 'rating') {
    btnRating.classList.add('active');
    btnDate.classList.remove('active');
    libraryData.sort((a, b) => b.rating - a.rating);
  } else {
    btnRating.classList.remove('active');
    btnDate.classList.add('active');
    libraryData.sort((a, b) => b.dateRead - a.dateRead);
  }
  renderBooks(libraryData);
}

function renderBooks(books) {
  container.innerHTML = ''; 

  books.forEach(book => {
    const card = document.createElement('div');
    card.className = 'book-card';
    
    const ratingStars = '<span class="star-filled">★</span>'.repeat(book.rating) + 
                        '<span class="star-empty">☆</span>'.repeat(5 - book.rating);

    card.innerHTML = `
      <div class="book-cover-container">
        <a href="${book.link}" target="_blank">
          <img src="${book.coverUrl}" alt="${book.title}" class="book-cover" loading="lazy">
        </a>
      </div>
      <div class="book-info">
        <div class="book-rating" title="${book.rating}/5">${ratingStars}</div>
        <a href="${book.link}" target="_blank" class="book-title-link">
            <h3 class="book-title">${book.title}</h3>
        </a>
        <div class="book-author">by ${book.author}</div>
        <a href="${book.link}" target="_blank" class="read-more-link">View on Goodreads</a>
      </div>
    `;

    container.appendChild(card);
  });
}

function renderStats(books) {
  const count = books.length;
  let totalRating = 0;
  let ratedCount = 0;
  
  books.forEach(book => {
    if(book.rating > 0) {
      totalRating += book.rating;
      ratedCount++;
    }
  });

  const avg = ratedCount > 0 ? (totalRating / ratedCount).toFixed(2) : 0;

  statsContainer.innerHTML = `
    <p><strong>Total Read:</strong> ${count}</p>
    <p><strong>Avg Rating:</strong> ${avg} / 5</p>
  `;
}

// Event Listeners
btnRating.addEventListener('click', () => handleSort('rating'));
btnDate.addEventListener('click', () => handleSort('date'));

fetchBooks();
