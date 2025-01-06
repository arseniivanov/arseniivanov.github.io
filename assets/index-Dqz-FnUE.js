import{O as ce,M as he,B as D,F as x,S as O,U as fe,V as I,W as de,H as ue,N as me,C as W,a as j,b as pe,P as ge,c as ve,d as we,A as be,e as S,I as ye,f as H,g as N,h as Y}from"./three.module-Ofi0PdTS.js";const xe={name:"CopyShader",uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

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


		}`};class R{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error("THREE.Pass: .render() must be implemented in derived pass.")}dispose(){}}const Ce=new ce(-1,1,1,-1,0,1);class Se extends D{constructor(){super(),this.setAttribute("position",new x([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new x([0,2,0,0,2,0],2))}}const _e=new Se;class Pe{constructor(e){this._mesh=new he(_e,e)}dispose(){this._mesh.geometry.dispose()}render(e){e.render(this._mesh,Ce)}get material(){return this._mesh.material}set material(e){this._mesh.material=e}}class L extends R{constructor(e,t){super(),this.textureID=t!==void 0?t:"tDiffuse",e instanceof O?(this.uniforms=e.uniforms,this.material=e):e&&(this.uniforms=fe.clone(e.uniforms),this.material=new O({name:e.name!==void 0?e.name:"unspecified",defines:Object.assign({},e.defines),uniforms:this.uniforms,vertexShader:e.vertexShader,fragmentShader:e.fragmentShader})),this.fsQuad=new Pe(this.material)}render(e,t,a){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=a.texture),this.fsQuad.material=this.material,this.renderToScreen?(e.setRenderTarget(null),this.fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this.fsQuad.render(e))}dispose(){this.material.dispose(),this.fsQuad.dispose()}}class q extends R{constructor(e,t){super(),this.scene=e,this.camera=t,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(e,t,a){const o=e.getContext(),s=e.state;s.buffers.color.setMask(!1),s.buffers.depth.setMask(!1),s.buffers.color.setLocked(!0),s.buffers.depth.setLocked(!0);let r,c;this.inverse?(r=0,c=1):(r=1,c=0),s.buffers.stencil.setTest(!0),s.buffers.stencil.setOp(o.REPLACE,o.REPLACE,o.REPLACE),s.buffers.stencil.setFunc(o.ALWAYS,r,4294967295),s.buffers.stencil.setClear(c),s.buffers.stencil.setLocked(!0),e.setRenderTarget(a),this.clear&&e.clear(),e.render(this.scene,this.camera),e.setRenderTarget(t),this.clear&&e.clear(),e.render(this.scene,this.camera),s.buffers.color.setLocked(!1),s.buffers.depth.setLocked(!1),s.buffers.color.setMask(!0),s.buffers.depth.setMask(!0),s.buffers.stencil.setLocked(!1),s.buffers.stencil.setFunc(o.EQUAL,1,4294967295),s.buffers.stencil.setOp(o.KEEP,o.KEEP,o.KEEP),s.buffers.stencil.setLocked(!0)}}class ke extends R{constructor(){super(),this.needsSwap=!1}render(e){e.state.buffers.stencil.setLocked(!1),e.state.buffers.stencil.setTest(!1)}}class Me{constructor(e,t){if(this.renderer=e,this._pixelRatio=e.getPixelRatio(),t===void 0){const a=e.getSize(new I);this._width=a.width,this._height=a.height,t=new de(this._width*this._pixelRatio,this._height*this._pixelRatio,{type:ue}),t.texture.name="EffectComposer.rt1"}else this._width=t.width,this._height=t.height;this.renderTarget1=t,this.renderTarget2=t.clone(),this.renderTarget2.texture.name="EffectComposer.rt2",this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],this.copyPass=new L(xe),this.copyPass.material.blending=me,this.clock=new W}swapBuffers(){const e=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=e}addPass(e){this.passes.push(e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(e,t){this.passes.splice(t,0,e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(e){const t=this.passes.indexOf(e);t!==-1&&this.passes.splice(t,1)}isLastEnabledPass(e){for(let t=e+1;t<this.passes.length;t++)if(this.passes[t].enabled)return!1;return!0}render(e){e===void 0&&(e=this.clock.getDelta());const t=this.renderer.getRenderTarget();let a=!1;for(let o=0,s=this.passes.length;o<s;o++){const r=this.passes[o];if(r.enabled!==!1){if(r.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(o),r.render(this.renderer,this.writeBuffer,this.readBuffer,e,a),r.needsSwap){if(a){const c=this.renderer.getContext(),g=this.renderer.state.buffers.stencil;g.setFunc(c.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,e),g.setFunc(c.EQUAL,1,4294967295)}this.swapBuffers()}q!==void 0&&(r instanceof q?a=!0:r instanceof ke&&(a=!1))}}this.renderer.setRenderTarget(t)}reset(e){if(e===void 0){const t=this.renderer.getSize(new I);this._pixelRatio=this.renderer.getPixelRatio(),this._width=t.width,this._height=t.height,e=this.renderTarget1.clone(),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=e,this.renderTarget2=e.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(e,t){this._width=e,this._height=t;const a=this._width*this._pixelRatio,o=this._height*this._pixelRatio;this.renderTarget1.setSize(a,o),this.renderTarget2.setSize(a,o);for(let s=0;s<this.passes.length;s++)this.passes[s].setSize(a,o)}setPixelRatio(e){this._pixelRatio=e,this.setSize(this._width,this._height)}dispose(){this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.copyPass.dispose()}}class Te extends R{constructor(e,t,a=null,o=null,s=null){super(),this.scene=e,this.camera=t,this.overrideMaterial=a,this.clearColor=o,this.clearAlpha=s,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this._oldClearColor=new j}render(e,t,a){const o=e.autoClear;e.autoClear=!1;let s,r;this.overrideMaterial!==null&&(r=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor!==null&&(e.getClearColor(this._oldClearColor),e.setClearColor(this.clearColor)),this.clearAlpha!==null&&(s=e.getClearAlpha(),e.setClearAlpha(this.clearAlpha)),this.clearDepth==!0&&e.clearDepth(),e.setRenderTarget(this.renderToScreen?null:a),this.clear===!0&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),e.render(this.scene,this.camera),this.clearColor!==null&&e.setClearColor(this._oldClearColor),this.clearAlpha!==null&&e.setClearAlpha(s),this.overrideMaterial!==null&&(this.scene.overrideMaterial=r),e.autoClear=o}}let z,X;const $=0;X=new W;const P=new pe,d=new ge(40,window.innerWidth/window.innerHeight,1,100),_=new ve({canvas:document.querySelector("#bg"),antialias:!1});_.setPixelRatio(window.devicePixelRatio);_.setSize(window.innerWidth,window.innerHeight);d.position.setZ(30);d.position.setX(0);const F=new we(16777215);F.position.set(5,5,5);F.layers.enable($);const K=new be(16777215);K.layers.enable($);P.add(F,K);let p={time:{value:0},breakawayThreshold:{value:.7},orbitalRadii:{value:new S(10,15,20)},isBook:{value:0}},Z=[],J=[],ee=[],te=[],V=[10,10,10,15,15,20],Q=[1,-1],Re=new Array(300).fill().map(()=>{Z.push(Math.random()*1.5+.5),J.push(Math.random());let i=V[Math.floor(Math.random()*V.length)];const e=Math.random()*2*Math.PI;let t=Q[Math.floor(Math.random()*Q.length)];te.push(t),ee.push(i);let a=i*Math.cos(e),o=i*Math.sin(e),s=-30;return new S(a,o,s)});P.background=new j(1441814);let k=new D().setFromPoints(Re);k.setAttribute("sizes",new x(Z,1));k.setAttribute("breakaway",new x(J,1));k.setAttribute("initRadius",new x(ee,1));k.setAttribute("direction",new ye(te,1));let ze=new H({size:.5,transparent:!0,depthTest:!0,blending:N,onBeforeCompile:i=>{i.uniforms.time=p.time,i.uniforms.isBook=p.isBook,i.uniforms.breakawayThreshold=p.breakawayThreshold,i.vertexShader=`
      uniform float time;
      uniform float isBook;
      uniform float breakawayThreshold;
      uniform vec3 orbitalRadii;

      attribute float initRadius;
      attribute float sizes;
      attribute float breakaway;
      attribute int direction;
      varying vec3 vColor;
      ${i.vertexShader}
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
      `),i.fragmentShader=`
      varying vec3 vColor;
      ${i.fragmentShader}
    `.replace("#include <clipping_planes_fragment>",`#include <clipping_planes_fragment>
        float d = length(gl_PointCoord - vec2(0.5, 0.5));
        d = smoothstep(0.5, 0.1, d);
      `).replace("vec4 diffuseColor = vec4( diffuse, opacity );","vec4 diffuseColor = vec4( vColor, d );")}}),y=new Y(k,ze);y.rotation.order="ZYX";y.rotation.z=0;P.add(y);const Ae=new Te(P,d);z=new Me(_);z.addPass(Ae);const Ee={uniforms:{tDiffuse:{value:null},time:{value:0},lineThickness:{value:1}},vertexShader:`
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
  `},B=new L(Ee),Be={uniforms:{tDiffuse:{value:null},time:{value:0},lineThickness:{value:.02}},vertexShader:`
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
  `},T=new L(Be);z.addPass(T);function ie(){document.body.getBoundingClientRect().top}document.body.onscroll=ie;ie();document.querySelector(".menu-toggle").addEventListener("click",()=>{document.querySelector(".side-menu").classList.toggle("expanded")});document.querySelector('a[href="#publications"]').addEventListener("click",i=>{i.preventDefault(),De()});function De(){document.getElementById("publications").scrollIntoView({behavior:"smooth"}),d.position.clone(),d.rotation.clone();const e=2e3,t=performance.now();n.visible=!0,n.material.opacity=0,n.scale.set(.1,.1,.1);function a(o){const s=o-t,r=Math.min(s/e,1),c=r<.5?2*r*r:1-Math.pow(-2*r+2,2)/2;if(d.position.z=30-c*60,r>.4){const g=Math.min((r-.4)/.6,1);n.material.opacity=g;const v=.1+g*.9;n.scale.set(v,v,v)}r<1?requestAnimationFrame(a):n.visible=!0}requestAnimationFrame(a)}const Le=new H({size:.5,transparent:!0,depthTest:!0,blending:N,onBeforeCompile:i=>{i.uniforms.time=p.time,i.uniforms.isBook={value:1},i.vertexShader=`
      uniform float time;
      attribute float sizes;
      varying vec3 vColor;
      
      // Book-specific gentle floating animation
      vec3 gentleFloat(vec3 pos, float time) {
        float yOffset = sin(time * 0.5) * 0.1; // Gentle Y oscillation
        float xOffset = cos(time * 0.3) * 0.05; // Subtle X movement
        return vec3(pos.x + xOffset, pos.y + yOffset, pos.z);
      }
      
      ${i.vertexShader}
    `.replace("gl_PointSize = size;","gl_PointSize = size * sizes;").replace("#include <color_vertex>",`#include <color_vertex>
        float d = abs(position.y) / 20.0; // Adjusted for book height
        d = pow(d, 0.5);
        d = clamp(d, 0., 1.);
        vColor = mix(vec3(227., 155., 0.), vec3(100., 50., 255.), d) / 255.;
      `).replace("#include <begin_vertex>",`#include <begin_vertex>
        // Apply gentle floating animation instead of orbital motion
        transformed = gentleFloat(position, time);
      `),i.fragmentShader=`
      varying vec3 vColor;
      ${i.fragmentShader}
    `.replace("#include <clipping_planes_fragment>",`#include <clipping_planes_fragment>
        float d = length(gl_PointCoord - vec2(0.5, 0.5));
        d = smoothstep(0.5, 0.1, d);
      `).replace("vec4 diffuseColor = vec4( diffuse, opacity );","vec4 diffuseColor = vec4( vColor, d );")}});function Fe(){const i=[],e=[];function s(f,u,h,l){const[w,b,C]=f;for(let m=0;m<u;m++)i.push(new S(w+(Math.random()-.5)*h,b+(Math.random()-.5)*h,C+(Math.random()-.5)*h)),e.push(l)}function r(f,u,h,l,w){const[b,C]=f,[m,A]=u;for(let M=0;M<l;M++){const oe=Math.floor(M/Math.sqrt(l))/Math.sqrt(l),ae=M%Math.sqrt(l)/Math.sqrt(l),re=b+(C-b)*oe,ne=m+(A-m)*ae,E=.2;i.push(new S(re+(Math.random()-.5)*E,ne+(Math.random()-.5)*E,h+(Math.random()-.5)*E));const[U,le]=w;e.push(Math.random()*(le-U)+U)}}r([-15/2,15/2],[-20/2,20/2],4/2,100,[.3,.8]),r([-15/2,15/2],[-20/2,20/2],-4/2,100,[.3,.8]),r([-15/2-.5,-15/2+.5],[-20/2,20/2],0,50,[.2,.6]);const c=10;for(let f=0;f<c;f++){const u=4*(f/c-.5)*.8,h=20;for(let l=0;l<h;l++){const w=l/h,b=-15/2+15*w,C=(Math.random()-.5)*20*.95,m=Math.sin(w*Math.PI)*(4/8),A=u+m;i.push(new S(b,C,A)),e.push(Math.random()*.3+.2)}}[[[-15/2,-20/2,0],10,.3,1.2],[[-15/2,20/2,0],10,.3,1.2],[[15/2,-20/2,4/2],10,.3,1.2],[[15/2,20/2,4/2],10,.3,1.2],[[15/2,-20/2,-4/2],10,.3,1.2],[[15/2,20/2,-4/2],10,.3,1.2]].forEach(([f,u,h,l])=>{s(f,u,h,l)});const v=new D().setFromPoints(i);return v.setAttribute("sizes",new x(e,1)),v}const n=new Y(Fe(),Le);n.visible=!1;n.position.set(0,0,-100);n.rotation.order="YXZ";n.rotation.y=Math.PI*.6;n.rotation.x=Math.PI*.45;P.add(n);document.getElementById("home-button").addEventListener("click",i=>{i.preventDefault(),window.scrollTo({top:0,behavior:"smooth"}),d.position.set(0,0,30),d.rotation.set(0,0,0),n&&(n.visible=!1,bookUniforms&&bookUniforms.openAmount&&(bookUniforms.openAmount.value=0)),y&&(y.visible=!0,y.rotation.set(0,0,0),p.breakawayThreshold.value=.7),p.time.value=0,T&&(T.uniforms.time.value=0),B&&(B.uniforms.time.value=0)});function se(){requestAnimationFrame(se),_.autoClear=!1,_.clear();let i=X.getElapsedTime();p.time.value=i*Math.PI,T.uniforms.time.value+=.05,B.uniforms.time.value+=.05,z.render()}const G=document.querySelectorAll(".arrow");function Ue(){window.scrollY>300?G.forEach(e=>{e.style.display="none"}):G.forEach(e=>{e.style.display="block"})}window.addEventListener("scroll",Ue);se();
