import './style.css';
import { Vector3, Clock, Scene, PerspectiveCamera, WebGLRenderer, PointLight, AmbientLight, BufferGeometry, Float32BufferAttribute, PointsMaterial, AdditiveBlending, Color, Points} from 'three';
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
  breakawayThreshold: {value: 0.3}
}


let sizes = [];
let breakawayStates = []
let settledStates = [];

let radii = [10, 10, 10, 15, 15, 20];

let pts = new Array(300).fill().map(() => {
  sizes.push(Math.random() * 1.5 + 0.5); // Assuming you have initialized 'sizes' array somewhere else
  breakawayStates.push(Math.random()); 
  settledStates.push(0.0); 
  const radius = radii[Math.floor(Math.random() * radii.length)]; // Randomly select one of the three radii
  const angle = Math.random() * 2 * Math.PI; // Random angle in radians
  let x = radius * Math.cos(angle); // Convert polar to Cartesian coordinates

  let y = radius * Math.sin(angle); // Convert polar to Cartesian coordinates
  let z = -30; // Set z to -30 as per your requirement

  return new Vector3(x, y, z);
});

scene.background = new Color(0x160016);

let g = new BufferGeometry().setFromPoints(pts);
g.setAttribute('sizes', new Float32BufferAttribute(sizes, 1));
g.setAttribute('breakaway', new Float32BufferAttribute(breakawayStates, 1));
g.setAttribute('settled', new Float32BufferAttribute(settledStates, 1));

let m = new PointsMaterial({
  size: 0.5,
  transparent: true,
  depthTest: true,
  blending: AdditiveBlending,
  onBeforeCompile: shader => {
    shader.uniforms.time = gu.time; // Ensure time uniform is properly defined if needed
    shader.uniforms.breakawayThreshold = gu.breakawayThreshold; // Ensure time uniform is properly defined if needed
    shader.vertexShader = `
      uniform float time;
      uniform float breakawayThreshold;
      attribute float sizes;
      attribute float breakaway;
      attribute float settled;
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
 float shouldBreakaway = breakaway < breakawayThreshold ? 1.0 : 0.0;
 float angle = atan(position.y, position.x) - time * 0.1;
 float radius = length(position.xy);
 
 if (settled > 0.5) {
     // Just orbit at current radius if settled
     transformed.x = cos(angle) * radius;
     transformed.y = sin(angle) * radius;
 } else if (shouldBreakaway > 0.5) {
     // Here we can add the time-varying probability
     float timeHash = fract(sin(time * 0.1) * 43758.5453);
     float particleHash = fract(sin(breakaway * 12.9898) * 43758.5453);
     float direction = fract(timeHash * particleHash) < 0.5 ? 1.0 : -1.0;
     
     float newRadius = radius + direction * time * 0.1;
     transformed.x = cos(angle) * newRadius;
     transformed.y = sin(angle) * newRadius;
 } else {
     transformed.x = cos(angle) * radius;
     transformed.y = sin(angle) * radius;
 }
      `
    );
    // Removed the part related to 'shift' attribute in vertex shader

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
composer.addPass(wavyTVPass);


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

// Animation Loop
function animate() {
  requestAnimationFrame(animate);
  renderer.autoClear = false;
  renderer.clear();
  let t = clock.getElapsedTime();
  gu.time.value = t * Math.PI;
  wavyTVPass.uniforms['time'].value += 0.05;
  gradientOscillatingPass.uniforms['time'].value += 0.05;
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

