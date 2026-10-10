import { MOCK_PREDICTIONS } from './predictions'

const KEY = 'careerMatchPredictions'

/* Mock matching catalog. TODO: replace createPrediction() with a call to your real model / API. */
const CATALOG = [
  { title: 'Data Scientist', skills: ['Python', 'SQL', 'Machine Learning', 'Data Analysis', 'Statistics', 'Critical Thinking', 'Curiosity'], mbti: ['INTP', 'INTJ', 'ENTP', 'ISTP'], degrees: ['computer', 'information tech', 'statistic', 'math', 'data'] },
  { title: 'Machine Learning Engineer', skills: ['Python', 'Machine Learning', 'Cloud Computing', 'Debugging', 'Version Control (Git)', 'Problem Solving'], mbti: ['INTJ', 'INTP', 'ISTP', 'ENTJ'], degrees: ['computer', 'information tech', 'engineering'] },
  { title: 'Software Engineer', skills: ['Python', 'JavaScript', 'Web Development', 'Mobile Development', 'Debugging', 'Version Control (Git)', 'Database Design', 'Problem Solving', 'HTML & CSS'], mbti: ['INTP', 'INTJ', 'ISTP', 'ISTJ'], degrees: ['computer', 'information tech', 'software'] },
  { title: 'Data Analyst', skills: ['SQL', 'Excel / Spreadsheets', 'Data Analysis', 'Statistics', 'Attention to Detail', 'Python', 'Critical Thinking'], mbti: ['ISTJ', 'INTP', 'ESTJ', 'INTJ'], degrees: ['computer', 'information tech', 'business', 'statistic', 'account'] },
  { title: 'Systems Analyst', skills: ['SQL', 'Database Design', 'Networking', 'Business Writing', 'Critical Thinking', 'Communication', 'Problem Solving'], mbti: ['ISTJ', 'ENTJ', 'INTJ', 'ESTJ'], degrees: ['computer', 'information tech', 'business'] },
  { title: 'Research Scientist', skills: ['Scientific Research', 'Statistics', 'Critical Thinking', 'Curiosity', 'Data Collection', 'Laboratory Techniques', 'Field Research', 'Python'], mbti: ['INTP', 'INTJ', 'INFJ'], degrees: ['biology', 'chemistry', 'physics', 'science', 'psychology'] },
  { title: 'Registered Nurse', skills: ['Patient Care', 'First Aid / CPR', 'Clinical Documentation', 'Medical Terminology', 'Pharmacology Basics', 'Empathy', 'Patience'], mbti: ['ISFJ', 'ESFJ', 'INFJ', 'ISFP'], degrees: ['nursing', 'health'] },
  { title: 'Accountant', skills: ['Accounting', 'Bookkeeping', 'Auditing', 'Taxation', 'Financial Analysis', 'Budgeting', 'Excel / Spreadsheets', 'Attention to Detail'], mbti: ['ISTJ', 'ESTJ', 'ISFJ'], degrees: ['account', 'finance', 'business'] },
  { title: 'Marketing Specialist', skills: ['Marketing', 'Social Media Management', 'Content Writing', 'Copywriting', 'Market Research', 'Creativity', 'Communication'], mbti: ['ENFP', 'ENTP', 'ESFP', 'ENFJ'], degrees: ['marketing', 'business', 'communication'] },
  { title: 'Teacher', skills: ['Lesson Planning', 'Classroom Management', 'Tutoring', 'Curriculum Design', 'Public Speaking', 'Mentoring', 'Patience', 'Communication'], mbti: ['ENFJ', 'INFJ', 'ESFJ', 'ISFJ'], degrees: ['education', 'teach'] },
  { title: 'Graphic Designer', skills: ['Graphic Design', 'UI/UX Design', 'Illustration', 'Photography', 'Video Editing', 'Creativity', 'Attention to Detail'], mbti: ['INFP', 'ISFP', 'ENFP', 'INTP'], degrees: ['design', 'arts', 'multimedia', 'communication', 'architecture'] },
  { title: 'Civil Engineer', skills: ['Technical Drawing', 'CAD / AutoCAD', 'Surveying', 'Structural Analysis', 'Construction Planning', 'Blueprint Reading', 'Safety Compliance', 'Project Management'], mbti: ['ISTJ', 'ESTJ', 'INTJ', 'ISTP'], degrees: ['civil', 'engineering', 'architecture'] },
  { title: 'Electrical Engineer', skills: ['Circuit Design', 'Electrical Wiring', 'Arduino / IoT', 'Troubleshooting', 'Safety Compliance', 'Technical Drawing', 'Equipment Maintenance'], mbti: ['ISTP', 'INTP', 'INTJ'], degrees: ['electrical', 'electronics', 'engineering'] },
  { title: 'Human Resources Specialist', skills: ['Human Resources', 'Communication', 'Empathy', 'Negotiation', 'Active Listening', 'Organization', 'Business Writing'], mbti: ['ESFJ', 'ENFJ', 'ISFJ'], degrees: ['psychology', 'business', 'human resource'] },
  { title: 'Guidance Counselor', skills: ['Counseling Basics', 'Psychological Assessment', 'Therapy Techniques', 'Empathy', 'Active Listening', 'Patience'], mbti: ['INFJ', 'INFP', 'ENFJ'], degrees: ['psychology', 'guidance', 'counseling'] },
  { title: 'Hospitality Manager', skills: ['Guest Service', 'Customer Service', 'Event Planning', 'Leadership', 'Multitasking', 'Communication'], mbti: ['ESFJ', 'ESTP', 'ENFP'], degrees: ['hospitality', 'tourism'] },
]

const localDate = () => {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/* payload comes from the assessment form: { mbti, degree, skills, preference, ... } */
export const createPrediction = (payload) => {
  const userSkills = payload.skills.map((s) => s.toLowerCase())
  const degree = payload.degree.toLowerCase()

  const scored = CATALOG.map((c) => {
    const matched = c.skills.filter((s) => userSkills.includes(s.toLowerCase()))
    const mbtiHit = c.mbti.includes(payload.mbti)
    const degreeHit = c.degrees.some((d) => degree.includes(d))
    const skillPart = Math.min(1, matched.length / Math.min(4, c.skills.length))

    const score = Math.max(40, Math.min(98, Math.round(45 + skillPart * 30 + (mbtiHit ? 12 : 0) + (degreeHit ? 12 : 0))))

    const reasons = [
      ...matched.slice(0, 2).map((s) => `Strong in ${s}`),
      ...(mbtiHit ? [`${payload.mbti} suits this field`] : []),
      ...(degreeHit ? ['Related degree program'] : []),
    ]

    return { title: c.title, score, reasons: reasons.length ? reasons : ['Broad profile fit'], mbtiHit }
  }).sort((a, b) => b.score - a.score)

  return {
    id: Date.now(),
    createdAt: localDate(),
    input: { mbti: payload.mbti, degree: payload.degree, skills: payload.skills, preference: payload.preference },
    topCareers: scored.slice(0, 3).map(({ mbtiHit, ...c }) => c),
    avoid: scored.slice(-2).reverse().map((c) => ({
      title: c.title,
      reason: c.mbtiHit ? 'Little overlap with your selected skills.' : `Work style in this field often differs from ${payload.mbti} preferences.`,
    })),
  }
}

const readSaved = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}

export const getPredictions = () => [...MOCK_PREDICTIONS, ...readSaved()]

export const savePrediction = (pred) => {
  try {
    localStorage.setItem(KEY, JSON.stringify([...readSaved(), pred]))
  } catch {
    /* storage unavailable: the modal still shows, it just won't appear in history */
  }
  return pred
}