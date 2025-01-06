import './blog-styles.css';

import {Color, MathUtils, Vector2} from "three";
import Delaunator from "https://cdn.skypack.dev/delaunator@5.0.0";

// Canvas setup and animation
const cnv = document.getElementById('cnv');
const ctx = cnv.getContext("2d");
let timeStart = performance.now();

console.clear();

let c1 = new Color(0x000000);
let c2 = new Color(0x2e2a2a);
let c = new Color();

let ptsBase = [];
let ptsActual = [];
let step = 140;

function refill(){
  cnv.width = innerWidth;
  cnv.height = innerHeight;
  
  ptsBase = [];
  ptsActual = [];
  
  for(let y = -step; y < cnv.height + step * 2; y += step){
    for(let x = -step; x < cnv.width + step * 2; x += step){
      let v = new Vector2(x, y + step * 0.5);
      v.move = {
        r: Math.random() * 1 + 40,
        phase: Math.random() * Math.PI * 2,
        speedRatioX: (Math.random() * 2.0 + 0.5) * (Math.random() < 0.5 ? -1 : 1),
        speedRatioY: (Math.random() * 0.5 + 0.5) * (Math.random() < 0.5 ? -1 : 1),
        pRmin: 2,
        pRdif: 5
      }
      v.colorOffset = Math.random() * 0.2 - 0.1;
      ptsBase.push(v);
    }
  }

  ptsActual = new Array(ptsBase.length).fill().map(p => {return [0, 0]});
}

// Initialize canvas
refill();

// Event listeners
window.addEventListener("resize", refill);

// Blog posts data
const blogPosts = {
    '2025-01': [
        {
            title: 'January Post 1',
            date: 'January 15, 2025',
            content: 'Content for January post 1...'
        }
    ],
    '2025-02': [
        {
            title: 'February Post 1',
            date: 'February 1, 2025',
            content: 'Content for February post 1...'
        }
    ]
};

// Blog post click handler
document.querySelectorAll('.dropdown-content a').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const month = link.getAttribute('data-month');
        const posts = blogPosts[month];
        const blogContent = document.querySelector('.blog-content');
        
        // Clear current content
        blogContent.innerHTML = '';
        
        if (posts && posts.length > 0) {
            // Display posts for the selected month
            posts.forEach(post => {
                const postElement = document.createElement('div');
                postElement.className = 'blog-post';
                postElement.innerHTML = `
                    <h2>${post.title}</h2>
                    <div class="date">${post.date}</div>
                    <div class="content">${post.content}</div>
                `;
                blogContent.appendChild(postElement);
            });
        } else {
            // Show a message if no posts exist for this month
            blogContent.innerHTML = `
                <div class="blog-post">
                    <p>No posts available for this month.</p>
                </div>
            `;
        }
    });
});

// Animation function
function draw(){
    let t = (performance.now() - timeStart) * 0.001;
    t *= 0.25;
    
    ptsActual.forEach((p, idx) => {
        let pbase = ptsBase[idx];
        p[0] = pbase.x + Math.cos(pbase.move.phase + t * pbase.move.speedRatioX) * pbase.move.r;
        let yShift = (cnv.height + step * 2) + ((pbase.y - (t * 100) - (cnv.height + step * 1.5)) % (cnv.height + step * 3));
        p[1] = yShift + Math.sin(pbase.move.phase + t * pbase.move.speedRatioY) * pbase.move.r;
    });
    
    let tris = Delaunator.from(ptsActual).triangles;
    let trisCount = tris.length / 3;
    
    ctx.clearRect(0, 0, cnv.width, cnv.height);
    ctx.save();
    ctx.strokeStyle = "#f40";
    ctx.lineWidth = 1;
    ctx.lineJoin = "round";
    
    for(let i = 0; i < trisCount; i++){
        let p0 = ptsActual[tris[i * 3 + 0]];
        let p1 = ptsActual[tris[i * 3 + 1]];
        let p2 = ptsActual[tris[i * 3 + 2]];
        
        let avg = MathUtils.clamp(((p0[1] + p1[1] + p2[1]) / 3) / cnv.height, 0., 1.);
        avg = Math.max(0, avg * 1.333 - 0.333);
        c.lerpColors(c1, c2, avg);
        ctx.fillStyle = "#" + c.getHexString();
        
        ctx.beginPath();
        ctx.moveTo(p0[0], p0[1]);
        ctx.lineTo(p1[0], p1[1]);
        ctx.lineTo(p2[0], p2[1]);
        ctx.closePath();
        ctx.fill();
    }
    
    ctx.fillStyle = "#FFA500";
    ctx.strokeStyle = "#FFA500";
    ctx.lineWidth = 2;
    
    ptsActual.forEach((p, idx) => {
        let pbm = ptsBase[idx].move;
        let sinVal = Math.sin(pbm.phase + t * 4) * 0.5 + 0.5;
        ctx.beginPath();
        ctx.arc(p[0], p[1], sinVal * pbm.pRdif + pbm.pRmin, 0, Math.PI * 2, false);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    });
    
    ctx.restore();
    requestAnimationFrame(draw);
}

// Start animation
draw();
