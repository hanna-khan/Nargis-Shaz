/* Art-directed still-life generator.
   Produces editorial "photographs" as SVG so the site is complete without stock imagery.
   To use real photography: add `photos:[...]` to a product in data.js (or `<img>` in a .ph block). */
(function(){
let uid=0;
const SCENES={
  camel:['#D9BC96','#B58A5E','#8E6544'],
  oat:['#F1E6D4','#DCC8A8','#BFA583'],
  clay:['#C98B6B','#A4553A','#6F3524'],
  sage:['#B9B79A','#8A8767','#5E5C45'],
  night:['#4E4036','#2B221C','#16110E'],
  blush:['#F0D8CB','#DDB6A2','#BF907C'],
  cocoa:['#7A5B47','#4A372B','#2A1E17'],
  ivory:['#FBF4E8','#EADBC3','#CDB693']
};
const COL={ivory:'#F3EADB',cream:'#EFE2CC',sand:'#D4BC98',camel:'#B98B5E',rust:'#A4553A',cocoa:'#5A4130',sage:'#8B8A68',
  ink:'#2A2420',blush:'#E3C2B3',navy:'#2F3A4A',burgundy:'#6E2B34',olive:'#6B6B45',gold:'#C79A4B',emerald:'#2F5A4B',rose:'#C9847E'};
function hex(h){h=h.replace('#','');return [0,2,4].map(i=>parseInt(h.substr(i,2),16))}
function mix(a,b,t){const A=hex(a),B=hex(b);return '#'+A.map((v,i)=>Math.round(v+(B[i]-v)*t).toString(16).padStart(2,'0')).join('')}
const lighten=(c,t)=>mix(c,'#ffffff',t), darken=(c,t)=>mix(c,'#1a120d',t);

const G={ // garment silhouettes, drawn in 400x500 box
 dress:(c)=>`
  <path d="M165 92Q200 120 235 92L264 108Q286 142 270 180L250 178 244 200 296 442Q200 466 104 442L156 200 150 178 130 180Q114 142 136 108Z" fill="url(#g)"/>
  <path d="M156 198Q200 212 244 198L242 216Q200 228 158 216Z" fill="${darken(c,.25)}" opacity=".55"/>
  <path d="M165 92Q200 144 235 92" fill="none" stroke="${darken(c,.3)}" stroke-width="1.4" opacity=".6"/>
  <g stroke="${darken(c,.35)}" stroke-width="1.2" fill="none" opacity=".22"><path d="M176 220L144 444"/><path d="M200 226V456"/><path d="M224 220L256 444"/><path d="M188 222L170 450"/><path d="M212 222L232 450"/></g>
  <path d="M138 108Q122 140 134 176" stroke="${lighten(c,.5)}" stroke-width="2" fill="none" opacity=".35"/>`,
 blouse:(c)=>`
  <path d="M160 96Q200 126 240 96L298 124 332 252 298 264 274 178 278 394Q200 410 122 394L126 178 102 264 68 252 102 124Z" fill="url(#g)"/>
  <path d="M160 96Q200 152 240 96" fill="none" stroke="${darken(c,.3)}" stroke-width="1.4" opacity=".55"/>
  <path d="M200 134V402" stroke="${darken(c,.3)}" stroke-width="1" opacity=".3"/>
  <g fill="${lighten(c,.55)}" opacity=".85">${[170,206,242,278,314,350].map(y=>`<circle cx="200" cy="${y}" r="2.6"/>`).join('')}</g>
  <g stroke="${darken(c,.35)}" stroke-width="1.1" fill="none" opacity=".18"><path d="M150 190L146 392"/><path d="M250 190L254 392"/><path d="M110 150L82 250"/><path d="M290 150L318 250"/></g>`,
 knit:(c)=>`
  <path d="M158 94Q200 118 242 94L304 130 336 296 296 306 276 190 280 376Q200 392 120 376L124 190 104 306 64 296 96 130Z" fill="url(#g)"/>
  <ellipse cx="200" cy="100" rx="38" ry="14" fill="none" stroke="${darken(c,.3)}" stroke-width="5" opacity=".4"/>
  <path d="M120 352Q200 368 280 352V384Q200 400 120 384Z" fill="${darken(c,.12)}"/>
  <g stroke="${darken(c,.35)}" stroke-width="1.2" opacity=".28">${Array.from({length:19},(_,i)=>`<path d="M${124+i*8.4} ${356+Math.abs(i-9)*-.2}V${390-Math.abs(i-9)*.9}"/>`).join('')}</g>
  <g stroke="${darken(c,.3)}" stroke-width="1" opacity=".13" fill="none">${Array.from({length:12},(_,i)=>`<path d="M${130+i*13} 130V340"/>`).join('')}</g>`,
 trousers:(c)=>`
  <path d="M144 88H256L262 152 304 454H214L200 194 186 454H96L138 152Z" fill="url(#g)"/>
  <path d="M144 88H256V110H144Z" fill="${darken(c,.2)}" opacity=".5"/>
  <path d="M200 110V194" stroke="${darken(c,.35)}" stroke-width="1.2" opacity=".35"/>
  <g stroke="${darken(c,.35)}" stroke-width="1.2" fill="none" opacity=".22"><path d="M160 200L132 450"/><path d="M240 200L268 450"/><path d="M150 140L128 300"/><path d="M250 140L272 300"/></g>
  <rect x="190" y="92" width="20" height="12" fill="${lighten(c,.5)}" opacity=".6"/>`,
 coat:(c)=>`
  <path d="M150 84Q200 108 250 84L310 120 328 376 296 382 290 214 310 474H90L110 214 104 382 72 376 90 120Z" fill="url(#g)"/>
  <path d="M150 84L200 262 250 84" fill="none" stroke="${darken(c,.35)}" stroke-width="1.4" opacity=".5"/>
  <path d="M150 84L176 150 200 130" fill="${lighten(c,.12)}" opacity=".5"/><path d="M250 84L224 150 200 130" fill="${darken(c,.1)}" opacity=".4"/>
  <path d="M110 238Q200 256 290 238V256Q200 274 110 256Z" fill="${darken(c,.22)}" opacity=".55"/>
  <circle cx="190" cy="300" r="4" fill="${darken(c,.45)}"/><circle cx="190" cy="360" r="4" fill="${darken(c,.45)}"/>
  <g stroke="${darken(c,.35)}" stroke-width="1.2" fill="none" opacity=".2"><path d="M130 280L118 470"/><path d="M270 280L282 470"/><path d="M200 270V470"/></g>`,
 bag:(c)=>`
  <path d="M150 232Q200 60 250 232" fill="none" stroke="${darken(c,.25)}" stroke-width="9" stroke-linecap="round"/>
  <path d="M106 262Q104 196 200 194Q296 196 294 262 306 392 200 410 94 392 106 262Z" fill="url(#g)"/>
  <path d="M130 236Q200 258 270 236" fill="none" stroke="${darken(c,.35)}" stroke-width="1.5" opacity=".45"/>
  <path d="M140 300Q132 360 170 392" stroke="${lighten(c,.5)}" stroke-width="3" fill="none" opacity=".35"/>
  <circle cx="200" cy="274" r="9" fill="${COL.gold}"/>`,
 shoes:(c)=>`
  <g transform="translate(40 40)"><path d="M70 330Q64 292 118 292L196 306Q224 326 194 352L100 360Q72 358 70 330Z" fill="url(#g)"/>
  <path d="M96 304Q150 336 128 356" fill="none" stroke="${darken(c,.35)}" stroke-width="5" opacity=".6"/><ellipse cx="204" cy="346" rx="22" ry="6" fill="${darken(c,.4)}" opacity=".6"/></g>
  <g transform="translate(100 -4) rotate(-6 200 340)"><path d="M70 330Q64 292 118 292L196 306Q224 326 194 352L100 360Q72 358 70 330Z" fill="url(#g)"/>
  <path d="M96 304Q150 336 128 356" fill="none" stroke="${darken(c,.35)}" stroke-width="5" opacity=".6"/><ellipse cx="204" cy="346" rx="22" ry="6" fill="${darken(c,.4)}" opacity=".6"/></g>`,
 jewelry:(c)=>`
  <path d="M96 150Q200 420 304 150" fill="none" stroke="${COL.gold}" stroke-width="5" stroke-linecap="round"/>
  <path d="M96 150Q200 420 304 150" fill="none" stroke="#fff" stroke-width="1" stroke-dasharray="2 14" opacity=".7"/>
  <g transform="translate(200 332)"><path d="M0 -4C-34 -4 -42 40 0 58 42 40 34 -4 0 -4Z" fill="url(#gold)"/><g stroke="${darken(COL.gold,.35)}" stroke-width="1.4" opacity=".5" fill="none"><path d="M0 0V54"/><path d="M-14 2L-22 46"/><path d="M14 2L22 46"/></g></g>
  <g fill="url(#gold)"><circle cx="120" cy="424" r="8"/><path d="M120 440q-14 22 0 36 14 -14 0 -36Z"/><circle cx="280" cy="424" r="8"/><path d="M280 440q-14 22 0 36 14 -14 0 -36Z"/></g>`,
 scarf:(c)=>`
  <path d="M152 80C270 140 128 262 248 332 304 364 262 436 208 446L188 412C232 400 248 372 218 344 96 262 232 148 118 104Z" fill="url(#g)"/>
  <path d="M152 80C270 140 128 262 248 332" fill="none" stroke="${COL.gold}" stroke-width="10" opacity=".55"/>
  <path d="M170 90C262 150 150 250 236 318" fill="none" stroke="#fff" stroke-width="2" opacity=".35"/>
  <path d="M210 446L190 412" stroke="${darken(c,.3)}" stroke-width="2"/>`
};
const HANG={dress:1,blouse:1,knit:1,coat:1,trousers:1};

function art(kind,o){
  o=o||{}; const id='a'+(++uid);
  const colr=COL[o.color]||o.color||COL.camel; const sc=SCENES[o.scene]||SCENES.camel; const view=+o.view||0;
  const accent=o.accent; // festive embroidery
  const views=['0 0 400 500','110 70 200 250','40 150 320 400','0 0 400 500'];
  let vb=views[view%4];
  if(kind==='bag'||kind==='shoes'||kind==='jewelry'||kind==='scarf'){ if(view===1) vb='80 140 240 300'; }
  const flip=view===3;
  const hanger=HANG[kind]?`<g stroke="${darken(sc[2],.1)}" stroke-width="1.6" fill="none" opacity=".75" stroke-linecap="round">
      <path d="M200 40V58"/><path d="M200 40q-8 0 -8 -8t8 -8"/><path d="M200 60L146 96M200 60L254 96"/></g>`:'';
  const emb=accent?`<g fill="none" stroke="${COL.gold}" stroke-width="1.3" opacity=".9">
      ${Array.from({length:7},(_,i)=>`<path d="M${200-90+i*30} 130q10 24 0 48M${200-90+i*30} 190q10 24 0 48"/>`).join('')}
      <path d="M130 110Q200 150 270 110" stroke-width="2"/></g>`:'';
  const floor=(kind==='bag'||kind==='shoes'||kind==='jewelry')
    ? `<rect y="360" width="400" height="140" fill="url(#fl)"/><ellipse cx="200" cy="${kind==='jewelry'?470:418}" rx="130" ry="14" fill="#000" opacity=".16" filter="url(#bl)"/>`
    : `<ellipse cx="200" cy="472" rx="118" ry="10" fill="#000" opacity=".14" filter="url(#bl)"/>`;
  const drape=(o.scene==='night'||o.scene==='cocoa')?'':`<path d="M-20 -10C60 120 40 300 -20 520H60C110 320 90 140 40 -10Z" fill="${lighten(sc[0],.25)}" opacity=".28"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${o.label||'Nargis & Shaz'}">
  <defs>
   <linearGradient id="${id}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sc[0]}"/><stop offset=".7" stop-color="${sc[1]}"/><stop offset="1" stop-color="${sc[2]}"/></linearGradient>
   <linearGradient id="g${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${darken(colr,.22)}"/><stop offset=".32" stop-color="${lighten(colr,.12)}"/><stop offset=".6" stop-color="${colr}"/><stop offset="1" stop-color="${darken(colr,.3)}"/></linearGradient>
   <linearGradient id="gold${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E8C36F"/><stop offset=".5" stop-color="#C79A4B"/><stop offset="1" stop-color="#8E6A2B"/></linearGradient>
   <linearGradient id="fl${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sc[1]}" stop-opacity="0"/><stop offset=".25" stop-color="${darken(sc[1],.12)}"/><stop offset="1" stop-color="${sc[2]}"/></linearGradient>
   <radialGradient id="lt${id}" cx=".25" cy=".1" r=".9"><stop offset="0" stop-color="#fff" stop-opacity=".42"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/></radialGradient>
   <radialGradient id="vg${id}" cx=".5" cy=".45" r=".8"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".28"/></radialGradient>
   <filter id="bl${id}"><feGaussianBlur stdDeviation="7"/></filter>
   <filter id="gr${id}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="${uid}"/><feColorMatrix values="0 0 0 0 .2  0 0 0 0 .13  0 0 0 0 .08  0 0 0 .55 0"/></filter>
  </defs>
  <rect x="-200" y="-200" width="800" height="900" fill="url(#${id}w)"/>
  ${o.scene==='ivory'||o.scene==='oat'||o.scene==='blush'?`<path d="M250 500V190Q250 90 330 90Q410 90 410 190V500Z" fill="#fff" opacity=".2"/>`:''}
  ${drape}
  <g transform="${flip?'translate(400 0) scale(-1 1)':''}">
  ${floor.replace(/url\(#fl\)/,`url(#fl${id})`).replace(/url\(#bl\)/,`url(#bl${id})`).replace(/filter="url\(#bl\)"/,`filter="url(#bl${id})"`)}
  ${hanger}
  <g>${G[kind](colr).replace(/url\(#g\)/g,`url(#g${id})`).replace(/url\(#gold\)/g,`url(#gold${id})`)}${emb}</g>
  </g>
  <rect x="-200" y="-200" width="800" height="900" fill="url(#lt${id})"/>
  <rect x="-200" y="-200" width="800" height="900" fill="url(#vg${id})"/>
  <rect x="-200" y="-200" width="800" height="900" filter="url(#gr${id})" opacity=".35"/>
  </svg>`;
}
window.NSArt={art,COL,SCENES,darken,lighten};
})();
