/* Resume parsing: reads PDF, DOCX, images (OCR) and TXT in the browser,
   then matches the text against the skill catalog used by the assessment page.

   npm i pdfjs-dist mammoth tesseract.js
   (heavy libraries are imported lazily, so they only load when someone uploads a resume) */

export const ACCEPT = '.pdf,.docx,.txt,.png,.jpg,.jpeg,.webp,.bmp'
export const MAX_BYTES = 8 * 1024 * 1024

const MBTI = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP', 'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ', 'ISTP', 'ISFP', 'ESTP', 'ESFP',
]

/* other ways people write a skill on a resume (keys must match the catalog names exactly) */
const ALIASES = {
  JavaScript: ['js', 'es6', 'ecmascript'],
  TypeScript: ['ts'],
  'HTML & CSS': ['html', 'html5', 'css', 'css3', 'tailwind', 'bootstrap'],
  React: ['reactjs', 'react.js', 'react native'],
  'Node.js': ['nodejs', 'node', 'express', 'express.js'],
  SQL: ['mysql', 'postgresql', 'postgres', 'sqlite', 'sql server', 'mariadb'],
  'Database Design': ['database management', 'erd', 'supabase', 'mongodb', 'firebase'],
  'Version Control (Git)': ['git', 'github', 'gitlab', 'bitbucket', 'version control'],
  'C / C++': ['c++', 'c programming', 'c language'],
  'C#': ['c sharp', '.net', 'asp.net'],
  'Machine Learning': ['ml', 'scikit-learn', 'sklearn', 'tensorflow', 'pytorch', 'deep learning'],
  'Artificial Intelligence': ['ai', 'a.i.', 'chatgpt', 'llm', 'generative ai'],
  'Natural Language Processing': ['nlp'],
  'Computer Vision': ['opencv', 'image processing'],
  'Data Analysis': ['data analytics', 'pandas', 'numpy', 'data analyst'],
  'Data Visualization': ['matplotlib', 'dashboards', 'data viz'],
  'Power BI / Tableau': ['power bi', 'powerbi', 'tableau'],
  'Excel / Spreadsheets': ['excel', 'ms excel', 'microsoft excel', 'google sheets', 'spreadsheets', 'spreadsheet'],
  'Microsoft Office': ['ms office', 'ms word', 'ms powerpoint', 'powerpoint', 'microsoft word', 'office 365', 'google workspace'],
  'Web Development': ['web developer', 'front-end', 'frontend', 'back-end', 'backend', 'full-stack', 'full stack', 'web design'],
  'Mobile Development': ['android', 'ios', 'flutter', 'kotlin', 'swift', 'mobile app', 'react native'],
  'API Development': ['rest api', 'restful', 'api', 'graphql'],
  'Cloud Computing': ['aws', 'azure', 'gcp', 'google cloud'],
  DevOps: ['docker', 'kubernetes', 'ci/cd', 'jenkins'],
  Cybersecurity: ['information security', 'infosec', 'cyber security'],
  'IT Support': ['technical support', 'tech support', 'it technician'],
  'Help Desk Support': ['helpdesk', 'help desk', 'service desk'],
  'Software Testing': ['qa testing', 'unit testing', 'test cases', 'selenium', 'manual testing'],
  'Game Development': ['unity', 'unreal engine', 'godot'],
  'UI/UX Design': ['ui design', 'ux design', 'figma', 'wireframing', 'prototyping', 'adobe xd'],
  'Graphic Design': ['photoshop', 'illustrator', 'canva', 'adobe creative suite', 'coreldraw'],
  'Video Editing': ['premiere', 'premiere pro', 'after effects', 'capcut', 'davinci resolve'],
  'Social Media Management': ['social media', 'community management'],
  'Digital Marketing': ['online marketing', 'sem', 'ppc', 'google ads', 'facebook ads'],
  Accounting: ['accountancy', 'general ledger'],
  Bookkeeping: ['book keeping'],
  'Project Management': ['project manager', 'pmp', 'jira', 'trello', 'asana'],
  'Agile / Scrum': ['agile', 'scrum', 'kanban'],
  'Customer Service': ['customer support', 'client service', 'call center', 'bpo'],
  'Public Speaking': ['public speaker', 'speaker'],
  'First Aid / CPR': ['first aid', 'cpr', 'bls', 'basic life support'],
  'Teaching Methods': ['teaching', 'instruction'],
  'Content Writing': ['article writing', 'content creation'],
  'CAD / AutoCAD': ['autocad', 'cad', 'revit', 'solidworks', 'sketchup'],
  'Arduino / IoT': ['arduino', 'iot', 'internet of things', 'raspberry pi'],
  'Problem Solving': ['problem-solving', 'troubleshooting skills'],
  'Critical Thinking': ['critical-thinking'],
  Teamwork: ['team player', 'team work', 'team-oriented'],
  'Time Management': ['time-management', 'meeting deadlines'],
  'Communication': ['communications', 'verbal communication', 'written communication'],
  'Leadership': ['led a team', 'team lead', 'president', 'officer'],
  'Foreign Languages': ['bilingual', 'multilingual', 'fluent in'],
}

const escapeRx = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const norm = (s) => s.toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, ' ')

/* every phrase that should count as a mention of this catalog skill */
const variants = (name) => {
  const out = new Set([name.toLowerCase()])
  name.split(/\s*\/\s*/).forEach((p) => out.add(p.toLowerCase()))
  const paren = name.match(/\(([^)]+)\)/)
  if (paren) {
    out.add(paren[1].toLowerCase())
    out.add(name.replace(/\s*\([^)]*\)/, '').toLowerCase())
  }
  ;(ALIASES[name] || []).forEach((a) => out.add(a.toLowerCase()))
  return [...out].filter((v) => v.length >= 2 && v !== 'c')
}

const rxCache = new Map()
const termRx = (term) => {
  if (!rxCache.has(term)) {
    rxCache.set(term, new RegExp(`(?<![a-z0-9+#.])${escapeRx(term)}(?![a-z0-9+#])`, 'i'))
  }
  return rxCache.get(term)
}

/* ---------- text extraction ---------- */

const ocrImage = async (source) => {
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('eng')
  try {
    const { data } = await worker.recognize(source)
    return data.text || ''
  } finally {
    await worker.terminate()
  }
}

const readPdf = async (file) => {
  const pdfjs = await import('pdfjs-dist')
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default // Vite
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise
  const pages = Math.min(pdf.numPages, 6)
  let text = ''
  for (let i = 1; i <= pages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    text += content.items.map((it) => it.str + (it.hasEOL ? '\n' : ' ')).join('') + '\n'
  }

  /* scanned PDF with no text layer: render the pages and read them with OCR */
  if (text.replace(/\s/g, '').length < 60) {
    text = ''
    for (let i = 1; i <= Math.min(pdf.numPages, 3); i++) {
      const page = await pdf.getPage(i)
      const viewport = page.getViewport({ scale: 2 })
      const canvas = document.createElement('canvas')
      canvas.width = viewport.width
      canvas.height = viewport.height
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
      text += (await ocrImage(canvas)) + '\n'
    }
  }
  return text
}

const readDocx = async (file) => {
  const m = await import('mammoth/mammoth.browser')
  const mammoth = m.default || m
  const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
  return value
}

export const extractText = async (file) => {
  const name = file.name.toLowerCase()
  const type = file.type || ''
  if (type === 'application/pdf' || name.endsWith('.pdf')) return readPdf(file)
  if (name.endsWith('.docx')) return readDocx(file)
  if (name.endsWith('.doc')) throw new Error('Old .doc files are not supported. Please save it as .docx or PDF.')
  if (type.startsWith('image/') || /\.(png|jpe?g|webp|bmp)$/.test(name)) return ocrImage(file)
  if (type.startsWith('text/') || name.endsWith('.txt')) return file.text()
  throw new Error('Unsupported file. Upload a PDF, DOCX, image (PNG/JPG) or TXT.')
}

/* ---------- analysis ---------- */

const STOP = /^\s*(work\s+)?(experience|employment|education|projects?|certifications?|certificates?|references?|summary|profile|objective|awards?|achievements?|trainings?|seminars?|interests|hobbies|personal\s+(information|details)|contact)\b/i
const HEAD = /^\s*(technical\s+skills|key\s+skills|core\s+(skills|competencies)|skills(\s*&\s*\w+)?|competencies|technologies|tools(\s*&\s*technologies)?|expertise)\s*:?\s*$/i

/* skills written in the resume's own "Skills" section that are not in the catalog */
const unlistedSkills = (text, knownLower) => {
  const lines = text.split(/\r?\n/)
  const out = []
  for (let i = 0; i < lines.length; i++) {
    if (!HEAD.test(lines[i])) continue
    for (let j = i + 1; j < Math.min(i + 14, lines.length); j++) {
      const line = lines[j].trim()
      if (STOP.test(line) || HEAD.test(line)) break
      const body = line.includes(':') && line.split(':')[0].length <= 28 ? line.split(':').slice(1).join(':') : line
      body
        .split(/[,|;•·▪●■◦\u2022]|\s[-–]\s|\s{3,}/)
        .map((t) => t.replace(/^[\s\-–*•·▪●■◦>]+|[\s.]+$/g, '').trim())
        .forEach((t) => {
          const words = t.split(/\s+/).length
          if (t.length < 2 || t.length > 30 || words > 4) return
          if (/^\d+$/.test(t) || /@|https?:/i.test(t)) return
          if (knownLower.has(t.toLowerCase())) return
          out.push(t)
        })
    }
  }
  return [...new Map(out.map((s) => [s.toLowerCase(), s])).values()].slice(0, 15)
}

const findDegree = (text) => {
  let m = text.match(/bachelor\s+of\s+(science|arts)(?:\s+in|\s+of)?\s+([A-Za-z &]+?)(?:\s*[\n,.(\d]|$)/i)
  if (m) return `${m[1].toLowerCase() === 'arts' ? 'BA' : 'BS'} in ${m[2].trim().replace(/\s+/g, ' ')}`.slice(0, 70)
  m = text.match(/\b(BS|BA|BSc|B\.S\.|B\.A\.)\s+(?:in\s+)?([A-Za-z &]{4,}?)(?:\s*[\n,.(\d]|$)/)
  if (m) return `${/A/.test(m[1]) && !/S/.test(m[1]) ? 'BA' : 'BS'} in ${m[2].trim().replace(/\s+/g, ' ')}`.slice(0, 70)
  return ''
}

/* catalog = the SKILLS object from the assessment page */
export const analyzeResume = (rawText, catalog) => {
  const text = rawText.replace(/\u00a0/g, ' ')
  const flat = norm(text)
  const names = [...new Set(Object.values(catalog).flat())]

  const skills = []
  const known = new Set()
  names.forEach((name) => {
    const vs = variants(name)
    vs.forEach((v) => known.add(v))
    if (vs.some((v) => termRx(v).test(flat))) skills.push(name)
  })

  return {
    text: text.trim(),
    skills,
    extra: unlistedSkills(text, known),
    degree: findDegree(text),
    mbti: MBTI.find((t) => new RegExp(`\\b${t}\\b`).test(text)) || '',
  }
}

export const readResume = async (file, catalog) => {
  if (file.size > MAX_BYTES) throw new Error('File is too large (max 8 MB).')
  const text = await extractText(file)
  if (text.replace(/\s/g, '').length < 30) {
    throw new Error('Could not read any text from this file. Try a clearer image or a different format.')
  }
  return analyzeResume(text, catalog)
}