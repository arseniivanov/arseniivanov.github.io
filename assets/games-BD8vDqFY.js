import"./modulepreload-polyfill-B5Qt9EMX.js";/* empty css                    */document.addEventListener("DOMContentLoaded",()=>{fetch("games.json").then(e=>e.json()).then(e=>{d(e)}).catch(e=>{console.error("Error loading games:",e),document.getElementById("games-container").innerHTML="<p>Error loading library. Ensure games.json is present.</p>"})});let a={},i="rating";function d(e){a=e,l(),p(),u()}function g(e){return[...e].sort((r,n)=>{if(i==="rating"){const s=r.user_rating||0;return(n.user_rating||0)-s}else return i==="released"?new Date(n.released)-new Date(r.released):0})}function l(){const e=document.getElementById("games-container");e.innerHTML="",[{key:"completed",title:"Played",icon:"🏆"}].forEach(n=>{const s=a[n.key];if(s&&s.length>0){const t=document.createElement("h2");t.className="section-title",t.innerHTML=`${n.icon} ${n.title} <span style="font-size:0.6em; opacity:0.6">(${s.length})</span>`,e.appendChild(t);const o=document.createElement("div");o.className="books-grid",g(s).forEach(c=>{o.appendChild(m(c))}),e.appendChild(o)}})}function m(e){const r=document.createElement("div");r.className="game-card";const n=e.image||"https://via.placeholder.com/640x360?text=No+Cover";let s="";if(e.user_rating>0){const t=Math.floor(e.user_rating);for(let o=0;o<5;o++)s+=o<t?'<span class="star-filled">★</span>':'<span class="star-empty">★</span>'}else s=`<span style="font-size: 0.85rem; color: var(--text-color-light)">${e.released?e.released.split("-")[0]:""}</span>`;if(r.innerHTML=`
    <div class="game-cover-container">
      <img src="${n}" alt="${e.title}" class="game-cover" loading="lazy">
    </div>
    <div class="game-info">
      <div class="game-meta">
        ${e.genres?`<span>${e.genres.join(", ")}</span>`:"<span>Game</span>"}
      </div>
      <h3 class="book-title">${e.title}</h3>
      <div class="book-rating">${s}</div>
    </div>
  `,e.slug){const t=document.createElement("a");t.href=`https://rawg.io/games/${e.slug}`,t.target="_blank",t.className="book-title-link",t.style.textDecoration="none",t.style.height="100%",t.innerHTML=r.innerHTML,r.innerHTML="",r.appendChild(t)}return r}function p(){const e=document.getElementById("game-stats"),r=a.playing?a.playing.length:0,n=a.completed?a.completed.length:0,s=a.backlog?a.backlog.length:0,t=a.dropped?a.dropped.length:0,o=r+n+s+t;e.innerHTML=`
    <ul style="list-style: none; padding: 0;">
      <li style="margin-bottom: 0.5rem"><strong>Played:</strong> ${n}</li>
      <li style="margin-bottom: 0.5rem"><strong>Dropped:</strong> ${t}</li>
      <li style="margin-top: 1rem; border-top: 1px solid var(--border-color); padding-top: 0.5rem"><strong>Total Tracked:</strong> ${o}</li>
    </ul>
  `}function u(){const e=document.querySelectorAll(".sort-btn");e.forEach(r=>{r.addEventListener("click",n=>{e.forEach(s=>s.classList.remove("active")),n.target.classList.add("active"),n.target.id==="sort-rating"?i="rating":n.target.id==="sort-released"?i="released":i="recent",l()})})}
