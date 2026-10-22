import React, { useEffect, useRef } from 'react'

/* Shared low-poly MBTI character + 16-segment ring, with the signature emote per type. */
export const TYPES = [
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

/* adjectives | enjoys */
const INFO = [
  'thoughtful and strategic|improving systems, solving complex problems, and applying creativity and logic to their ideas',
  'curious and analytical|exploring ideas, understanding how things work, and solving challenging problems',
  'strategic leaders who thrive on challenge|!are driven to organize people and resources to achieve long-term goals',
  'quick-witted and inventive|debating ideas, challenging assumptions, and trying new approaches',
  'insightful and principled|understanding people, pursuing meaningful goals, and helping others grow',
  'idealistic and imaginative|exploring their values, expressing creativity, and understanding others',
  'warm and charismatic|guiding others, building communities, and bringing out the best in people',
  'enthusiastic and creative|exploring possibilities, connecting with people, and sparking new ideas',
  'dependable and detail-oriented|keeping things organized, following clear processes, and finishing what they start',
  'caring and conscientious|supporting others, keeping routines steady, and looking after details',
  'organized and practical|managing tasks, setting clear rules, and getting results efficiently',
  'sociable and considerate|helping others, bringing people together, and keeping the group running smoothly',
  'observant and hands-on|figuring out how things work, solving practical problems, and working with tools',
  'gentle and artistic|exploring creative interests, enjoying the moment, and staying true to their values',
  'energetic and action-oriented|taking on challenges, thinking on their feet, and making things happen',
  'spontaneous and outgoing|engaging with people, sharing experiences, and bringing energy to a room',
]

const idxOf = (code) => TYPES.findIndex(([c]) => c === String(code || '').toUpperCase())

/* { name, tint, dark, main, blurb } for a type code, or null if unknown */
export const mbtiTheme = (code) => {
  const i = idxOf(code)
  if (i < 0) return null
  const [main, tint, dark] = PAL[Math.floor(i / 4)]
  const [adj, en] = INFO[i].split('|')
  const cap = adj[0].toUpperCase() + adj.slice(1)
  const blurb = en[0] === '!' ? `${cap}. You ${en.slice(1)}.` : `${cap}. You tend to enjoy ${en}.`
  return { name: TYPES[i][1], tint, dark, main, blurb }
}

/* ---------- ring ---------- */
const R = 185
const SEG = 360 / 16
const GAP = 5
const polar = (deg) => {
  const r = (deg * Math.PI) / 180
  return [200 + R * Math.sin(r), 200 - R * Math.cos(r)]
}
const arcPath = (a, b) => {
  const [x0, y0] = polar(a)
  const [x1, y1] = polar(b)
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${R} ${R} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`
}
const SEG_PATHS = TYPES.map((_, k) => arcPath(k * SEG + GAP / 2, (k + 1) * SEG - GAP / 2))

/* ---------- character art ---------- */
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
const BARE = [1, 3, 5, 6, 7, 11, 13, 14, 15]
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

/* parts carry their own pivots inline so no external CSS is needed */
const PART = 'class="mb-part" style="transform-box:fill-box;transform-origin:center"'

function draw(i) {
  const [code] = TYPES[i], g = Math.floor(i / 4), [b, t, d] = PAL[g]
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
  return F(`<g ${PART}>${scene}</g><polygon ${PART} points="48,178 66,172 134,172 152,178 136,190 64,190" fill="${sh(d, -10)}"/><polygon ${PART} points="100,172 134,172 152,178 136,190 100,190" fill="${sh(d, 25)}"/>
<g ${PART}><g class="mb-fig" style="transform-origin:100px 172px">
<polygon points="74,86 126,86 150,168 50,168" fill="${C.K}"/><polygon points="100,86 126,86 150,168 100,168" fill="${sh(b, -30)}"/>
<polygon points="82,130 99,130 97,172 80,172" fill="#2f3140"/><polygon points="101,130 118,130 120,172 103,172" fill="#454860"/>
<polygon points="78,172 98,172 98,178 76,178" fill="#1a1a1a"/><polygon points="102,172 122,172 124,178 102,178" fill="#2b2b2b"/>
${body}
<polygon points="72,88 62,92 54,122 64,124" fill="${armor ? '#8b95a5' : b}"/><g class="mb-lprop" style="transform-origin:58px 125px"><polygon points="${hex(58, 125, 6)}" fill="${sk}"/>${PROP[i]}</g>
<g class="mb-arm" style="transform-origin:126px 92px"><polygon points="128,88 138,92 146,122 136,124" fill="${armor ? '#aab4c4' : C.L}"/><polygon points="${hex(141, 125, 6)}" fill="${sh(sk, 14)}"/></g>
<polygon points="94,76 106,76 106,88 94,88" fill="${sh(sk, -25)}"/>
<g class="mb-head" style="transform-origin:100px 80px"><polygon points="100,36 80,46 78,64 88,80 100,80" fill="${sk}"/><polygon points="100,36 120,46 122,64 112,80 100,80" fill="${sh(sk, 14)}"/>${hair}
<polygon points="100,62 104,71 96,71" fill="${sh(sk, -22)}"/>
<g class="mb-pupils"><polygon points="88,60 92,57 96,60 92,63" fill="#1a1a1a"/><polygon points="104,60 108,57 112,60 108,63" fill="#1a1a1a"/></g>
${ext ? '<polygon points="93,74 107,74 100,80" fill="#7a2a2a"/>' : '<polygon points="95,75 105,75 103,77 97,77" fill="#7a2a2a"/>'}${HEAD[i]}</g>
</g></g>`)
}

/* ---------- Emotes: one signature move per character ----------
   Parts: fig (whole body), head, arm (right arm), prop (left hand + item), pupils.
   Helpers: run(el, frames, ms, origin?) animates a part; mk(markup, parent?) adds a temporary effect;
   an(el, keyframes, ms, opts) animates any element; dk is the character's dark colour. */
const FONT = 'Inter, Arial, sans-serif'
const star = (x, y, s = 5, f = '#f5c518') =>
  `<polygon points="${x},${y - s} ${x + s * 0.3},${y - s * 0.3} ${x + s},${y} ${x + s * 0.3},${y + s * 0.3} ${x},${y + s} ${x - s * 0.3},${y + s * 0.3} ${x - s},${y} ${x - s * 0.3},${y - s * 0.3}" fill="${f}"/>`
const glowDef = (id, c = '#fff6a8') =>
  `<defs><radialGradient id="${id}"><stop offset="0" stop-color="${c}" stop-opacity="1"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient></defs>`
const txt = (s, x, y, size, fill) =>
  `<text x="${x}" y="${y}" font-size="${size}" font-weight="900" text-anchor="middle" fill="${fill}" font-family="${FONT}">${s}</text>`

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
  /* ESTP Entrepreneur: two quick slash-and-lunge combos */
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

const NS = 'http://www.w3.org/2000/svg'
const EMOTE_GAP = 5200 // ms between emote repeats

/* ring of 16 segments (the type's own segment is solid) with the animated character inside.
   animate={false} turns the movement off. */
const MbtiCharacter = ({ code, className = '', animate = true }) => {
  const i = idxOf(code)
  const ref = useRef(null)

  useEffect(() => {
    const ch = ref.current
    if (!ch || i < 0) return undefined
    ch.innerHTML = draw(i)

    const canAnim = animate && !matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!canAnim) return undefined

    let emoteT = 0
    let emoAnims = []
    let fxNodes = []

    /* pop-in */
    ch.querySelectorAll('.mb-part').forEach((el, k) =>
      el.animate([{ transform: 'scale(.55)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], {
        duration: 520, delay: k * 45, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'backwards',
      })
    )

    const stopEmote = () => {
      clearTimeout(emoteT)
      emoAnims.forEach((a) => a.cancel())
      emoAnims = []
      fxNodes.forEach((n) => n.remove())
      fxNodes = []
    }

    const playEmote = () => {
      stopEmote()
      const q = (s) => ch.querySelector(s)
      const dk = PAL[Math.floor(i / 4)][2]
      const parts = { fig: q('.mb-fig'), head: q('.mb-head'), arm: q('.mb-arm'), prop: q('.mb-lprop'), pupils: q('.mb-pupils'), dk }
      const run = (el, frames, ms, origin) => {
        if (!el) return
        emoAnims.push(el.animate(frames.map((t) => ({ transform: t, easing: 'ease-in-out', ...(origin ? { transformOrigin: origin } : {}) })), { duration: ms, easing: 'linear' }))
      }
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
      emoteT = setTimeout(playEmote, EMOTE_GAP)
    }

    emoteT = setTimeout(playEmote, 900)

    /* eyes and head follow the pointer */
    const onMove = (e) => {
      const r = ch.getBoundingClientRect()
      const dx = Math.max(-1, Math.min(1, (e.clientX - r.left - r.width / 2) / (innerWidth / 2)))
      const dy = Math.max(-1, Math.min(1, (e.clientY - r.top - r.height / 2) / (innerHeight / 2)))
      const p = ch.querySelector('.mb-pupils')
      const h = ch.querySelector('.mb-head')
      if (p) p.style.transform = `translate(${dx * 1.8}px,${dy * 1.4}px)`
      if (h) h.style.transform = `rotate(${dx * 5}deg)`
    }
    addEventListener('pointermove', onMove, { passive: true })

    return () => {
      stopEmote()
      removeEventListener('pointermove', onMove)
    }
  }, [i, animate])

  if (i < 0) return null
  return (
    <div className={`relative aspect-square ${className}`} role="img" aria-label={`${TYPES[i][0]} ${TYPES[i][1]}`}>
      <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full" aria-hidden="true">
        {SEG_PATHS.map((d, k) => (
          <path
            key={k}
            d={d}
            fill="none"
            strokeWidth={k === i ? 19 : 14}
            stroke={k === i ? '#0a0a0a' : 'rgba(10,10,10,0.16)'}
          />
        ))}
      </svg>
      <div className="absolute inset-[8.5%] overflow-hidden rounded-full">
        <svg ref={ref} viewBox="0 0 200 200" className="block h-full w-full" aria-hidden="true" />
      </div>
    </div>
  )
}

export default MbtiCharacter