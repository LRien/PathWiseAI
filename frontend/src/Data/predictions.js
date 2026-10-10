export const MOCK_PREDICTIONS = [
  {
    id: 1,
    createdAt: '2026-09-28',
    input: { mbti: 'INTP', degree: 'BS in Computer Science', skills: ['Python', 'Problem Solving', 'Curiosity', 'Research'] },
    topCareers: [
      { title: 'Research Scientist', score: 84, reasons: ['INTP enjoys deep research', 'Strong problem solving'] },
      { title: 'Software Engineer', score: 81, reasons: ['Python skills', 'Logical thinking'] },
      { title: 'Systems Analyst', score: 78, reasons: ['Analytical mindset', 'Computer science degree'] },
    ],
    avoid: [{ title: 'Sales Representative', reason: 'Heavy people-facing targets clash with your preferences.' }],
  },
  {
    id: 2,
    createdAt: '2026-10-03',
    input: { mbti: 'INTP', degree: 'BS in Computer Science', skills: ['Python', 'SQL', 'Data Analysis', 'Problem Solving', 'Curiosity'] },
    topCareers: [
      { title: 'Data Analyst', score: 89, reasons: ['SQL and data analysis skills', 'Pattern-finding strength'] },
      { title: 'Software Engineer', score: 85, reasons: ['Python skills', 'Logical thinking'] },
      { title: 'Research Scientist', score: 82, reasons: ['INTP enjoys deep research', 'Curious by nature'] },
    ],
    avoid: [{ title: 'Customer Service Agent', reason: 'Repetitive social tasks drain introverted types.' }],
  },
  {
    id: 3,
    createdAt: '2026-10-10',
    input: {
      mbti: 'INTP',
      degree: 'BS in Computer Science',
      skills: ['Python', 'SQL', 'Machine Learning', 'Data Analysis', 'Problem Solving', 'Critical Thinking', 'Curiosity'],
    },
    topCareers: [
      { title: 'Data Scientist', score: 92, reasons: ['Machine learning + Python', 'INTP enjoys complex problems', 'Strong data analysis'] },
      { title: 'Machine Learning Engineer', score: 88, reasons: ['Machine learning skills', 'Computer science degree'] },
      { title: 'Software Engineer', score: 85, reasons: ['Python skills', 'Logical thinking'] },
    ],
    avoid: [
      { title: 'Sales Representative', reason: 'Heavy people-facing targets clash with your preferences.' },
      { title: 'Event Coordinator', reason: 'Fast-changing, people-heavy work is a poor fit for your style.' },
    ],
  },
]

export const fmtDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })