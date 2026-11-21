import type { GarmentKind, SceneTone } from "@/types";

/**
 * Art-directed still-life generator: an illustrated "photograph" of a garment on a warm wall.
 * Used wherever a real photograph is not yet uploaded. Deterministic (ids derive from params),
 * so server and client output is identical.
 */

const SCENES: Record<SceneTone, [string, string, string]> = {
  camel: ["#DCC3A2", "#B89A78", "#8E7358"],
  oat: ["#F1E8D9", "#DCCDB6", "#BFAE93"],
  clay: ["#C9967B", "#A7684F", "#71402F"],
  sage: ["#BDBBA2", "#8F8D70", "#5F5D49"],
  night: ["#544538", "#30261F", "#18120F"],
  blush: ["#F0DCD1", "#DDBBAA", "#BE9583"],
  cocoa: ["#7E6352", "#655044", "#2E231C"],
  ivory: ["#FBF6EE", "#EADFCC", "#CDBA9D"],
};
const GOLD = "#C79A4B";

function hex(h: string) { h = h.replace("#", ""); return [0, 2, 4].map((i) => parseInt(h.substr(i, 2), 16)); }
function mix(a: string, b: string, t: number) { const A = hex(a), B = hex(b); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join(""); }
const light = (c: string, t: number) => mix(c, "#ffffff", t);
const dark = (c: string, t: number) => mix(c, "#1a120d", t);

function hash(s: string) { let h = 5381; for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i); return (h >>> 0).toString(36); }

type Draw = (c: string, id: string) => string;
const G: Record<GarmentKind, Draw> = {
  dress: (c, id) => `<path d="M165 92Q200 120 235 92L264 108Q286 142 270 180L250 178 244 200 296 442Q200 466 104 442L156 200 150 178 130 180Q114 142 136 108Z" fill="url(#g${id})"/>
    <path d="M156 198Q200 212 244 198L242 216Q200 228 158 216Z" fill="${dark(c, .25)}" opacity=".55"/>
    <path d="M165 92Q200 144 235 92" fill="none" stroke="${dark(c, .3)}" stroke-width="1.4" opacity=".6"/>
    <g stroke="${dark(c, .35)}" stroke-width="1.2" fill="none" opacity=".22"><path d="M176 220L144 444"/><path d="M200 226V456"/><path d="M224 220L256 444"/><path d="M188 222L170 450"/><path d="M212 222L232 450"/></g>`,
  blouse: (c, id) => `<path d="M160 96Q200 126 240 96L298 124 332 252 298 264 274 178 278 394Q200 410 122 394L126 178 102 264 68 252 102 124Z" fill="url(#g${id})"/>
    <path d="M160 96Q200 152 240 96" fill="none" stroke="${dark(c, .3)}" stroke-width="1.4" opacity=".55"/>
    <path d="M200 134V402" stroke="${dark(c, .3)}" stroke-width="1" opacity=".3"/>
    <g fill="${light(c, .55)}" opacity=".85">${[170, 206, 242, 278, 314, 350].map((y) => `<circle cx="200" cy="${y}" r="2.6"/>`).join("")}</g>
    <g stroke="${dark(c, .35)}" stroke-width="1.1" fill="none" opacity=".18"><path d="M150 190L146 392"/><path d="M250 190L254 392"/></g>`,
  kurta: (c, id) => `<path d="M160 92Q200 122 240 92L296 120 330 250 298 262 272 176 280 452 238 452 232 404 168 404 162 452 120 452 128 176 102 262 70 250 104 120Z" fill="url(#g${id})"/>
    <path d="M178 94L200 160 222 94" fill="none" stroke="${GOLD}" stroke-width="2.4" opacity=".9"/>
    <path d="M128 446H162M238 446H272" stroke="${GOLD}" stroke-width="3" opacity=".8"/>
    <g stroke="${dark(c, .35)}" stroke-width="1.1" fill="none" opacity=".18"><path d="M150 200L144 440"/><path d="M250 200L256 440"/><path d="M200 170V400"/></g>`,
  knit: (c, id) => `<path d="M158 94Q200 118 242 94L304 130 336 296 296 306 276 190 280 376Q200 392 120 376L124 190 104 306 64 296 96 130Z" fill="url(#g${id})"/>
    <ellipse cx="200" cy="100" rx="38" ry="14" fill="none" stroke="${dark(c, .3)}" stroke-width="5" opacity=".4"/>
    <path d="M120 352Q200 368 280 352V384Q200 400 120 384Z" fill="${dark(c, .12)}"/>
    <g stroke="${dark(c, .35)}" stroke-width="1.2" opacity=".28">${Array.from({ length: 19 }, (_, i) => `<path d="M${124 + i * 8.4} 358V388"/>`).join("")}</g>
    <g stroke="${dark(c, .3)}" stroke-width="1" opacity=".13" fill="none">${Array.from({ length: 12 }, (_, i) => `<path d="M${130 + i * 13} 130V340"/>`).join("")}</g>`,
  trousers: (c, id) => `<path d="M144 88H256L262 152 304 454H214L200 194 186 454H96L138 152Z" fill="url(#g${id})"/>
    <path d="M144 88H256V110H144Z" fill="${dark(c, .2)}" opacity=".5"/>
    <path d="M200 110V194" stroke="${dark(c, .35)}" stroke-width="1.2" opacity=".35"/>
    <g stroke="${dark(c, .35)}" stroke-width="1.2" fill="none" opacity=".22"><path d="M160 200L132 450"/><path d="M240 200L268 450"/></g>`,
  coat: (c, id) => `<path d="M150 84Q200 108 250 84L310 120 328 376 296 382 290 214 310 474H90L110 214 104 382 72 376 90 120Z" fill="url(#g${id})"/>
    <path d="M150 84L200 262 250 84" fill="none" stroke="${dark(c, .35)}" stroke-width="1.4" opacity=".5"/>
    <path d="M150 84L176 150 200 130" fill="${light(c, .12)}" opacity=".5"/><path d="M250 84L224 150 200 130" fill="${dark(c, .1)}" opacity=".4"/>
    <path d="M110 238Q200 256 290 238V256Q200 274 110 256Z" fill="${dark(c, .22)}" opacity=".55"/>
    <circle cx="190" cy="300" r="4" fill="${dark(c, .45)}"/><circle cx="190" cy="360" r="4" fill="${dark(c, .45)}"/>
    <g stroke="${dark(c, .35)}" stroke-width="1.2" fill="none" opacity=".2"><path d="M130 280L118 470"/><path d="M270 280L282 470"/></g>`,
  bag: (c, id) => `<path d="M150 232Q200 60 250 232" fill="none" stroke="${dark(c, .25)}" stroke-width="9" stroke-linecap="round"/>
    <path d="M106 262Q104 196 200 194Q296 196 294 262 306 392 200 410 94 392 106 262Z" fill="url(#g${id})"/>
    <path d="M130 236Q200 258 270 236" fill="none" stroke="${dark(c, .35)}" stroke-width="1.5" opacity=".45"/>
    <path d="M140 300Q132 360 170 392" stroke="${light(c, .5)}" stroke-width="3" fill="none" opacity=".35"/>
    <circle cx="200" cy="274" r="9" fill="${GOLD}"/>`,
  shoes: (c, id) => [0, 1].map((k) => `<g transform="${k ? "translate(100 -4) rotate(-6 200 340)" : "translate(40 40)"}"><path d="M70 330Q64 292 118 292L196 306Q224 326 194 352L100 360Q72 358 70 330Z" fill="url(#g${id})"/>
    <path d="M96 304Q150 336 128 356" fill="none" stroke="${dark(c, .35)}" stroke-width="5" opacity=".6"/><ellipse cx="204" cy="346" rx="22" ry="6" fill="${dark(c, .4)}" opacity=".6"/></g>`).join(""),
  jewelry: (_c, id) => `<path d="M96 150Q200 420 304 150" fill="none" stroke="${GOLD}" stroke-width="5" stroke-linecap="round"/>
    <path d="M96 150Q200 420 304 150" fill="none" stroke="#fff" stroke-width="1" stroke-dasharray="2 14" opacity=".7"/>
    <g transform="translate(200 332)"><path d="M0 -4C-34 -4 -42 40 0 58 42 40 34 -4 0 -4Z" fill="url(#au${id})"/><g stroke="${dark(GOLD, .35)}" stroke-width="1.4" opacity=".5" fill="none"><path d="M0 0V54"/><path d="M-14 2L-22 46"/><path d="M14 2L22 46"/></g></g>`,
  scarf: (c, id) => `<path d="M152 80C270 140 128 262 248 332 304 364 262 436 208 446L188 412C232 400 248 372 218 344 96 262 232 148 118 104Z" fill="url(#g${id})"/>
    <path d="M152 80C270 140 128 262 248 332" fill="none" stroke="${GOLD}" stroke-width="10" opacity=".55"/>
    <path d="M170 90C262 150 150 250 236 318" fill="none" stroke="#fff" stroke-width="2" opacity=".35"/>`,
};

const HANGS = new Set<GarmentKind>(["dress", "blouse", "knit", "coat", "trousers", "kurta"]);
const PROPS = new Set<GarmentKind>(["bag", "shoes", "jewelry"]);

export function garmentSvg(o: { kind: GarmentKind; color: string; scene: SceneTone; view?: number; accent?: boolean; label?: string }): string {
  const view = o.view ?? 0;
  const id = hash(`${o.kind}${o.color}${o.scene}${view}${o.accent ? 1 : 0}`);
  const sc = SCENES[o.scene] ?? SCENES.camel;
  const c = o.color;
  const boxes = ["0 0 400 500", "110 70 200 250", "40 150 320 400", "0 0 400 500"];
  const vb = PROPS.has(o.kind) || o.kind === "scarf" ? (view === 1 ? "80 140 240 300" : boxes[view % 4]) : boxes[view % 4];
  const flip = view === 3;
  const hanger = HANGS.has(o.kind) ? `<g stroke="${dark(sc[2], .1)}" stroke-width="1.6" fill="none" opacity=".75" stroke-linecap="round"><path d="M200 40V58"/><path d="M200 40q-8 0 -8 -8t8 -8"/><path d="M200 60L146 96M200 60L254 96"/></g>` : "";
  const emb = o.accent && o.kind !== "scarf" && o.kind !== "kurta"
    ? `<g fill="none" stroke="${GOLD}" stroke-width="1.3" opacity=".9">${Array.from({ length: 7 }, (_, i) => `<path d="M${110 + i * 30} 130q10 24 0 48M${110 + i * 30} 190q10 24 0 48"/>`).join("")}<path d="M130 110Q200 150 270 110" stroke-width="2"/></g>`
    : o.accent && o.kind === "scarf" ? `<g fill="${GOLD}" opacity=".9">${Array.from({ length: 9 }, (_, i) => `<circle cx="${150 + (i % 3) * 40}" cy="${170 + Math.floor(i / 3) * 70}" r="3"/>`).join("")}</g>` : "";
  const floor = PROPS.has(o.kind)
    ? `<rect y="360" width="400" height="140" fill="url(#f${id})"/><ellipse cx="200" cy="${o.kind === "jewelry" ? 470 : 418}" rx="130" ry="14" fill="#000" opacity=".16" filter="url(#b${id})"/>`
    : `<ellipse cx="200" cy="472" rx="118" ry="10" fill="#000" opacity=".14" filter="url(#b${id})"/>`;
  const drape = o.scene === "night" || o.scene === "cocoa" ? "" : `<path d="M-20 -10C60 120 40 300 -20 520H60C110 320 90 140 40 -10Z" fill="${light(sc[0], .25)}" opacity=".28"/>`;
  const arch = ["ivory", "oat", "blush"].includes(o.scene) ? `<path d="M250 500V190Q250 90 330 90Q410 90 410 190V500Z" fill="#fff" opacity=".2"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
<defs>
<linearGradient id="w${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sc[0]}"/><stop offset=".7" stop-color="${sc[1]}"/><stop offset="1" stop-color="${sc[2]}"/></linearGradient>
<linearGradient id="g${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${dark(c, .22)}"/><stop offset=".32" stop-color="${light(c, .12)}"/><stop offset=".6" stop-color="${c}"/><stop offset="1" stop-color="${dark(c, .3)}"/></linearGradient>
<linearGradient id="au${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E8C36F"/><stop offset=".5" stop-color="#C79A4B"/><stop offset="1" stop-color="#8E6A2B"/></linearGradient>
<linearGradient id="f${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sc[1]}" stop-opacity="0"/><stop offset=".25" stop-color="${dark(sc[1], .12)}"/><stop offset="1" stop-color="${sc[2]}"/></linearGradient>
<radialGradient id="l${id}" cx=".25" cy=".1" r=".9"><stop offset="0" stop-color="#fff" stop-opacity=".4"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/></radialGradient>
<radialGradient id="v${id}" cx=".5" cy=".45" r=".8"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".26"/></radialGradient>
<filter id="b${id}"><feGaussianBlur stdDeviation="7"/></filter>
<filter id="n${id}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="7"/><feColorMatrix values="0 0 0 0 .2  0 0 0 0 .13  0 0 0 0 .08  0 0 0 .5 0"/></filter>
</defs>
<rect x="-200" y="-200" width="800" height="900" fill="url(#w${id})"/>${arch}${drape}
<g${flip ? ' transform="translate(400 0) scale(-1 1)"' : ""}>${floor}${hanger}<g>${G[o.kind](c, id)}${emb}</g></g>
<rect x="-200" y="-200" width="800" height="900" fill="url(#l${id})"/>
<rect x="-200" y="-200" width="800" height="900" fill="url(#v${id})"/>
<rect x="-200" y="-200" width="800" height="900" filter="url(#n${id})" opacity=".3"/>
</svg>`;
}
