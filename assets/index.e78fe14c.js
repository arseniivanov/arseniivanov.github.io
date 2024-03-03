import{O as E,B as m,F as c,M as j,S as x,U as W,V as _,W as H,C as T,L as b,R as G,a as M,b as I,P as q,c as K,d as N,A as Y,e as $,f as X,g as Z,h as J}from"./three.module.70505099.js";var S={uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform float opacity;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = opacity * texel;

		}`};class d{constructor(){this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error("THREE.Pass: .render() must be implemented in derived pass.")}}const ee=new E(-1,1,1,-1,0,1),v=new m;v.setAttribute("position",new c([-1,3,0,-1,-1,0,3,-1,0],3));v.setAttribute("uv",new c([0,2,0,0,2,0],2));class te{constructor(e){this._mesh=new j(v,e)}dispose(){this._mesh.geometry.dispose()}render(e){e.render(this._mesh,ee)}get material(){return this._mesh.material}set material(e){this._mesh.material=e}}class h extends d{constructor(e,t){super(),this.textureID=t!==void 0?t:"tDiffuse",e instanceof x?(this.uniforms=e.uniforms,this.material=e):e&&(this.uniforms=W.clone(e.uniforms),this.material=new x({defines:Object.assign({},e.defines),uniforms:this.uniforms,vertexShader:e.vertexShader,fragmentShader:e.fragmentShader})),this.fsQuad=new te(this.material)}render(e,t,r){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=r.texture),this.fsQuad.material=this.material,this.renderToScreen?(e.setRenderTarget(null),this.fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this.fsQuad.render(e))}}class P extends d{constructor(e,t){super(),this.scene=e,this.camera=t,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(e,t,r){const i=e.getContext(),s=e.state;s.buffers.color.setMask(!1),s.buffers.depth.setMask(!1),s.buffers.color.setLocked(!0),s.buffers.depth.setLocked(!0);let o,n;this.inverse?(o=0,n=1):(o=1,n=0),s.buffers.stencil.setTest(!0),s.buffers.stencil.setOp(i.REPLACE,i.REPLACE,i.REPLACE),s.buffers.stencil.setFunc(i.ALWAYS,o,4294967295),s.buffers.stencil.setClear(n),s.buffers.stencil.setLocked(!0),e.setRenderTarget(r),this.clear&&e.clear(),e.render(this.scene,this.camera),e.setRenderTarget(t),this.clear&&e.clear(),e.render(this.scene,this.camera),s.buffers.color.setLocked(!1),s.buffers.depth.setLocked(!1),s.buffers.stencil.setLocked(!1),s.buffers.stencil.setFunc(i.EQUAL,1,4294967295),s.buffers.stencil.setOp(i.KEEP,i.KEEP,i.KEEP),s.buffers.stencil.setLocked(!0)}}class se extends d{constructor(){super(),this.needsSwap=!1}render(e){e.state.buffers.stencil.setLocked(!1),e.state.buffers.stencil.setTest(!1)}}class ie{constructor(e,t){if(this.renderer=e,t===void 0){const r={minFilter:b,magFilter:b,format:G},i=e.getSize(new _);this._pixelRatio=e.getPixelRatio(),this._width=i.width,this._height=i.height,t=new H(this._width*this._pixelRatio,this._height*this._pixelRatio,r),t.texture.name="EffectComposer.rt1"}else this._pixelRatio=1,this._width=t.width,this._height=t.height;this.renderTarget1=t,this.renderTarget2=t.clone(),this.renderTarget2.texture.name="EffectComposer.rt2",this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],S===void 0&&console.error("THREE.EffectComposer relies on CopyShader"),h===void 0&&console.error("THREE.EffectComposer relies on ShaderPass"),this.copyPass=new h(S),this.clock=new T}swapBuffers(){const e=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=e}addPass(e){this.passes.push(e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(e,t){this.passes.splice(t,0,e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(e){const t=this.passes.indexOf(e);t!==-1&&this.passes.splice(t,1)}isLastEnabledPass(e){for(let t=e+1;t<this.passes.length;t++)if(this.passes[t].enabled)return!1;return!0}render(e){e===void 0&&(e=this.clock.getDelta());const t=this.renderer.getRenderTarget();let r=!1;for(let i=0,s=this.passes.length;i<s;i++){const o=this.passes[i];if(o.enabled!==!1){if(o.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(i),o.render(this.renderer,this.writeBuffer,this.readBuffer,e,r),o.needsSwap){if(r){const n=this.renderer.getContext(),C=this.renderer.state.buffers.stencil;C.setFunc(n.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,e),C.setFunc(n.EQUAL,1,4294967295)}this.swapBuffers()}P!==void 0&&(o instanceof P?r=!0:o instanceof se&&(r=!1))}}this.renderer.setRenderTarget(t)}reset(e){if(e===void 0){const t=this.renderer.getSize(new _);this._pixelRatio=this.renderer.getPixelRatio(),this._width=t.width,this._height=t.height,e=this.renderTarget1.clone(),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=e,this.renderTarget2=e.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(e,t){this._width=e,this._height=t;const r=this._width*this._pixelRatio,i=this._height*this._pixelRatio;this.renderTarget1.setSize(r,i),this.renderTarget2.setSize(r,i);for(let s=0;s<this.passes.length;s++)this.passes[s].setSize(r,i)}setPixelRatio(e){this._pixelRatio=e,this.setSize(this._width,this._height)}}new E(-1,1,1,-1,0,1);const A=new m;A.setAttribute("position",new c([-1,3,0,-1,-1,0,3,-1,0],3));A.setAttribute("uv",new c([0,2,0,0,2,0],2));class re extends d{constructor(e,t,r,i,s){super(),this.scene=e,this.camera=t,this.overrideMaterial=r,this.clearColor=i,this.clearAlpha=s!==void 0?s:0,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this._oldClearColor=new M}render(e,t,r){const i=e.autoClear;e.autoClear=!1;let s,o;this.overrideMaterial!==void 0&&(o=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor&&(e.getClearColor(this._oldClearColor),s=e.getClearAlpha(),e.setClearColor(this.clearColor,this.clearAlpha)),this.clearDepth&&e.clearDepth(),e.setRenderTarget(this.renderToScreen?null:r),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),e.render(this.scene,this.camera),this.clearColor&&e.setClearColor(this._oldClearColor,s),this.overrideMaterial!==void 0&&(this.scene.overrideMaterial=o),e.autoClear=i}}let f,k;const z=0;k=new T;const u=new I,p=new q(40,window.innerWidth/window.innerHeight,1,100),l=new K({canvas:document.querySelector("#bg"),antialias:!1});l.setPixelRatio(window.devicePixelRatio);l.setSize(window.innerWidth,window.innerHeight);p.position.setZ(30);p.position.setX(0);const g=new N(16777215);g.position.set(5,5,5);g.layers.enable(z);const D=new Y(16777215);D.layers.enable(z);u.add(g,D);let L={time:{value:0}},B=[],y=[10,10,10,15,15,20],ae=new Array(300).fill().map(()=>{B.push(Math.random()*1.5+.5);const a=y[Math.floor(Math.random()*y.length)],e=Math.random()*2*Math.PI;let t=a*Math.cos(e),r=a*Math.sin(e),i=-30;return new $(t,r,i)});u.background=new M(1441814);let U=new m().setFromPoints(ae);U.setAttribute("sizes",new c(B,1));let oe=new X({size:.5,transparent:!0,depthTest:!0,blending:Z,onBeforeCompile:a=>{a.uniforms.time=L.time,a.vertexShader=`
      uniform float time;
      attribute float sizes;
      varying vec3 vColor;
      ${a.vertexShader}
    `.replace("gl_PointSize = size;","gl_PointSize = size * sizes;").replace("#include <color_vertex>",`#include <color_vertex>
        float d = abs(position.y) / 30.0;
        d = pow(d, 0.5);
        d = clamp(d, 0., 1.);
        vColor = mix(vec3(227., 155., 0.), vec3(100., 50., 255.), d) / 255.;
      `).replace("#include <begin_vertex>",`#include <begin_vertex>
       float angle = atan(position.y, position.x) - time * 0.1; // Adjust time * 0.1 to change speed
       float radius = length(position.xy); // Assuming your points are initially placed on a circle
       transformed.x = cos(angle) * radius;
       transformed.y = sin(angle) * radius;
      `),a.fragmentShader=`
      varying vec3 vColor;
      ${a.fragmentShader}
    `.replace("#include <clipping_planes_fragment>",`#include <clipping_planes_fragment>
        float d = length(gl_PointCoord - vec2(0.5, 0.5));
        d = smoothstep(0.5, 0.1, d);
      `).replace("vec4 diffuseColor = vec4( diffuse, opacity );","vec4 diffuseColor = vec4( vColor, d );")}}),w=new J(U,oe);w.rotation.order="ZYX";w.rotation.z=0;u.add(w);const ne=new re(u,p);f=new ie(l);f.addPass(ne);const le={uniforms:{tDiffuse:{value:null},time:{value:0},lineThickness:{value:1}},vertexShader:`
      varying vec2 vUv;
      void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
  `,fragmentShader:`
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
  `},F=new h(le);f.addPass(F);const ce={uniforms:{tDiffuse:{value:null},time:{value:0},lineThickness:{value:.02}},vertexShader:`
      varying vec2 vUv;
      void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
  `,fragmentShader:`
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
  `},O=new h(ce);f.addPass(O);function V(){document.body.getBoundingClientRect().top}document.body.onscroll=V;V();function Q(){requestAnimationFrame(Q),l.autoClear=!1,l.clear();let a=k.getElapsedTime();L.time.value=a*Math.PI,F.uniforms.time.value+=.05,O.uniforms.time.value+=.05,f.render()}const R=document.querySelectorAll(".arrow");function fe(){window.scrollY>300?R.forEach(e=>{e.style.display="none"}):R.forEach(e=>{e.style.display="block"})}window.addEventListener("scroll",fe);Q();
