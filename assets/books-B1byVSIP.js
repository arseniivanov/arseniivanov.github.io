import"./modulepreload-polyfill-B5Qt9EMX.js";/* empty css                    */const g="books.json",r=document.getElementById("books-grid"),h=document.getElementById("book-stats"),s=document.getElementById("sort-rating"),o=document.getElementById("sort-date");let n=[];async function v(){try{const e=await fetch(g);if(!e.ok)throw new Error("Failed to load books.json");n=await e.json(),n.length>0?(m(n),l("rating")):r.innerHTML="<p>No books found.</p>"}catch(e){console.error("Error fetching books:",e),r.innerHTML=`
      <div style="text-align:center; padding: 2rem;">
        <p>Could not load library.</p>
        <small>If this is the first time you are running this, please wait for the GitHub Action to finish generating the data.</small>
      </div>`}}function l(e){e==="rating"?(s.classList.add("active"),o.classList.remove("active"),n.sort((t,a)=>a.rating-t.rating)):(s.classList.remove("active"),o.classList.add("active"),n.sort((t,a)=>a.dateRead-t.dateRead)),f(n)}function f(e){r.innerHTML="",e.forEach(t=>{const a=document.createElement("div");a.className="book-card";const i='<span class="star-filled">★</span>'.repeat(t.rating)+'<span class="star-empty">☆</span>'.repeat(5-t.rating);a.innerHTML=`
      <div class="book-cover-container">
        <a href="${t.link}" target="_blank">
          <img src="${t.coverUrl}" alt="${t.title}" class="book-cover" loading="lazy">
        </a>
      </div>
      <div class="book-info">
        <div class="book-rating" title="${t.rating}/5">${i}</div>
        <a href="${t.link}" target="_blank" class="book-title-link">
            <h3 class="book-title">${t.title}</h3>
        </a>
        <div class="book-author">by ${t.author}</div>
        <a href="${t.link}" target="_blank" class="read-more-link">View on Goodreads</a>
      </div>
    `,r.appendChild(a)})}function m(e){const t=e.length;let a=0,i=0;e.forEach(c=>{c.rating>0&&(a+=c.rating,i++)});const d=i>0?(a/i).toFixed(2):0;h.innerHTML=`
    <p><strong>Total Read:</strong> ${t}</p>
    <p><strong>Avg Rating:</strong> ${d} / 5</p>
  `}s.addEventListener("click",()=>l("rating"));o.addEventListener("click",()=>l("date"));v();
