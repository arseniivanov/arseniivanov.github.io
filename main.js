import './style.css';
import { Vector3, Clock, Scene, PerspectiveCamera, WebGLRenderer, PointLight, AmbientLight, BufferGeometry, Float32BufferAttribute, Int32BufferAttribute ,PointsMaterial, AdditiveBlending, Color, Points} from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

// Setup

let composer, walkmixer, clock;

const ENTIRE_SCENE = 0;
clock = new Clock();

const scene = new Scene();  
const camera = new PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 100);

const renderer = new WebGLRenderer({
  canvas: document.querySelector('#bg'),
  antialias: false
});

renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);

camera.position.setZ(30);
camera.position.setX(0);

// Lights

const pointLight = new PointLight(0xffffff);
pointLight.position.set(5, 5, 5);
pointLight.layers.enable(ENTIRE_SCENE);

const ambientLight = new AmbientLight(0xffffff);
ambientLight.layers.enable(ENTIRE_SCENE);
scene.add(pointLight, ambientLight);

let gu = {
  time: {value: 0},
  breakawayThreshold: {value: 0.7}, // break away from initial orbit
  orbitalRadii: { value: new Vector3(10, 15, 20) },
  isBook: { value: 0 }, // 0 for main cloud, 1 for book cloud
}

let sizes = [];
let breakawayStates = [] // denotes if target breakawayprob
let initRadii = [];      // New array for transition targets
let direction = [];      // New array for transition targets

let radii = [10, 10, 10, 15, 15, 20];
let dirs = [1, -1]

let pts = new Array(300).fill().map(() => {
  sizes.push(Math.random() * 1.5 + 0.5); // Assuming you have initialized 'sizes' array somewhere else
  breakawayStates.push(Math.random()); 

  let radius = radii[Math.floor(Math.random() * radii.length)]; // Randomly select one of the three radii
  const angle = Math.random() * 2 * Math.PI; // Random angle in radians

  let dir = dirs[Math.floor(Math.random() * dirs.length)];
  direction.push(dir);  // Initially, target = current

  initRadii.push(radius);  // Initially, target = current

  let x = radius * Math.cos(angle); // Convert polar to Cartesian coordinates
  let y = radius * Math.sin(angle); // Convert polar to Cartesian coordinates
  let z = -30; // Set z to -30 as per your requirement

  return new Vector3(x, y, z);
});

scene.background = new Color(0x160016);

let g = new BufferGeometry().setFromPoints(pts);
g.setAttribute('sizes', new Float32BufferAttribute(sizes, 1));
g.setAttribute('breakaway', new Float32BufferAttribute(breakawayStates, 1));
g.setAttribute('initRadius', new Float32BufferAttribute(initRadii, 1));
g.setAttribute('direction', new Int32BufferAttribute(direction, 1));

let m = new PointsMaterial({
  size: 0.5,
  transparent: true,
  depthTest: true,
  blending: AdditiveBlending,
  onBeforeCompile: shader => {
    shader.uniforms.time = gu.time; // Ensure time uniform is properly defined if needed
    shader.uniforms.isBook = gu.isBook;
    shader.uniforms.breakawayThreshold = gu.breakawayThreshold;
shader.vertexShader = `
      uniform float time;
      uniform float isBook;
      uniform float breakawayThreshold;
      uniform vec3 orbitalRadii;

      attribute float initRadius;
      attribute float sizes;
      attribute float breakaway;
      attribute int direction;
      varying vec3 vColor;
      ${shader.vertexShader}
    `.replace(
      `gl_PointSize = size;`,
      `gl_PointSize = size * sizes;`
    ).replace(
      `#include <color_vertex>`,
      `#include <color_vertex>
        float d = abs(position.y) / 30.0;
        d = pow(d, 0.5);
        d = clamp(d, 0., 1.);
        vColor = mix(vec3(227., 155., 0.), vec3(100., 50., 255.), d) / 255.;
      `
    ).replace(
      `#include <begin_vertex>`,
      `#include <begin_vertex>
      if (isBook < 0.5){
        float radius = length(position.xy);
        float shouldBreakaway = breakaway < breakawayThreshold ? 1.0 : 0.0;
        float angle = atan(position.y, position.x) - time * 0.1;
        float currentRadius = radius;
        
        if (shouldBreakaway > 0.5) {
          float dir = float(direction);
          float cycleDuration = 25.0;
          float cycleTime = mod(time, cycleDuration);
          
          // First half of cycle: move away, Second half: return
          float transitionFactor = cycleTime < cycleDuration * 0.5 ? 
            cycleTime / (cycleDuration * 0.5) : // Going out
            1.0 - ((cycleTime - cycleDuration * 0.5) / (cycleDuration * 0.5)); // Coming back
          
          // Use transitionFactor to smoothly interpolate between original and target radius
          float targetOrbit = radius + dir * 5.0;
          currentRadius = mix(radius, targetOrbit, transitionFactor);
          
          transformed.x = cos(angle) * currentRadius;
          transformed.y = sin(angle) * currentRadius;
        } else {
          transformed.x = cos(angle) * radius;
          transformed.y = sin(angle) * radius;
        }
      } else {
        float swayAmount = sin(time * 0.5 + position.x) * 0.2;
        transformed.y += swayAmount;
      }
      `
    );
    shader.fragmentShader = `
      varying vec3 vColor;
      ${shader.fragmentShader}
    `.replace(
      `#include <clipping_planes_fragment>`,
      `#include <clipping_planes_fragment>
        float d = length(gl_PointCoord - vec2(0.5, 0.5));
        d = smoothstep(0.5, 0.1, d);
      `
    ).replace(
      `vec4 diffuseColor = vec4( diffuse, opacity );`,
      `vec4 diffuseColor = vec4( vColor, d );` // Updated to use 'd' for alpha to create a fade effect on the edges of the points
    );
  }
});

let cloud = new Points(g, m);
cloud.rotation.order = "ZYX";
cloud.rotation.z = 0.0;
scene.add(cloud);

const renderScene = new RenderPass( scene, camera );
composer = new EffectComposer( renderer );
composer.addPass( renderScene );



const wavyTVShader = {
  uniforms: {
      "tDiffuse": { value: null },
      "time": { value: 0 },
      "lineThickness": { value: 1.0 } // Adjust thickness of horizontal lines
  },
  vertexShader: `
      varying vec2 vUv;
      void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
  `,
  fragmentShader: `
  uniform sampler2D tDiffuse;
  uniform float time;
  uniform float lineThickness;
  varying vec2 vUv;

  void main() {
      vec2 uv = vUv;
      // Oscillating effect only for the lines
      float linePos = mod(uv.y * 800.0 + time * 9.0, 8.0); // Move lines up and down
      vec4 color = texture2D(tDiffuse, uv);

      // Creating thin black horizontal lines that oscillate
      if (linePos < lineThickness) color.rgb *= 0.0;

      gl_FragColor = color;
  }
  `
};

const wavyTVPass = new ShaderPass(wavyTVShader);
//composer.addPass(wavyTVPass);


const circularGradientShader = {
  uniforms: {
      "tDiffuse": { value: null },
      "time": { value: 0 },
      "lineThickness": { value: 0.02 }, // Adjust thickness of horizontal lines
  },
  vertexShader: `
      varying vec2 vUv;
      void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
  `,
  fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform float time;
      uniform float lineThickness;
      varying vec2 vUv;

      void main() {
          vec2 uv = vUv;
          float linePos = mod(uv.y * 800.0 + time * 50.0, 10.0); // Move lines up and down
          vec4 color = texture2D(tDiffuse, uv);

          // Creating thin black horizontal lines that oscillate
          if (linePos < lineThickness) color.rgb *= 0.0;

          // Adjusting for circular gradient movement
          vec2 center1 = vec2(0.5 + sin(time * 0.2) * 0.2, 0.5 + cos(time * 0.3) * 0.2);
          vec2 center2 = vec2(0.5 - sin(time * 0.3) * 0.2, 0.5 - cos(time * 0.2) * 0.2);

          // Clouds gradient calculations
          float dist1 = length(uv - center1);
          float dist2 = length(uv - center2);

          // Create gradients for each cloud based on distance to its center
          float cloud1 = 1.0 - smoothstep(0.0, 0.5, dist1);
          float cloud2 = 1.0 - smoothstep(0.0, 0.7, dist2);

          float cloudEffect = smoothstep(0.0, 0.7, dist1) * smoothstep(0.0, 0.5, dist2);

          // Darker purple and orange colors
          vec3 colorOne = vec3(120, 50, 255) / 255.0; // Darker purple
          vec3 colorTwo = vec3(0.58, 0.03, 0.30); // Darker orange

          // Create the smooth color gradient between two clouds
          vec3 gradientColor = mix(colorOne * cloud1, colorTwo * cloud2, 0.5);

          // Apply the clouds gradient over the original color
          color.rgb = mix(color.rgb, gradientColor, 0.5); // Adjust the blending as needed
      
          gl_FragColor = color;
      }
  `
};

const gradientOscillatingPass = new ShaderPass(circularGradientShader);
composer.addPass(gradientOscillatingPass);

// Scroll Animation

function moveCamera() {
  const t = document.body.getBoundingClientRect().top;
}

document.body.onscroll = moveCamera;
moveCamera();
document.querySelector('.menu-toggle').addEventListener('click', () => {
  document.querySelector('.side-menu').classList.toggle('expanded');
});

document.querySelector('a[href="#publications"]').addEventListener('click', (e) => {
  e.preventDefault();
  moveToPublications();
});

function moveToPublications() {
  // Scroll to section
  const publicationsSection = document.getElementById('publications');
  publicationsSection.scrollIntoView({ behavior: 'smooth' });

  // Store initial camera position for potential return
  const initialPosition = camera.position.clone();
  const initialRotation = camera.rotation.clone();
  
  // Timeline for camera movement
  const duration = 2000; // 2 seconds
  const startTime = performance.now();
  const fadeInDuration = 1000; // Duration for fade-in effect
  // Reset book properties
  bookCloud.visible = true;
  bookCloud.material.opacity = 0;
  bookCloud.scale.set(0.1, 0.1, 0.1); // Start small

  function animateCamera(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Smooth easing
    const eased = progress < 0.5 
      ? 2 * progress * progress 
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    
    // Move camera forward
    camera.position.z = 30 - (eased * 60);
    
    if (progress > 0.4) {
      const fadeProgress = Math.min((progress - 0.4) / 0.6, 1);
      bookCloud.material.opacity = fadeProgress;
      const scale = 0.1 + fadeProgress * 0.9; // Grow from 0.1 to 1.0
      bookCloud.scale.set(scale, scale, scale);
    }
    
    if (progress < 1) {
      requestAnimationFrame(animateCamera);
    } else {
      bookCloud.visible = true;
    }
  }
  
  requestAnimationFrame(animateCamera);
}

// Create a separate material for the book
const bookMaterial = new PointsMaterial({
  size: 0.5,
  transparent: true,
  depthTest: true,
  blending: AdditiveBlending,
  onBeforeCompile: shader => {
    shader.uniforms.time = gu.time;
    shader.uniforms.isBook = { value: 1.0 }; // Flag to identify book shader

    shader.vertexShader = `
      uniform float time;
      attribute float sizes;
      varying vec3 vColor;
      
      // Book-specific gentle floating animation
      vec3 gentleFloat(vec3 pos, float time) {
        float yOffset = sin(time * 0.5) * 0.1; // Gentle Y oscillation
        float xOffset = cos(time * 0.3) * 0.05; // Subtle X movement
        return vec3(pos.x + xOffset, pos.y + yOffset, pos.z);
      }
      
      ${shader.vertexShader}
    `.replace(
      `gl_PointSize = size;`,
      `gl_PointSize = size * sizes;`
    ).replace(
      `#include <color_vertex>`,
      `#include <color_vertex>
        float d = abs(position.y) / 20.0; // Adjusted for book height
        d = pow(d, 0.5);
        d = clamp(d, 0., 1.);
        vColor = mix(vec3(227., 155., 0.), vec3(100., 50., 255.), d) / 255.;
      `
    ).replace(
      `#include <begin_vertex>`,
      `#include <begin_vertex>
        // Apply gentle floating animation instead of orbital motion
        transformed = gentleFloat(position, time);
      `
    );

    shader.fragmentShader = `
      varying vec3 vColor;
      ${shader.fragmentShader}
    `.replace(
      `#include <clipping_planes_fragment>`,
      `#include <clipping_planes_fragment>
        float d = length(gl_PointCoord - vec2(0.5, 0.5));
        d = smoothstep(0.5, 0.1, d);
      `
    ).replace(
      `vec4 diffuseColor = vec4( diffuse, opacity );`,
      `vec4 diffuseColor = vec4( vColor, d );`
    );
  }
});

function createBookGeometry() {
  const bookPoints = [];
  const bookSizes = [];
  
  // Book dimensions
  const width = 15;
  const height = 20;
  const depth = 4;
  const numPoints = 400;
  
  // Helper function to add points with slight random offset
  function addPointsWithJitter(basePoint, count, jitterAmount, size) {
    const [x, y, z] = basePoint;
    for (let i = 0; i < count; i++) {
      bookPoints.push(new Vector3(
        x + (Math.random() - 0.5) * jitterAmount,
        y + (Math.random() - 0.5) * jitterAmount,
        z + (Math.random() - 0.5) * jitterAmount
      ));
      bookSizes.push(size);
    }
  }

  // Create structured points for the book faces
  function createFace(xRange, yRange, zPos, pointCount, sizeRange) {
    const [xMin, xMax] = xRange;
    const [yMin, yMax] = yRange;
    
    for (let i = 0; i < pointCount; i++) {
      // Use structured positioning instead of pure random
      const xProgress = Math.floor(i / Math.sqrt(pointCount)) / Math.sqrt(pointCount);
      const yProgress = (i % Math.sqrt(pointCount)) / Math.sqrt(pointCount);
      
      const x = xMin + (xMax - xMin) * xProgress;
      const y = yMin + (yMax - yMin) * yProgress;
      
      // Add slight randomness to prevent perfect grid
      const jitter = 0.2;
      bookPoints.push(new Vector3(
        x + (Math.random() - 0.5) * jitter,
        y + (Math.random() - 0.5) * jitter,
        zPos + (Math.random() - 0.5) * jitter
      ));
      
      const [minSize, maxSize] = sizeRange;
      bookSizes.push(Math.random() * (maxSize - minSize) + minSize);
    }
  }

  // Create front cover
  createFace(
    [-width/2, width/2],  // x range
    [-height/2, height/2], // y range
    depth/2,              // z position
    100,                  // number of points
    [0.3, 0.8]           // size range
  );

  // Create back cover
  createFace(
    [-width/2, width/2],
    [-height/2, height/2],
    -depth/2,
    100,
    [0.3, 0.8]
  );

  // Create spine (with more density)
  createFace(
    [-width/2 - 0.5, -width/2 + 0.5],
    [-height/2, height/2],
    0,
    50,
    [0.2, 0.6]
  );

  // Create pages (multiple layers)
  const numLayers = 10;
  for (let layer = 0; layer < numLayers; layer++) {
    const zPos = (depth * (layer / numLayers - 0.5)) * 0.8;
    const pagePoints = 20; // Points per layer
    
    for (let i = 0; i < pagePoints; i++) {
      const xProgress = i / pagePoints;
      const x = -width/2 + width * xProgress;
      const y = (Math.random() - 0.5) * height * 0.95;
      
      // Create subtle page curve
      const curve = Math.sin(xProgress * Math.PI) * (depth/8);
      const z = zPos + curve;
      
      bookPoints.push(new Vector3(x, y, z));
      bookSizes.push(Math.random() * 0.3 + 0.2); // Smaller points for pages
    }
  }

  // Add reinforced edges
  const edges = [
    // Spine edges
    [[-width/2, -height/2, 0], 10, 0.3, 1.2],
    [[-width/2, height/2, 0], 10, 0.3, 1.2],
    // Front edges
    [[width/2, -height/2, depth/2], 10, 0.3, 1.2],
    [[width/2, height/2, depth/2], 10, 0.3, 1.2],
    // Back edges
    [[width/2, -height/2, -depth/2], 10, 0.3, 1.2],
    [[width/2, height/2, -depth/2], 10, 0.3, 1.2]
  ];

  edges.forEach(([point, count, jitter, size]) => {
    addPointsWithJitter(point, count, jitter, size);
  });

  const geometry = new BufferGeometry().setFromPoints(bookPoints);
  geometry.setAttribute('sizes', new Float32BufferAttribute(bookSizes, 1));
  
  return geometry;
}
// Create and add book cloud with new material
const bookCloud = new Points(createBookGeometry(), bookMaterial);
bookCloud.visible = false;
bookCloud.position.set(0, 0, -100);

bookCloud.rotation.order = 'YXZ';  // Do Y rotation first, then X
bookCloud.rotation.y = Math.PI * 0.6;
bookCloud.rotation.x = Math.PI * 0.45;  // 80 degrees ≈ 0.45 * PI
scene.add(bookCloud);

document.getElementById('home-button').addEventListener('click', (e) => {
  e.preventDefault();
  
  // Scroll to top smoothly
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
  
  // Reset camera properties
  camera.position.set(0, 0, 30);
  camera.rotation.set(0, 0, 0);
  
  // Reset book cloud if it exists
  if (bookCloud) {
    bookCloud.visible = false;
    if (bookUniforms && bookUniforms.openAmount) {
      bookUniforms.openAmount.value = 0;
    }
  }

  // Reset the main cloud
  if (cloud) {
    cloud.visible = true;
    cloud.rotation.set(0, 0, 0);
    gu.breakawayThreshold.value = 0.7; // Reset to initial threshold
  }
  
  // Reset animation time
  gu.time.value = 0;
  
  // Reset any post-processing effects if needed
  if (gradientOscillatingPass) {
    gradientOscillatingPass.uniforms['time'].value = 0;
  }
  if (wavyTVPass) {
    wavyTVPass.uniforms['time'].value = 0;
  }

});

document.addEventListener('DOMContentLoaded', () => {
  const menu = document.querySelector('.side-menu');
  
  // Set initial state based on screen width
  if (window.innerWidth >= 768) {
    menu.classList.add('expanded');
  }
  
  // Handle window resize
  window.addEventListener('resize', () => {
    if (window.innerWidth >= 768) {
      menu.classList.add('expanded');
    } else {
      menu.classList.remove('expanded');
    }
  });
  
  // Toggle menu on button click (for mobile)
  document.querySelector('.menu-toggle').addEventListener('click', () => {
    menu.classList.toggle('expanded');
  });
});

// Update animation loop
function animate() {
  requestAnimationFrame(animate);
  renderer.autoClear = false;
  renderer.clear();
  
  let t = clock.getElapsedTime();
  
  // Update uniforms
  gu.time.value = t * Math.PI;
  gradientOscillatingPass.uniforms['time'].value += 0.05;
  wavyTVPass.uniforms['time'].value += 0.05;
  
  composer.render();
}

// Select the arrow elements
const arrows = document.querySelectorAll(".arrow");

// Function to handle scroll event
function handleScroll() {
  const scrollThreshold = 300; // Change this value to adjust the scroll threshold

  if (window.scrollY > scrollThreshold) {
    arrows.forEach((arrow) => {
      arrow.style.display = "none";
    });
  } else {
    arrows.forEach((arrow) => {
      arrow.style.display = "block";
    });
  }
}

// Add scroll event listener
window.addEventListener("scroll", handleScroll);


animate();

