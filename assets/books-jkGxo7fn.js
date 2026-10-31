import"./modulepreload-polyfill-B5Qt9EMX.js";/* empty css                    */function s(e){return String(e).replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t])}function f(e){return e>0?Array.from({length:5},(t,n)=>`<span class="rating-star" aria-hidden="true"><span class="star-empty">☆</span><span class="star-filled" style="width:${Math.max(0,Math.min(100,(e-n)*100))}%">★</span></span>`).join(""):'<span class="star-empty" style="font-size:0.8em; color:#ccc">Not rated</span>'}const p="books.json",o=document.getElementById("books-grid"),h=document.getElementById("book-stats"),l=document.getElementById("sort-rating"),c=document.getElementById("sort-date");let r=[];async function m(){try{const e=await fetch(p);if(!e.ok)throw new Error("Failed to load books.json");r=await e.json(),r.length>0?(v(r),d("rating")):o.innerHTML="<p>No books found.</p>"}catch(e){console.error("Error fetching books:",e),o.innerHTML=`
      <div style="text-align:center; padding: 2rem;">
        <p>Could not load library.</p>
        <small>If this is the first time you are running this, please wait for the GitHub Action to finish generating the data.</small>
      </div>`}}function d(e){e==="rating"?(l.classList.add("active"),c.classList.remove("active"),r.sort((t,n)=>n.rating-t.rating)):(l.classList.remove("active"),c.classList.add("active"),r.sort((t,n)=>(n.dateRead||n.dateAdded||0)-(t.dateRead||t.dateAdded||0))),u(r)}function u(e){o.innerHTML="",e.forEach(t=>{const n=document.createElement("div");n.className="book-card";const a=s(t.title),i=s(t.link);n.innerHTML=`
      <div class="book-cover-container">
        <a href="${i}" target="_blank" rel="noopener noreferrer" class="cover-link" aria-label="View ${a}">
          <img src="${s(t.coverUrl)}" alt="${a}" class="book-cover" loading="lazy">
        </a>
      </div>
      <div class="book-info">
        <div class="book-rating" title="${t.rating}/5" aria-label="${t.rating?`${t.rating} out of 5 stars`:"Not rated"}">${f(t.rating)}</div>
        <a href="${i}" target="_blank" rel="noopener noreferrer" class="book-title-link">
            <h3 class="book-title">${a}</h3>
        </a>
        <div class="book-author">by ${s(t.author)}</div>
      </div>
    `,o.appendChild(n)})}function v(e){const t=e.length;let n=0,a=0;e.forEach(g=>{g.rating>0&&(n+=g.rating,a++)});const i=a>0?(n/a).toFixed(2):0;h.innerHTML=`
    <p><strong>Total Read:</strong> ${t}</p>
    <p><strong>Avg Rating:</strong> ${i} / 5</p>
  `}l.addEventListener("click",()=>d("rating"));c.addEventListener("click",()=>d("date"));m();
