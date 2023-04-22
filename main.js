import './style.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';

// Setup

let composer, walkmixer, clock;

const ENTIRE_SCENE = 0;

clock = new THREE.Clock();

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 100);

const renderer = new THREE.WebGLRenderer({
  canvas: document.querySelector('#bg'),
  antialias: false
});

renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);

camera.position.setZ(30);
camera.position.setX(-3);

// Lights

const pointLight = new THREE.PointLight(0xffffff);
pointLight.position.set(5, 5, 5);
pointLight.layers.enable(ENTIRE_SCENE);

const ambientLight = new THREE.AmbientLight(0xffffff);
ambientLight.layers.enable(ENTIRE_SCENE);
scene.add(pointLight, ambientLight);


let gu = {
  time: {value: 0}
}

let sizes = [];
let shift = [];
let pushShift = () => {
  shift.push(
    Math.random() * Math.PI, 
    Math.random() * Math.PI * 2, 
    (Math.random() * 0.9 + 0.1) * Math.PI * 0.1,
    Math.random() * 0.9 + 0.1
  );
}
let pts = new Array(10000).fill().map(p => {
  sizes.push(Math.random() * 1.5 + 0.5);
  pushShift();
  var sz = { x: 230, y: 230 };
  let x = THREE.MathUtils.randFloatSpread(sz.x);
  let y = THREE.MathUtils.randFloatSpread(sz.y);
  let z = -30;
  return new THREE.Vector3(x,y,z);
})

scene.background = new THREE.Color(0x160016);

let g = new THREE.BufferGeometry().setFromPoints(pts);
g.setAttribute("sizes", new THREE.Float32BufferAttribute(sizes, 1));
g.setAttribute("shift", new THREE.Float32BufferAttribute(shift, 4));
let m = new THREE.PointsMaterial({
  size: 0.5,
  transparent: true,
  depthTest: true,
  blending: THREE.AdditiveBlending,
  onBeforeCompile: shader => {
    shader.uniforms.time = gu.time;
    shader.vertexShader = `
      uniform float time;
      attribute float sizes;
      attribute vec4 shift;
      varying vec3 vColor;
      ${shader.vertexShader}
    `.replace(
      `gl_PointSize = size;`,
      `gl_PointSize = size * sizes;`
    ).replace(
      `#include <color_vertex>`,
      `#include <color_vertex>
        float d = abs(position.y) / 230.0;
        d = pow(d, 0.5);
        d = clamp(d, 0., 1.);
        vColor = mix(vec3(227., 155., 0.), vec3(100., 50., 255.), d) / 255.;
      `
    ).replace(
      `#include <begin_vertex>`,
      `#include <begin_vertex>
        float t = time;
        float moveT = mod(shift.x + shift.z * t, PI2);
        float moveS = mod(shift.y + shift.z * t, PI2);
        transformed += vec3(cos(moveS) * sin(moveT), cos(moveT), sin(moveS) * sin(moveT)) * shift.w;
        transformed += normalize(transformed - cameraPosition) * -0.5;
      `
    );
    shader.fragmentShader = `
      varying vec3 vColor;
      ${shader.fragmentShader}
    `.replace(
      `#include <clipping_planes_fragment>`,
      `#include <clipping_planes_fragment>
        float d = length(gl_PointCoord.xy - 0.5);
        //if (d > 0.5) discard;
      `
    ).replace(
      `vec4 diffuseColor = vec4( diffuse, opacity );`,
      `vec4 diffuseColor = vec4( vColor, smoothstep(0.5, 0.1, d)/* * 0.5 + 0.5*/ );`
    );
  }
});
let cloud = new THREE.Points(g, m);
cloud.rotation.order = "ZYX";
cloud.rotation.z = 0.0;
scene.add(cloud);

let modelloader = new GLTFLoader();

modelloader.load( 'models/walkingman.glb', function ( gltf ) {

  const model = gltf.scene;
  model.position.z = 0;
  model.position.x = 1;
  model.position.y = -2;
  scene.add( model );
  walkmixer = new THREE.AnimationMixer( model );
  const torusclip = gltf.animations[ 0 ];
  const walkclip = gltf.animations[ 1 ];
  walkmixer.clipAction( torusclip.optimize() ).play();
  walkmixer.clipAction( walkclip.optimize() ).play();
} );

const renderScene = new RenderPass( scene, camera );
composer = new EffectComposer( renderer );
composer.addPass( renderScene );

// Scroll Animation

function moveCamera() {
  const t = document.body.getBoundingClientRect().top;
  camera.position.z = t * -0.01;
}

document.body.onscroll = moveCamera;
moveCamera();

// Animation Loop
function animate() {
  requestAnimationFrame(animate);
  renderer.autoClear = false;
  renderer.clear();
  const delta = clock.getDelta();
  let t = clock.getElapsedTime();
  gu.time.value = t * Math.PI;
  walkmixer.update(delta);
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

