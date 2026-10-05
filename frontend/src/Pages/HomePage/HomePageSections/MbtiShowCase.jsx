import React, { useEffect, useRef } from 'react'
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
<polygon points="72,88 62,92 54,122 64,124" fill="${armor ? '#8b95a5' : b}"/><polygon points="${hex(58, 125, 6)}" fill="${sk}"/>${PROP[i]}
<g class="mb-arm"><polygon points="128,88 138,92 146,122 136,124" fill="${armor ? '#aab4c4' : C.L}"/><polygon points="${hex(141, 125, 6)}" fill="${sh(sk, 14)}"/></g>
<polygon points="94,76 106,76 106,88 94,88" fill="${sh(sk, -25)}"/>
<g class="mb-head"><polygon points="100,36 80,46 78,64 88,80 100,80" fill="${sk}"/><polygon points="100,36 120,46 122,64 112,80 100,80" fill="${sh(sk, 14)}"/>${hair}
<polygon points="100,62 104,71 96,71" fill="${sh(sk, -22)}"/>
<g class="mb-pupils"><polygon points="88,60 92,57 96,60 92,63" fill="#1a1a1a"/><polygon points="104,60 108,57 112,60 108,63" fill="#1a1a1a"/></g>
${ext ? '<polygon points="93,74 107,74 100,80" fill="#7a2a2a"/>' : '<polygon points="95,75 105,75 103,77 97,77" fill="#7a2a2a"/>'}${HEAD[i]}</g>
</g></g>`)
}

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
const easeInOutCubic = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2)

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
  const secRef = useRef(null)
  const lyA = useRef(null)
  const lyB = useRef(null)
  const diamRef = useRef(null)
  const dashRef = useRef(null)
  const arcRef = useRef(null)
  const charRef = useRef(null)

  /* click / Enter on the character: wave */
  const wave = () => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const ch = charRef.current
    const arm = ch.querySelector('.mb-arm'), fig = ch.querySelector('.mb-fig')
    if (arm) arm.animate(['0deg', '-150deg', '-110deg', '-150deg', '-110deg', '0deg'].map((r) => ({ transform: `rotate(${r})` })), { duration: 1100, easing: 'ease-in-out' })
    if (fig) fig.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-9px)' }, { transform: 'translateY(0)' }], { duration: 450, easing: 'ease-out' })
  }

  useEffect(() => {
    const sec = secRef.current
    const LY = [lyA.current, lyB.current]
    const diam = diamRef.current, dash = dashRef.current, arc = arcRef.current, ch = charRef.current
    const canAnim = !matchMedia('(prefers-reduced-motion: reduce)').matches

    let shown = -1, want = -1, busy = false, act = 0, base = 0
    let M = null, raf = 0, tickRaf = 0, tick = false

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
      ch.parentElement.setAttribute('aria-label', TYPES[i].join(' ') + ', activate to wave')
      if (canAnim && pop) {
        ch.querySelectorAll('.mb-part').forEach((el, k) =>
          el.animate([{ transform: 'scale(.55)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], {
            duration: 520, delay: k * 45, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'backwards',
          })
        )
      }
    }

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

    /* one frame of the sweep: masks, morph, rotating line, ring */
    function frame(a) {
      setMask(LY[act], mask(a, false))
      setMask(LY[1 - act], mask(a, true))
      if (M) morph(a / 180)
      diam.style.transform = `rotate(${a}deg)`
      diam.style.setProperty('--ext', Math.sin((a * Math.PI) / 180).toFixed(3))
      dash.style.transform = `rotate(${base + a}deg)`
      arc.style.transform = `rotate(${(base + a) * 1.5}deg)`
    }

    function tween(dur, onUpdate, onDone) {
      const t0 = performance.now()
      const step = (now) => {
        const u = Math.min(1, (now - t0) / dur)
        onUpdate(easeInOutCubic(u) * 180)
        if (u < 1) raf = requestAnimationFrame(step)
        else onDone()
      }
      raf = requestAnimationFrame(step)
    }

    function go() {
      if (busy || shown === want) return
      const i = want
      if (shown < 0 || !canAnim) { paint(LY[act], i); setChar(i); shown = i; return }
      busy = true
      const o = LY[act], n = LY[1 - act]
      prep(shown, i)
      paint(n, i)
      n.style.visibility = 'visible'
      n.removeAttribute('aria-hidden')
      frame(0)
      tween(1200, frame, () => {
        o.style.visibility = 'hidden'
        o.setAttribute('aria-hidden', 'true')
        setMask(n, 'none')
        M = null
        setChar(i, false)
        act = 1 - act
        base += 180
        diam.style.transform = 'rotate(0deg)'
        diam.style.setProperty('--ext', 0)
        shown = i
        busy = false
        go()
      })
    }

    /* scroll picks the personality (16 stops across the pinned section) */
    function update() {
      tick = false
      const max = sec.offsetHeight - innerHeight
      const p = Math.min(1, Math.max(0, -sec.getBoundingClientRect().top / max))
      const i = Math.min(15, Math.floor(p * 16))
      if (i !== want) { want = i; go() }
    }
    const onScroll = () => { if (!tick) { tick = true; tickRaf = requestAnimationFrame(update) } }

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
    addEventListener('resize', update)
    addEventListener('pointermove', onMove, { passive: true })
    update()

    return () => {
      cancelAnimationFrame(raf)
      cancelAnimationFrame(tickRaf)
      removeEventListener('scroll', onScroll)
      removeEventListener('resize', update)
      removeEventListener('pointermove', onMove)
      LY.forEach((L) => { L.innerHTML = ''; L.removeAttribute('style') })
      LY[1].setAttribute('aria-hidden', 'true')
      ch.innerHTML = ''
      ;[diam, dash, arc].forEach((el) => { el.style.transform = '' })
    }
  }, [])

  return (
    <section className="mbti" ref={secRef} aria-label="Personality types">
      <div className="mbti__stage">
        <div className="mbti__ly" ref={lyA} />
        <div className="mbti__ly mbti__ly--b" ref={lyB} aria-hidden="true" />

        <div className="mbti__ringbox">
          <svg className="mbti__ring" viewBox="0 0 400 400" aria-hidden="true">
            <g ref={dashRef}>
              <circle cx="200" cy="200" r="185" fill="none" stroke="#0a0a0a" strokeWidth="10" strokeDasharray="12 15" />
            </g>
            <g ref={arcRef}>
              <path d="M193.5 15.2 A185 185 0 0 1 384.6 187.1" fill="none" stroke="#0a0a0a" strokeWidth="16" />
              <circle cx="193.5" cy="15.2" r="15" fill="#0a0a0a" />
              <circle cx="384.6" cy="187.1" r="15" fill="#0a0a0a" />
            </g>
          </svg>
          <div
            className="mbti__disc"
            tabIndex={0}
            role="button"
            aria-label="INTJ Architect, activate to wave"
            onClick={wave}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); wave() } }}
          >
            <svg ref={charRef} viewBox="0 0 200 200" aria-hidden="true" />
          </div>
        </div>

        <div className="mbti__diam" ref={diamRef} aria-hidden="true">
          <i className="mbti__diam-r" />
          <i className="mbti__diam-l" />
        </div>
      </div>
    </section>
  )
}

export default MbtiShowCase