import './style.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import Delaunator from 'delaunator';
import { randFloatSpread } from 'three/src/math/MathUtils';

// Setup

let composer, walkmixer, clock;

const ENTIRE_SCENE = 0;

clock = new THREE.Clock();

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 100);

const size = 10;
const divisions = 10;
const teal = new THREE.Color("rgb(0, 255, 204))");
const gridHelper = new THREE.GridHelper( size, divisions, teal, teal);
gridHelper.translateY(-3);
gridHelper.color;
//scene.add(gridHelper);


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

/*
let campos = camera.getWorldPosition();

var sz = { x: 200, z: 200 };
var pointsCount = 1000;
var points3d = [];
var billboardpoints = [];
for (let i = 0; i < pointsCount; i++) {
  let x = THREE.MathUtils.randFloatSpread(sz.x);
  let z = THREE.MathUtils.randFloatSpread(sz.z);
  let y = 10;
  let dotpos = new THREE.Vector3(x, y, z);  
  points3d.push(dotpos);
  const direction = new THREE.Vector3().subVectors(dotpos, campos).normalize();
  const distance = Math.random() * 70;
  let temp_pos = new THREE.Vector3(x, y, z);
  temp_pos.add(direction.multiplyScalar(distance));
  billboardpoints.push(temp_pos);
}


const sprite = new THREE.TextureLoader().load( 'disc.png' );

var geom = new THREE.BufferGeometry().setFromPoints(billboardpoints);
var geom_mesh = new THREE.BufferGeometry().setFromPoints(points3d);
var material = new THREE.PointsMaterial( { size: 1, sizeAttenuation: true, map: sprite, alphaTest: 0.5, transparent: true } );

var cloud = new THREE.Points(
  geom,
  material
);

//cloud.rotation.x = -Math.PI / 2; 

scene.add(cloud);
*/
// triangulate x, z
var indexDelaunay = Delaunator.from(
  pts.map(v => {
    return [v.x, v.y];
  })
);

var meshIndex = []; // delaunay index => three.js index
for (let i = 0; i < indexDelaunay.triangles.length; i++){
  meshIndex.push(indexDelaunay.triangles[i]);
}
console.log(meshIndex.length)

var colors = [];
for (let i = 0; i < meshIndex.length; i+=3) {
  let avgy = (meshIndex[i].y + meshIndex[i+1].y + meshIndex[i+2].y)/3;
  let color = new THREE.Color(avgy);
  colors[meshIndex[i]] = color;
  colors[meshIndex[i+1]] = color;
  colors[meshIndex[i+2]] = color;
}
console.log(colors.length)

g.setIndex(meshIndex); // add three.js index to the existing geometry
g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); // set vertex colors
g.computeVertexNormals();

const myShaderMaterial = new THREE.ShaderMaterial({
  uniforms: {
    time: gu.time,
    color1: { value: new THREE.Color(0xec5800) },
    color2: { value: new THREE.Color(0xffbf00) },
  },

  vertexShader: document.getElementById("vertexShader").textContent,
	fragmentShader: document.getElementById("fragmentShader").textContent,
  wireframe: false,
  vertexColors: true // enable vertex colors
});

var mesh = new THREE.Mesh(
  g,
  myShaderMaterial
);
mesh.material.side = THREE.DoubleSide;
//scene.add(mesh);


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
  //camera.position.x = t * -0.0002;
  //camera.rotation.y = t * -0.0002;
}

document.body.onscroll = moveCamera;
moveCamera();

// Animation Loop
function animate() {
  console.log(myShaderMaterial.time)
  requestAnimationFrame(animate);
  renderer.autoClear = false;
  renderer.clear();
  const delta = clock.getDelta();
  let t = clock.getElapsedTime();
  gu.time.value = t * Math.PI;
  //cloud.rotation.y = t * 0.05;
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

