/* Silk — a single, restrained WebGL moment (hero + story banner).
   Raw WebGL, no libraries, works from file:// . Falls back to a CSS gradient if WebGL is unavailable. */
(function(){
  function silk(canvas,opt){
    opt=opt||{};
    const gl=canvas.getContext('webgl',{antialias:true,alpha:false,powerPreference:'low-power'});
    const fb=canvas.parentElement.querySelector('.fallback');
    if(!gl){return}
    const pal=opt.palette||{a:[.55,.38,.24],b:[.86,.72,.52],c:[.99,.94,.84]};
    const vs=`attribute vec2 p;uniform float t;uniform vec2 m;uniform float asp;varying vec3 vN;varying float vH;varying vec2 vUv;
    float h(vec2 q){
      float d=length(q-m);
      return .20*sin(q.x*1.9+q.y*1.2+t*.42)+.13*sin(q.x*3.4-q.y*2.1-t*.33)+.035*sin(q.y*5.0+q.x*1.6+t*.55)
            +.12*sin(d*3.6-t*.7)*exp(-d*1.1);
    }
    void main(){
      vec2 q=p*vec2(asp,1.0)*.9; float e=.012; float z=h(q);
      vec3 n=normalize(vec3(-(h(q+vec2(e,0.))-z)/e,-(h(q+vec2(0.,e))-z)/e,1.0));
      vN=n; vH=z; vUv=p*.5+.5;
      gl_Position=vec4(p.x*1.04,p.y*1.04,-z*.15,1.0-z*.10);
    }`;
    const fs=`#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec3 vN;varying float vH;varying vec2 vUv;uniform vec3 ca,cb,cc;uniform float t;
    float rnd(vec2 s){return fract(sin(dot(s,vec2(12.9898,78.233)))*43758.5453);}
    void main(){
      vec3 n=normalize(vN); vec3 L=normalize(vec3(-.45,.55,.7)); vec3 V=vec3(0.,0.,1.);
      float diff=clamp(dot(n,L)*.5+.5,0.,1.);
      vec3 R=reflect(-L,n); float sp=pow(max(dot(R,V),0.),9.);
      float sheen=pow(1.-abs(dot(n,V)),2.2)*.35;
      vec3 col=mix(ca,cb,smoothstep(.15,.85,diff));
      col=mix(col,cc,sp*.38+sheen*.35);
      col*=.88+.2*smoothstep(-.4,.5,vH);
      col*=1.-.28*length(vUv-.5);
      col+=(rnd(gl_FragCoord.xy+t)-.5)*.028;
      gl_FragColor=vec4(col,1.);
    }`;
    function sh(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){console.warn(gl.getShaderInfoLog(s));return null}return s}
    const v=sh(gl.VERTEX_SHADER,vs),f=sh(gl.FRAGMENT_SHADER,fs); if(!v||!f)return;
    const pr=gl.createProgram();gl.attachShader(pr,v);gl.attachShader(pr,f);gl.linkProgram(pr);
    if(!gl.getProgramParameter(pr,gl.LINK_STATUS)){console.warn(gl.getProgramInfoLog(pr));return}
    gl.useProgram(pr);
    const N=90, verts=[], idx=[];
    for(let y=0;y<=N;y++)for(let x=0;x<=N;x++)verts.push(x/N*2-1,y/N*2-1);
    for(let y=0;y<N;y++)for(let x=0;x<N;x++){const a=y*(N+1)+x,b=a+1,c=a+N+1,d=c+1;idx.push(a,b,c,b,d,c)}
    const vb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(verts),gl.STATIC_DRAW);
    const ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(idx),gl.STATIC_DRAW);
    const loc=gl.getAttribLocation(pr,'p');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    const U=n=>gl.getUniformLocation(pr,n);
    const uT=U('t'),uM=U('m'),uA=U('asp');
    gl.uniform3fv(U('ca'),pal.a);gl.uniform3fv(U('cb'),pal.b);gl.uniform3fv(U('cc'),pal.c);
    let mx=0,my=0,tx=0,ty=0,run=true,vis=true,t0=performance.now(),w=0,h=0;
    const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
    function size(){const d=Math.min(devicePixelRatio||1,1.5);const r=canvas.getBoundingClientRect();w=Math.max(2,r.width*d|0);h=Math.max(2,r.height*d|0);canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);gl.uniform1f(uA,w/h)}
    size();addEventListener('resize',size);
    addEventListener('pointermove',e=>{const r=canvas.getBoundingClientRect();tx=((e.clientX-r.left)/r.width*2-1)*1.2;ty=-((e.clientY-r.top)/r.height*2-1)});
    new IntersectionObserver(es=>{vis=es[0].isIntersecting}).observe(canvas);
    document.addEventListener('visibilitychange',()=>{run=!document.hidden});
    function draw(now){
      if(run&&vis){
        mx+=(tx-mx)*.04;my+=(ty-my)*.04;
        gl.uniform1f(uT,(now-t0)/1000);gl.uniform2f(uM,mx,my);
        gl.drawElements(gl.TRIANGLES,idx.length,gl.UNSIGNED_SHORT,0);
      }
      if(!reduce)requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
    if(reduce){gl.uniform1f(uT,4);gl.drawElements(gl.TRIANGLES,idx.length,gl.UNSIGNED_SHORT,0)}
    canvas.classList.add('live'); if(fb)fb.style.opacity=0;
  }
  window.NSSilk=silk;
})();
