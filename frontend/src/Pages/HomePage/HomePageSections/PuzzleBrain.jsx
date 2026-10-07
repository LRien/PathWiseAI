import React, { useEffect, useRef } from 'react'
import anime from 'animejs/lib/anime.es.js' // npm i animejs@3.2.2 (v3 only)

const S = 30
const COLS = 11
const ROWS = 17
const W = COLS * S
const H = ROWS * S
const PAD = S * 1.5 // free space around the figure so pieces can be pulled away
const VX = -PAD
const VY = -PAD
const VW = W + PAD * 2
const VH = H + PAD * 2
const IDLE_MS = 9000 // untouched this long -> every piece flies back
const SNAP = S * 0.55 // drop a piece this close to its slot -> it clicks in
const MIN = S * 0.98
const NS = 'http://www.w3.org/2000/svg'

// K hair | F face | E eye | N nose | D neck | B blue | R red | Y yellow
// O orange | W white cuff | H hand | G gray pants | C dark legs | S shoes
const SHAPE = [
  '...KKKKK...',
  '..KKKKKKK..',
  '..KKKKKKK..',
  '..KFFFFFK..',
  '..KFEFEFK..',
  '..KFFNFFK..',
  '....DDD....',
  '.BBRBBBRRB.',
  'OBRRBBYRRBW',
  'OBBYYYYYBRW',
  'HBRYYYYYRBH',
  'BBYRGGGBYRB',
  'YBRYGGGRBYB',
  'BYRBGGGYRBY',
  'RBYBCCCYBRY',
  '....C.C....',
  '...SS.SS...',
]

const COLORS = {
  K: ['#1b1b1d', '#2d2d30'],
  F: ['#b97b53', '#c78960'],
  E: ['#b97b53', '#c78960'],
  N: ['#b97b53', '#c78960'],
  D: ['#9a603c', '#a86a44'],
  B: ['#2f7de1', '#3a9be0'],
  R: ['#d93a3f', '#ee5a5c'],
  Y: ['#f7c52d', '#fbd95e'],
  O: ['#f08a24', '#f6a04a'],
  W: ['#ffffff', '#f1ece4'],
  H: ['#b97b53', '#a86a44'],
  G: ['#667587', '#7a8899'],
  C: ['#33465c', '#2a3b4f'],
  S: ['#7c8696', '#6c7686'],
}

const el = (name, attrs) => {
  const e = document.createElementNS(NS, name)
  Object.keys(attrs).forEach((k) => e.setAttribute(k, attrs[k]))
  return e
}

const PuzzleBrain = () => {
  const svgRef = useRef(null)
  const layerRef = useRef(null)

  useEffect(() => {
    const svg = svgRef.current
    const layer = layerRef.current
    layer.innerHTML = ''

    const tiles = []
    let drag = null
    let ready = false
    let raf = 0
    let idleT = 0
    let gx = 0
    let gy = 0
    let last = { dx: 0, dy: 0, t: 0 }

    // deterministic shade variation so the figure looks the same every load
    let seed = 11
    const rnd = () => {
      seed = (seed * 9301 + 49297) % 233280
      return seed / 233280
    }

    const render = (t) => {
      t.g.style.transform = `translate(${t.x}px,${t.y}px) rotate(${t.rot}deg) scale(${t.s})`
      t.g.style.opacity = t.o
    }
    const renderAll = () => tiles.forEach(render)

    const mk = (c, r, ch) => {
      const fill = COLORS[ch][rnd() > 0.5 ? 1 : 0]
      const x = c * S
      const y = r * S
      const g = el('g', {})
      g.style.transformBox = 'fill-box'
      g.style.transformOrigin = 'center'
      g.style.cursor = 'grab'

      g.appendChild(el('rect', { x, y, width: S, height: S, fill, stroke: 'rgba(0,0,0,.18)' }))
      // puzzle socket (left) + tab (top)
      g.appendChild(el('circle', { cx: x, cy: y + S / 2, r: 5, fill: 'rgba(0,0,0,.22)' }))
      g.appendChild(el('circle', { cx: x + S / 2, cy: y - 2.5, r: 6, fill }))

      // face details live on their own tiles so they travel with the piece
      if (ch === 'E') {
        const cx = x + S / 2
        const cy = y + S / 2
        g.appendChild(el('polygon', {
          points: `${cx},${cy - 6} ${cx + 8},${cy} ${cx},${cy + 6} ${cx - 8},${cy}`,
          fill: '#141416',
        }))
      }
      if (ch === 'N') {
        const cx = x + S / 2
        const cy = y + S / 2
        g.appendChild(el('polygon', {
          points: `${cx},${cy - 8} ${cx + 9},${cy + 8} ${cx - 9},${cy + 8}`,
          fill: '#a6683f',
        }))
      }

      const t = { g, hx: x + S / 2, hy: y + S / 2, x: 0, y: 0, vx: 0, vy: 0, rot: 0, s: 1, o: 1 }
      g.__t = t
      layer.appendChild(g)
      tiles.push(t)
    }

    SHAPE.forEach((row, r) => {
      row.split('').forEach((ch, c) => {
        if (ch !== '.') mk(c, r, ch)
      })
    })

    // ---- tiny physics: pieces push each other and stay where they end up
    const step = () => {
      let moving = false
      for (const a of tiles) {
        if (a === drag) continue
        a.x += a.vx
        a.y += a.vy
        a.vx *= 0.86
        a.vy *= 0.86
      }
      for (let it = 0; it < 3; it++) {
        for (let i = 0; i < tiles.length; i++) {
          for (let j = i + 1; j < tiles.length; j++) {
            const a = tiles[i]
            const b = tiles[j]
            let dx = b.hx + b.x - (a.hx + a.x)
            let dy = b.hy + b.y - (a.hy + a.y)
            let d = Math.sqrt(dx * dx + dy * dy)
            if (d >= MIN) continue
            if (d < 0.01) { dx = 0.01; dy = 0; d = 0.01 }
            const ov = MIN - d
            const nx = dx / d
            const ny = dy / d
            if (a === drag) {
              b.x += nx * ov; b.y += ny * ov; b.vx += nx * ov * 0.25; b.vy += ny * ov * 0.25
            } else if (b === drag) {
              a.x -= nx * ov; a.y -= ny * ov; a.vx -= nx * ov * 0.25; a.vy -= ny * ov * 0.25
            } else {
              a.x -= (nx * ov) / 2; a.y -= (ny * ov) / 2
              b.x += (nx * ov) / 2; b.y += (ny * ov) / 2
              a.vx -= nx * ov * 0.1; a.vy -= ny * ov * 0.1
              b.vx += nx * ov * 0.1; b.vy += ny * ov * 0.1
            }
          }
        }
      }
      for (const a of tiles) {
        if (a === drag) { render(a); continue }
        const cx = a.hx + a.x
        const cy = a.hy + a.y
        if (cx < -PAD) { a.x = -PAD - a.hx; a.vx = Math.abs(a.vx) * 0.5 }
        else if (cx > W + PAD) { a.x = W + PAD - a.hx; a.vx = -Math.abs(a.vx) * 0.5 }
        if (cy < -PAD) { a.y = -PAD - a.hy; a.vy = Math.abs(a.vy) * 0.5 }
        else if (cy > H + PAD) { a.y = H + PAD - a.hy; a.vy = -Math.abs(a.vy) * 0.5 }
        a.rot += (Math.max(-25, Math.min(25, a.vx * 4)) - a.rot) * 0.2
        if (Math.abs(a.vx) > 0.03 || Math.abs(a.vy) > 0.03 || Math.abs(a.rot) > 0.3) moving = true
        render(a)
      }
      raf = drag || moving ? requestAnimationFrame(step) : 0
    }
    const wake = () => { if (!raf) raf = requestAnimationFrame(step) }

    // ---- reassemble: everything flows back into the figure
    const reset = () => {
      if (drag) { touch(); return }
      anime.remove(tiles)
      cancelAnimationFrame(raf)
      raf = 0
      tiles.forEach((t) => { t.vx = 0; t.vy = 0 })
      anime({
        targets: tiles, x: 0, y: 0, rot: 0, s: 1, o: 1,
        delay: anime.stagger(12, { from: 'center' }),
        duration: 1300, easing: 'easeOutElastic(1, .7)', update: renderAll,
      })
    }
    function touch() {
      clearTimeout(idleT)
      idleT = setTimeout(reset, IDLE_MS)
    }

    // ---- dragging
    const pt = (e) => {
      const b = svg.getBoundingClientRect()
      return {
        x: VX + ((e.clientX - b.left) / b.width) * VW,
        y: VY + ((e.clientY - b.top) / b.height) * VH,
      }
    }
    const onDown = (e) => {
      const g = e.target.closest && e.target.closest('g')
      if (!ready || !g || !g.__t) return
      const t = g.__t
      const p = pt(e)
      anime.remove(tiles)
      clearTimeout(idleT)
      drag = t
      gx = t.hx + t.x - p.x
      gy = t.hy + t.y - p.y
      t.vx = 0; t.vy = 0
      layer.appendChild(t.g)
      svg.style.cursor = 'grabbing'
      svg.setPointerCapture(e.pointerId)
      anime({ targets: t, s: 1.15, duration: 200, easing: 'easeOutQuad', update: () => render(t) })
      wake()
    }
    const onMove = (e) => {
      if (!drag) return
      const p = pt(e)
      const nx = Math.max(-PAD, Math.min(W + PAD, p.x + gx))
      const ny = Math.max(-PAD, Math.min(H + PAD, p.y + gy))
      last = { dx: nx - (drag.hx + drag.x), dy: ny - (drag.hy + drag.y), t: performance.now() }
      drag.x = nx - drag.hx
      drag.y = ny - drag.hy
      wake()
    }
    const release = () => {
      if (!drag) return
      const t = drag
      drag = null
      svg.style.cursor = ''
      anime.remove(t)

      // attach: dropped close to its own slot -> click back into place
      if (Math.hypot(t.x, t.y) < SNAP) {
        t.vx = 0; t.vy = 0
        anime({
          targets: t, x: 0, y: 0, rot: 0, s: 1,
          duration: 450, easing: 'easeOutElastic(1, .6)', update: () => render(t),
        })
      } else {
        // detach: fling it with the throw velocity
        if (performance.now() - last.t < 80) { t.vx = last.dx * 0.6; t.vy = last.dy * 0.6 }
        anime({ targets: t, s: 1, duration: 400, easing: 'easeOutElastic(1, .6)', update: () => render(t) })
      }
      touch()
      wake()
    }
    svg.addEventListener('pointerdown', onDown)
    svg.addEventListener('pointermove', onMove)
    svg.addEventListener('pointerup', release)
    svg.addEventListener('pointercancel', release)
    svg.addEventListener('dblclick', reset) // double-click = rebuild now

    // ---- intro: pieces fly in and assemble the figure
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      ready = true
      touch()
    } else {
      tiles.forEach((t) => {
        t.x = anime.random(-320, 320)
        t.y = anime.random(-380, 380)
        t.rot = anime.random(-360, 360)
        t.s = 0.3
        t.o = 0
      })
      renderAll()
      anime({
        targets: tiles, x: 0, y: 0, rot: 0, s: 1, o: 1,
        delay: anime.stagger(10), duration: 1100, easing: 'easeOutElastic(1, .6)',
        update: renderAll,
        complete: () => { ready = true; touch() },
      })
    }

    return () => {
      clearTimeout(idleT)
      cancelAnimationFrame(raf)
      anime.remove(tiles)
      svg.removeEventListener('pointerdown', onDown)
      svg.removeEventListener('pointermove', onMove)
      svg.removeEventListener('pointerup', release)
      svg.removeEventListener('pointercancel', release)
      svg.removeEventListener('dblclick', reset)
      layer.innerHTML = ''
    }
  }, [])

  return (
    <svg
      ref={svgRef}
      className="hero__img"
      viewBox={`${VX} ${VY} ${VW} ${VH}`}
      role="img"
      aria-label="A person made of colorful puzzle pieces. Drag the pieces around."
      style={{
        width: '100%',
        maxWidth: 640,
        maxHeight: '80vh',
        height: 'auto',
        overflow: 'visible',
        touchAction: 'none',
        userSelect: 'none',
      }}
    >
      <g ref={layerRef} />
    </svg>
  )
}

export default PuzzleBrain