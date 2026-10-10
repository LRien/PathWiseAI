// server/services/baselineService.js  (NEW file)
// Simple rule-based BASELINE. Score (0-99) =
//   MBTI fit 45% + skill overlap 40% + degree relevance 15% (+10 bonus for matching preferences)
// Swap predictBaseline() for your real model later; keep the return shape.

import { supabase } from '../config/supabase.js'

const W_MBTI = 0.45
const W_SKILLS = 0.4
const W_DEGREE = 0.15
const PREF_BONUS = 0.1

const pretty = (s) => (s.length <= 3 ? s.toUpperCase() : s.replace(/\b\w/g, (c) => c.toUpperCase()))

const matchedSkills = (userSkills, careerSkills) =>
  careerSkills.filter((cs) =>
    userSkills.some((us) => us.length >= 3 && (cs.includes(us) || us.includes(cs)))
  )

function scoreCareer(career, { mbti, degree, skills, preference }) {
  const mbtiOk = career.mbti.includes(mbti)
  const skillHits = matchedSkills(skills, career.skills)
  const degreeOk = career.degrees.some((k) => degree.includes(k))
  const prefOk = preference !== '' && career.prefs.some((k) => preference.includes(k))

  const score =
    (mbtiOk ? W_MBTI : 0) +
    W_SKILLS * Math.min(1, skillHits.length / 3) +
    (degreeOk ? W_DEGREE : 0) +
    (prefOk ? PREF_BONUS : 0)

  return { title: career.title, score: Math.min(0.99, score), mbtiOk, skillHits, degreeOk, prefOk }
}

function fitReasons(r, mbti) {
  const reasons = []
  if (r.mbtiOk) reasons.push(`${mbti} is a common fit for this role`)
  if (r.skillHits.length) reasons.push('Skills match: ' + r.skillHits.slice(0, 3).map(pretty).join(', '))
  if (r.degreeOk) reasons.push('Related to your degree')
  if (r.prefOk) reasons.push('Matches your work preferences')
  return reasons.length ? reasons : ['General match']
}

function avoidReasons(r, mbti) {
  const reasons = []
  if (!r.mbtiOk) reasons.push(`${mbti} is not a typical fit`)
  if (!r.skillHits.length) reasons.push('Few matching skills')
  if (!r.degreeOk) reasons.push('Unrelated to your degree')
  return reasons.length ? reasons : ['Weaker overall fit']
}

// Pure function: ranks a list of careers for one assessment
export function rankCareers(careers, assessment) {
  const input = {
    mbti: String(assessment.mbti || '').trim().toUpperCase(),
    degree: String(assessment.degree_program || '').trim().toLowerCase(),
    skills: (assessment.skills || []).map((s) => String(s).trim().toLowerCase()).filter(Boolean),
    preference: String(assessment.career_preference || '').trim().toLowerCase(),
  }

  const results = careers.map((c) => scoreCareer(c, input))
  const byTitle = (a, b) => a.title.localeCompare(b.title)

  const best = [...results].sort((a, b) => b.score - a.score || byTitle(a, b)).slice(0, 3)
  const worst = [...results].sort((a, b) => a.score - b.score || byTitle(a, b)).slice(0, 3)

  return {
    recommended: best.map((r) => ({
      title: r.title,
      matchPercent: Math.round(r.score * 1000) / 10,
      reasons: fitReasons(r, input.mbti),
    })),
    avoid: worst.map((r) => ({ title: r.title, reasons: avoidReasons(r, input.mbti) })),
  }
}

// Loads the catalog from Supabase and returns { recommended: [3], avoid: [3] }
export async function predictBaseline(assessment) {
  const { data: careers, error } = await supabase
    .from('careers')
    .select('title, mbti, skills, degrees, prefs')

  if (error) throw error
  if (!careers || careers.length < 6) {
    throw new Error('Careers table is empty. Run schema_careers.sql first.')
  }

  return rankCareers(careers, assessment)
}