import React, { useEffect, useRef, useState } from 'react'
import './css/mbtiShowcase.css'

/* ---------- Data: 16 low-poly adventurers drawn in pure SVG (no image files, no animation library) ---------- */
const TYPES = [
  ['INTJ', 'Architect'], ['INTP', 'Logician'], ['ENTJ', 'Commander'], ['ENTP', 'Debater'],
  ['INFJ', 'Advocate'], ['INFP', 'Mediator'], ['ENFJ', 'Protagonist'], ['ENFP', 'Campaigner'],
  ['ISTJ', 'Logistician'], ['ISFJ', 'Defender'], ['ESTJ', 'Executive'], ['ESFJ', 'Consul'],
  ['ISTP', 'Virtuoso'], ['ISFP', 'Adventurer'], ['ESTP', 'Entrepreneur'], ['ESFP', 'Entertainer'],
]
/* [outfit, scene tint, dark] per group: analysts, diplomats, sentinels, explorers */
const PAL = [
  ['#7b5ea7', '#d9c8f0', '#4b3578'], ['#3fa56f', '#c8ecd7', '#23704a'],
  ['#3d8fc4', '#cde6f6', '#245f8a'], ['#e8b830', '#fbeab0', '#a97f10'],
]
const SKIN = ['#f1c9a5', '#d9a273', '#a8704a', '#f6d9bd']
const HAIR = ['#2b1b17', '#5a3825', '#d9a441', '#1b1b2e']
/* Optional artwork per type, e.g. { INTJ: intjImg }, replaces the drawn figure */
const ART = {}

/* ---------- Tuning ---------- */
const R = 185
const SEG = 360 / 16
const GAP = 5 // degrees of empty space between ring segments
const JUMP_LAND = 0.04 // clicking a segment lands this far (0-1) into that type's scroll range
const SNAP_LAND = 0.5 // paged scrolling parks in the middle of each type's scroll range
const SNAP_S = 0.7 // seconds the page glides from one type to the next
const EMOTE_GAP = 5200 // ms between emote repeats while a character stays on screen
const TEXT_OUT_MS = 300 // old poster text clears this fast BEFORE the circle spins
const TEXT_STAGGER = 40 // ms between each text block leaving
const WIPE_MS = 1400 // the spin / wipe itself
const FAST_MS = 650 // wipe speed when the user is scrolling fast and personalities are queued up
const IDLE_WAVE_MS = 1100 // stay this long without scrolling and the strands swell and the dots ripple
const MOBILE_Q = '(max-width: 767px)' // at or below this width, tapping a character does not replay its emote
const TAU = Math.PI * 2

const polar = (deg) => {
  const r = (deg * Math.PI) / 180
  return [200 + R * Math.sin(r), 200 - R * Math.cos(r)]
}
const arcPath = (a, b) => {
  const [x0, y0] = polar(a)
  const [x1, y1] = polar(b)
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${R} ${R} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`
}
const SEGS = TYPES.map(([code, name], k) => ({
  code,
  name,
  d: arcPath(k * SEG + GAP / 2, (k + 1) * SEG - GAP / 2),
}))

const sh = (c, a) =>
  '#' + c.slice(1).match(/../g).map((x) => Math.max(0, Math.min(255, parseInt(x, 16) + a)).toString(16).padStart(2, '0')).join('')
const hex = (x, y, r) =>
  [0, 1, 2, 3, 4, 5].map((k) => (x + r * Math.cos(k * 1.0472)).toFixed(1) + ',' + (y + r * Math.sin(k * 1.0472)).toFixed(1)).join(' ')

/* Tokens: {B} outfit {L} light {K} dark {T} deep {N} tint {S} skin */
const HOOD = '<polygon points="74,72 80,40 100,22 120,40 126,72 114,52 100,46 86,52" fill="{K}"/><polygon points="100,22 120,40 126,72 114,52 100,46" fill="{B}"/>'
const HELM = '<polygon points="76,62 78,40 100,31 122,40 124,62 116,48 84,48" fill="#8b95a5"/><polygon points="100,31 122,40 124,62 116,48 100,46" fill="#b4bdca"/>'
const HAT = '<polygon points="66,50 134,50 120,44 100,28 80,44" fill="{B}"/><polygon points="100,28 120,44 134,50 100,50" fill="{L}"/><polygon points="68,50 132,50 124,55 76,55" fill="{K}"/>'
const CROWN = '<polygon points="80,46 82,30 91,40 100,26 109,40 118,30 120,46" fill="#e8c34a"/><polygon points="100,26 109,40 118,30 120,46 100,46" fill="#f6dc7a"/>'
const HEAD = [
  HOOD,
  '<polygon points="82,38 96,38 96,48 82,48" fill="#d9b44a"/><polygon points="104,38 118,38 118,48 104,48" fill="#d9b44a"/><polygon points="85,40 94,40 94,46 85,46" fill="#9fd8e8"/><polygon points="106,40 115,40 115,46 106,46" fill="#9fd8e8"/>',
  HELM + '<polygon points="100,31 94,12 110,16" fill="{B}"/><polygon points="98,48 102,48 102,64 98,64" fill="#8b95a5"/>',
  HAT + '<polygon points="104,30 128,12 120,36" fill="#e8c34a"/>',
  HOOD + '<polygon points="100,38 104,44 100,50 96,44" fill="#fff6a8"/>',
  '<polygon points="82,42 86,32 92,42" fill="#5fbf7a"/><polygon points="94,38 100,26 106,38" fill="#7bd592"/><polygon points="108,42 114,32 118,42" fill="#5fbf7a"/><polygon points="78,56 64,50 78,66" fill="{S}"/><polygon points="122,56 136,50 122,66" fill="{S}"/>',
  '<polygon points="78,46 122,46 122,50 78,50" fill="#e8c34a"/><polygon points="100,40 104,46 100,50 96,46" fill="{B}"/>',
  '<polygon points="76,48 124,48 114,32 94,28" fill="{B}"/><polygon points="94,28 114,32 124,48 100,48" fill="{L}"/><polygon points="112,32 132,14 126,38" fill="#e8c34a"/>',
  HELM + '<polygon points="98,31 102,31 102,64 98,64" fill="{B}"/>',
  HOOD + '<polygon points="97,34 103,34 103,40 109,40 109,46 103,46 103,52 97,52 97,46 91,46 91,40 97,40" fill="#fff"/>',
  HELM + '<polygon points="78,44 62,26 82,34" fill="#e8e0c8"/><polygon points="122,44 138,26 118,34" fill="#e8e0c8"/>',
  CROWN,
  HOOD + '<polygon points="80,66 120,66 112,80 88,80" fill="#2a2d3a"/>',
  HAT + '<polygon points="84,50 116,50 116,53 84,53" fill="#e8c34a"/>',
  '<polygon points="77,52 123,52 122,42 100,34 78,42" fill="#c0392b"/><polygon points="100,34 122,42 123,52 100,52" fill="#e0574a"/><polygon points="120,52 132,60 128,66" fill="#c0392b"/><polygon points="86,55 98,55 98,65 86,65" fill="#1a1a1a"/>',
  '<polygon points="82,40 86,14 92,40" fill="{T}"/><polygon points="94,36 100,8 106,36" fill="{B}"/><polygon points="108,40 114,14 118,40" fill="{L}"/>',
]
const BARE = [1, 3, 5, 6, 7, 11, 13, 14, 15] /* types that show hair */
const PROP = [
  '<polygon points="42,108 66,104 68,126 44,130" fill="{K}"/><polygon points="46,111 64,108 65,122 47,125" fill="#e8c34a"/>',
  '<polygon points="56,100 64,100 64,110 70,126 50,126 56,110" fill="#9fd8e8"/><polygon points="52,120 68,120 70,126 50,126" fill="{B}"/>',
  '<polygon points="53,66 59,66 60,118 52,118" fill="#d3dae6"/><polygon points="56,66 59,66 60,118 56,118" fill="#aab4c4"/><polygon points="46,118 66,118 66,122 46,122" fill="#e8c34a"/>',
  '<polygon points="44,108 70,108 70,124 44,124" fill="#f1e2b8"/><polygon points="44,108 70,108 70,112 44,112" fill="#c9a96a"/>',
  '<polygon points="54,70 58,70 58,130 54,130" fill="#8a6a43"/><polygon points="56,50 66,61 56,72 46,61" fill="#fff6a8"/>',
  '<polygon points="50,100 62,100 64,106 48,106" fill="{K}"/><polygon points="48,106 64,106 66,124 46,124" fill="#e8c34a"/><polygon points="52,110 60,110 60,120 52,120" fill="#fff6a8"/>',
  '<polygon points="40,102 70,102 68,128 55,140 42,128" fill="{B}"/><polygon points="55,102 70,102 68,128 55,140" fill="{L}"/><polygon points="52,112 58,112 58,126 52,126" fill="#fff"/>',
  '<polygon points="54,100 60,100 62,122 52,122" fill="#8a6a43"/><polygon points="40,118 66,118 70,134 56,142 42,134" fill="{T}"/><polygon points="53,118 66,118 70,134 56,142" fill="{L}"/>',
  '<polygon points="53,64 57,58 61,64" fill="#d3dae6"/><polygon points="54,64 58,64 58,150 54,150" fill="#8a6a43"/>',
  '<polygon points="54,76 58,76 58,134 54,134" fill="#8a6a43"/><polygon points="52,60 60,60 60,68 66,68 66,76 60,76 60,84 52,84 52,76 46,76 46,68 52,68" fill="#fff"/>',
  '<polygon points="54,84 58,84 58,134 54,134" fill="#8a6a43"/><polygon points="58,84 78,88 78,104 58,106" fill="#aab4c4"/>',
  '<polygon points="54,72 58,72 58,134 54,134" fill="#8a6a43"/><polygon points="58,74 82,74 76,84 82,94 58,94" fill="{B}"/>',
  '<polygon points="53,104 57,104 58,124 52,124" fill="#d3dae6"/><polygon points="49,124 61,124 61,128 49,128" fill="{K}"/>',
  '<polygon points="44,106 68,102 70,124 46,128" fill="#f1e2b8"/><polygon points="50,112 62,110 64,120 52,122" fill="{T}"/>',
  '<polygon points="50,72 56,76 62,120 54,120" fill="#d3dae6"/><polygon points="46,120 64,120 64,124 46,124" fill="#e8c34a"/>',
  '<polygon points="56,100 66,104 68,114 62,124 50,124 44,114 46,104" fill="{T}"/><polygon points="56,106 62,110 62,118 56,120 50,118 50,110" fill="{N}"/>',
]
const ROBE = [0, 1, 4, 5, 9, 15]
const ARMOR = [2, 6, 8, 10]

function draw(i) {
  const [code] = TYPES[i], g = Math.floor(i / 4), [b, t, d] = PAL[g]
  if (ART[code]) return `<image class="mb-part" href="${ART[code]}" width="200" height="200" preserveAspectRatio="xMidYMid slice"/>`
  const sk = SKIN[(i * 3) % 4], hr = HAIR[(i * 5 + 1) % 4], ext = code[0] === 'E'
  const C = { B: b, L: sh(b, 40), K: sh(b, -50), T: d, N: t, S: sk }
  const F = (x) => x.replace(/\{(\w)\}/g, (m, k) => C[k])
  const robe = ROBE.includes(i), armor = ARMOR.includes(i)
  const scene = `<rect width="200" height="200" fill="${t}"/><polygon points="${hex(150, 48, 16)}" fill="#fff" opacity=".7"/><polygon points="0,140 36,92 70,128 104,84 150,134 200,100 200,200 0,200" fill="${sh(d, 50)}" opacity=".45"/><polygon points="36,92 70,128 36,140 0,140" fill="${d}" opacity=".25"/><polygon points="104,84 150,134 104,150 70,128" fill="${d}" opacity=".25"/>`
  const hair = BARE.includes(i)
    ? `<polygon points="76,56 78,40 100,32 122,40 124,56 114,46 100,48 86,46" fill="${hr}"/><polygon points="100,32 122,40 124,56 114,46 100,48" fill="${sh(hr, 18)}"/>`
    : ''
  const body = robe
    ? `<polygon points="72,86 128,86 138,170 62,170" fill="${b}"/><polygon points="100,86 128,86 138,170 100,170" fill="${C.L}"/><polygon points="62,164 138,164 138,170 62,170" fill="${d}"/>`
    : `<polygon points="72,86 128,86 122,134 78,134" fill="${armor ? '#c5ccd8' : b}"/><polygon points="100,86 128,86 122,134 100,134" fill="${armor ? '#dfe4ec' : C.L}"/><polygon points="76,126 124,126 124,134 76,134" fill="${C.K}"/>` +
      (armor ? '<polygon points="64,84 82,84 80,98 62,94" fill="#8b95a5"/><polygon points="136,84 118,84 120,98 138,94" fill="#aab4c4"/>' : '')
  return F(`<g class="mb-part">${scene}</g><polygon class="mb-part" points="48,178 66,172 134,172 152,178 136,190 64,190" fill="${sh(d, -10)}"/><polygon class="mb-part" points="100,172 134,172 152,178 136,190 100,190" fill="${sh(d, 25)}"/>
<g class="mb-part"><g class="mb-fig">
<polygon points="74,86 126,86 150,168 50,168" fill="${C.K}"/><polygon points="100,86 126,86 150,168 100,168" fill="${sh(b, -30)}"/>
<polygon points="82,130 99,130 97,172 80,172" fill="#2f3140"/><polygon points="101,130 118,130 120,172 103,172" fill="#454860"/>
<polygon points="78,172 98,172 98,178 76,178" fill="#1a1a1a"/><polygon points="102,172 122,172 124,178 102,178" fill="#2b2b2b"/>
${body}
<polygon points="72,88 62,92 54,122 64,124" fill="${armor ? '#8b95a5' : b}"/><g class="mb-lprop"><polygon points="${hex(58, 125, 6)}" fill="${sk}"/>${PROP[i]}</g>
<g class="mb-arm"><polygon points="128,88 138,92 146,122 136,124" fill="${armor ? '#aab4c4' : C.L}"/><polygon points="${hex(141, 125, 6)}" fill="${sh(sk, 14)}"/></g>
<polygon points="94,76 106,76 106,88 94,88" fill="${sh(sk, -25)}"/>
<g class="mb-head"><polygon points="100,36 80,46 78,64 88,80 100,80" fill="${sk}"/><polygon points="100,36 120,46 122,64 112,80 100,80" fill="${sh(sk, 14)}"/>${hair}
<polygon points="100,62 104,71 96,71" fill="${sh(sk, -22)}"/>
<g class="mb-pupils"><polygon points="88,60 92,57 96,60 92,63" fill="#1a1a1a"/><polygon points="104,60 108,57 112,60 108,63" fill="#1a1a1a"/></g>
${ext ? '<polygon points="93,74 107,74 100,80" fill="#7a2a2a"/>' : '<polygon points="95,75 105,75 103,77 97,77" fill="#7a2a2a"/>'}${HEAD[i]}</g>
</g></g>`)
}

/* ---------- Emotes: one signature move per character ----------
   Parts: fig (whole body, pivots at the feet), head, arm (right arm), prop (left hand + item), pupils.
   Helpers: run(el, frames, ms, origin?) animates a part; mk(markup, parent?) adds a temporary effect (sparkles, glow,
   speech bubbles...) that is removed when the emote ends; an(el, keyframes, ms, opts) animates any element;
   dk is the character's dark colour. Effects added inside `prop` / `head` move with that part.
   Every transform animation keeps the same transform functions in every frame so the browser can interpolate. */
const FONT = 'Inter, Arial, sans-serif'
const star = (x, y, s = 5, f = '#f5c518') =>
  `<polygon points="${x},${y - s} ${x + s * 0.3},${y - s * 0.3} ${x + s},${y} ${x + s * 0.3},${y + s * 0.3} ${x},${y + s} ${x - s * 0.3},${y + s * 0.3} ${x - s},${y} ${x - s * 0.3},${y - s * 0.3}" fill="${f}"/>`
const glowDef = (id, c = '#fff6a8') =>
  `<defs><radialGradient id="${id}"><stop offset="0" stop-color="${c}" stop-opacity="1"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient></defs>`
const txt = (s, x, y, size, fill) =>
  `<text x="${x}" y="${y}" font-size="${size}" font-weight="900" text-anchor="middle" fill="${fill}" font-family="${FONT}">${s}</text>`
const POP = (hold = 0.8) => [
  { opacity: 0, transform: 'scale(.3)' },
  { opacity: 1, transform: 'scale(1.12)', offset: 0.12 },
  { opacity: 1, transform: 'scale(1)', offset: 0.2 },
  { opacity: 1, transform: 'scale(1)', offset: hold },
  { opacity: 0, transform: 'scale(.9)' },
]

const EMOTES = [
  /* INTJ Architect: sketches a blueprint in the air, eyes following the pen */
  ({ arm, head, pupils, prop, mk, an, dk }, run) => {
    const D = 2800
    run(arm, ['rotate(0deg)', 'rotate(-72deg)', 'rotate(-58deg)', 'rotate(-80deg)', 'rotate(-58deg)', 'rotate(-80deg)', 'rotate(-62deg)', 'rotate(-72deg)', 'rotate(0deg)'], D)
    run(head, ['rotate(0deg)', 'rotate(5deg)', 'rotate(5deg)', 'rotate(5deg)', 'rotate(0deg)'], D)
    run(pupils, ['translate(0px,0px)', 'translate(3px,0px)', 'translate(3px,1px)', 'translate(3px,0px)', 'translate(0px,0px)'], D)
    run(prop, ['rotate(0deg)', 'rotate(6deg)', 'rotate(6deg)', 'rotate(0deg)'], D)
    const g = mk(`<path d="M150 100 L150 78 L166 64 L182 78 L182 100 Z M150 78 L182 78 M160 100 L160 88 L170 88 L170 100" pathLength="1" fill="none" stroke="${dk}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="1" stroke-dashoffset="1"/>`)
    an(g.firstElementChild, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], 1900, { delay: 350, easing: 'linear' })
    an(g, [{ opacity: 0 }, { opacity: 1, offset: 0.08 }, { opacity: 1, offset: 0.85 }, { opacity: 0 }], D)
  },
  /* INTP Logician: shakes the flask, equations float up, then a eureka hop */
  ({ prop, head, fig, pupils, mk, an, dk }, run) => {
    const D = 2800
    run(prop, ['rotate(0deg)', 'rotate(-24deg)', 'rotate(20deg)', 'rotate(-24deg)', 'rotate(20deg)', 'rotate(0deg)'], 1600)
    run(head, ['rotate(0deg)', 'rotate(-6deg)', 'rotate(-6deg)', 'rotate(-6deg)', 'rotate(0deg)'], D)
    run(pupils, ['translate(0px,0px)', 'translate(-2px,-2px)', 'translate(2px,-2px)', 'translate(-2px,-2px)', 'translate(0px,0px)'], D)
    run(fig, ['translateY(0px)', 'translateY(0px)', 'translateY(0px)', 'translateY(0px)', 'translateY(-12px)', 'translateY(0px)'], D)
    ;[['2+2', 56, 50], ['π', 84, 24], ['∑', 118, 22], ['=4?', 146, 50]].forEach(([s, x, y], k) => {
      const t = mk(txt(s, x, y, 14, dk))
      an(t, [
        { opacity: 0, transform: 'translateY(8px) scale(.6)' },
        { opacity: 1, transform: 'translateY(0px) scale(1)', offset: 0.2 },
        { opacity: 1, transform: 'translateY(-3px) scale(1)', offset: 0.75 },
        { opacity: 0, transform: 'translateY(-10px) scale(.9)' },
      ], 1500, { delay: 250 * k, easing: 'ease-out' })
    })
    const e = mk(`<text x="100" y="28" font-size="32" font-weight="900" text-anchor="middle" fill="#f5c518" stroke="${dk}" stroke-width="1" font-family="${FONT}">!</text>`)
    an(e, [{ opacity: 0, transform: 'scale(.2)' }, { opacity: 1, transform: 'scale(1.3)', offset: 0.4 }, { opacity: 1, transform: 'scale(1)', offset: 0.8 }, { opacity: 0, transform: 'scale(1)' }], 800, { delay: 1900 })
  },
  /* ENTJ Commander: sword up, arm points forward, "advance!" */
  ({ prop, head, fig, arm, mk, an, dk }, run) => {
    const D = 2400
    run(prop, ['rotate(0deg) translateY(0px)', 'rotate(-18deg) translateY(-14px)', 'rotate(30deg) translateY(-14px)', 'rotate(30deg) translateY(-14px)', 'rotate(0deg) translateY(0px)'], D)
    run(arm, ['rotate(0deg)', 'rotate(-92deg)', 'rotate(-98deg)', 'rotate(-88deg)', 'rotate(0deg)'], D)
    run(fig, ['scale(1)', 'scale(1.06)', 'scale(1.06)', 'scale(1.06)', 'scale(1)'], D)
    run(head, ['rotate(0deg)', 'rotate(-4deg)', 'rotate(-4deg)', 'rotate(-4deg)', 'rotate(0deg)'], D)
    const l = mk(`<path d="M172 70 h14 M175 80 h16 M172 90 h14" fill="none" stroke="${dk}" stroke-width="3" stroke-linecap="round"/>`)
    an(l, [{ opacity: 0, transform: 'translateX(-8px)' }, { opacity: 0, transform: 'translateX(-8px)', offset: 0.3 }, { opacity: 1, transform: 'translateX(0px)', offset: 0.45 }, { opacity: 0, transform: 'translateX(10px)' }], 1800)
  },
  /* ENTP Debater: jabs a finger, shakes the evidence, speech bubble pops */
  ({ arm, head, prop, mk, an, dk }, run) => {
    const D = 2400
    run(arm, ['rotate(0deg)', 'rotate(-70deg)', 'rotate(-45deg)', 'rotate(-70deg)', 'rotate(-45deg)', 'rotate(-70deg)', 'rotate(0deg)'], D)
    run(head, ['rotate(0deg)', 'rotate(5deg)', 'rotate(-5deg)', 'rotate(5deg)', 'rotate(-5deg)', 'rotate(5deg)', 'rotate(0deg)'], D)
    run(prop, ['rotate(0deg) translateY(0px)', 'rotate(-10deg) translateY(-10px)', 'rotate(0deg) translateY(-6px)', 'rotate(-10deg) translateY(-10px)', 'rotate(0deg) translateY(-6px)', 'rotate(-10deg) translateY(-10px)', 'rotate(0deg) translateY(0px)'], D)
    const b = mk(`<polygon points="118,28 162,28 166,46 146,46 138,56 140,46 118,46" fill="#fff" stroke="${dk}" stroke-width="2" stroke-linejoin="round"/>${txt('!?', 142, 42, 15, dk)}`)
    an(b, [
      { opacity: 0, transform: 'scale(.3)' },
      { opacity: 1, transform: 'scale(1.12)', offset: 0.1 },
      { opacity: 1, transform: 'scale(1)', offset: 0.18 },
      { opacity: 1, transform: 'scale(1.1)', offset: 0.45 },
      { opacity: 1, transform: 'scale(1)', offset: 0.55 },
      { opacity: 1, transform: 'scale(1.1)', offset: 0.75 },
      { opacity: 1, transform: 'scale(1)', offset: 0.85 },
      { opacity: 0, transform: 'scale(.9)' },
    ], D)
  },
  /* INFJ Advocate: floats up and casts magic: staff glows, rings pulse, sparkles rise */
  ({ fig, prop, head, arm, mk, an }, run) => {
    const D = 2800
    run(fig, ['translateY(0px)', 'translateY(-12px)', 'translateY(-8px)', 'translateY(-12px)', 'translateY(-8px)', 'translateY(0px)'], D)
    run(prop, ['rotate(0deg) translateY(0px)', 'rotate(-10deg) translateY(-6px)', 'rotate(8deg) translateY(-6px)', 'rotate(-10deg) translateY(-6px)', 'rotate(0deg) translateY(0px)'], D)
    run(arm, ['rotate(0deg)', 'rotate(-140deg)', 'rotate(-120deg)', 'rotate(-140deg)', 'rotate(0deg)'], D)
    run(head, ['rotate(0deg)', 'rotate(-5deg)', 'rotate(-5deg)', 'rotate(-5deg)', 'rotate(0deg)'], D)
    const halo = mk(glowDef('mbmg') + '<circle cx="56" cy="61" r="26" fill="url(#mbmg)"/>', prop)
    an(halo, [
      { opacity: 0, transform: 'scale(.4)' }, { opacity: 0.95, transform: 'scale(1)', offset: 0.2 }, { opacity: 0.5, transform: 'scale(.8)', offset: 0.4 },
      { opacity: 0.95, transform: 'scale(1.1)', offset: 0.6 }, { opacity: 0.5, transform: 'scale(.8)', offset: 0.8 }, { opacity: 0, transform: 'scale(.4)' },
    ], D)
    ;[300, 1100, 1900].forEach((d) => {
      const r = mk('<circle cx="56" cy="61" r="10" fill="none" stroke="#e8b830" stroke-width="2.5"/>', prop)
      an(r, [{ opacity: 0.9, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(4)' }], 900, { delay: d, easing: 'ease-out' })
    })
    ;[[36, 48], [76, 36], [28, 86], [150, 46], [168, 74], [132, 30]].forEach(([x, y], k) => {
      const s = mk(star(x, y, 6))
      an(s, [
        { opacity: 0, transform: 'translateY(6px) scale(.2) rotate(0deg)' },
        { opacity: 1, transform: 'translateY(-4px) scale(1) rotate(40deg)', offset: 0.4 },
        { opacity: 0, transform: 'translateY(-24px) scale(.3) rotate(90deg)' },
      ], 1200, { delay: 200 + k * 330, easing: 'ease-out' })
    })
  },
  /* INFP Mediator: lifts the lamp and it glows warm */
  ({ prop, head, fig, mk, an }, run) => {
    const D = 3000
    run(prop, ['translateY(0px) rotate(0deg)', 'translateY(-16px) rotate(-6deg)', 'translateY(-16px) rotate(2deg)', 'translateY(-16px) rotate(-2deg)', 'translateY(-16px) rotate(2deg)', 'translateY(0px) rotate(0deg)'], D)
    run(head, ['rotate(0deg)', 'rotate(-6deg)', 'rotate(-6deg)', 'rotate(-4deg)', 'rotate(-4deg)', 'rotate(0deg)'], D)
    run(fig, ['rotate(0deg)', 'rotate(-2deg)', 'rotate(-2deg)', 'rotate(-2deg)', 'rotate(-2deg)', 'rotate(0deg)'], D)
    const halo = mk(glowDef('mblamp') + '<circle cx="56" cy="115" r="46" fill="url(#mblamp)"/>', prop)
    an(halo, [
      { opacity: 0, transform: 'scale(.2)' }, { opacity: 0, transform: 'scale(.2)', offset: 0.2 }, { opacity: 1, transform: 'scale(1)', offset: 0.35 },
      { opacity: 0.7, transform: 'scale(.9)', offset: 0.5 }, { opacity: 1, transform: 'scale(1.05)', offset: 0.65 }, { opacity: 0.8, transform: 'scale(.95)', offset: 0.8 }, { opacity: 0, transform: 'scale(.4)' },
    ], D)
    const core = mk('<circle cx="56" cy="115" r="6" fill="#fffbd0"/>', prop)
    an(core, [{ opacity: 0, transform: 'scale(.2)' }, { opacity: 0, transform: 'scale(.2)', offset: 0.25 }, { opacity: 1, transform: 'scale(1.4)', offset: 0.35 }, { opacity: 0.9, transform: 'scale(1)', offset: 0.5 }, { opacity: 0.9, transform: 'scale(1.1)', offset: 0.8 }, { opacity: 0, transform: 'scale(.3)' }], D)
    ;[[30, 96], [84, 92], [58, 70]].forEach(([x, y], k) => {
      const s = mk(star(x, y, 5), prop)
      an(s, [{ opacity: 0, transform: 'scale(.2)' }, { opacity: 1, transform: 'scale(1)', offset: 0.4 }, { opacity: 0, transform: 'scale(.3)' }], 900, { delay: 900 + k * 350 })
    })
  },
  /* ENFJ Protagonist: raises the shield high, glint sweeps across, fist in the air */
  ({ prop, arm, fig, head, mk, an, dk }, run) => {
    const D = 2800
    run(prop, ['translateY(0px) scale(1)', 'translateY(-46px) scale(1.3)', 'translateY(-46px) scale(1.3)', 'translateY(-46px) scale(1.3)', 'translateY(0px) scale(1)'], D)
    run(arm, ['rotate(0deg)', 'rotate(-150deg)', 'rotate(-140deg)', 'rotate(-150deg)', 'rotate(0deg)'], D)
    run(fig, ['scale(1) translateY(0px)', 'scale(1.04) translateY(0px)', 'scale(1.04) translateY(-6px)', 'scale(1.04) translateY(0px)', 'scale(1) translateY(0px)'], D)
    run(head, ['rotate(0deg)', 'rotate(-4deg)', 'rotate(-4deg)', 'rotate(-4deg)', 'rotate(0deg)'], D)
    const gl = mk('<polygon points="44,104 52,102 62,134 54,138" fill="#fff"/>', prop)
    an(gl, [{ opacity: 0, transform: 'translateX(-8px)' }, { opacity: 0, transform: 'translateX(-8px)', offset: 0.35 }, { opacity: 0.85, transform: 'translateX(0px)', offset: 0.5 }, { opacity: 0, transform: 'translateX(12px)' }], D)
    ;[700, 1400].forEach((d) => {
      const r = mk(`<circle cx="55" cy="121" r="24" fill="none" stroke="${dk}" stroke-width="3"/>`, prop)
      an(r, [{ opacity: 0.7, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(2.2)' }], 800, { delay: d, easing: 'ease-out' })
    })
    ;[[28, 40], [150, 40]].forEach(([x, y], k) => {
      const s = mk(star(x, y, 7))
      an(s, [{ opacity: 0, transform: 'scale(.2) rotate(0deg)' }, { opacity: 1, transform: 'scale(1) rotate(45deg)', offset: 0.4 }, { opacity: 0, transform: 'scale(.3) rotate(90deg)' }], 1000, { delay: 800 + k * 300 })
    })
  },
  /* ENFP Campaigner: tips his hat with a nod and a twinkle */
  ({ arm, head, fig, prop, mk, an }, run) => {
    const D = 2600
    run(arm, ['rotate(0deg)', 'rotate(-160deg)', 'rotate(-172deg)', 'rotate(-160deg)', 'rotate(-172deg)', 'rotate(-160deg)', 'rotate(0deg)'], D)
    run(head, ['rotate(0deg)', 'rotate(7deg)', 'rotate(10deg)', 'rotate(7deg)', 'rotate(10deg)', 'rotate(7deg)', 'rotate(0deg)'], D)
    run(fig, ['translateY(0px)', 'translateY(0px)', 'translateY(-3px)', 'translateY(0px)', 'translateY(-3px)', 'translateY(0px)', 'translateY(0px)'], D)
    run(prop, ['rotate(0deg)', 'rotate(-8deg)', 'rotate(6deg)', 'rotate(-8deg)', 'rotate(6deg)', 'rotate(-8deg)', 'rotate(0deg)'], D)
    ;[800, 1500].forEach((d) => {
      const s = mk(star(134, 44, 7), head)
      an(s, [{ opacity: 0, transform: 'scale(.2) rotate(0deg)' }, { opacity: 1, transform: 'scale(1.2) rotate(30deg)', offset: 0.4 }, { opacity: 0, transform: 'scale(.3) rotate(60deg)' }], 600, { delay: d })
    })
  },
  /* ISTJ Logistician: spins the spear like a baton */
  ({ prop, head, fig, mk, an, dk }, run) => {
    const D = 2200
    run(prop, ['rotate(0deg)', 'rotate(-25deg)', 'rotate(700deg)', 'rotate(720deg)'], D, '56px 104px')
    run(head, ['rotate(0deg)', 'rotate(-3deg)', 'rotate(3deg)', 'rotate(0deg)'], D)
    run(fig, ['translateY(0px)', 'translateY(0px)', 'translateY(-4px)', 'translateY(0px)'], D)
    const t = mk(`<circle cx="56" cy="104" r="46" fill="none" stroke="${dk}" stroke-width="3" stroke-dasharray="18 14" stroke-linecap="round"/>`)
    an(t, [{ opacity: 0, transform: 'rotate(0deg)' }, { opacity: 0.4, transform: 'rotate(180deg)', offset: 0.25 }, { opacity: 0.4, transform: 'rotate(420deg)', offset: 0.7 }, { opacity: 0, transform: 'rotate(560deg)' }], D, { easing: 'linear' })
  },
  /* ISFJ Defender: raises the staff and casts a shield spell around the whole party */
  ({ prop, arm, head, fig, mk, an, dk }, run) => {
    const D = 2800
    run(prop, ['rotate(0deg) translateY(0px)', 'rotate(-12deg) translateY(-10px)', 'rotate(-12deg) translateY(-10px)', 'rotate(-12deg) translateY(-10px)', 'rotate(0deg) translateY(0px)'], D)
    run(arm, ['rotate(0deg)', 'rotate(-100deg)', 'rotate(-100deg)', 'rotate(-100deg)', 'rotate(0deg)'], D)
    run(head, ['rotate(0deg)', 'rotate(-4deg)', 'rotate(-4deg)', 'rotate(-4deg)', 'rotate(0deg)'], D)
    run(fig, ['scale(1)', 'scale(1.03)', 'scale(1)', 'scale(1.03)', 'scale(1)'], D)
    const halo = mk(glowDef('mbcross', '#ffffff') + '<circle cx="56" cy="72" r="22" fill="url(#mbcross)"/>', prop)
    an(halo, [{ opacity: 0, transform: 'scale(.3)' }, { opacity: 1, transform: 'scale(1)', offset: 0.25 }, { opacity: 0.6, transform: 'scale(.9)', offset: 0.5 }, { opacity: 1, transform: 'scale(1.1)', offset: 0.7 }, { opacity: 0, transform: 'scale(.4)' }], D)
    const dome = mk(`<polygon points="${hex(100, 108, 70)}" fill="#9fd8e8" fill-opacity=".3" stroke="${dk}" stroke-opacity=".8" stroke-width="3" stroke-linejoin="round"/><polygon points="${hex(100, 108, 56)}" fill="none" stroke="${dk}" stroke-opacity=".6" stroke-width="1.5" stroke-dasharray="6 5"/><polygon points="100,84 118,90 116,112 100,124 84,112 82,90" fill="#fff" fill-opacity=".85" stroke="${dk}" stroke-width="2" stroke-linejoin="round"/>`)
    an(dome, [
      { opacity: 0, transform: 'scale(.3)' }, { opacity: 1, transform: 'scale(1.08)', offset: 0.25 }, { opacity: 1, transform: 'scale(1)', offset: 0.35 },
      { opacity: 0.85, transform: 'scale(1)', offset: 0.7 }, { opacity: 0, transform: 'scale(1.15)' },
    ], D, { delay: 400 })
  },
  /* ESTJ Executive: puffs up and lets out a roar, shock arcs ripple outward */
  ({ head, fig, arm, prop, mk, an, dk }, run) => {
    const D = 2400
    run(fig, ['scale(1) translateX(0px)', 'scale(1.08) translateX(0px)', 'scale(1.08) translateX(-2px)', 'scale(1.08) translateX(2px)', 'scale(1.08) translateX(-2px)', 'scale(1.08) translateX(2px)', 'scale(1) translateX(0px)'], D)
    run(head, ['rotate(0deg)', 'rotate(-10deg)', 'rotate(-10deg)', 'rotate(-10deg)', 'rotate(-10deg)', 'rotate(0deg)'], D)
    run(arm, ['rotate(0deg)', 'rotate(-120deg)', 'rotate(-120deg)', 'rotate(-125deg)', 'rotate(-120deg)', 'rotate(0deg)'], D)
    run(prop, ['rotate(0deg)', 'rotate(-6deg)', 'rotate(6deg)', 'rotate(-6deg)', 'rotate(6deg)', 'rotate(-6deg)', 'rotate(0deg)'], D)
    const m = mk('<polygon points="90,70 110,70 106,86 94,86" fill="#3a0f0f"/><polygon points="95,82 105,82 100,86" fill="#d9605a"/>', head)
    an(m, [{ opacity: 0, transform: 'scaleY(.3)' }, { opacity: 0, transform: 'scaleY(.3)', offset: 0.18 }, { opacity: 1, transform: 'scaleY(1)', offset: 0.28 }, { opacity: 1, transform: 'scaleY(1)', offset: 0.75 }, { opacity: 0, transform: 'scaleY(.3)' }], D)
    ;[0, 1, 2].forEach((k) => {
      const r = mk(`<path d="M124 60 Q136 76 124 92" fill="none" stroke="${dk}" stroke-width="3.5" stroke-linecap="round"/>`)
      an(r, [{ opacity: 0, transform: 'translateX(-6px) scale(.6)' }, { opacity: 0.9, transform: 'translateX(2px) scale(.9)', offset: 0.25 }, { opacity: 0, transform: 'translateX(22px) scale(1.4)' }], 700, { delay: 500 + k * 220, easing: 'ease-out' })
      const l = mk(`<path d="M76 60 Q64 76 76 92" fill="none" stroke="${dk}" stroke-width="3.5" stroke-linecap="round"/>`)
      an(l, [{ opacity: 0, transform: 'translateX(6px) scale(.6)' }, { opacity: 0.9, transform: 'translateX(-2px) scale(.9)', offset: 0.25 }, { opacity: 0, transform: 'translateX(-22px) scale(1.4)' }], 700, { delay: 500 + k * 220, easing: 'ease-out' })
    })
  },
  /* ESFJ Consul: raises the flag high while it flutters, confetti falls */
  ({ prop, arm, fig, head, mk, an }, run) => {
    const D = 2800
    run(prop, ['translateY(0px) rotate(0deg) skewY(0deg)', 'translateY(-34px) rotate(-4deg) skewY(-6deg)', 'translateY(-34px) rotate(-4deg) skewY(6deg)', 'translateY(-34px) rotate(-4deg) skewY(-6deg)', 'translateY(-34px) rotate(-4deg) skewY(6deg)', 'translateY(-34px) rotate(-4deg) skewY(-6deg)', 'translateY(0px) rotate(0deg) skewY(0deg)'], D)
    run(arm, ['rotate(0deg)', 'rotate(-150deg)', 'rotate(-110deg)', 'rotate(-150deg)', 'rotate(-110deg)', 'rotate(-150deg)', 'rotate(0deg)'], D)
    run(fig, ['translateY(0px)', 'translateY(-5px)', 'translateY(0px)', 'translateY(-5px)', 'translateY(0px)', 'translateY(-5px)', 'translateY(0px)'], D)
    run(head, ['rotate(0deg)', 'rotate(-4deg)', 'rotate(4deg)', 'rotate(-4deg)', 'rotate(4deg)', 'rotate(-4deg)', 'rotate(0deg)'], D)
    const cols = ['#e0574a', '#e8c34a', '#5fbf7a', '#3d8fc4']
    ;[[50, 24], [68, 40], [92, 18], [116, 30], [134, 20], [150, 44], [108, 12]].forEach(([x, y], k) => {
      const c = mk(`<polygon points="${x},${y - 4} ${x + 3},${y} ${x},${y + 4} ${x - 3},${y}" fill="${cols[k % 4]}"/>`)
      an(c, [{ opacity: 0, transform: 'translateY(-6px) rotate(0deg)' }, { opacity: 1, transform: 'translateY(4px) rotate(60deg)', offset: 0.2 }, { opacity: 1, transform: 'translateY(16px) rotate(140deg)', offset: 0.7 }, { opacity: 0, transform: 'translateY(26px) rotate(200deg)' }], 1300, { delay: 500 + k * 170, easing: 'ease-in' })
    })
  },
  /* ISTP Virtuoso: lights dim, eyes glint, the dagger turns slowly */
  ({ prop, head, fig, pupils, mk, an, dk }, run) => {
    const D = 3000
    run(prop, ['translateY(0px) rotate(0deg)', 'translateY(-12px) rotate(0deg)', 'translateY(-12px) rotate(360deg)', 'translateY(0px) rotate(360deg)'], D, '55px 114px')
    run(head, ['rotate(0deg)', 'rotate(8deg)', 'rotate(8deg)', 'rotate(8deg)', 'rotate(0deg)'], D)
    run(fig, ['rotate(0deg)', 'rotate(-3deg)', 'rotate(-3deg)', 'rotate(0deg)'], D)
    run(pupils, ['translate(0px,0px)', 'translate(2px,2px)', 'translate(2px,2px)', 'translate(0px,0px)'], D)
    const v = mk('<defs><radialGradient id="mbvig"><stop offset=".4" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".75"/></radialGradient></defs><rect width="200" height="200" fill="url(#mbvig)"/>')
    an(v, [{ opacity: 0 }, { opacity: 1, offset: 0.25 }, { opacity: 1, offset: 0.75 }, { opacity: 0 }], D)
    ;[[40, 170], [160, 160], [100, 176]].forEach(([x, y], k) => {
      const w = mk(`<circle cx="${x}" cy="${y}" r="9" fill="${dk}"/>`)
      an(w, [{ opacity: 0, transform: 'translateY(0px) scale(.6)' }, { opacity: 0.3, offset: 0.4 }, { opacity: 0, transform: 'translateY(-50px) scale(1.6)' }], 1800, { delay: 300 + k * 450, easing: 'ease-out' })
    })
    const gl = mk(star(108, 58, 5, '#fff'), head)
    an(gl, [{ opacity: 0, transform: 'scale(.2)' }, { opacity: 0, transform: 'scale(.2)', offset: 0.35 }, { opacity: 1, transform: 'scale(1.3)', offset: 0.45 }, { opacity: 0, transform: 'scale(.3)' }], D)
  },
  /* ISFP Adventurer: unfolds the map, draws a route and marks the spot */
  ({ prop, head, pupils, mk, an }, run) => {
    const D = 3200
    run(prop, ['translateX(0px) translateY(0px) scale(1)', 'translateX(8px) translateY(-4px) scale(2)', 'translateX(8px) translateY(-4px) scale(2)', 'translateX(8px) translateY(-4px) scale(2)', 'translateX(0px) translateY(0px) scale(1)'], D)
    run(head, ['rotate(0deg)', 'rotate(8deg)', 'rotate(8deg)', 'rotate(8deg)', 'rotate(0deg)'], D)
    run(pupils, ['translate(0px,0px)', 'translate(-1px,2px)', 'translate(-1px,2px)', 'translate(-1px,2px)', 'translate(0px,0px)'], D)
    const g = mk('<path d="M47 124 Q52 112 57 118 T65 106" pathLength="1" fill="none" stroke="#c0392b" stroke-width="1.4" stroke-linecap="round" stroke-dasharray="1" stroke-dashoffset="1"/><path d="M62.5 103.5 l5 5 M67.5 103.5 l-5 5" fill="none" stroke="#c0392b" stroke-width="1.8" stroke-linecap="round"/>', prop)
    const [route, x] = [g.children[0], g.children[1]]
    an(route, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], 1000, { delay: 800, easing: 'linear' })
    an(x, [{ opacity: 0, transform: 'scale(.2)' }, { opacity: 0, transform: 'scale(.2)', offset: 0.55 }, { opacity: 1, transform: 'scale(1.5)', offset: 0.7 }, { opacity: 1, transform: 'scale(1)', offset: 0.8 }, { opacity: 1, transform: 'scale(1)' }], D)
    an(g, [{ opacity: 0 }, { opacity: 1, offset: 0.25 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }], D)
  },
  /* ESTP Entrepreneur: two quick slash-and-lunge combos (unchanged) */
  ({ prop, fig, head }, run) => {
    run(prop, ['rotate(0deg)', 'rotate(-70deg)', 'rotate(55deg)', 'rotate(0deg)', 'rotate(-70deg)', 'rotate(55deg)', 'rotate(0deg)'], 1800)
    run(fig, ['translateX(0px) rotate(0deg)', 'translateX(-6px) rotate(-3deg)', 'translateX(8px) rotate(4deg)', 'translateX(0px) rotate(0deg)', 'translateX(-6px) rotate(-3deg)', 'translateX(8px) rotate(4deg)', 'translateX(0px) rotate(0deg)'], 1800)
    run(head, ['rotate(0deg)', 'rotate(-4deg)', 'rotate(5deg)', 'rotate(0deg)', 'rotate(-4deg)', 'rotate(5deg)', 'rotate(0deg)'], 1800)
  },
  /* ESFP Entertainer: a little dance with music notes floating up */
  ({ fig, arm, prop, head, mk, an, dk }, run) => {
    const D = 2800
    run(fig, ['rotate(0deg) translateY(0px)', 'rotate(-8deg) translateY(-8px)', 'rotate(0deg) translateY(0px)', 'rotate(8deg) translateY(-8px)', 'rotate(0deg) translateY(0px)', 'rotate(-8deg) translateY(-8px)', 'rotate(0deg) translateY(0px)', 'rotate(8deg) translateY(-8px)', 'rotate(0deg) translateY(0px)'], D)
    run(arm, ['rotate(0deg)', 'rotate(-160deg)', 'rotate(-110deg)', 'rotate(-160deg)', 'rotate(-110deg)', 'rotate(-160deg)', 'rotate(-110deg)', 'rotate(-160deg)', 'rotate(0deg)'], D)
    run(prop, ['translateY(0px)', 'translateY(-10px)', 'translateY(0px)', 'translateY(-10px)', 'translateY(0px)', 'translateY(-10px)', 'translateY(0px)', 'translateY(-10px)', 'translateY(0px)'], D)
    run(head, ['rotate(0deg)', 'rotate(6deg)', 'rotate(0deg)', 'rotate(-6deg)', 'rotate(0deg)', 'rotate(6deg)', 'rotate(0deg)', 'rotate(-6deg)', 'rotate(0deg)'], D)
    ;[['♪', 34, 70], ['♫', 168, 78], ['♪', 28, 118], ['♫', 172, 120], ['♪', 52, 40]].forEach(([s, x, y], k) => {
      const n = mk(txt(s, x, y, 20, dk))
      an(n, [{ opacity: 0, transform: 'translateY(10px) scale(.6) rotate(-10deg)' }, { opacity: 1, transform: 'translateY(-2px) scale(1) rotate(0deg)', offset: 0.3 }, { opacity: 0, transform: 'translateY(-24px) scale(1) rotate(12deg)' }], 1400, { delay: k * 480, easing: 'ease-out' })
    })
  },
]

/* ---------- Text per type: adjectives | enjoys | career paths | work that allows them to ---------- */
const TR = { I: 'Introverted', E: 'Extraverted', N: 'Intuitive', S: 'Sensing', T: 'Thinking', F: 'Feeling', J: 'Judging', P: 'Prospecting' }
const INFO = [
  'thoughtful and strategic|improving systems, solving complex problems, and applying creativity and logic to their ideas|strategic thinking, complex problem-solving, research, systems development, and long-term planning|analyze information, develop solutions, improve processes, and work independently toward long-term goals',
  'curious and analytical|exploring ideas, understanding how things work, and solving challenging problems|analysis, research, experimentation, technology, and complex problem-solving|investigate ideas, understand systems, experiment with solutions, and explore new concepts',
  'strategic leaders who thrive on challenge|!are driven to organize people and resources to achieve long-term goals|management, entrepreneurship, consulting, law, and business strategy|take charge, make decisions, build plans, and drive progress',
  'quick-witted and inventive|debating ideas, challenging assumptions, and trying new approaches|innovation, entrepreneurship, marketing, product development, and technology|brainstorm freely, test new ideas, take on varied challenges, and persuade others',
  'insightful and principled|understanding people, pursuing meaningful goals, and helping others grow|counseling, education, writing, social work, and human-centered design|support others, work toward a purpose, express ideas, and make a lasting difference',
  'idealistic and imaginative|exploring their values, expressing creativity, and understanding others|writing, the arts, psychology, community work, and education|express themselves, stay true to their values, work creatively, and help others',
  'warm and charismatic|guiding others, building communities, and bringing out the best in people|teaching, coaching, human resources, public service, and communications|mentor others, lead with empathy, organize group efforts, and inspire people',
  'enthusiastic and creative|exploring possibilities, connecting with people, and sparking new ideas|media, marketing, counseling, event planning, and creative industries|collaborate, generate ideas, explore different interests, and energize others',
  'dependable and detail-oriented|keeping things organized, following clear processes, and finishing what they start|accounting, administration, auditing, engineering, and operations|follow clear standards, work with accuracy, manage details, and deliver reliable results',
  'caring and conscientious|supporting others, keeping routines steady, and looking after details|healthcare, education, administration, social services, and customer care|support people directly, maintain order, serve their community, and apply careful attention',
  'organized and practical|managing tasks, setting clear rules, and getting results efficiently|management, operations, public safety, finance, and project coordination|lead teams, set clear structures, manage resources, and meet goals',
  'sociable and considerate|helping others, bringing people together, and keeping the group running smoothly|healthcare, teaching, event coordination, customer service, and human resources|work with people, support a team, organize activities, and create a welcoming environment',
  'observant and hands-on|figuring out how things work, solving practical problems, and working with tools|engineering, mechanics, IT support, the technical trades, and emergency response|work with their hands, troubleshoot problems, experiment, and act quickly',
  'gentle and artistic|exploring creative interests, enjoying the moment, and staying true to their values|design, the arts, photography, culinary work, and wellness|create things, work at their own pace, express a personal style, and engage their senses',
  'energetic and action-oriented|taking on challenges, thinking on their feet, and making things happen|sales, entrepreneurship, sports, emergency services, and trading|move quickly, take calculated risks, solve problems on the spot, and see immediate results',
  'spontaneous and outgoing|engaging with people, sharing experiences, and bringing energy to a room|performing arts, hospitality, events, entertainment, and customer-facing roles|interact with others, perform, try new things, and keep work lively',
]

/* Conic masks pivot on the ring centre and start at 3 o'clock, so they follow the rotating line exactly */
const mask = (a, inv) =>
  inv
    ? `conic-gradient(from 90deg at 50% 50%,#000 0 ${a}deg,transparent ${a}deg 180deg,#000 180deg ${180 + a}deg,transparent ${180 + a}deg 360deg)`
    : `conic-gradient(from 90deg at 50% 50%,transparent 0 ${a}deg,#000 ${a}deg 180deg,transparent 180deg ${180 + a}deg,#000 ${180 + a}deg 360deg)`
const setMask = (el, v) => { el.style.maskImage = el.style.webkitMaskImage = v }
const easeInOutSine = (u) => -(Math.cos(Math.PI * u) - 1) / 2 // gentler than cubic: no long stall at either end

/* ---------- Morph helpers: polygons of the old character glide into the new one ---------- */
const NS = 'http://www.w3.org/2000/svg'
const rgb = (h) => {
  h = h.replace('#', '')
  if (h.length === 3) h = [...h].map((c) => c + c).join('')
  return [0, 2, 4].map((k) => parseInt(h.slice(k, k + 2), 16))
}
function shapes(i) {
  const s = document.createElementNS(NS, 'svg')
  s.innerHTML = draw(i)
  return [...s.querySelectorAll('polygon,rect')].map((e) => ({
    pts: e.tagName === 'rect' ? [[0, 0], [200, 0], [200, 200], [0, 200]] : e.getAttribute('points').trim().split(/\s+/).map((p) => p.split(',').map(Number)),
    fill: rgb(e.getAttribute('fill')),
    op: +(e.getAttribute('opacity') || 1),
  }))
}
const grow = (p, n) => {
  p = p.map((q) => q.slice())
  while (p.length < n) {
    let k = 0, m = -1
    p.forEach((q, j) => {
      const r = p[(j + 1) % p.length], d = (q[0] - r[0]) ** 2 + (q[1] - r[1]) ** 2
      if (d > m) { m = d; k = j }
    })
    const q = p[k], r = p[(k + 1) % p.length]
    p.splice(k + 1, 0, [(q[0] + r[0]) / 2, (q[1] + r[1]) / 2])
  }
  return p
}
const cen = (p) => [p.reduce((s, q) => s + q[0], 0) / p.length, p.reduce((s, q) => s + q[1], 0) / p.length]

const MbtiShowCase = () => {
  /* true on phones / narrow screens: tapping the character does nothing there, so it can never get in the way of scrolling */
  const [mobile, setMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MOBILE_Q).matches
  )
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_Q)
    const on = (e) => setMobile(e.matches)
    setMobile(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  const secRef = useRef(null)
  const stageRef = useRef(null)
  const lyA = useRef(null)
  const lyB = useRef(null)
  const diamRef = useRef(null)
  const swayRef = useRef(null)
  const knobRef = useRef(null)
  const charRef = useRef(null)
  const segRef = useRef([])
  const jumpRef = useRef(() => {})
  const emoteRef = useRef(() => {})

  useEffect(() => {
    const sec = secRef.current
    const LY = [lyA.current, lyB.current]
    const diam = diamRef.current, sway = swayRef.current, knob = knobRef.current, ch = charRef.current
    const segs = segRef.current.map((g) => ({ g, fill: g.querySelector('.mbti__seg-fill') }))
    const canAnim = !matchMedia('(prefers-reduced-motion: reduce)').matches

    let shown = -1, want = -1, busy = false, act = 0
    let M = null, raf = 0, tickRaf = 0, tick = false
    let curSeg = -1, jump = -1, jumpT = 0, skipTo = false // skipTo: a ring click may jump straight to its target
    let emoteT = 0, emoAnims = [], fxNodes = []
    let textT = 0
    let lockUntil = 0, lastWheelT = 0, lastAbs = 0, exitDir = 0 // paged scrolling state
    let ty = 0, tdone = false, wasPin = null, prevTop = 0
    let amp = 0, ampTarget = 0, waveRaf = 0, idleT = 0
    let ext = 0, phase = 0, last = 0, lw = 4 // ext: 0-1 how far the strands stretch during the wipe

    /* the wavy strands live in this SVG; its origin is the ring centre */
    const ringEl = ch.parentElement.parentElement
    const P = [sway.querySelector('.mbti__strand-r'), sway.querySelector('.mbti__strand-l')]
    const D = [sway.querySelector('.mbti__dot-r'), sway.querySelector('.mbti__dot-l')]
    const RP = [sway.querySelector('.mbti__rip-r'), sway.querySelector('.mbti__rip-l')]

    function paint(L, i) {
      const [code, name] = TYPES[i]
      const [adj, en, paths, al] = INFO[i].split('|')
      const t = [...code].map((c) => TR[c])
      const [, tint, dark] = PAL[Math.floor(i / 4)]
      L.style.background = tint
      L.style.setProperty('--dk', dark)
      L.innerHTML =
        `<div class="mbti__tl"><h2 class="mbti__code">${code}</h2><p>${code} (${name}) is a personality type with ${t.slice(0, 3).join(', ')}, and ${t[3]} traits.</p></div>` +
        `<p class="mbti__tr">${code}s may be drawn to career paths involving ${paths}.</p>` +
        `<p class="mbti__bl">They are ${en[0] === '!' ? adj + ' and ' + en.slice(1) : adj + ' individuals who enjoy ' + en}.</p>` +
        `<div class="mbti__br"><p>They may particularly enjoy work that allows them to ${al}.</p><div class="mbti__nm">${name.toUpperCase()}</div></div>`
    }

    function setChar(i, pop = true) {
      ch.innerHTML = draw(i)
      ch.parentElement.setAttribute('aria-label', TYPES[i].join(' ') + ', activate to replay its emote')
      if (canAnim && pop) {
        ch.querySelectorAll('.mb-part').forEach((el, k) =>
          el.animate([{ transform: 'scale(.55)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], {
            duration: 520, delay: k * 45, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'backwards',
          })
        )
      }
    }

    /* ---------- wavy strands: one flowing line each side, point-mirrored so the 180° swap is seamless ---------- */
    function measure() {
      lw = Math.min(6, Math.max(3.5, innerWidth * 0.004))
      P.forEach((p) => p.setAttribute('stroke-width', lw.toFixed(1)))
    }

    function drawStrands(now) {
      const vw = innerWidth, vh = innerHeight
      const rw = ringEl.offsetWidth
      const x0 = rw / 2 + vw * 0.03
      const rest = vw * 0.5 - rw / 2 - vw * 0.06
      const L = Math.max(10, rest + ext * 1.3 * Math.max(vw, vh))
      const lam = Math.max(90, rest * 1.1) // wavelength
      const A = Math.min(rw * 0.14, Math.max(rest, 40) * 0.6) * amp // wave height: 0 = perfectly straight
      const ramp = Math.max(40, rest * 0.5) // the wave grows in from the ring
      const step = Math.min(10, lam / 16)
      let r = '', l = '', ex = 0, ey = 0
      for (let d = 0; ; d += step) {
        const dd = Math.min(d, L)
        const e = Math.min(1, dd / ramp), env = e * e * (3 - 2 * e)
        const y = A * env * (Math.sin((dd / lam) * TAU - phase) + 0.4 * Math.sin((dd / lam) * TAU * 2.3 - phase * 1.6 + 1.3))
        const x = x0 + dd
        r += (d ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1)
        l += (d ? 'L' : 'M') + (-x).toFixed(1) + ' ' + (-y).toFixed(1)
        ex = x; ey = y
        if (dd >= L) break
      }
      P[0].setAttribute('d', r)
      P[1].setAttribute('d', l)
      const p = (now % 2400) / 2400
      ;[[D[0], RP[0], ex, ey], [D[1], RP[1], -ex, -ey]].forEach(([dot, rip, x, y]) => {
        dot.setAttribute('cx', x.toFixed(1)); dot.setAttribute('cy', y.toFixed(1)); dot.setAttribute('r', (lw * 2.5).toFixed(1))
        rip.setAttribute('cx', x.toFixed(1)); rip.setAttribute('cy', y.toFixed(1))
        rip.setAttribute('r', (lw * 2.5 * (1 + 2.2 * p)).toFixed(1))
        rip.setAttribute('stroke-width', (lw * 0.8).toFixed(1))
        rip.setAttribute('stroke-opacity', (amp * 0.5 * (1 - p)).toFixed(3))
      })
    }

    function waveLoop(now) {
      const dt = last ? Math.min(50, now - last) : 16
      last = now
      amp += (ampTarget - amp) * (ampTarget > amp ? 0.04 : 0.14) // waves build slowly, straighten fast
      if (Math.abs(ampTarget - amp) < 0.004) amp = ampTarget
      phase += dt * 0.0022 // wave flows outward
      drawStrands(now)
      waveRaf = requestAnimationFrame(waveLoop)
    }
    function setWave(on) { ampTarget = on ? 1 : 0 }
    function armWave() {
      clearTimeout(idleT)
      if (!canAnim) return
      idleT = setTimeout(() => { if (!busy) setWave(true) }, IDLE_WAVE_MS)
    }
    function calm() { setWave(false); armWave() }

    /* ---------- emotes ---------- */
    function stopEmote() {
      clearTimeout(emoteT)
      emoAnims.forEach((a) => a.cancel())
      emoAnims = []
      fxNodes.forEach((n) => n.remove())
      fxNodes = []
    }

    function playEmote(i) {
      stopEmote()
      if (!canAnim || busy || shown !== i) return
      const q = (s) => ch.querySelector(s)
      const dk = PAL[Math.floor(i / 4)][2]
      const parts = { fig: q('.mb-fig'), head: q('.mb-head'), arm: q('.mb-arm'), prop: q('.mb-lprop'), pupils: q('.mb-pupils'), dk }
      const run = (el, frames, ms, origin) => {
        if (!el) return
        emoAnims.push(el.animate(frames.map((t) => ({ transform: t, easing: 'ease-in-out', ...(origin ? { transformOrigin: origin } : {}) })), { duration: ms, easing: 'linear' }))
      }
      /* temporary effect group (removed when the emote restarts or ends) */
      const mk = (markup, parent) => {
        const g = document.createElementNS(NS, 'g')
        g.innerHTML = markup
        ;[g, ...g.querySelectorAll('*')].forEach((e) => { e.style.transformBox = 'fill-box'; e.style.transformOrigin = 'center' })
        ;(parent || ch).appendChild(g)
        fxNodes.push(g)
        return g
      }
      const an = (el, frames, ms, o = {}) => {
        if (el) emoAnims.push(el.animate(frames, { duration: ms, fill: 'both', easing: 'ease-in-out', ...o }))
      }
      parts.mk = mk
      parts.an = an
      EMOTES[i](parts, run)
      emoteT = setTimeout(() => playEmote(i), EMOTE_GAP)
    }

    function queueEmote(i, delay) {
      clearTimeout(emoteT)
      emoteT = setTimeout(() => playEmote(i), delay)
    }

    /* tap / click / Enter on the character replays its emote (desktop only: on mobile it is ignored) */
    emoteRef.current = () => {
      if (matchMedia(MOBILE_Q).matches) return
      if (shown >= 0 && !busy) playEmote(shown)
    }

    /* ---------- morph ---------- */
    function prep(a, b) {
      if (ART[TYPES[a][0]] || ART[TYPES[b][0]]) { M = null; return }
      const A = shapes(a), B = shapes(b), n = Math.max(A.length, B.length)
      M = []
      for (let k = 0; k < n; k++) {
        let x = A[k], y = B[k]
        if (!x) { const c = cen(y.pts); x = { pts: y.pts.map(() => c), fill: y.fill, op: 0 } }
        if (!y) { const c = cen(x.pts); y = { pts: x.pts.map(() => c), fill: x.fill, op: 0 } }
        const m = Math.max(x.pts.length, y.pts.length, 6), pa = grow(x.pts, m), g = grow(y.pts, m)
        let best = 1e18, bs = 0
        for (let s = 0; s < m; s++) {
          let d = 0
          for (let j = 0; j < m; j++) { const u = pa[j], v = g[(j + s) % m]; d += (u[0] - v[0]) ** 2 + (u[1] - v[1]) ** 2 }
          if (d < best) { best = d; bs = s }
        }
        M.push({ pa, pb: g.map((_, j) => g[(j + bs) % m]), fa: x.fill, fb: y.fill, oa: x.op, ob: y.op })
      }
      ch.innerHTML = M.map(() => '<polygon/>').join('')
      M.nodes = [...ch.children]
    }

    function morph(t) {
      const n = M.length
      M.forEach((m, k) => {
        const u = Math.min(1, Math.max(0, t * 1.4 - (k / n) * 0.4)), e = u * u * (3 - 2 * u), nd = M.nodes[k]
        nd.setAttribute('points', m.pa.map((p, j) => (p[0] + (m.pb[j][0] - p[0]) * e).toFixed(1) + ',' + (p[1] + (m.pb[j][1] - p[1]) * e).toFixed(1)).join(' '))
        nd.setAttribute('fill', 'rgb(' + m.fa.map((c, j) => Math.round(c + (m.fb[j] - c) * e)).join(',') + ')')
        nd.setAttribute('opacity', (m.oa + (m.ob - m.oa) * e).toFixed(2))
      })
    }

    /* one frame of the sweep: masks, morph, rotating strands */
    function frame(a) {
      setMask(LY[act], mask(a, false))
      setMask(LY[1 - act], mask(a, true))
      if (M) morph(a / 180)
      diam.style.transform = `rotate(${a}deg)`
      ext = Math.sin((a * Math.PI) / 180) // strands stretch to the screen edge mid-sweep (redrawn by waveLoop)
    }

    function tween(dur, onUpdate, onDone) {
      const t0 = performance.now()
      const step = (now) => {
        const u = Math.min(1, (now - t0) / dur)
        onUpdate(easeInOutSine(u) * 180)
        if (u < 1) raf = requestAnimationFrame(step)
        else onDone()
      }
      raf = requestAnimationFrame(step)
    }

    /* step 1 of a swap: the old poster text leaves first, so nothing old is left when the circle spins */
    function textOut(L, done) {
      Array.from(L.children).forEach((b, k) => {
        b.animate(
          [{ opacity: 1, transform: 'translateY(0px)' }, { opacity: 0, transform: `translateY(${k < 2 ? -14 : 14}px)` }],
          { duration: TEXT_OUT_MS, delay: k * TEXT_STAGGER, easing: 'cubic-bezier(.4,0,.6,1)', fill: 'forwards' }
        )
      })
      textT = setTimeout(done, TEXT_OUT_MS + 3 * TEXT_STAGGER)
    }

    function go() {
      if (busy || shown === want) return
      /* step one personality at a time toward the target, so fast scrolling never skips any */
      const i = shown < 0 || !canAnim || skipTo ? want : shown + Math.sign(want - shown)
      skipTo = false
      const queued = want !== i // more personalities still waiting after this one
      if (shown < 0 || !canAnim) {
        paint(LY[act], i)
        setChar(i)
        shown = i
        queueEmote(i, 900)
        return
      }
      busy = true
      stopEmote()
      setWave(false)
      const o = LY[act], n = LY[1 - act]

      textOut(o, () => {
        /* step 2: the circle spins and wipes in the new poster */
        prep(shown, i)
        paint(n, i)
        n.style.visibility = 'visible'
        n.removeAttribute('aria-hidden')
        frame(0)
        tween(queued ? FAST_MS : WIPE_MS, frame, () => {
          o.style.visibility = 'hidden'
          o.setAttribute('aria-hidden', 'true')
          setMask(n, 'none')
          M = null
          setChar(i, false)
          act = 1 - act
          diam.style.transform = 'rotate(0deg)'
          ext = 0
          shown = i
          busy = false
          lockUntil = performance.now() + 150
          if (want !== shown) go()
          else {
            queueEmote(i, 350)
            armWave()
          }
        })
      })
    }

    /* ---------- ring: 16 segments fill with scroll progress ---------- */
    function ring(p) {
      const x = p * 16
      const cur = Math.min(15, Math.floor(x))
      segs.forEach((s, k) => {
        s.fill.style.strokeDashoffset = (1 - Math.min(1, Math.max(0, x - k))).toFixed(3)
      })
      if (cur !== curSeg) {
        if (segs[curSeg]) {
          segs[curSeg].g.classList.remove('is-on')
          segs[curSeg].g.removeAttribute('aria-current')
        }
        segs[cur].g.classList.add('is-on')
        segs[cur].g.setAttribute('aria-current', 'true')
        curSeg = cur
      }
      const f = x >= 16 ? 1 : x - cur
      knob.style.transform = `rotate(${(cur * SEG + GAP / 2 + f * (SEG - GAP)).toFixed(2)}deg)`
    }

    /* scroll picks the personality (16 stops across the pinned section) */
    function update() {
      tick = false
      calm()
      const max = sec.offsetHeight - innerHeight
      let r = sec.getBoundingClientRect()
      const pin = isPinned(r)
      /* just entered the pinned section: land exactly on the first / last type, whatever the scroll momentum was
         (invisible, because the stage is sticky) */
      if (wasPin === false && pin && jump < 0) {
        const k = prevTop > 0 ? 0 : 15
        const y = scrollY + r.top + ((k + SNAP_LAND) / 16) * max
        if (window.lenis) window.lenis.scrollTo(y, { immediate: true, force: true })
        else scrollTo({ top: y, behavior: 'auto' })
        r = sec.getBoundingClientRect()
      }
      wasPin = pin
      prevTop = r.top
      const p = Math.min(1, Math.max(0, -r.top / max))
      ring(p)
      const i = Math.min(15, Math.floor(p * 16))
      /* while a segment click is scrolling us there, skip the types we pass through */
      if (jump >= 0) {
        if (i !== jump) return
        jump = -1
        skipTo = true // clicked a segment: go straight there
      }
      if (i !== want) { want = i; go() }
    }
    const onScroll = () => { if (!tick) { tick = true; tickRaf = requestAnimationFrame(update) } }

    function cancelJump() { jump = -1; clearTimeout(jumpT) }

    jumpRef.current = (k, land = JUMP_LAND, dur = 1.6) => {
      const max = sec.offsetHeight - innerHeight
      const top = sec.getBoundingClientRect().top + scrollY + ((k + land) / 16) * max
      jump = k
      clearTimeout(jumpT)
      jumpT = setTimeout(() => { jump = -1; skipTo = true; update() }, 4000)
      if (window.lenis) window.lenis.scrollTo(top, { duration: dur, force: true })
      else scrollTo({ top, behavior: canAnim ? 'smooth' : 'auto' })
    }

    /* ---------- paged scrolling: one gesture = one personality, so spamming the scroll can never skip one ---------- */
    const isPinned = (rect) => rect.top <= 0 && rect.bottom >= innerHeight - 2
    const pinned = () => isPinned(sec.getBoundingClientRect())
    const base = () => (want >= 0 ? want : 0)
    const atEdge = (dir) => (dir > 0 && base() >= 15) || (dir < 0 && base() <= 0)
    const settled = () => !busy && jump < 0 && shown === want && performance.now() >= lockUntil

    function tryStep(dir) {
      if (!settled()) return
      const k = base() + dir
      if (k < 0 || k > 15) return
      lockUntil = performance.now() + SNAP_S * 1000 + 200
      jumpRef.current(k, SNAP_LAND, SNAP_S)
    }

    /* mouse wheel / trackpad: while the section is pinned we take over, and let the page scroll normally only
       at the very first / last type (so the section can still be left) */
    const onWheel = (e) => {
      if (e.ctrlKey || Math.abs(e.deltaY) < Math.abs(e.deltaX) || !pinned()) return
      const dir = Math.sign(e.deltaY)
      if (!dir) return
      const now = performance.now(), abs = Math.abs(e.deltaY), gap = now - lastWheelT
      const fresh = gap > 90 || (abs >= lastAbs && abs >= 8) // a new flick, not the fading tail of the last one
      lastWheelT = now
      lastAbs = abs
      if (exitDir === dir && gap < 200) return // already scrolling out of the section
      exitDir = 0
      if (atEdge(dir)) {
        if (settled() && fresh) { exitDir = dir; return }
        e.preventDefault(); e.stopImmediatePropagation()
        return
      }
      e.preventDefault(); e.stopImmediatePropagation()
      if (fresh && abs >= 2) tryStep(dir)
    }

    /* touch: one swipe = one personality */
    const onTouchStart = (e) => { ty = e.touches[0].clientY; tdone = false }
    const onTouchMove = (e) => {
      if (!pinned() || !e.cancelable) return
      const dy = ty - e.touches[0].clientY // > 0: finger moving up = scroll down
      const dir = Math.sign(dy)
      if (dir && atEdge(dir) && settled()) return // let the page scroll out at the ends
      e.preventDefault()
      if (!tdone && Math.abs(dy) >= 36) { tdone = true; tryStep(dir) }
    }

    /* keyboard */
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || !pinned()) return
      if (e.target.closest && e.target.closest('input,textarea,select,button,a,[role=button],[contenteditable]')) return
      const dir = { ArrowDown: 1, PageDown: 1, ArrowUp: -1, PageUp: -1, ' ': e.shiftKey ? -1 : 1 }[e.key]
      if (!dir) return
      if (atEdge(dir) && settled()) return
      e.preventDefault()
      tryStep(dir)
    }

    /* eyes and head follow the pointer */
    const onMove = (e) => {
      if (!canAnim) return
      const r = ch.getBoundingClientRect()
      const dx = Math.max(-1, Math.min(1, (e.clientX - r.left - r.width / 2) / (innerWidth / 2)))
      const dy = Math.max(-1, Math.min(1, (e.clientY - r.top - r.height / 2) / (innerHeight / 2)))
      const p = ch.querySelector('.mb-pupils'), h = ch.querySelector('.mb-head')
      if (p) p.style.transform = `translate(${dx * 1.8}px,${dy * 1.4}px)`
      if (h) h.style.transform = `rotate(${dx * 5}deg)`
    }

    addEventListener('scroll', onScroll, { passive: true })
    addEventListener('wheel', onWheel, { passive: false, capture: true })
    addEventListener('touchstart', onTouchStart, { passive: true })
    addEventListener('touchmove', onTouchMove, { passive: false })
    addEventListener('keydown', onKey)
    addEventListener('resize', update)
    addEventListener('resize', measure)
    addEventListener('pointermove', onMove, { passive: true })
    addEventListener('wheel', cancelJump, { passive: true })
    addEventListener('touchstart', cancelJump, { passive: true })
    measure()
    drawStrands(0)
    if (canAnim) waveRaf = requestAnimationFrame(waveLoop)
    update()

    return () => {
      cancelAnimationFrame(raf)
      cancelAnimationFrame(tickRaf)
      cancelAnimationFrame(waveRaf)
      clearTimeout(jumpT)
      clearTimeout(textT)
      clearTimeout(idleT)
      stopEmote()
      removeEventListener('scroll', onScroll)
      removeEventListener('wheel', onWheel, { capture: true })
      removeEventListener('touchstart', onTouchStart)
      removeEventListener('touchmove', onTouchMove)
      removeEventListener('keydown', onKey)
      removeEventListener('resize', update)
      removeEventListener('resize', measure)
      removeEventListener('pointermove', onMove)
      removeEventListener('wheel', cancelJump)
      removeEventListener('touchstart', cancelJump)
      LY.forEach((L) => { L.innerHTML = ''; L.removeAttribute('style') })
      LY[1].setAttribute('aria-hidden', 'true')
      ch.innerHTML = ''
      diam.style.transform = ''
      sway.style.transform = ''
      knob.style.transform = ''
      segs.forEach((s) => {
        s.fill.style.strokeDashoffset = ''
        s.g.classList.remove('is-on')
        s.g.removeAttribute('aria-current')
      })
    }
  }, [])

  return (
    <section className="mbti" ref={secRef} aria-label="Personality types">
      <div className="mbti__stage" ref={stageRef}>
        <div className="mbti__ly" ref={lyA} />
        <div className="mbti__ly mbti__ly--b" ref={lyB} aria-hidden="true" />

        <div className="mbti__ringbox">
          <svg className="mbti__ring" viewBox="0 0 400 400">
            {SEGS.map((s, k) => (
              <g
                key={s.code}
                className="mbti__seg"
                role="button"
                tabIndex={0}
                aria-label={`${s.code} ${s.name}, jump to this personality`}
                ref={(el) => { segRef.current[k] = el }}
                onClick={() => jumpRef.current(k)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); jumpRef.current(k) }
                }}
              >
                <title>{`${s.code} · ${s.name}`}</title>
                <path className="mbti__seg-track" d={s.d} />
                <path className="mbti__seg-fill" d={s.d} pathLength="1" />
                <path className="mbti__seg-hit" d={s.d} />
              </g>
            ))}
            <g ref={knobRef}>
              <circle className="mbti__knob" cx="200" cy="15" r="15" />
            </g>
          </svg>
          {/* On mobile the character is not tappable (pointer-events off), so touches pass through and never interfere with scrolling */}
          <div
            className="mbti__disc"
            {...(mobile
              ? { style: { pointerEvents: 'none' } }
              : {
                  tabIndex: 0,
                  role: 'button',
                  'aria-label': 'INTJ Architect, activate to replay its emote',
                  onClick: () => emoteRef.current(),
                  onKeyDown: (e) => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); emoteRef.current() }
                  },
                })}
          >
            <svg ref={charRef} viewBox="0 0 200 200" aria-hidden="true" />
          </div>
        </div>

        <div className="mbti__diam" ref={diamRef} aria-hidden="true">
          <div className="mbti__sway" ref={swayRef}>
            <svg className="mbti__strand" width="2" height="2" overflow="visible">
              <path className="mbti__strand-r" fill="none" stroke="#0a0a0a" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              <path className="mbti__strand-l" fill="none" stroke="#0a0a0a" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              <circle className="mbti__rip mbti__rip-r" cx="0" cy="0" r="1" fill="none" stroke="#0a0a0a" strokeOpacity="0" />
              <circle className="mbti__rip mbti__rip-l" cx="0" cy="0" r="1" fill="none" stroke="#0a0a0a" strokeOpacity="0" />
              <circle className="mbti__dot mbti__dot-r" cx="0" cy="0" r="1" fill="#0a0a0a" />
              <circle className="mbti__dot mbti__dot-l" cx="0" cy="0" r="1" fill="#0a0a0a" />
            </svg>
          </div>
        </div>
      </div>
    </section>
  )
}

export default MbtiShowCase