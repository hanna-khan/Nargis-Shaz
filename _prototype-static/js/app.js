/* Nargis & Shaz — site behaviour */
(function(){
const D=window.NS_DATA, A=window.NSArt;
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const money=n=>D.currency+Number(n).toLocaleString('en-US');
const byId=id=>D.products.find(p=>p.id===id);
const qs=new URLSearchParams(location.search);
const page=document.body.dataset.page||'';
const safe=(fn)=>{try{return fn()}catch(e){console.error(e)}};

/* ---------- imagery ---------- */
function pArt(p,ci,view,label){
  const c=p.colors[ci||0]; view=view||0;
  if(p.photos&&p.photos[view])return `<img src="${p.photos[view]}" alt="${label||p.name}" loading="lazy">`;
  const scenes=[c.s,c.s,'oat','clay'];
  return A.art(p.kind,{color:c.c,scene:scenes[view%4],view:view,accent:p.accent,label:`${p.name} in ${c.n}`});
}
function hydrate(root){
  $$('[data-art]',root).forEach(el=>{
    if(el.dataset.done)return; el.dataset.done=1;
    const [kind,color,scene,view,accent]=el.dataset.art.split(',');
    const svg=A.art(kind,{color,scene,view:view||0,accent:accent==='1',label:el.dataset.label||''});
    el.insertAdjacentHTML('afterbegin',svg);
  });
}
function card(p,i){
  return `<a class="card hov" href="product.html?id=${p.id}" data-r style="--i:${(i||0)%4}">
   <div class="ph">${pArt(p,0,0)}<div class="alt">${pArt(p,0,2)}</div>${p.isNew?'<span class="tag">New</span>':''}<span class="quick">Choose a size</span></div>
   <div class="meta"><div><h3>${p.name}</h3><div class="sw">${p.colors.map(x=>`<i style="background:${A.COL[x.c]}" title="${x.n}"></i>`).join('')}</div></div><div class="price">${money(p.price)}</div></div></a>`;
}

/* ---------- chrome (header, drawers, footer) ---------- */
const cats=D.categories.map(c=>`<li><a href="shop.html?cat=${c.id}">${c.label}</a></li>`).join('');
const occs=D.occasions.map(c=>`<li><a href="shop.html?occ=${c.id}">${c.label}</a></li>`).join('');
const icon={
  search:'<svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/></svg>',
  user:'<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4.5 4-6.5 8-6.5s7 2 8 6.5"/></svg>',
  bag:'<svg viewBox="0 0 24 24"><path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 016 0v2"/></svg>',
  menu:'<svg viewBox="0 0 24 24"><path d="M3 8h18M3 16h18"/></svg>'
};
function buildChrome(){
  const over=document.body.dataset.hero==='1';
  const bar=`<div class="bar" id="bar">Complimentary shipping over ${money(D.freeShipping)} &nbsp;·&nbsp; Free returns within 30 days<button aria-label="Close" id="barx">×</button></div>`;
  const header=`<header class="header ${over?'over':'solid'}" id="header">
    <div class="left">
      <button class="burger" id="menuBtn" aria-label="Menu">${icon.menu.replace('<svg','<svg width="22" height="22" stroke="currentColor" fill="none" stroke-width="1.2"')}</button>
      <ul class="nav">
        <li><a href="shop.html?new=1">New In</a></li>
        <li><a href="shop.html">Shop</a>
          <div class="mega">
            <div><h6>By category</h6><ul>${cats}</ul></div>
            <div><h6>By occasion</h6><ul>${occs}</ul></div>
            <div><h6>Highlights</h6><ul><li><a href="shop.html?new=1">New arrivals</a></li><li><a href="shop.html?occ=festive">Festive edit</a></li><li><a href="shop.html?cat=accessories">Gifts & accessories</a></li></ul></div>
            <a class="tile hov" href="shop.html?occ=work"><div class="ph" data-art="coat,camel,night,0"></div><span>The Working Edit</span></a>
            <a class="tile hov" href="shop.html?occ=festive"><div class="ph" data-art="dress,navy,camel,0,1"></div><span>Jashn</span></a>
          </div></li>
        <li><a href="shop.html?occ=casual">Collections</a>
          <div class="mega">
            <div><h6>Collections</h6><ul>${D.collections.map(c=>`<li><a href="shop.html?occ=${c.id}">${c.title}</a></li>`).join('')}</ul></div>
            <div><h6>Moments</h6><ul><li><a href="shop.html?occ=work">Office to evening</a></li><li><a href="shop.html?occ=festive">Weddings & Eid</a></li><li><a href="shop.html?occ=casual">Weekend wardrobe</a></li></ul></div>
            <div><h6>Discover</h6><ul><li><a href="story.html">Our story</a></li><li><a href="story.html#craft">The craft</a></li></ul></div>
            <a class="tile hov" href="shop.html?occ=formal"><div class="ph" data-art="dress,burgundy,oat,0"></div><span>Evening</span></a>
            <a class="tile hov" href="shop.html?occ=casual"><div class="ph" data-art="knit,sage,blush,0"></div><span>Everyday</span></a>
          </div></li>
        <li><a href="story.html">Our Story</a></li>
      </ul>
    </div>
    <a class="logo" href="index.html" aria-label="Nargis and Shaz — home">Nargis<i>&amp;</i>Shaz</a>
    <div class="tools">
      <button id="searchBtn" aria-label="Search">${icon.search}<span class="hide-m">Search</span></button>
      <a class="hide-m" href="story.html" aria-label="Account">${icon.user}</a>
      <button id="cartBtn" aria-label="Bag">${icon.bag}<span class="count" id="count" data-n="0"></span></button>
    </div></header>`;
  const menu=`<div class="drawer left" id="menuDrawer"><div class="scrim" data-close></div><aside class="panel">
    <div class="head"><h4>Menu</h4><button class="x" data-close aria-label="Close">×</button></div>
    <div class="body"><ul class="macc">
      <li><a href="shop.html?new=1">New In</a></li>
      <li><button>Shop <span>+</span></button><div class="sub"><ul>${D.categories.map(c=>`<li><a href="shop.html?cat=${c.id}">${c.label}</a></li>`).join('')}</ul></div></li>
      <li><button>Collections <span>+</span></button><div class="sub"><ul>${D.collections.map(c=>`<li><a href="shop.html?occ=${c.id}">${c.title}</a></li>`).join('')}</ul></div></li>
      <li><a href="story.html">Our Story</a></li>
    </ul></div></aside></div>`;
  const cart=`<div class="drawer right" id="cartDrawer"><div class="scrim" data-close></div><aside class="panel">
    <div class="head"><h4>Your bag</h4><button class="x" data-close aria-label="Close">×</button></div>
    <div class="ship" id="shipMsg"></div>
    <div class="body" id="cartBody"></div>
    <div class="cart-foot" id="cartFoot"></div></aside></div>`;
  const search=`<div class="search" id="search"><div class="top"><span class="eyebrow">Search</span><button class="x" id="searchX" aria-label="Close">×</button></div>
    <input id="sInput" placeholder="Search dresses, coats, festive…" autocomplete="off"><div class="results" id="sRes"></div></div>`;
  const toast=`<div class="toast" id="toast"></div>`;
  $('#site-header').innerHTML=bar+header+menu+cart+search+toast;
  $('#site-footer').innerHTML=`
   ${page==='home'||page==='story'?'':''}
   <section class="news" data-r><span class="eyebrow">The letter</span>
     <h2 class="display h2" style="margin-top:16px">Stories, first <em>access</em>,<br>and quiet <em>invitations</em></h2>
     <form id="nl"><input type="email" required placeholder="Your email address" aria-label="Email"><button>Subscribe</button></form></section>
   <footer class="foot"><div class="foot-g">
     <div><div class="logo">Nargis<i>&amp;</i>Shaz</div><p style="max-width:300px;margin-top:18px;font-size:14px;opacity:.7">Considered clothing for working women, weekends and celebrations.</p></div>
     <div><h6>Shop</h6><ul><li><a href="shop.html?new=1">New in</a></li>${D.categories.slice(0,5).map(c=>`<li><a href="shop.html?cat=${c.id}">${c.label}</a></li>`).join('')}</ul></div>
     <div><h6>Occasions</h6><ul>${D.occasions.map(c=>`<li><a href="shop.html?occ=${c.id}">${c.label}</a></li>`).join('')}</ul></div>
     <div><h6>Our house</h6><ul><li><a href="story.html">Our story</a></li><li><a href="story.html#craft">The craft</a></li><li><a href="story.html#values">Values</a></li></ul></div>
     <div><h6>Help</h6><ul><li><a href="#">Size guide</a></li><li><a href="#">Delivery</a></li><li><a href="#">Returns</a></li><li><a href="#">Contact</a></li></ul></div>
   </div><div class="foot-b"><span>© ${new Date().getFullYear()} Nargis &amp; Shaz. All rights reserved.</span><span>Privacy · Terms · Cookies</span></div></footer>`;
}

/* ---------- drawers ---------- */
function openD(id){const d=$('#'+id);d.classList.add('open');document.body.classList.add('lock')}
function closeD(){$$('.drawer.open').forEach(d=>d.classList.remove('open'));document.body.classList.remove('lock')}
function wireChrome(){
  $('#menuBtn').onclick=()=>openD('menuDrawer');
  $('#cartBtn').onclick=()=>{renderCart();openD('cartDrawer')};
  $$('[data-close]').forEach(b=>b.onclick=closeD);
  $$('.macc>li>button').forEach(b=>b.onclick=()=>b.parentElement.classList.toggle('on'));
  const bar=$('#bar');$('#barx').onclick=()=>{bar.style.display='none';document.body.classList.add('bar-gone');document.documentElement.style.setProperty('--bar-h','0px')};
  const hd=$('#header');const over=hd.classList.contains('over');
  const on=()=>{const s=scrollY>50;hd.classList.toggle('solid',s||!over);hd.classList.toggle('stuck',scrollY>(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--bar-h'))||0)-2)};on();addEventListener('scroll',on,{passive:true});
  // search
  const S=$('#search'),inp=$('#sInput'),res=$('#sRes');
  const openS=()=>{S.classList.add('open');document.body.classList.add('lock');setTimeout(()=>inp.focus(),400);doS()};
  const closeS=()=>{S.classList.remove('open');document.body.classList.remove('lock')};
  function doS(){
    const q=inp.value.trim().toLowerCase();
    const list=(q?D.products.filter(p=>(p.name+' '+p.kind+' '+p.cat+' '+p.occ.join(' ')+' '+p.colors.map(c=>c.n).join(' ')).toLowerCase().includes(q)):D.products.filter(p=>p.isNew)).slice(0,8);
    res.innerHTML=list.length?list.map(p=>`<a class="card hov" href="product.html?id=${p.id}"><div class="ph" style="aspect-ratio:4/5">${pArt(p,0,0)}</div><div class="meta"><h3 style="font-size:18px">${p.name}</h3><div class="price">${money(p.price)}</div></div></a>`).join(''):`<p class="muted">Nothing found for “${inp.value}”. Try “dress” or “festive”.</p>`;
  }
  $('#searchBtn').onclick=openS;$('#searchX').onclick=closeS;inp.oninput=doS;
  addEventListener('keydown',e=>{if(e.key==='Escape'){closeD();closeS()}});
  $('#nl').onsubmit=e=>{e.preventDefault();e.target.reset();toast('Thank you — welcome to the letter')};
}
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('on'),2600)}

/* ---------- cart ---------- */
const store={get(){try{return JSON.parse(localStorage.getItem('ns_cart'))||[]}catch(e){return []}},set(v){try{localStorage.setItem('ns_cart',JSON.stringify(v))}catch(e){window.__cart=v}}};
let memCart=null;
function cartGet(){return memCart||(memCart=store.get())}
function cartSet(v){memCart=v;store.set(v);updateCount()}
function updateCount(){const n=cartGet().reduce((a,l)=>a+l.qty,0);const c=$('#count');if(c){c.textContent=n||'';c.dataset.n=n}}
function addToCart(id,ci,size){
  const c=cartGet().slice();const f=c.find(l=>l.id===id&&l.ci===ci&&l.size===size);
  if(f)f.qty++;else c.push({id,ci,size,qty:1});cartSet(c);
}
function renderCart(){
  const c=cartGet();const body=$('#cartBody'),foot=$('#cartFoot'),ship=$('#shipMsg');
  const sub=c.reduce((a,l)=>a+byId(l.id).price*l.qty,0);
  const left=Math.max(0,D.freeShipping-sub);
  ship.innerHTML=(left>0?`You are ${money(left)} away from complimentary shipping`:'You have complimentary shipping')+`<i><b style="width:${Math.min(100,sub/D.freeShipping*100)}%"></b></i>`;
  if(!c.length){body.innerHTML=`<div class="empty"><h3 class="h3" style="margin-bottom:12px">Your bag is empty</h3><p class="muted" style="margin-bottom:26px">Begin with something you will wear for years.</p><a class="btn" href="shop.html?new=1">Shop new in</a></div>`;foot.innerHTML='';return}
  body.innerHTML=c.map((l,i)=>{const p=byId(l.id);return `<div class="cart-line"><a class="ph" href="product.html?id=${p.id}">${pArt(p,l.ci,0)}</a>
    <div><h5>${p.name}</h5><small>${p.colors[l.ci].n} · Size ${l.size}</small><small>${money(p.price)}</small>
    <div><span class="qty"><button data-q="-1" data-i="${i}" aria-label="Less">−</button><span>${l.qty}</span><button data-q="1" data-i="${i}" aria-label="More">+</button></span><button class="rm" data-rm="${i}">Remove</button></div></div></div>`}).join('');
  foot.innerHTML=`<div class="row"><span>Subtotal</span><span>${money(sub)}</span></div><button class="btn block" id="checkout">Checkout</button><p class="muted" style="font-size:12px;text-align:center;margin-top:12px">Taxes and delivery calculated at checkout</p>`;
  $$('[data-q]',body).forEach(b=>b.onclick=()=>{const n=cartGet().map(x=>({...x}));const l=n[+b.dataset.i];l.qty+=+b.dataset.q;if(l.qty<1)n.splice(+b.dataset.i,1);cartSet(n);renderCart()});
  $$('[data-rm]',body).forEach(b=>b.onclick=()=>{const n=cartGet().slice();n.splice(+b.dataset.rm,1);cartSet(n);renderCart()});
  $('#checkout').onclick=()=>toast('Demo store — checkout is not connected');
}

/* ---------- motion ---------- */
function motion(){
  $$('[data-stagger]').forEach(g=>Array.from(g.children).forEach((c,i)=>{c.style.setProperty('--i',i);if(!c.hasAttribute('data-r'))c.setAttribute('data-r','img')}));
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.12,rootMargin:'0px 0px -6% 0px'});
  const watch=r=>$$('[data-r]:not(.in)',r).forEach(el=>io.observe(el));watch();window.__watch=watch;
  // parallax
  const par=$$('[data-par]');
  if(par.length&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
    let tick=false;const upd=()=>{tick=false;par.forEach(el=>{const r=el.parentElement.getBoundingClientRect();if(r.bottom<0||r.top>innerHeight)return;
      const k=+el.dataset.par;const off=((r.top+r.height/2)-innerHeight/2)*k;el.style.transform=`translate3d(0,${off.toFixed(1)}px,0)`})};
    addEventListener('scroll',()=>{if(!tick){tick=true;requestAnimationFrame(upd)}},{passive:true});upd();
  }
  // tilt (fine pointers only)
  if(matchMedia('(pointer:fine)').matches){
    $$('.tilt').forEach(el=>{
      el.parentElement.addEventListener('pointermove',e=>{const r=el.getBoundingClientRect();const x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
        el.style.transform=`perspective(900px) rotateY(${x*9}deg) rotateX(${-y*7}deg)`});
      el.parentElement.addEventListener('pointerleave',()=>el.style.transform='');
    });
  }
  // rails
  $$('[data-rail]').forEach(b=>b.onclick=()=>{const r=$(b.dataset.rail);r.scrollBy({left:b.dataset.dir*r.clientWidth*.7,behavior:'smooth'})});
}

/* ---------- pages ---------- */
function home(){
  const rail=$('#rail-new');if(rail){rail.innerHTML=D.products.filter(p=>p.isNew).concat(D.products.filter(p=>!p.isNew).slice(0,2)).map(card).join('')}
  if(window.NSSilk){const c=$('#silk');if(c)NSSilk(c)}
}
function shop(){
  const state={cat:qs.get('cat')||'',occ:qs.get('occ')||'',nw:qs.get('new')==='1',sort:'featured'};
  const chips=$('#chips'),grid=$('#grid'),title=$('#shopTitle'),blurb=$('#shopBlurb'),note=$('#shopCount');
  const all=[{k:'',v:'',l:'All'}];
  function draw(){
    chips.innerHTML=[`<button class="chip ${!state.cat&&!state.occ&&!state.nw?'on':''}" data-k="all">All</button>`,
      `<button class="chip ${state.nw?'on':''}" data-k="new">New in</button>`,
      ...D.occasions.map(o=>`<button class="chip ${state.occ===o.id?'on':''}" data-k="occ:${o.id}">${o.label}</button>`),
      ...D.categories.map(o=>`<button class="chip ${state.cat===o.id?'on':''}" data-k="cat:${o.id}">${o.label}</button>`)].join('');
    $$('.chip',chips).forEach(b=>b.onclick=()=>{const k=b.dataset.k;
      if(k==='all'){state.cat=state.occ='';state.nw=false}else if(k==='new'){state.nw=!state.nw}
      else{const[t,v]=k.split(':');state[t]=state[t]===v?'':v}
      draw()});
    let l=D.products.filter(p=>(!state.cat||p.cat===state.cat)&&(!state.occ||p.occ.includes(state.occ))&&(!state.nw||p.isNew));
    if(state.sort==='low')l.sort((a,b)=>a.price-b.price);if(state.sort==='high')l.sort((a,b)=>b.price-a.price);
    const oc=D.occasions.find(o=>o.id===state.occ),ct=D.categories.find(o=>o.id===state.cat),col=D.collections.find(o=>o.id===state.occ);
    title.innerHTML=state.nw?'New <em>arrivals</em>':col&&!state.cat?col.title.replace(/(\S+)$/,'<em>$1</em>'):ct?ct.label:'The <em>collection</em>';
    blurb.textContent=state.nw?'Just arrived — the pieces we are wearing now.':col&&!state.cat?col.blurb:'Considered clothing for work, weekends and celebrations.';
    note.textContent=`${l.length} piece${l.length===1?'':'s'}`;
    const cards=l.map(card);
    const ed=col||D.collections[0];
    const editorial=`<a class="editorial hov" href="story.html" data-r="img"><div class="ph" data-art="${ed.kind},${ed.color},${ed.scene},3,${ed.accent?1:0}"></div><div class="cap"><span class="eyebrow">${ed.title}</span><h3>${ed.blurb.split(',')[0].split('.')[0]}</h3><span class="ulink">Our story</span></div></a>`;
    if(cards.length>4)cards.splice(4,0,editorial);
    grid.innerHTML=cards.length?cards.join(''):`<p class="center muted" style="grid-column:1/-1;padding:80px 0">No pieces match these filters.</p>`;
    hydrate(grid);window.__watch(grid);
    $('.page-top .eyebrow').textContent=state.nw?'Just in':'Shop';
  }
  $('#sort').onchange=e=>{state.sort=e.target.value;draw()};
  draw();
}
function product(){
  const p=byId(qs.get('id'))||D.products[0];let ci=0,size='';
  document.title=`${p.name} — Nargis & Shaz`;
  const cat=D.categories.find(c=>c.id===p.cat);
  $('#crumbs').innerHTML=`<a href="index.html">Home</a> &nbsp;/&nbsp; <a href="shop.html?cat=${p.cat}">${cat.label}</a> &nbsp;/&nbsp; ${p.name}`;
  const g=$('#gallery'),sw=$('#swatches'),sz=$('#sizes'),msg=$('#msg');
  function gal(){g.innerHTML=[0,1,2,3].map(v=>`<div class="gw" data-r="img" style="--i:${v}"><div class="ph">${pArt(p,ci,v)}</div></div>`).join('');window.__watch(g);$('#cName').textContent=p.colors[ci].n}
  sw.innerHTML=p.colors.map((c,i)=>`<button class="${i?'':'on'}" style="background:${A.COL[c.c]}" aria-label="${c.n}" title="${c.n}"></button>`).join('');
  $$('button',sw).forEach((b,i)=>b.onclick=()=>{ci=i;$$('button',sw).forEach(x=>x.classList.remove('on'));b.classList.add('on');gal()});
  const accessories=p.cat==='accessories';
  if(accessories&&p.kind!=='shoes'){sz.parentElement.style.display='none';size='One size'}
  sz.innerHTML=(p.kind==='shoes'?['36','37','38','39','40','41']:D.sizes).map(s=>`<button>${s}</button>`).join('');
  $$('button',sz).forEach(b=>b.onclick=()=>{size=b.textContent;$$('button',sz).forEach(x=>x.classList.remove('on','err'));b.classList.add('on');msg.textContent=''});
  $('#pName').textContent=p.name;$('#pPrice').textContent=money(p.price);$('#pDesc').textContent=p.desc;
  $('#pTag').textContent=p.isNew?'New in':cat.label;
  $('#stickyPrice').textContent=money(p.price);
  $('#accDetails').innerHTML='<ul>'+p.details.map(d=>`<li>${d}</li>`).join('')+'</ul>';
  $('#accFabric').innerHTML=`<p>${p.fabric}.</p><p style="margin-top:8px">Care: follow the label. Store folded or on a padded hanger.</p>`;
  const add=()=>{if(!size){msg.textContent='Please select a size to continue.';$$('button',sz).forEach(x=>x.classList.add('err'));sz.scrollIntoView({block:'center',behavior:'smooth'});return}
    addToCart(p.id,ci,size);renderCart();openD('cartDrawer')};
  $('#add').onclick=add;$('#stickyAdd').onclick=add;
  gal();
  const rel=D.products.filter(x=>x.id!==p.id&&x.occ.some(o=>p.occ.includes(o))&&x.cat!==p.cat).slice(0,4);
  $('#related').innerHTML=rel.map(card).join('');hydrate(document);
}
function story(){
  if(window.NSSilk){const c=$('#silk');if(c)NSSilk(c,{palette:{a:[.2,.14,.1],b:[.52,.36,.24],c:[.95,.82,.62]}})}
}

/* ---------- init ---------- */
function init(){
  buildChrome();
  hydrate(document);wireChrome();updateCount();motion();
  if(page==='home')safe(home);
  if(page==='shop')safe(shop);
  if(page==='product')safe(product);
  if(page==='story')safe(story);
  hydrate(document);window.__watch();
  requestAnimationFrame(()=>document.body.classList.add('ready'));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
