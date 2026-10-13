    
    // backend/src/services/roadmapParser.js
//
// The Hugging Face Space returns each roadmap as ONE plain-text block
// ("JOB TITLE: ... SKILLS NEEDED ... EDUCATION NEEDED ... TIME FRAME GUIDE ...").
// This turns it into a clean object so the frontend never has to parse text.
//
// Works whether the text still has line breaks or has been flattened onto one line.

const MARKERS = [
  ['title', /JOB TITLE:/i],
  ['skillsHeader', /SKILLS NEEDED/i],
  ['soft', /Soft skills:/i],
  ['other', /Other skills:/i],
  ['technical', /Technical skills:/i],
  ['educationHeader', /EDUCATION NEEDED/i],
  ['typical', /Typical requirement:/i],
  ['reported', /Reported by workers:/i],
  ['programs', /Related programs:/i],
  ['certs', /CERTIFICATES\s*\([^)]*\)/i],
  ['timeHeader', /TIME FRAME GUIDE/i],
  ['estimate', /Estimated total:/i],
  ['note', /Note:/i],
]

// Cuts the text into { markerKey: "text until the next marker" }
function splitSections(text) {
  const found = []
  for (const [key, re] of MARKERS) {
    const m = re.exec(text)
    if (m) found.push({ key, start: m.index, end: m.index + m[0].length })
  }
  found.sort((a, b) => a.start - b.start)

  const out = {}
  found.forEach((f, i) => {
    out[f.key] = text.slice(f.end, found[i + 1]?.start ?? text.length).trim()
  })
  return out
}

// "- Speaking - Reading Comprehension" -> ["Speaking", "Reading Comprehension"]
const toList = (s) =>
  String(s ?? '')
    .split(/(?:^|\s)-\s+/)
    .map((x) => x.trim())
    .filter(Boolean)

// "5.0 (51% of workers); 6.0 (42% of workers)" -> [{ level: 5, percent: 51 }, ...]
function toReported(s) {
  const out = []
  const re = /(\d+(?:\.\d+)?)\s*\(\s*(\d+(?:\.\d+)?)\s*%/g
  let m
  while ((m = re.exec(String(s ?? '')))) {
    out.push({ level: Number(m[1]), percent: Number(m[2]) })
  }
  return out
}

// "about 4-5 years (starting from zero) 1. Complete the degree — ~4 years 2. ..."
// -> { estimatedTotal, steps: [{ order, title, duration }] }
function toTimeline(s) {
  const text = String(s ?? '').trim()
  const firstStep = text.search(/(?:^|\s)1\.\s/)
  const estimatedTotal = (firstStep === -1 ? text : text.slice(0, firstStep)).trim() || null
  const stepsText = firstStep === -1 ? '' : text.slice(firstStep).trim()

  const steps = stepsText
    .split(/\s+(?=\d+\.\s)/)
    .map((chunk) => {
      const m = /^(\d+)\.\s+(.*)$/.exec(chunk.trim())
      if (!m) return null
      const [title, ...rest] = m[2].split(/\s+[—–]\s+/)
      return { order: Number(m[1]), title: title.trim(), duration: rest.join(' — ').trim() || null }
    })
    .filter(Boolean)

  return { estimatedTotal, steps }
}

export function parseRoadmap(raw) {
  if (!raw || typeof raw !== 'string') return null

  const text = raw.replace(/={3,}/g, ' ').replace(/\s+/g, ' ').trim()
  const s = splitSections(text)
  if (!s.soft && !s.technical && !s.typical && !s.estimate) return null // nothing usable

  return {
    jobTitle: s.title || null,
    skills: {
      soft: toList(s.soft),
      other: toList(s.other),
      technical: toList(s.technical),
    },
    education: {
      typical: s.typical || null,
      reportedByWorkers: toReported(s.reported),
      relatedPrograms: toList(s.programs),
    },
    certificates: toList(s.certs),
    timeline: toTimeline(s.estimate),
    note: s.note || null,
    rawText: raw,
  }
}