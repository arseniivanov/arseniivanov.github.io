import"./modulepreload-polyfill-B5Qt9EMX.js";/* empty css                    */const g="books.json",i=document.getElementById("books-grid"),p=document.getElementById("book-stats"),r=document.getElementById("sort-rating"),o=document.getElementById("sort-date");let n=[];async function v(){try{const e=await fetch(g);if(!e.ok)throw new Error("Failed to load books.json");n=await e.json(),n.length>0?(h(n),l("rating")):i.innerHTML="<p>No books found.</p>"}catch(e){console.error("Error fetching books:",e),i.innerHTML=`
      <div style="text-align:center; padding: 2rem;">
        <p>Could not load library.</p>
        <small>If this is the first time you are running this, please wait for the GitHub Action to finish generating the data.</small>
      </div>`}}function l(e){e==="rating"?(r.classList.add("active"),o.classList.remove("active"),n.sort((t,a)=>a.rating-t.rating)):(r.classList.remove("active"),o.classList.add("active"),n.sort((t,a)=>a.dateRead-t.dateRead)),f(n)}function f(e){i.innerHTML="",e.forEach(t=>{const a=document.createElement("div");a.className="book-card";const s=t.rating>0?'<span class="star-filled">★</span>'.repeat(t.rating)+'<span class="star-empty">☆</span>'.repeat(5-t.rating):'<span class="star-empty" style="font-size:0.8em; color:#ccc">Not rated</span>';a.innerHTML=`
      <div class="book-cover-container">
        <a href="${t.link}" target="_blank" class="cover-link" aria-label="View ${t.title} on Goodreads">
          <img src="${t.coverUrl}" alt="${t.title}" class="book-cover" loading="lazy">
        </a>
      </div>
      <div class="book-info">
        <div class="book-rating" title="${t.rating}/5">${s}</div>
        <a href="${t.link}" target="_blank" class="book-title-link">
            <h3 class="book-title">${t.title}</h3>
        </a>
        <div class="book-author">by ${t.author}</div>
      </div>
    `,i.appendChild(a)})}function h(e){const t=e.length;let a=0,s=0;e.forEach(c=>{c.rating>0&&(a+=c.rating,s++)});const d=s>0?(a/s).toFixed(2):0;p.innerHTML=`
    <p><strong>Total Read:</strong> ${t}</p>
    <p><strong>Avg Rating:</strong> ${d} / 5</p>
  `}r.addEventListener("click",()=>l("rating"));o.addEventListener("click",()=>l("date"));v();
