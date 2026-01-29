document.addEventListener('DOMContentLoaded', () => {
  fetch('games.json')
    .then(response => response.json())
    .then(data => {
      initLibrary(data);
    })
    .catch(error => {
      console.error('Error loading games:', error);
      document.getElementById('games-container').innerHTML = 
        '<p>Error loading library. Ensure games.json is present.</p>';
    });
});

let fullLibrary = {};
let currentSort = 'rating'; // recent, rating, released

function initLibrary(data) {
  fullLibrary = data;
  renderLibrary();
  updateStats();
  setupSorting();
}

function getSortedGames(gamesList) {
  return [...gamesList].sort((a, b) => {
    if (currentSort === 'rating') {
      // Sort by user rating first, then global rating
      const ratingA = a.user_rating || 0;
      const ratingB = b.user_rating || 0;
      return ratingB - ratingA;
    } else if (currentSort === 'released') {
      return new Date(b.released) - new Date(a.released);
    } else {
      // Default / Recent (assuming the JSON list order from API is roughly "updated")
      // Since our python script fetched with ordering=-updated, the array index is the sort
      return 0; 
    }
  });
}

function renderLibrary() {
  const container = document.getElementById('games-container');
  container.innerHTML = '';

  // Define section order
  const sections = [
    //{ key: 'playing', title: 'Currently Playing', icon: '🎮' },
    { key: 'completed', title: 'Played', icon: '🏆' },
    //{ key: 'backlog', title: 'Backlog / To Play', icon: '⏳' },
    //{ key: 'dropped', title: 'Dropped', icon: '🛑' }
  ];

  sections.forEach(section => {
    const games = fullLibrary[section.key];
    if (games && games.length > 0) {
      // Create Section Header
      const header = document.createElement('h2');
      header.className = 'section-title';
      header.innerHTML = `${section.icon} ${section.title} <span style="font-size:0.6em; opacity:0.6">(${games.length})</span>`;
      container.appendChild(header);

      // Create Grid
      const grid = document.createElement('div');
      grid.className = 'books-grid'; // Reusing the grid class from books

      const sortedGames = getSortedGames(games);

      sortedGames.forEach(game => {
        grid.appendChild(createGameCard(game));
      });

      container.appendChild(grid);
    }
  });
}

function createGameCard(game) {
  const card = document.createElement('div');
  card.className = 'game-card';

  // Fallback image if RAWG doesn't provide one
  const bgImage = game.image || 'https://via.placeholder.com/640x360?text=No+Cover';

  // Stars generation
  let starsHtml = '';
  if (game.user_rating > 0) {
    const filledStars = Math.floor(game.user_rating);
    for (let i = 0; i < 5; i++) {
      starsHtml += i < filledStars 
        ? '<span class="star-filled">★</span>' 
        : '<span class="star-empty">★</span>';
    }
  } else {
    // If no user rating, maybe show release year
    const year = game.released ? game.released.split('-')[0] : '';
    starsHtml = `<span style="font-size: 0.85rem; color: var(--text-color-light)">${year}</span>`;
  }

  card.innerHTML = `
    <div class="game-cover-container">
      <img src="${bgImage}" alt="${game.title}" class="game-cover" loading="lazy">
    </div>
    <div class="game-info">
      <div class="game-meta">
        ${game.genres ? `<span>${game.genres.join(', ')}</span>` : '<span>Game</span>'}
      </div>
      <h3 class="book-title">${game.title}</h3>
      <div class="book-rating">${starsHtml}</div>
    </div>
  `;
  
  // Make the whole card clickable to the rawg page (optional, requires slug)
  if (game.slug) {
    const link = document.createElement('a');
    link.href = `https://rawg.io/games/${game.slug}`;
    link.target = "_blank";
    link.className = "book-title-link"; 
    link.style.textDecoration = "none";
    link.style.height = "100%";
    
    // Move innerHTML to link
    link.innerHTML = card.innerHTML;
    card.innerHTML = '';
    card.appendChild(link);
  }

  return card;
}

function updateStats() {
  const statsContainer = document.getElementById('game-stats');
  const countPlaying = fullLibrary.playing ? fullLibrary.playing.length : 0;
  const countBeaten = fullLibrary.completed ? fullLibrary.completed.length : 0;
  const countBacklog = fullLibrary.backlog ? fullLibrary.backlog.length : 0;
  const countDropped = fullLibrary.dropped ? fullLibrary.dropped.length : 0;
  const total = countPlaying + countBeaten + countBacklog + countDropped;

  statsContainer.innerHTML = `
    <ul style="list-style: none; padding: 0;">
      <li style="margin-bottom: 0.5rem"><strong>Played:</strong> ${countBeaten}</li>
      <li style="margin-bottom: 0.5rem"><strong>Dropped:</strong> ${countDropped}</li>
      <li style="margin-top: 1rem; border-top: 1px solid var(--border-color); padding-top: 0.5rem"><strong>Total Tracked:</strong> ${total}</li>
    </ul>
  `;
}

function setupSorting() {
  const buttons = document.querySelectorAll('.sort-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      // Remove active class from all
      buttons.forEach(b => b.classList.remove('active'));
      // Add to clicked
      e.target.classList.add('active');
      
      // Update sort state
      if (e.target.id === 'sort-rating') currentSort = 'rating';
      else if (e.target.id === 'sort-released') currentSort = 'released';
      else currentSort = 'recent';

      renderLibrary();
    });
  });
}
