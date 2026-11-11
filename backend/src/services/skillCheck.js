import { RegExpMatcher, englishDataset, englishRecommendedTransformers } from 'obscenity'

const enMatcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
})

const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', '@': 'a', $: 's', '!': 'i' }
const leetNorm = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[013457@$!]/g, (c) => LEET[c] ?? c)
    .replace(/[^a-z\s]/g, '')
    .replace(/(.)\1+/g, '$1')

// keep in sync with the list in AssesmentTest.jsx
const TL = [
  'putangina', 'putang ina', 'tangina', 'tarantado', 'punyeta', 'pakshet', 'pakyu', 'hinayupak',
  'kupal', 'ulol', 'gago', 'bobo', 'tanga', 'puta', 'pokpok', 'kantot', 'iyot', 'burat',
  'puki', 'pekpek', 'leche', 'lintik', 'siraulo', 'ungas', 'engot', 'buwisit', 'bwisit',
].map(leetNorm)

const TL_SHORT = new Set(TL.filter((w) => w.length <= 5))
const TL_LONG = TL.filter((w) => w.length > 5).map((w) => w.replace(/\s/g, ''))

export const isProfane = (text) => {
  if (enMatcher.hasMatch(text)) return true
  const n = leetNorm(text)
  if (n.split(/\s+/).some((t) => TL_SHORT.has(t))) return true
  const joined = n.replace(/\s/g, '')
  return TL_LONG.some((w) => joined.includes(w))
}

// Lenient on purpose: official names like "3D Modeling" or "Excel / Spreadsheets" must pass.
const ALLOWED_CHARS = /^[\p{L}\p{N}\s.'’\-+#/&()]+$/u

export const MAX_SKILL_LEN = 60

// Fast, no-network check used by both the validate route and the submit route.
// Returns an error string, or '' if the skill is fine.
export function basicSkillError(skill) {
  const s = String(skill ?? '').normalize('NFKC').trim()
  if (!s) return 'Empty skill'
  if (s.length > MAX_SKILL_LEN) return 'Skill name is too long'
  if (!/\p{L}/u.test(s)) return 'Skill must contain letters'
  if (!ALLOWED_CHARS.test(s)) return 'Skill contains unsupported characters'
  if (isProfane(s)) return 'Inappropriate language'
  return ''
}