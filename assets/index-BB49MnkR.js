import{O as ce,M as he,B,F as x,S as O,U as de,V as q,W as fe,H as ue,N as me,C as G,a as j,b as pe,P as ge,c as ve,d as we,A as be,e as S,I as ye,f as H,g as N,h as Y}from"./three.module-Ofi0PdTS.js";const xe={name:"CopyShader",uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

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


		}`};class z{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error("THREE.Pass: .render() must be implemented in derived pass.")}dispose(){}}const Ce=new ce(-1,1,1,-1,0,1);class Se extends B{constructor(){super(),this.setAttribute("position",new x([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new x([0,2,0,0,2,0],2))}}const _e=new Se;class ke{constructor(e){this._mesh=new he(_e,e)}dispose(){this._mesh.geometry.dispose()}render(e){e.render(this._mesh,Ce)}get material(){return this._mesh.material}set material(e){this._mesh.material=e}}class D extends z{constructor(e,i){super(),this.textureID=i!==void 0?i:"tDiffuse",e instanceof O?(this.uniforms=e.uniforms,this.material=e):e&&(this.uniforms=de.clone(e.uniforms),this.material=new O({name:e.name!==void 0?e.name:"unspecified",defines:Object.assign({},e.defines),uniforms:this.uniforms,vertexShader:e.vertexShader,fragmentShader:e.fragmentShader})),this.fsQuad=new ke(this.material)}render(e,i,a){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=a.texture),this.fsQuad.material=this.material,this.renderToScreen?(e.setRenderTarget(null),this.fsQuad.render(e)):(e.setRenderTarget(i),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this.fsQuad.render(e))}dispose(){this.material.dispose(),this.fsQuad.dispose()}}class I extends z{constructor(e,i){super(),this.scene=e,this.camera=i,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(e,i,a){const o=e.getContext(),s=e.state;s.buffers.color.setMask(!1),s.buffers.depth.setMask(!1),s.buffers.color.setLocked(!0),s.buffers.depth.setLocked(!0);let r,c;this.inverse?(r=0,c=1):(r=1,c=0),s.buffers.stencil.setTest(!0),s.buffers.stencil.setOp(o.REPLACE,o.REPLACE,o.REPLACE),s.buffers.stencil.setFunc(o.ALWAYS,r,4294967295),s.buffers.stencil.setClear(c),s.buffers.stencil.setLocked(!0),e.setRenderTarget(a),this.clear&&e.clear(),e.render(this.scene,this.camera),e.setRenderTarget(i),this.clear&&e.clear(),e.render(this.scene,this.camera),s.buffers.color.setLocked(!1),s.buffers.depth.setLocked(!1),s.buffers.color.setMask(!0),s.buffers.depth.setMask(!0),s.buffers.stencil.setLocked(!1),s.buffers.stencil.setFunc(o.EQUAL,1,4294967295),s.buffers.stencil.setOp(o.KEEP,o.KEEP,o.KEEP),s.buffers.stencil.setLocked(!0)}}class Pe extends z{constructor(){super(),this.needsSwap=!1}render(e){e.state.buffers.stencil.setLocked(!1),e.state.buffers.stencil.setTest(!1)}}class Me{constructor(e,i){if(this.renderer=e,this._pixelRatio=e.getPixelRatio(),i===void 0){const a=e.getSize(new q);this._width=a.width,this._height=a.height,i=new fe(this._width*this._pixelRatio,this._height*this._pixelRatio,{type:ue}),i.texture.name="EffectComposer.rt1"}else this._width=i.width,this._height=i.height;this.renderTarget1=i,this.renderTarget2=i.clone(),this.renderTarget2.texture.name="EffectComposer.rt2",this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],this.copyPass=new D(xe),this.copyPass.material.blending=me,this.clock=new G}swapBuffers(){const e=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=e}addPass(e){this.passes.push(e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(e,i){this.passes.splice(i,0,e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(e){const i=this.passes.indexOf(e);i!==-1&&this.passes.splice(i,1)}isLastEnabledPass(e){for(let i=e+1;i<this.passes.length;i++)if(this.passes[i].enabled)return!1;return!0}render(e){e===void 0&&(e=this.clock.getDelta());const i=this.renderer.getRenderTarget();let a=!1;for(let o=0,s=this.passes.length;o<s;o++){const r=this.passes[o];if(r.enabled!==!1){if(r.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(o),r.render(this.renderer,this.writeBuffer,this.readBuffer,e,a),r.needsSwap){if(a){const c=this.renderer.getContext(),g=this.renderer.state.buffers.stencil;g.setFunc(c.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,e),g.setFunc(c.EQUAL,1,4294967295)}this.swapBuffers()}I!==void 0&&(r instanceof I?a=!0:r instanceof Pe&&(a=!1))}}this.renderer.setRenderTarget(i)}reset(e){if(e===void 0){const i=this.renderer.getSize(new q);this._pixelRatio=this.renderer.getPixelRatio(),this._width=i.width,this._height=i.height,e=this.renderTarget1.clone(),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=e,this.renderTarget2=e.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(e,i){this._width=e,this._height=i;const a=this._width*this._pixelRatio,o=this._height*this._pixelRatio;this.renderTarget1.setSize(a,o),this.renderTarget2.setSize(a,o);for(let s=0;s<this.passes.length;s++)this.passes[s].setSize(a,o)}setPixelRatio(e){this._pixelRatio=e,this.setSize(this._width,this._height)}dispose(){this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.copyPass.dispose()}}class Te extends z{constructor(e,i,a=null,o=null,s=null){super(),this.scene=e,this.camera=i,this.overrideMaterial=a,this.clearColor=o,this.clearAlpha=s,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this._oldClearColor=new j}render(e,i,a){const o=e.autoClear;e.autoClear=!1;let s,r;this.overrideMaterial!==null&&(r=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor!==null&&(e.getClearColor(this._oldClearColor),e.setClearColor(this.clearColor)),this.clearAlpha!==null&&(s=e.getClearAlpha(),e.setClearAlpha(this.clearAlpha)),this.clearDepth==!0&&e.clearDepth(),e.setRenderTarget(this.renderToScreen?null:a),this.clear===!0&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),e.render(this.scene,this.camera),this.clearColor!==null&&e.setClearColor(this._oldClearColor),this.clearAlpha!==null&&e.setClearAlpha(s),this.overrideMaterial!==null&&(this.scene.overrideMaterial=r),e.autoClear=o}}let R,X;const $=0;X=new G;const k=new pe,f=new ge(40,window.innerWidth/window.innerHeight,1,100),_=new ve({canvas:document.querySelector("#bg"),antialias:!1});_.setPixelRatio(window.devicePixelRatio);_.setSize(window.innerWidth,window.innerHeight);f.position.setZ(30);f.position.setX(0);const F=new we(16777215);F.position.set(5,5,5);F.layers.enable($);const K=new be(16777215);K.layers.enable($);k.add(F,K);let p={time:{value:0},breakawayThreshold:{value:.7},orbitalRadii:{value:new S(10,15,20)},isBook:{value:0}},Z=[],J=[],ee=[],te=[],V=[10,10,10,15,15,20],W=[1,-1],ze=new Array(300).fill().map(()=>{Z.push(Math.random()*1.5+.5),J.push(Math.random());let t=V[Math.floor(Math.random()*V.length)];const e=Math.random()*2*Math.PI;let i=W[Math.floor(Math.random()*W.length)];te.push(i),ee.push(t);let a=t*Math.cos(e),o=t*Math.sin(e),s=-30;return new S(a,o,s)});k.background=new j(1441814);let P=new B().setFromPoints(ze);P.setAttribute("sizes",new x(Z,1));P.setAttribute("breakaway",new x(J,1));P.setAttribute("initRadius",new x(ee,1));P.setAttribute("direction",new ye(te,1));let Re=new H({size:.5,transparent:!0,depthTest:!0,blending:N,onBeforeCompile:t=>{t.uniforms.time=p.time,t.uniforms.isBook=p.isBook,t.uniforms.breakawayThreshold=p.breakawayThreshold,t.vertexShader=`
      uniform float time;
      uniform float isBook;
      uniform float breakawayThreshold;
      uniform vec3 orbitalRadii;

      attribute float initRadius;
      attribute float sizes;
      attribute float breakaway;
      attribute int direction;
      varying vec3 vColor;
      ${t.vertexShader}
    `.replace("gl_PointSize = size;","gl_PointSize = size * sizes;").replace("#include <color_vertex>",`#include <color_vertex>
        float d = abs(position.y) / 30.0;
        d = pow(d, 0.5);
        d = clamp(d, 0., 1.);
        vColor = mix(vec3(227., 155., 0.), vec3(100., 50., 255.), d) / 255.;
      `).replace("#include <begin_vertex>",`#include <begin_vertex>
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
      `),t.fragmentShader=`
      varying vec3 vColor;
      ${t.fragmentShader}
    `.replace("#include <clipping_planes_fragment>",`#include <clipping_planes_fragment>
        float d = length(gl_PointCoord - vec2(0.5, 0.5));
        d = smoothstep(0.5, 0.1, d);
      `).replace("vec4 diffuseColor = vec4( diffuse, opacity );","vec4 diffuseColor = vec4( vColor, d );")}}),y=new Y(P,Re);y.rotation.order="ZYX";y.rotation.z=0;k.add(y);const Ae=new Te(k,f);R=new Me(_);R.addPass(Ae);const Ee={uniforms:{tDiffuse:{value:null},time:{value:0},lineThickness:{value:1}},vertexShader:`
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
  `},L=new D(Ee),Le={uniforms:{tDiffuse:{value:null},time:{value:0},lineThickness:{value:.02}},vertexShader:`
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
  `},T=new D(Le);R.addPass(T);function ie(){document.body.getBoundingClientRect().top}document.body.onscroll=ie;ie();document.querySelector(".menu-toggle").addEventListener("click",()=>{document.querySelector(".side-menu").classList.toggle("expanded")});document.querySelector('a[href="#publications"]').addEventListener("click",t=>{t.preventDefault(),Be()});function Be(){document.getElementById("publications").scrollIntoView({behavior:"smooth"}),f.position.clone(),f.rotation.clone();const e=2e3,i=performance.now();n.visible=!0,n.material.opacity=0,n.scale.set(.1,.1,.1);function a(o){const s=o-i,r=Math.min(s/e,1),c=r<.5?2*r*r:1-Math.pow(-2*r+2,2)/2;if(f.position.z=30-c*60,r>.4){const g=Math.min((r-.4)/.6,1);n.material.opacity=g;const v=.1+g*.9;n.scale.set(v,v,v)}r<1?requestAnimationFrame(a):n.visible=!0}requestAnimationFrame(a)}const De=new H({size:.5,transparent:!0,depthTest:!0,blending:N,onBeforeCompile:t=>{t.uniforms.time=p.time,t.uniforms.isBook={value:1},t.vertexShader=`
      uniform float time;
      attribute float sizes;
      varying vec3 vColor;
      
      // Book-specific gentle floating animation
      vec3 gentleFloat(vec3 pos, float time) {
        float yOffset = sin(time * 0.5) * 0.1; // Gentle Y oscillation
        float xOffset = cos(time * 0.3) * 0.05; // Subtle X movement
        return vec3(pos.x + xOffset, pos.y + yOffset, pos.z);
      }
      
      ${t.vertexShader}
    `.replace("gl_PointSize = size;","gl_PointSize = size * sizes;").replace("#include <color_vertex>",`#include <color_vertex>
        float d = abs(position.y) / 20.0; // Adjusted for book height
        d = pow(d, 0.5);
        d = clamp(d, 0., 1.);
        vColor = mix(vec3(227., 155., 0.), vec3(100., 50., 255.), d) / 255.;
      `).replace("#include <begin_vertex>",`#include <begin_vertex>
        // Apply gentle floating animation instead of orbital motion
        transformed = gentleFloat(position, time);
      `),t.fragmentShader=`
      varying vec3 vColor;
      ${t.fragmentShader}
    `.replace("#include <clipping_planes_fragment>",`#include <clipping_planes_fragment>
        float d = length(gl_PointCoord - vec2(0.5, 0.5));
        d = smoothstep(0.5, 0.1, d);
      `).replace("vec4 diffuseColor = vec4( diffuse, opacity );","vec4 diffuseColor = vec4( vColor, d );")}});function Fe(){const t=[],e=[];function s(d,u,h,l){const[w,b,C]=d;for(let m=0;m<u;m++)t.push(new S(w+(Math.random()-.5)*h,b+(Math.random()-.5)*h,C+(Math.random()-.5)*h)),e.push(l)}function r(d,u,h,l,w){const[b,C]=d,[m,A]=u;for(let M=0;M<l;M++){const oe=Math.floor(M/Math.sqrt(l))/Math.sqrt(l),ae=M%Math.sqrt(l)/Math.sqrt(l),re=b+(C-b)*oe,ne=m+(A-m)*ae,E=.2;t.push(new S(re+(Math.random()-.5)*E,ne+(Math.random()-.5)*E,h+(Math.random()-.5)*E));const[U,le]=w;e.push(Math.random()*(le-U)+U)}}r([-15/2,15/2],[-20/2,20/2],4/2,100,[.3,.8]),r([-15/2,15/2],[-20/2,20/2],-4/2,100,[.3,.8]),r([-15/2-.5,-15/2+.5],[-20/2,20/2],0,50,[.2,.6]);const c=10;for(let d=0;d<c;d++){const u=4*(d/c-.5)*.8,h=20;for(let l=0;l<h;l++){const w=l/h,b=-15/2+15*w,C=(Math.random()-.5)*20*.95,m=Math.sin(w*Math.PI)*(4/8),A=u+m;t.push(new S(b,C,A)),e.push(Math.random()*.3+.2)}}[[[-15/2,-20/2,0],10,.3,1.2],[[-15/2,20/2,0],10,.3,1.2],[[15/2,-20/2,4/2],10,.3,1.2],[[15/2,20/2,4/2],10,.3,1.2],[[15/2,-20/2,-4/2],10,.3,1.2],[[15/2,20/2,-4/2],10,.3,1.2]].forEach(([d,u,h,l])=>{s(d,u,h,l)});const v=new B().setFromPoints(t);return v.setAttribute("sizes",new x(e,1)),v}const n=new Y(Fe(),De);n.visible=!1;n.position.set(0,0,-100);n.rotation.order="YXZ";n.rotation.y=Math.PI*.6;n.rotation.x=Math.PI*.45;k.add(n);document.getElementById("home-button").addEventListener("click",t=>{t.preventDefault(),window.scrollTo({top:0,behavior:"smooth"}),f.position.set(0,0,30),f.rotation.set(0,0,0),n&&(n.visible=!1,bookUniforms&&bookUniforms.openAmount&&(bookUniforms.openAmount.value=0)),y&&(y.visible=!0,y.rotation.set(0,0,0),p.breakawayThreshold.value=.7),p.time.value=0,T&&(T.uniforms.time.value=0),L&&(L.uniforms.time.value=0)});document.addEventListener("DOMContentLoaded",()=>{const t=document.querySelector(".side-menu");window.innerWidth>=768&&t.classList.add("expanded"),window.addEventListener("resize",()=>{window.innerWidth>=768?t.classList.add("expanded"):t.classList.remove("expanded")}),document.querySelector(".menu-toggle").addEventListener("click",()=>{t.classList.toggle("expanded")})});function se(){requestAnimationFrame(se),_.autoClear=!1,_.clear();let t=X.getElapsedTime();p.time.value=t*Math.PI,T.uniforms.time.value+=.05,L.uniforms.time.value+=.05,R.render()}const Q=document.querySelectorAll(".arrow");function Ue(){window.scrollY>300?Q.forEach(e=>{e.style.display="none"}):Q.forEach(e=>{e.style.display="block"})}window.addEventListener("scroll",Ue);se();
