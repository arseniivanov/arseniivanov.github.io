import{a as p,e as M,V as w}from"./three.module.d62d6700.js";import u from"https://cdn.skypack.dev/delaunator@5.0.0";const o=document.getElementById("cnv");console.clear();let y=new p(0),R=new p(3025450),f=new p,c=[],r=[],i=140;function g(){o.width=innerWidth,o.height=innerHeight,c=[],r=[];for(let a=-i;a<o.height+i*2;a+=i)for(let n=-i;n<o.width+i*2;n+=i){let m=new w(n,a+i*.5);m.move={r:Math.random()*1+40,phase:Math.random()*Math.PI*2,speedRatioX:(Math.random()*2+.5)*(Math.random()<.5?-1:1),speedRatioY:(Math.random()*.5+.5)*(Math.random()<.5?-1:1),pRmin:2,pRdif:5},m.colorOffset=Math.random()*.2-.1,c.push(m)}r=new Array(c.length).fill().map(a=>[0,0])}g();window.addEventListener("resize",a=>{g()});let e=o.getContext("2d"),x=performance.now();v();function v(){let a=(performance.now()-x)*.001;a*=.25,r.forEach((l,h)=>{let t=c[h];l[0]=t.x+Math.cos(t.move.phase+a*t.move.speedRatioX)*t.move.r;let s=o.height+i*2+(t.y-a*100-(o.height+i*1.5))%(o.height+i*3);l[1]=s+Math.sin(t.move.phase+a*t.move.speedRatioY)*t.move.r});let n=u.from(r).triangles,m=n.length/3;e.clearRect(0,0,o.width,o.height),e.save(),e.strokeStyle="#f40",e.lineWidth=1,e.lineJoin="round";for(let l=0;l<m;l++){let h=r[n[l*3+0]],t=r[n[l*3+1]],s=r[n[l*3+2]],d=M.clamp((h[1]+t[1]+s[1])/3/o.height,0,1);d=Math.max(0,d*1.333-.333),f.lerpColors(y,R,d),e.fillStyle="#"+f.getHexString(),e.beginPath(),e.moveTo(h[0],h[1]),e.lineTo(t[0],t[1]),e.lineTo(s[0],s[1]),e.closePath(),e.fill()}e.fillStyle="#FFA500",e.strokeStyle="#FFA500",e.lineWidth=2,r.forEach((l,h)=>{let t=c[h].move,s=Math.sin(t.phase+a*4)*.5+.5;e.beginPath(),e.arc(l[0],l[1],s*t.pRdif+t.pRmin,0,Math.PI*2,!1),e.closePath(),e.fill(),e.stroke()}),e.restore(),requestAnimationFrame(v)}
