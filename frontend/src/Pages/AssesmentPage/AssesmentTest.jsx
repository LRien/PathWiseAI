import React, { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { animate, stagger } from 'animejs'
import { RegExpMatcher, englishDataset, englishRecommendedTransformers } from 'obscenity'
import { submitAssessment } from '../../api/assessment'
import { getPrediction, selectCareer, redoPrediction } from '../../api/predictions'
import { validateSkills } from '../../api/skills'
import { getProfile } from '../../Data/settingsStore'
import PredictionModal from './PredictionModal' // adjust the path to where you keep the modal

/* ---------- Theme (matches the homepage) ----------
   cream page  #f3e7d6   · lighter cream cards #fbf6ee · border #e6d8c3
   deep navy   #0b0b2b   (buttons, selected states)
   puzzle accents: blue #2f80e0 · yellow #f2c230 · red #e0404a · orange #e8832a · slate #6b7a99 */

const TYPES = [
  ['INTJ', 'Architect'], ['INTP', 'Logician'], ['ENTJ', 'Commander'], ['ENTP', 'Debater'],
  ['INFJ', 'Advocate'], ['INFP', 'Mediator'], ['ENFJ', 'Protagonist'], ['ENFP', 'Campaigner'],
  ['ISTJ', 'Logistician'], ['ISFJ', 'Defender'], ['ESTJ', 'Executive'], ['ESFJ', 'Consul'],
  ['ISTP', 'Virtuoso'], ['ISFP', 'Adventurer'], ['ESTP', 'Entrepreneur'], ['ESFP', 'Entertainer'],
]

/* skills across many fields, not only computing */
const SKILLS = {
  soft: [
    'Hardworking', 'Flexible', 'Communication', 'Teamwork', 'Adaptability', 'Time Management',
    'Problem Solving', 'Leadership', 'Creativity', 'Attention to Detail', 'Critical Thinking',
    'Public Speaking', 'Empathy', 'Negotiation', 'Curiosity', 'Self-Motivation', 'Decision Making',
    'Collaboration', 'Organization', 'Resilience', 'Presentation', 'Mentoring', 'Strategic Thinking',
    'Customer Service', 'Fast Learner', 'Initiative', 'Active Listening', 'Patience', 'Multitasking',
    'Conflict Resolution', 'Emotional Intelligence', 'Persuasion', 'Professional Networking', 'Stress Management',
    'Accountability', 'Reliability', 'Cultural Awareness', 'Open-mindedness', 'Delegation', 'Coaching',
    'Analytical Thinking', 'Research Skills', 'Goal Setting', 'Professionalism', 'Integrity',
    'Perseverance', 'Adaptive Learning', 'Self-Discipline', 'Positive Attitude', 'Handling Feedback',
    'Team Leadership', 'Diplomacy', 'Working Under Pressure', 'Customer Focus', 'Innovation',
    'Self-Awareness', 'Dependability', 'Ownership',
  ],
  tech: [
    'Python', 'JavaScript', 'SQL', 'HTML & CSS', 'Web Development', 'Mobile Development', 'Data Analysis',
    'Machine Learning', 'Database Design', 'Cybersecurity', 'Networking', 'Cloud Computing', 'Debugging',
    'Excel / Spreadsheets', 'Microsoft Office', 'IT Support', 'Software Testing', 'Version Control (Git)',
    'Java', 'C / C++', 'C#', 'PHP', 'React', 'Node.js', 'API Development', 'Data Visualization',
    'Power BI / Tableau', 'DevOps', 'Linux', 'Game Development', 'Technical Documentation',
    'System Administration', 'Automation / Scripting', 'Computer Hardware Repair', 'Data Entry',
    'Artificial Intelligence', 'Mobile App Testing', 'TypeScript', 'Data Engineering', 'Big Data',
    'Natural Language Processing', 'Computer Vision', 'Help Desk Support', 'WordPress',
    'Penetration Testing Basics', 'Embedded Systems', 'Network Security', 'Virtualization',
  ],
  business: [
    'Project Management', 'Business Writing', 'Human Resources', 'Inventory Management', 'Supply Chain',
    'Entrepreneurship', 'Business Analysis', 'Retail Management', 'Procurement', 'Logistics', 'Recruitment',
    'Operations Management', 'Agile / Scrum', 'Business Planning', 'Process Improvement', 'Team Management',
    'Office Administration', 'Administrative Support', 'Executive Assistance', 'Strategic Planning',
    'Warehouse Management', 'Quality Assurance', 'Vendor Management', 'Performance Management',
    'Training & Development', 'Employee Relations', 'Change Management', 'Business Development',
    'Store Management', 'Franchise Management', 'Calendar & Scheduling',
  ],
  finance: [
    'Accounting', 'Bookkeeping', 'Financial Analysis', 'Budgeting', 'Auditing', 'Taxation', 'Payroll',
    'Banking Operations', 'Insurance Basics', 'Risk Management', 'Investment Analysis', 'Financial Reporting',
    'Accounts Payable', 'Accounts Receivable', 'Credit Analysis', 'Cost Accounting', 'Financial Forecasting',
    'Financial Modeling', 'QuickBooks', 'Loan Processing', 'Treasury Management', 'Economics',
    'Actuarial Basics', 'Billing & Collections', 'Stock Market Basics', 'Financial Advising',
    'Fraud Detection', 'Account Reconciliation',
  ],
  marketing: [
    'Marketing', 'Sales', 'Market Research', 'Digital Marketing', 'SEO', 'E-commerce', 'Public Relations',
    'Brand Strategy', 'Email Marketing', 'Content Strategy', 'Lead Generation',
    'Customer Relationship Management', 'Account Management', 'Retail Sales', 'Product Marketing',
    'Pricing Strategy', 'Social Media Advertising', 'Telemarketing', 'Influencer Marketing',
    'Google Analytics', 'Campaign Management', 'Merchandising', 'Direct Selling', 'Consumer Behavior',
    'Customer Retention', 'Sales Forecasting', 'Product Demonstration', 'Advertising', 'Media Planning',
    'Affiliate Marketing',
  ],
  law: [
    'Legal Research', 'Contract Drafting', 'Regulatory Compliance', 'Legal Writing', 'Paralegal Support',
    'Case Management', 'Policy Analysis', 'Public Administration', 'Document Review', 'Mediation',
    'Intellectual Property Basics', 'Labor Law Basics', 'Corporate Law Basics', 'Immigration Procedures',
    'Records Management', 'Community Development', 'Government Procedures', 'Law Enforcement Basics',
    'Investigation', 'Ethics & Governance', 'Grant Writing', 'Fundraising', 'Nonprofit Management',
    'Notarial Work', 'Court Procedures', 'Legal Documentation', 'Data Privacy Compliance',
    'Political Research', 'Social Work Basics', 'Disaster Response Planning',
  ],
  hospitality: [
    'Guest Service', 'Culinary Arts', 'Event Planning', 'Tour Guiding', 'Hotel Front Desk', 'Baking & Pastry',
    'Event Hosting', 'Food & Beverage Service', 'Housekeeping Management', 'Bartending', 'Travel Planning',
    'Reservations Management', 'Restaurant Management', 'Catering', 'Barista Skills', 'Menu Planning',
    'Airline Customer Service', 'Resort Operations', 'Wedding Planning', 'Food Presentation',
    'Kitchen Management', 'Concierge Services', 'Tourism Promotion',
  ],
  health: [
    'Patient Care', 'First Aid / CPR', 'Laboratory Techniques', 'Clinical Documentation', 'Medical Terminology',
    'Nutrition Planning', 'Scientific Research', 'Data Collection', 'Pharmacology Basics', 'Field Research',
    'Public Health Education', 'Psychological Assessment', 'Counseling Basics', 'Environmental Monitoring',
    'Statistics', 'Lab Safety', 'Animal Care', 'Therapy Techniques',
    'Vital Signs Monitoring', 'Medication Administration', 'Emergency Response', 'Physical Therapy Basics',
    'Dental Assistance', 'Community Health Outreach', 'Mental Health Support', 'Sports Training',
    'Veterinary Care', 'Food Safety', 'Microbiology', 'Chemistry Lab Work', 'Biotechnology Basics',
    'Elderly Care', 'Child Development', 'Occupational Therapy Basics', 'Medical Billing & Coding',
    'Pharmacy Assistance', 'Health Records Management', 'Infection Control', 'Wound Care',
    'Phlebotomy Basics', 'Epidemiology Basics', 'Wellness Coaching', 'Fitness Instruction',
    'Ecology Fieldwork', 'Rehabilitation Support', 'Agricultural Science', 'Crop Management',
    'Forestry Basics', 'Marine Biology Basics',
  ],
  eng: [
    'Technical Drawing', 'CAD / AutoCAD', 'Circuit Design', 'Electrical Wiring', 'Surveying', 'Structural Analysis',
    'Quality Control', 'Equipment Maintenance', 'Welding', 'Arduino / IoT', 'Safety Compliance',
    'Blueprint Reading', 'Machine Operation', 'Mechanical Repair', 'Plumbing', 'Construction Planning',
    '3D Modeling', 'Troubleshooting',
    'Carpentry', 'Auto Mechanics', 'HVAC Basics', 'Electronics Repair', 'Power Systems', 'CNC Operation',
    'Cost Estimation', 'Site Inspection', 'Hydraulics', 'Robotics', 'PLC Programming', 'Fabrication',
    'Painting & Finishing', 'Heavy Equipment Operation', 'Renewable Energy Basics', 'Mechanical Design',
    'Network Cabling', 'Masonry', 'Tile Setting', 'Roofing', 'Sheet Metal Work', 'Drone Operation',
    'GIS Mapping', 'Geotechnical Basics', 'Instrumentation', 'Industrial Safety',
    'Aircraft Maintenance Basics', 'Telecommunications Installation', 'Solar Panel Installation',
    'Vehicle Diagnostics', 'Pipefitting', 'Building Maintenance', 'Lean Manufacturing',
  ],
  creative: [
    'Lesson Planning', 'Classroom Management', 'Tutoring', 'Curriculum Design', 'Graphic Design', 'Photography',
    'Video Editing', 'Content Writing', 'Copywriting', 'Social Media Management', 'Illustration', 'Storytelling',
    'Foreign Languages', 'Translation', 'Music / Performance', 'Journalism', 'UI/UX Design', 'Fashion Design',
    'Special Education', 'Early Childhood Education', 'Podcasting', 'Animation', 'Interior Design',
    'Songwriting', 'Creative Writing', 'Editing & Proofreading', 'Voice Acting', 'Painting & Drawing',
    'Brand Design', 'Film Production', 'Community Organizing', 'Sign Language', 'Sports Coaching',
    'Teaching Methods', 'Educational Technology', 'Academic Research', 'Student Assessment',
    'Library Services', 'Digital Art', 'Motion Graphics', 'Sound Engineering', 'Music Production',
    'Dance / Choreography', 'Acting / Theater', 'Visual Merchandising', 'Jewelry Making',
    'Handmade Crafts', 'Pattern Making', 'Sewing & Tailoring', 'Makeup Artistry', 'Hair Styling',
    'Technical Writing', 'Blogging',
  ],
}

const CAT = {
  soft: {
    label: 'Soft skills',
    dot: 'bg-[#0b0b2b]',
    off: 'border-[#0b0b2b]/25 text-[#0b0b2b] hover:border-[#0b0b2b] hover:bg-[#0b0b2b]/5',
    on: 'border-[#0b0b2b] bg-[#0b0b2b] text-white',
  },
  tech: {
    label: 'Technology',
    dot: 'bg-[#2f80e0]',
    off: 'border-[#2f80e0]/40 text-[#1d5fb0] hover:border-[#2f80e0] hover:bg-[#2f80e0]/10',
    on: 'border-[#2f80e0] bg-[#2f80e0] text-white',
  },
  business: {
    label: 'Business & Management',
    dot: 'bg-[#f2c230]',
    off: 'border-[#f2c230]/80 text-[#7a5a08] hover:border-[#f2c230] hover:bg-[#f2c230]/20',
    on: 'border-[#f2c230] bg-[#f2c230] text-[#0b0b2b]',
  },
  finance: {
    label: 'Finance & Accounting',
    dot: 'bg-[#2f9e62]',
    off: 'border-[#2f9e62]/45 text-[#1d7a49] hover:border-[#2f9e62] hover:bg-[#2f9e62]/10',
    on: 'border-[#2f9e62] bg-[#2f9e62] text-white',
  },
  marketing: {
    label: 'Marketing & Sales',
    dot: 'bg-[#d6558b]',
    off: 'border-[#d6558b]/45 text-[#a3305f] hover:border-[#d6558b] hover:bg-[#d6558b]/10',
    on: 'border-[#d6558b] bg-[#d6558b] text-white',
  },
  law: {
    label: 'Law & Public Service',
    dot: 'bg-[#7c5cbf]',
    off: 'border-[#7c5cbf]/45 text-[#5a3f99] hover:border-[#7c5cbf] hover:bg-[#7c5cbf]/10',
    on: 'border-[#7c5cbf] bg-[#7c5cbf] text-white',
  },
  hospitality: {
    label: 'Hospitality & Tourism',
    dot: 'bg-[#1f9d9a]',
    off: 'border-[#1f9d9a]/45 text-[#146e6c] hover:border-[#1f9d9a] hover:bg-[#1f9d9a]/10',
    on: 'border-[#1f9d9a] bg-[#1f9d9a] text-white',
  },
  health: {
    label: 'Health & Science',
    dot: 'bg-[#e0404a]',
    off: 'border-[#e0404a]/40 text-[#b0252e] hover:border-[#e0404a] hover:bg-[#e0404a]/10',
    on: 'border-[#e0404a] bg-[#e0404a] text-white',
  },
  eng: {
    label: 'Engineering & Trades',
    dot: 'bg-[#e8832a]',
    off: 'border-[#e8832a]/50 text-[#a85a10] hover:border-[#e8832a] hover:bg-[#e8832a]/10',
    on: 'border-[#e8832a] bg-[#e8832a] text-white',
  },
  creative: {
    label: 'Education & Creative',
    dot: 'bg-[#6b7a99]',
    off: 'border-[#6b7a99]/45 text-[#475371] hover:border-[#6b7a99] hover:bg-[#6b7a99]/10',
    on: 'border-[#6b7a99] bg-[#6b7a99] text-white',
  },
}

const KIND = {}
Object.entries(SKILLS).forEach(([k, list]) => list.forEach((s) => { if (!KIND[s]) KIND[s] = k }))

/* lowercase name -> official name, so typing "active listening" selects the listed "Active Listening" chip */
const SKILL_LOOKUP = {}
Object.values(SKILLS).forEach((list) =>
  list.forEach((s) => {
    const k = s.toLowerCase()
    if (!SKILL_LOOKUP[k]) SKILL_LOOKUP[k] = s
  })
)

/* limits (no limit on the number of skills; keep these in sync with the backend validation) */
const MAX_SKILL_LEN = 60
const MAX_PREF = 500
const MAX_DEGREE = 150

/* ---------- Degree programs ----------
   Common programs linked to O*NET careers (O*NET connects careers to degrees through CIP program data),
   written in the Philippine naming style. Only programs from this list can be selected. */
const DEGREES = [
  ['Computing & IT', [
    'BS in Computer Science', 'BS in Information Technology', 'BS in Information Systems',
    'BS in Data Science', 'BS in Cybersecurity', 'BS in Software Engineering',
    'BS in Entertainment and Multimedia Computing', 'BS in Game Development',
    'Associate in Computer Technology',
  ]],
  ['Engineering', [
    'BS in Civil Engineering', 'BS in Mechanical Engineering', 'BS in Electrical Engineering',
    'BS in Electronics Engineering', 'BS in Electronics and Communications Engineering',
    'BS in Computer Engineering', 'BS in Industrial Engineering', 'BS in Chemical Engineering',
    'BS in Geodetic Engineering', 'BS in Mining Engineering', 'BS in Sanitary Engineering',
    'BS in Aerospace Engineering', 'BS in Materials Engineering', 'BS in Petroleum Engineering',
    'BS in Agricultural and Biosystems Engineering', 'BS in Environmental Engineering',
    'BS in Metallurgical Engineering',
  ]],
  ['Architecture & Design', [
    'BS in Architecture', 'BS in Interior Design', 'BS in Landscape Architecture', 'BS in Industrial Design',
  ]],
  ['Health', [
    'BS in Nursing', 'BS in Midwifery', 'BS in Pharmacy', 'BS in Medical Technology',
    'BS in Physical Therapy', 'BS in Occupational Therapy', 'BS in Radiologic Technology',
    'BS in Respiratory Therapy', 'BS in Nutrition and Dietetics', 'BS in Public Health',
    'BS in Speech-Language Pathology', 'BS in Sports Science', 'Doctor of Dental Medicine',
    'Doctor of Medicine',
  ]],
  ['Science & Mathematics', [
    'BS in Biology', 'BS in Chemistry', 'BS in Physics', 'BS in Mathematics', 'BS in Statistics',
    'BS in Applied Mathematics', 'BS in Environmental Science', 'BS in Marine Biology', 'BS in Geology',
    'BS in Meteorology', 'BS in Biochemistry', 'BS in Molecular Biology', 'BS in Food Technology',
    'BS in Biotechnology',
  ]],
  ['Agriculture & Environment', [
    'BS in Agriculture', 'BS in Agribusiness', 'BS in Forestry', 'BS in Fisheries',
    'BS in Agricultural Technology', 'BS in Animal Science', 'Doctor of Veterinary Medicine',
  ]],
  ['Business & Finance', [
    'BS in Business Administration', 'BS in Business Administration major in Marketing',
    'BS in Business Administration major in Financial Management',
    'BS in Business Administration major in Human Resource Management',
    'BS in Business Administration major in Operations Management', 'BS in Entrepreneurship',
    'BS in Accountancy', 'BS in Management Accounting', 'BS in Accounting Information System',
    'BS in Internal Auditing', 'BS in Banking and Finance', 'BS in Economics',
    'BS in Office Administration', 'BS in Real Estate Management', 'BS in Business Analytics',
    'BS in Cooperatives Management', 'BS in Customs Administration',
  ]],
  ['Hospitality & Tourism', [
    'BS in Hospitality Management', 'BS in Tourism Management', 'BS in Culinary Management',
    'BS in Travel Management', 'BS in Food Service Management',
  ]],
  ['Education', [
    'Bachelor of Elementary Education', 'Bachelor of Early Childhood Education',
    'Bachelor of Secondary Education major in English', 'Bachelor of Secondary Education major in Mathematics',
    'Bachelor of Secondary Education major in Science', 'Bachelor of Secondary Education major in Filipino',
    'Bachelor of Secondary Education major in Social Studies',
    'Bachelor of Secondary Education major in Values Education',
    'Bachelor of Technology and Livelihood Education', 'Bachelor of Physical Education',
    'Bachelor of Special Needs Education',
  ]],
  ['Communication, Arts & Media', [
    'BA in Communication', 'BA in Journalism', 'BA in Broadcasting', 'BS in Development Communication',
    'BA in Multimedia Arts', 'BA in Film', 'BA in Advertising', 'BA in Public Relations',
    'Bachelor of Fine Arts', 'Bachelor of Music', 'BA in Theater Arts', 'BS in Fashion Design and Merchandising',
  ]],
  ['Social Sciences & Humanities', [
    'BS in Psychology', 'BA in Political Science', 'BA in Sociology', 'BA in Anthropology', 'BA in History',
    'BA in Philosophy', 'BS in Social Work', 'BA in International Studies', 'BS in Public Administration',
    'BS in Library and Information Science', 'BA in English Language Studies', 'BA in Literature',
    'BA in Filipino', 'BS in Community Development',
  ]],
  ['Law & Public Safety', [
    'BS in Criminology', 'BS in Legal Management', 'BS in Forensic Science',
    'BS in Industrial Security Management', 'BS in Disaster Risk Management', 'Juris Doctor',
  ]],
  ['Maritime & Aviation', [
    'BS in Marine Transportation', 'BS in Marine Engineering', 'BS in Naval Architecture',
    'BS in Aeronautical Engineering', 'BS in Air Transportation', 'BS in Aircraft Maintenance Technology',
  ]],
  ['Technical & Vocational', [
    'BS in Industrial Technology', 'BS in Automotive Technology', 'BS in Electrical Technology',
    'BS in Electronics Technology', 'BS in Mechatronics', 'BS in Refrigeration and Air Conditioning Technology',
    'TESDA / Technical-Vocational Certificate', 'Senior High School (STEM)', 'Senior High School (ABM)',
    'Senior High School (HUMSS)', 'Senior High School (GAS)', 'Senior High School (TVL)',
  ]],
]

const ALL_DEGREES = DEGREES.flatMap(([group, list]) => list.map((label) => ({ label, group })))

/* lowercase, no accents or symbols, single spaces: makes searching forgiving */
const normText = (s) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/* Words can be typed in any order ("comp sci"). Best matches first:
   0 = the whole phrase is in the name, 1 = every word starts a word in the name, 2 = anything else that matches */
const searchDegrees = (q) => {
  const tokens = normText(q).split(' ').filter(Boolean)
  if (!tokens.length) return ALL_DEGREES

  const out = []
  for (const d of ALL_DEGREES) {
    const name = normText(d.label)
    const hay = `${name} ${normText(d.group)}`
    if (!tokens.every((t) => hay.includes(t))) continue

    const words = name.split(' ')
    let score = 2
    if (name.includes(tokens.join(' '))) score = 0
    else if (tokens.every((t) => words.some((w) => w.startsWith(t)))) score = 1
    out.push([score, d])
  }
  return out.sort((a, b) => a[0] - b[0]).map((x) => x[1])
}

const DEGREE_HINTS = [
  'BS in Computer Science', 'BS in Nursing', 'BS in Accountancy', 'BS in Civil Engineering',
  'BS in Psychology', 'Bachelor of Elementary Education', 'BS in Business Administration', 'BA in Communication',
  'BS in Biology', 'BS in Hospitality Management', 'BS in Architecture', 'BS in Information Technology',
]

/* ---------- Profanity filter ----------
   English: the "obscenity" package (handles leetspeak, repeated letters, spacing tricks).
   Filipino: a small list below. Add words to TL as you find them. */
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
    .replace(/(.)\1+/g, '$1') // putaaaa -> puta

const TL = [
  'putangina', 'putang ina', 'tangina', 'tarantado', 'punyeta', 'pakshet', 'pakyu', 'hinayupak',
  'kupal', 'ulol', 'gago', 'bobo', 'tanga', 'puta', 'pokpok', 'kantot', 'iyot', 'burat',
  'puki', 'pekpek', 'leche', 'lintik', 'siraulo', 'ungas', 'engot', 'buwisit', 'bwisit',"ugh",
].map(leetNorm)

const TL_SHORT = new Set(TL.filter((w) => w.length <= 5)) // whole word only (avoids false hits)
const TL_LONG = TL.filter((w) => w.length > 5).map((w) => w.replace(/\s/g, ''))

const isProfane = (text) => {
  if (enMatcher.hasMatch(text)) return true
  const n = leetNorm(text)
  if (n.split(/\s+/).some((t) => TL_SHORT.has(t))) return true
  const joined = n.replace(/\s/g, '')
  return TL_LONG.some((w) => joined.includes(w))
}

/* ---------- Self-description check ----------
   "I am pretty", "maganda ko", "pogi ako" describe the person, they are not skills.
   Catches first-person words (English + Filipino) and looks-related words. Official listed skills
   (e.g. "Makeup Artistry", "Hair Styling") are never checked, because they skip this test. */
const FIRST_PERSON = new Set([
  'i', 'im', "i'm", 'iam', "i'll", "i've", 'ive', 'me', 'my', 'myself',
  'ako', "ako'y", 'akong', 'ko', 'akin', 'aking', 'sarili',
])
const LOOKS_WORDS = new Set([
  'maganda', 'magandang', 'pogi', 'poging', 'gwapo', 'gwapa', 'gwapong', 'pretty', 'beautiful', 'handsome',
  'cute', 'cutie', 'sexy', 'attractive', 'goodlooking', 'ganda', 'kagwapuhan', 'kagandahan',
])
const LOOKS_PHRASES = /good[\s-]?looking|so pretty|very pretty|so beautiful|so handsome/

const isSelfDescription = (s) => {
  const t = String(s).toLowerCase().replace(/[’‘]/g, "'")
  const words = t.split(/[^\p{L}\p{N}']+/u).filter(Boolean)
  if (words.some((w) => FIRST_PERSON.has(w))) return true
  if (words.some((w) => LOOKS_WORDS.has(w))) return true
  return LOOKS_PHRASES.test(t)
}

/* ---------- Skill typing helpers ---------- */

/* A skill word can mix letters and a few digits (Web3, K8s, GPT-4, 3D, 5G, Neo4j).
   Rules: at most 3 digits per word, and symbols only as a hyphen, dot, apostrophe or ampersand between
   characters (R&D, Q&A), or C++ / C# at the end. A skill can also contain a lone "&" between two words
   ("Food & Beverage"), but it can NEVER start or end with "&". A bare number like "3.0" or "11" is allowed
   only next to a real word ("Web 3.0", "Windows 11"). Official names from the skill lists are always accepted. */
const SKILL_WORD = /^\.?[\p{L}\p{N}]+(?:[.'’&-][\p{L}\p{N}]+)*(?:\+\+?|#)?$/u
const VERSION = /^\d{1,2}(?:\.\d{1,2})?$/

const digitCount = (w) => (w.match(/\d/g) || []).length

const normalizeSkill = (s) => String(s ?? '').normalize('NFKC').replace(/\s+/g, ' ').trim()

const isValidSkill = (s) => {
  // one balanced pair of parentheses is fine, as in "Search Engine Optimization (SEO)"
  const open = (s.match(/\(/g) || []).length
  const close = (s.match(/\)/g) || []).length
  if (open !== close || open > 1) return false

  const words = s.split(' ')
  if (!words.some((w) => /\p{L}/u.test(w))) return false
  return words.every((raw, i) => {
    const w = raw.replace(/^\(/, '').replace(/\)$/, '')
    if (!w) return false
    // a lone "&" must sit between two real words: never first, never last, never next to another "&"
    if (w === '&') return i > 0 && i < words.length - 1 && words[i - 1] !== '&' && words[i + 1] !== '&'
    return SKILL_WORD.test(w) && (/\p{L}/u.test(w) ? digitCount(w) <= 3 : VERSION.test(w))
  })
}

/* ---------- Gibberish check ----------
   Typing "HAHAHA", "HRKEHDND" or "asdfgh" must not count as a skill. There is no dictionary here, so each word
   is checked for the signs of mashed keys: laughing, repeated letters or chunks, keyboard rows (qwert, asdfg),
   too few vowels, or long runs of consonants. Words from the skill lists and common tech acronyms always pass.
   Gibberish that looks like a normal word is caught by the server check (see verifySkills in the component). */
const EXTRA_KNOWN = [
  'sql', 'php', 'css', 'scss', 'html', 'xml', 'json', 'yaml', 'api', 'aws', 'gcp', 'sap', 'crm', 'erp',
  'cnc', 'plc', 'hvac', 'cad', 'gis', 'bim', 'seo', 'sem', 'ppc', 'kpi', 'roi', 'qa', 'hr', 'ui', 'ux',
  'ai', 'ml', 'nlp', 'cpa', 'pmp', 'vpn', 'lan', 'wan', 'tcp', 'dns', 'ssh', 'sdk', 'mysql', 'mssql',
  'nginx', 'strength', 'strengths', 'rhythm', 'script', 'scripts', 'scripting', 'sprint', 'sprints',
]
const KNOWN_WORDS = new Set(EXTRA_KNOWN)
Object.values(SKILLS).forEach((list) =>
  list.forEach((s) =>
    s.toLowerCase().split(/[^\p{L}]+/u).forEach((w) => {
      if (w) KNOWN_WORDS.add(w)
    })
  )
)

const KEY_ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm']
const FILLER = new Set(['lol', 'lmao', 'lmfao', 'omg', 'wtf', 'idk', 'bruh', 'blah', 'xxx'])
const LAUGH = /^(?:(?:ha|he|hi|ho|ja|ah|eh|oh){2,})h?$/

/* 5 keys in a row on the keyboard, forwards or backwards (real words like "property" only have 4) */
const hasKeyboardRun = (w) =>
  KEY_ROWS.some((row) => {
    for (let i = 0; i + 5 <= row.length; i++) {
      const chunk = row.slice(i, i + 5)
      if (w.includes(chunk) || w.includes([...chunk].reverse().join(''))) return true
    }
    return false
  })

const wordIsGibberish = (raw) => {
  const w = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  if (KNOWN_WORDS.has(w)) return false
  if (/[^\u0000-\u024f]/.test(w)) return false // other alphabets are not checked
  const n = w.length

  if (n === 1) return w !== 'c' && w !== 'r' // only C and R are real one-letter skills
  if (n > 25) return true
  if (FILLER.has(w) || LAUGH.test(w)) return true
  if (/(.)\1{2,}/.test(w)) return true // aaa, hhh
  if (n >= 4 && new Set(w).size <= 2) return true // haaha, dndn
  if (/(.{2,3})\1{2,}/.test(w)) return true // hahaha, lalala
  if (hasKeyboardRun(w)) return true // qwerty, asdfg

  const vowels = (w.match(/[aeiouy]/g) || []).length
  if (vowels === 0) return !(n <= 3 && raw === raw.toUpperCase()) // short acronyms like TCP are fine
  if (/[^aeiouy]{5,}/.test(w)) return true // hrkhdnd
  if (n >= 5 && vowels / n < 0.2) return true // too few vowels
  return false
}

const looksLikeGibberish = (skill) =>
  skill
    .split(/\s+/)
    .filter(Boolean)
    .some((word) => {
      // short letter groups joined by & (R&D, Q&A, S&P, M&A, P&L) are real
      if (/^\p{L}{1,2}(?:&\p{L}{1,2})+$/u.test(word)) return false

      return word
        .split(/[^\p{L}\p{N}]+/u)
        .filter(Boolean)
        .some((token) => {
          if (/^\d+$/.test(token)) return false // version numbers are handled by isValidSkill
          if (/\d/.test(token)) {
            // Web3, K8s, S3, Neo4j: check only the letters, and let very short ones (K8s, S3, 5G) through
            const letters = token.replace(/\d+/g, '')
            if (letters.length <= 3) return false
            return wordIsGibberish(letters)
          }
          return wordIsGibberish(token)
        })
    })

/* "good listener" -> "Good Listener", "r&d" -> "R&D" (only when everything was typed in lowercase) */
const tidySkill = (s) =>
  s === s.toLowerCase() ? s.replace(/(^|[\s\-\/(&])(\p{L})/gu, (m, a, b) => a + b.toUpperCase()) : s

const listQuoted = (arr) => arr.map((x) => `“${x}”`).join(', ')

/* Turns typed text (one skill, or several split by comma / new line) into skills to add.
   Checks run in this order for anything that is not an official listed skill:
     1. swear words (English + Filipino)      -> `profane`
     2. describes the person, not a skill      -> `descriptions` ("I am pretty", "maganda ko")
     3. only numbers / symbols, no letters    -> `numeric`
     4. unsupported symbols or too many digits -> `symbols` (includes a skill that starts or ends with &)
     5. random typing                         -> `gibberish`
   Rejected text comes back in `invalid` with a clear `error`. A skill that is already in the list is selected
   instead of added again. There is NO limit on how many skills can be added. */
const parseCustomSkills = (raw, selected, custom) => {
  const taken = new Set([...selected, ...custom].map((s) => s.toLowerCase()))
  const add = []
  const select = []
  const invalid = []
  const profane = []
  const descriptions = []
  const numeric = []
  const symbols = []
  const gibberish = []
  let error = ''

  for (const part of String(raw ?? '').split(/[,;\n]/)) {
    const s = normalizeSkill(part)
    if (!s) continue
    const key = s.toLowerCase()

    // official names from the lists (e.g. "3D Modeling", "Excel / Spreadsheets") are always fine
    if (!SKILL_LOOKUP[key]) {
      // profanity first: leetspeak like "sh1t" contains digits
      if (isProfane(s)) {
        invalid.push(s)
        profane.push(s)
        continue
      }
      // "I am pretty", "maganda ko": a description of the person, not a skill
      if (isSelfDescription(s)) {
        invalid.push(s)
        descriptions.push(s)
        continue
      }
      if (!/\p{L}/u.test(s)) {
        invalid.push(s)
        numeric.push(s)
        continue
      }
      if (!isValidSkill(s)) {
        invalid.push(s)
        symbols.push(s)
        continue
      }
      if (looksLikeGibberish(s)) {
        invalid.push(s)
        gibberish.push(s)
        continue
      }
    }
    if (taken.has(key)) {
      error ||= `“${s}” is already added.`
      continue
    }
    if (s.length > MAX_SKILL_LEN) {
      error ||= `Skill names can be up to ${MAX_SKILL_LEN} characters.`
      continue
    }

    taken.add(key)
    if (SKILL_LOOKUP[key]) select.push(SKILL_LOOKUP[key])
    else add.push(tidySkill(s))
  }

  if (invalid.length) {
    const parts = []
    if (profane.length) {
      // the word is not echoed back on purpose
      parts.push('Please remove inappropriate language. Only real skills can be added.')
    }
    if (descriptions.length) {
      parts.push(`${listQuoted(descriptions)} ${descriptions.length > 1 ? 'describe' : 'describes'} you, not a skill. Add things you can do, like Cooking or Active Listening.`)
    }
    if (numeric.length) {
      parts.push(`${listQuoted(numeric)} can’t be added. A skill can’t be just numbers or symbols.`)
    }
    if (symbols.length) {
      parts.push(`${listQuoted(symbols)} can’t be added. Use letters, with a few digits only for names like Web3 or K8s. The only symbols allowed are & between words (as in Food & Beverage or R&D, never at the start or end), one pair of parentheses like (SEO), plus C++, C# and Node.js.`)
    }
    if (gibberish.length) {
      parts.push(`${listQuoted(gibberish)} ${gibberish.length > 1 ? 'don’t' : 'doesn’t'} look like a real skill. Please type real words, like Cooking or Active Listening.`)
    }
    error = parts.join(' ')
  }
  return { add, select, invalid, profane, descriptions, numeric, symbols, gibberish, error }
}

/* Career preference ideas, grouped by theme so every batch mixes different kinds of preferences */
const PREF_GROUPS = {
  interests: [
    'I enjoy solving problems and finding practical solutions.',
    'I enjoy analyzing information and finding patterns.',
    'I like creative work where I can come up with my own ideas.',
    'I enjoy building or fixing things with my hands.',
    'I like researching topics and discovering new things.',
    'I enjoy designing things that look good and work well.',
    'I like writing, storytelling or communicating ideas.',
    'I enjoy working with numbers, data or financial information.',
    'I am passionate about technology and how things work.',
    'I enjoy planning and organizing events or projects.',
    'I like working with animals, plants or nature.',
    'I enjoy cooking, food or hospitality.',
  ],
  people: [
    'I would like a job that lets me help people directly.',
    'I prefer collaborating with a team over working alone.',
    'I enjoy teaching, explaining or guiding other people.',
    'I prefer working independently with minimal supervision.',
    'I enjoy meeting new people and talking to customers.',
    'I like leading a group and motivating others.',
    'I am comfortable speaking in front of an audience.',
    'I prefer quiet, focused work over constant interaction.',
    'I like supporting people through difficult times.',
    'I enjoy negotiating, persuading and closing deals.',
  ],
  environment: [
    'I prefer a calm, structured work environment with clear goals.',
    'I like fast-paced work with new challenges every day.',
    'I am interested in remote or flexible work arrangements.',
    'I like working outdoors or in different places.',
    'I prefer working in an office with a regular schedule.',
    'I would enjoy a job that involves travel.',
    'I like working in a lab, clinic or workshop.',
    'I enjoy working in a start-up where I can wear many hats.',
    'I prefer working in a large, established organization.',
    'I am open to working abroad or for international companies.',
  ],
  growth: [
    'I want a career where I can keep learning new things.',
    'I want to grow into a leadership or management role.',
    'I am interested in starting my own business someday.',
    'I want to become an expert in one specialized field.',
    'I plan to take a master’s degree or further studies.',
    'I want to earn professional certifications to advance.',
    'I want a career with clear promotions and growth steps.',
    'I would like to try different roles before settling on one.',
    'I want to build a portfolio of projects that shows my skills.',
    'I would like to become a mentor or trainer one day.',
  ],
  values: [
    'I prefer work that has a meaningful impact on society.',
    'I want work-life balance and a stable career path.',
    'I want a high-earning career, even if it is demanding.',
    'I value job security, such as government or established roles.',
    'I care about sustainability and the environment.',
    'I want to contribute to my community or my country.',
    'I value creativity and freedom over a fixed routine.',
    'I want a career that supports my family and future plans.',
    'I value honesty, fairness and ethical work.',
    'I want to work on products that many people will use.',
  ],
  industries: [
    'I am interested in healthcare or medical fields.',
    'I am interested in education and training.',
    'I am interested in banking, finance or investing.',
    'I am interested in law, government or public service.',
    'I am interested in engineering and construction.',
    'I am interested in software, AI or data.',
    'I am interested in media, arts or entertainment.',
    'I am interested in tourism, hotels or restaurants.',
    'I am interested in agriculture or food production.',
    'I am interested in marketing, advertising or sales.',
    'I am interested in science and research.',
    'I am interested in logistics, shipping or manufacturing.',
  ],
}

const VISIBLE = 15
const VISIBLE_PREFS = 6

const shuffle = (arr) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/* Pool of skills not yet chosen. Skills from the previous batch are skipped (when enough others remain)
   so "Show different skills" really shows something new. */
const freshPool = (list, selected, previous) => {
  const open = list.filter((s) => !selected.includes(s))
  const unseen = open.filter((s) => !previous.includes(s))
  return shuffle(unseen.length >= 3 ? unseen : open)
}

/* All = an even mix taken in turns from every field (so every field shows up);
   a tab = only that group. */
const pickSkills = (filter, selected, previous) => {
  if (filter !== 'all') return freshPool(SKILLS[filter], selected, previous).slice(0, VISIBLE)

  const pools = shuffle(Object.keys(SKILLS)).map((k) => freshPool(SKILLS[k], selected, previous))
  const out = []
  for (let round = 0; out.length < VISIBLE && round < VISIBLE; round++) {
    for (const pool of pools) {
      if (pool[round] && out.length < VISIBLE) out.push(pool[round])
    }
  }
  return shuffle(out)
}

/* A batch of preference ideas: one from each theme in turns, so the list is always varied.
   Ideas already in the text box, and ones from the previous batch, are skipped when possible. */
const pickPrefs = (current, previous) => {
  const pools = Object.values(PREF_GROUPS).map((list) => {
    const open = list.filter((t) => !current.includes(t))
    const unseen = open.filter((t) => !previous.includes(t))
    return shuffle(unseen.length ? unseen : open)
  })
  const out = []
  for (let round = 0; out.length < VISIBLE_PREFS && round < 3; round++) {
    for (const pool of shuffle(pools)) {
      if (pool[round] && out.length < VISIBLE_PREFS) out.push(pool[round])
    }
  }
  return shuffle(out)
}

const Card = ({ n, title, optional, children }) => (
  <section className="rounded-3xl border border-[#e6d8c3] bg-[#fbf6ee] p-5 shadow-sm sm:p-7">
    <div className="mb-1 flex items-center gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0b0b2b] text-xs font-semibold text-white">
        {n}
      </span>
      <h2 className="text-lg font-extrabold text-black">
        {title}
        {optional && <span className="ml-1.5 text-sm font-normal text-neutral-500">(Optional)</span>}
      </h2>
    </div>
    <div className="sm:pl-10">{children}</div>
  </section>
)

/* text-base on phones (16px) stops mobile browsers from zooming the page when an input is focused */
const inputCls =
  'w-full rounded-xl border border-[#e0d1ba] bg-white px-4 py-3 text-base text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-[#0b0b2b] focus:ring-2 focus:ring-[#0b0b2b]/15 sm:text-sm'

/* ------------------------------------------------------------------ */
/* Degree dropdown: click to browse all programs by field, or type to  */
/* search. Only programs from the list can be chosen: numbers, symbols */
/* and made-up text are not accepted.                                  */
/* ------------------------------------------------------------------ */
const DegreeSelect = ({ value, onChange, placeholder }) => {
  const uid = useId()
  const listId = `${uid}-list`

  const [text, setText] = useState(value || '')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  const query = text.trim().replace(/\s+/g, ' ')
  const results = useMemo(() => searchDegrees(query).slice(0, query ? 40 : 400), [query])
  const exact = results.find((d) => normText(d.label) === normText(query))

  /* only programs from the list can be chosen */
  const options = results.map((d) => ({ label: d.label, group: d.group }))
  const committed = !!value && value === text

  const pick = (o) => {
    setText(o.label)
    onChange(o.label)
    setOpen(false)
  }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive((i) => Math.min(i + 1, options.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (open && options[active]) pick(options[active])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  /* keep the highlighted option visible while using the arrow keys */
  useEffect(() => {
    if (!open) return
    document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: 'nearest' })
  }, [active, open, listId])

  return (
    <div className="relative mt-2 max-w-md">
      <input
        id="degree"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && options[active] ? `${listId}-${active}` : undefined}
        autoComplete="off"
        maxLength={MAX_DEGREE}
        value={text}
        placeholder={placeholder}
        className={`${inputCls} pr-10`}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onBlur={() => {
          setOpen(false)
          // typed the exact name of a listed program? save it without needing a click
          if (!committed && exact) pick({ label: exact.label })
        }}
        onKeyDown={onKeyDown}
        onChange={(e) => {
          // letters and spaces only: numbers and symbols are removed as the user types
          const clean = e.target.value.replace(/[^\p{L}\s]/gu, '')
          setText(clean)
          setActive(0)
          setOpen(true)
          onChange('') // typing un-selects; the program is saved only when one is picked
        }}
      />
      <span
        className={`pointer-events-none absolute right-4 top-3 text-sm ${committed ? 'font-bold text-[#2f9e62]' : 'text-neutral-400'}`}
        aria-hidden="true"
      >
        {committed ? '✓' : '▾'}
      </span>

      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-[#e0d1ba] bg-white pb-1 shadow-lg"
        >
          {options.length === 0 && (
            <li role="presentation" className="px-4 py-3 text-sm text-neutral-500">
              No matching program. Please choose one from the list.
            </li>
          )}
          {options.map((o, i) => (
            <React.Fragment key={`${o.group}-${o.label}`}>
              {!query && (i === 0 || options[i - 1].group !== o.group) && (
                <li
                  role="presentation"
                  className="sticky top-0 bg-[#fbf6ee] px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide text-neutral-500"
                >
                  {o.group}
                </li>
              )}
              <li
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault() // keep focus in the input so the list does not close first
                  pick(o)
                }}
                onMouseEnter={() => setActive(i)}
                className={`cursor-pointer px-4 py-2 ${i === active ? 'bg-[#f7efe2]' : ''}`}
              >
                <span className="block text-sm font-medium text-neutral-900">{o.label}</span>
                {query && <span className="block text-[11px] text-neutral-400">{o.group}</span>}
              </li>
            </React.Fragment>
          ))}
        </ul>
      )}

      {!open && !committed && query && (
        <p
          role="alert"
          className="mt-1.5 inline-flex items-center gap-1 rounded-md border border-red-300 bg-red-50 px-2 py-1 text-[10px] font-semibold leading-tight text-red-700"
        >
          <span aria-hidden="true" className="text-[10px]">⚠</span>
          <span>Not selected yet. Please choose a program from the list.</span>
        </p>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Loading animation: your career gets built, step by step             */
/* Bars drop in one after another while the AI works. When the result  */
/* is ready they lock in, a flag goes up, and then the modal opens.    */
/* ------------------------------------------------------------------ */
const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const BUILD_LINES = [
  'Reading your personality type...',
  'Looking at your academic background...',
  'Matching your skills to careers...',
  'Comparing hundreds of career paths...',
  'Ranking your top matches...',
]
const MIN_SHOW = 2800 // ms the animation stays up, even if the result arrives fast
const FINISH_HOLD = 1200 // ms to enjoy the finished build before the modal opens

const BAR_COLORS = ['#2f80e0', '#f2c230', '#e0404a', '#e8832a', '#6b7a99']
const BAR_W = 34
const BAR_GAP = 8
const BAR_X0 = (240 - (BAR_COLORS.length * BAR_W + (BAR_COLORS.length - 1) * BAR_GAP)) / 2
const BAR_BASE = 160
const BAR_H = BAR_COLORS.map((_, i) => 30 + i * 24)

const BuildingOverlay = ({ ready, onFinished }) => {
  const rootRef = useRef(null)
  const loopRef = useRef(null)
  const startedAt = useRef(Date.now())
  const finishedCb = useRef(onFinished)
  finishedCb.current = onFinished

  const [line, setLine] = useState(0)
  const [finished, setFinished] = useState(false)

  /* the looping build: bars drop in one by one, then lift away and start again */
  useEffect(() => {
    if (reducedMotion() || !rootRef.current) return undefined
    const bars = rootRef.current.querySelectorAll('.bar')
    loopRef.current = animate(bars, {
      translateY: [-150, 0],
      opacity: [0, 1],
      duration: 650,
      delay: stagger(240),
      ease: 'outBounce',
      loop: true,
      alternate: true,
      loopDelay: 500,
    })
    return () => loopRef.current?.pause()
  }, [])

  /* rotating status text, stops once the result is ready */
  useEffect(() => {
    if (ready) return undefined
    const id = setInterval(() => setLine((n) => (n + 1) % BUILD_LINES.length), 2200)
    return () => clearInterval(id)
  }, [ready])

  /* the result is in: wait out the minimum time, lock the build in, raise the flag, then hand over */
  useEffect(() => {
    if (!ready) return undefined
    const wait = Math.max(0, MIN_SHOW - (Date.now() - startedAt.current))
    let t2 = 0

    const t1 = setTimeout(() => {
      setFinished(true)
      loopRef.current?.pause()

      if (rootRef.current && !reducedMotion()) {
        const bars = rootRef.current.querySelectorAll('.bar')
        const flag = rootRef.current.querySelector('.flag')
        animate(bars, { translateY: 0, opacity: 1, duration: 300, ease: 'outQuad' })
        animate(bars, { scale: [1, 1.1, 1], duration: 450, delay: stagger(70, { start: 250 }), ease: 'outQuad' })
        if (flag) animate(flag, { scale: [0, 1], opacity: [0, 1], duration: 600, delay: 650, ease: 'outBack' })
      } else if (rootRef.current) {
        const flag = rootRef.current.querySelector('.flag')
        if (flag) flag.style.opacity = '1'
      }

      t2 = setTimeout(() => finishedCb.current?.(), FINISH_HOLD + 650)
    }, wait)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [ready])

  const last = BAR_COLORS.length - 1
  const flagX = BAR_X0 + last * (BAR_W + BAR_GAP) + BAR_W / 2
  const flagY = BAR_BASE - BAR_H[last]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#f3e7d6]/95 px-4 backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      <div className="w-full max-w-sm text-center">
        <svg
          ref={rootRef}
          viewBox="0 0 240 190"
          className="mx-auto block h-auto w-full max-w-[300px]"
          aria-hidden="true"
        >
          {/* ground */}
          <rect x="8" y={BAR_BASE} width="224" height="6" rx="3" fill="#d9c8ae" />

          {/* the bars that get built */}
          {BAR_COLORS.map((color, i) => (
            <g
              key={color}
              className="bar"
              style={{ opacity: reducedMotion() ? 1 : 0, transformBox: 'fill-box', transformOrigin: '50% 100%' }}
            >
              <rect
                x={BAR_X0 + i * (BAR_W + BAR_GAP)}
                y={BAR_BASE - BAR_H[i]}
                width={BAR_W}
                height={BAR_H[i]}
                rx="6"
                fill={color}
              />
              <rect
                x={BAR_X0 + i * (BAR_W + BAR_GAP) + 5}
                y={BAR_BASE - BAR_H[i] + 5}
                width={BAR_W - 10}
                height="6"
                rx="3"
                fill="#fff"
                opacity="0.35"
              />
            </g>
          ))}

          {/* flag on the tallest bar, raised when the result is ready */}
          <g
            className="flag"
            style={{ opacity: 0, transformBox: 'fill-box', transformOrigin: '0% 100%' }}
            transform={`translate(${flagX} ${flagY})`}
          >
            <rect x="-1.5" y="-30" width="3" height="30" rx="1.5" fill="#0b0b2b" />
            <polygon points="1.5,-30 24,-23 1.5,-16" fill="#2f9e62" />
          </g>
        </svg>

        <div className="mt-6 text-xl font-black tracking-tight text-black">
          {finished ? 'Your matches are ready!' : 'Building your career matches'}
        </div>
        <div className="mt-2 min-h-[20px] text-sm text-neutral-600">
          {finished ? 'Opening your results...' : BUILD_LINES[line]}
        </div>
        {!finished && (
          <div className="mt-1 text-xs text-neutral-500">
            This can take up to a minute the first time. Please keep this page open.
          </div>
        )}
      </div>
    </div>
  )
}

const AssesmentTest = () => {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [checking, setChecking] = useState(false)
  const [submitError, setSubmitError] = useState('')

  /* the saved prediction + the inputs that produced it; when set, the result modal opens */
  const [result, setResult] = useState(null)
  /* the prediction is loaded but the build animation is still finishing; the modal opens after it */
  const [pending, setPending] = useState(null)
  const [selecting, setSelecting] = useState(false)
  const [selectError, setSelectError] = useState('')

    /* "No, show me different careers" */
  const [redoing, setRedoing] = useState(false)
  const [redoError, setRedoError] = useState('')
  const [round, setRound] = useState(0) // changes the modal key so the opening animation replays with the new careers

  /* pre-filled from the saved profile, if there is one */
  const [mbti, setMbti] = useState(() => getProfile().mbti)
  const [degree, setDegree] = useState(() => getProfile().degree ?? '')
  const [skills, setSkills] = useState([])
  /* skills the user typed themselves; each one shows up as a selected chip */
  const [customSkills, setCustomSkills] = useState([])
  const [otherInput, setOtherInput] = useState('')
  const [skillNote, setSkillNote] = useState({ text: '', ok: true })
  const [pref, setPref] = useState('')
  const [prefMsg, setPrefMsg] = useState('')
  const [filter, setFilter] = useState('all')
  const [skillSeed, setSkillSeed] = useState(0)
  const [prefSeed, setPrefSeed] = useState(0)
  const [hint, setHint] = useState(DEGREE_HINTS[0])
  const lastBatch = useRef([])
  const lastPrefs = useRef([])

  useEffect(() => {
    setHint(DEGREE_HINTS[Math.floor(Math.random() * DEGREE_HINTS.length)])
  }, [])

  /* random chips: change on every shuffle / tab change; selected chips always stay on screen */
  const randomSkills = useMemo(
    () => pickSkills(filter, skills, lastBatch.current),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [skillSeed, filter]
  )
  useEffect(() => {
    lastBatch.current = randomSkills
  }, [randomSkills])

  const shownSkills = useMemo(() => {
    const sel = skills.filter((s) => filter === 'all' || KIND[s] === filter)
    return [...randomSkills.filter((s) => !sel.includes(s)), ...sel]
  }, [randomSkills, skills, filter])

  const suggestions = useMemo(
    () => pickPrefs(pref, lastPrefs.current),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [prefSeed]
  )
  useEffect(() => {
    lastPrefs.current = suggestions
  }, [suggestions])

  const totalSkills = skills.length + customSkills.length

  /* live check of whatever is typed in the skill box (invalid text turns the box red) */
  const otherParsed = useMemo(
    () => parseCustomSkills(otherInput, skills, customSkills),
    [otherInput, skills, customSkills]
  )
  const otherInvalid = otherParsed.invalid.length > 0

  const toggleSkill = (s) => {
    setSkillNote({ text: '', ok: true })
    setSkills((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]))
  }

  /* Asks the server whether typed skills are real. If the server can't be reached we let them through
     (fail open); the backend checks again when the assessment is submitted. */
  const verifySkills = async (list) => {
    if (!list.length) return { ok: [], bad: [] }
    try {
      const res = await validateSkills(list)
      return {
        ok: res.filter((r) => r.valid).map((r) => r.skill),
        bad: res.filter((r) => !r.valid).map((r) => r.skill),
      }
    } catch {
      return { ok: list, bad: [] }
    }
  }

  /* "Add skills" button / Enter: one skill or a comma-separated list, each becomes a selected chip.
     Rejected text (swear words, descriptions, numbers, symbols, gibberish) stays in the box so the user can fix it. */
  const addSkills = async () => {
    if (checking) return
    if (!otherInput.trim()) {
      setSkillNote({ text: 'Type a skill first, for example: Cooking, Active Listening', ok: false })
      return
    }

    const r = parseCustomSkills(otherInput, skills, customSkills)

    setChecking(true)
    const { ok, bad } = await verifySkills(r.add)
    setChecking(false)

    const added = [...r.select, ...ok]
    if (r.select.length) setSkills((cur) => [...cur, ...r.select])
    if (ok.length) setCustomSkills((cur) => [...cur, ...ok])

    // keep only the rejected text in the box so it can be corrected
    setOtherInput([...r.invalid, ...bad].join(', '))

    const errs = [r.error]
    if (bad.length) {
      errs.push(`${listQuoted(bad)} ${bad.length > 1 ? 'don’t' : 'doesn’t'} look like a real skill. Please type a real skill, like Cooking or Active Listening.`)
    }
    const error = errs.filter(Boolean).join(' ')

    if (added.length) {
      setSkillNote({
        text: `Added: ${added.join(', ')}${error ? `. ${error}` : ''}`,
        ok: !error,
      })
    } else {
      setSkillNote({ text: error || 'Please type a valid skill.', ok: false })
    }
  }

  const removeCustom = (s) => {
    setSkillNote({ text: '', ok: true })
    setCustomSkills((cur) => cur.filter((x) => x !== s))
  }

  const clearSkills = () => {
    setSkills([])
    setCustomSkills([])
    setSkillNote({ text: '', ok: true })
  }

  /* tap an idea to add it, tap again to remove it from the text */
  const togglePref = (t) => {
    setPrefMsg('')
    if (pref.includes(t)) {
      setPref((cur) => cur.split(t).join('').replace(/[ \t]{2,}/g, ' ').trim())
      return
    }
    const next = pref.trim() ? `${pref.trim()} ${t}` : t
    if (next.length > MAX_PREF) {
      setPrefMsg(`That would pass the ${MAX_PREF}-character limit. Remove some text first.`)
      return
    }
    setPref(next)
  }

  const done = [
    !!mbti,
    degree.trim().length > 1,
    totalSkills > 0 || otherParsed.add.length + otherParsed.select.length > 0,
    true,
  ]
  const first = done.findIndex((d) => !d)
  const active = first === -1 ? 3 : first
  const valid = done[0] && done[1] && done[2]
  const missing = [
    !done[0] && 'Personality Type',
    !done[1] && 'Academic Background',
    !done[2] && 'Skills',
  ].filter(Boolean)

  /* Enter inside a text input should not submit the form; only the Start Assessment button does.
     The textarea still allows new lines, and buttons keep working with Enter/Space. */
  const blockEnterSubmit = (e) => {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
      e.preventDefault()
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!valid || submitting || checking) return

    /* anything still typed in the skill box counts too */
    const p = parseCustomSkills(otherInput, skills, customSkills)

    /* text with swear words, descriptions, numbers or symbols must be fixed first */
    if (p.invalid.length) {
      setSubmitError(p.error)
      return
    }

    /* typed skills still in the box get the same server check as the "Add skills" button */
    setChecking(true)
    const v = await verifySkills(p.add)
    setChecking(false)
    if (v.bad.length) {
      setSubmitError(`${listQuoted(v.bad)} ${v.bad.length > 1 ? 'don’t' : 'doesn’t'} look like a real skill. Please fix or remove ${v.bad.length > 1 ? 'them' : 'it'}.`)
      return
    }

    const picked = [...skills, ...p.select]
    const allSkills = [...new Set([...picked, ...customSkills, ...v.ok])]

    if (allSkills.length === 0) {
      setSubmitError('Please add at least one valid skill.')
      return
    }

    setSubmitError('')
    setSubmitting(true)

    try {
      const id = await submitAssessment({
        mbti,
        degree: degree.trim(),
        skills: allSkills,
        softSkills: picked.filter((s) => KIND[s] === 'soft'),
        fieldSkills: picked.filter((s) => KIND[s] !== 'soft'),
        preference: pref.trim(),
      })

      /* load the saved prediction; the build animation finishes first, then the modal opens */
      try {
        const pred = await getPrediction(id)
        setSelectError('')
        setPending({
          pred: { ...pred, id: pred?.id ?? id },
          input: { mbti, degree: degree.trim(), skills: allSkills },
        })
      } catch {
        // the prediction is saved, so the dashboard can still show it
        navigate('/dashboard')
      }
    } catch (err) {
      setSubmitError(err.message || 'Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  /* called by the animation once the finished build has been shown: now open the result modal */
  const showResult = () => {
    setResult(pending)
    setPending(null)
    setSubmitting(false)
  }

  /* choose a career in the modal: save it, then open its roadmap */
  const openRoadmap = async (title) => {
    const id = result?.pred?.id
    if (!id || !title || selecting) return

    setSelecting(true)
    setSelectError('')

    try {
      await selectCareer(id, title)

      try {
        localStorage.setItem('selectedCareer', JSON.stringify({ predictionId: id, career: title }))
      } catch {
        // the database remains the source of the selected career
      }

      navigate('/dashboard/roadmap', { state: { predictionId: id } })
    } catch (err) {
      setSelectError(err?.message || 'Unable to select this career. Please try again.')
      setSelecting(false)
    }
  }
    /* swaps the 3 careers (and their roadmaps) for different ones; on failure the current results stay */
  const handleRedo = async () => {
    const id = result?.pred?.id
    if (!id || redoing) return

    setRedoing(true)
    setRedoError('')
    setSelectError('')

    try {
      const next = await redoPrediction(id)
      setResult((r) => ({ ...r, pred: { ...next, id: next?.id ?? id } }))
      setRound((n) => n + 1)
    } catch (err) {
      setRedoError(
        err?.response?.data?.message || err?.message || 'Could not find different careers. Please try again.'
      )
    } finally {
      setRedoing(false)
    }
  }

  /* closing the modal leaves the saved prediction on the dashboard */
  const closeResult = () => navigate('/dashboard')

  /* go to the previous page; if the page was opened directly (no history), fall back to the dashboard */
  const goBack = () => {
    if (window.history.state?.idx > 0) navigate(-1)
    else navigate('/dashboard')
  }

  const steps = ['Personality', 'Academic Background', 'Skills', 'Preferences']
  const tabs = [['all', 'All'], ...Object.entries(CAT).map(([k, v]) => [k, v.label])]

  /* the assessment is saved to the user's account, so they must be logged in */
  if (!localStorage.getItem('token')) return <Navigate to="/login" replace />

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f3e7d6] px-4 pb-16 pt-10 text-neutral-900 sm:pt-14">
      <form onSubmit={submit} onKeyDown={blockEnterSubmit} className="mx-auto w-full max-w-3xl">
        <header>
          <button
            type="button"
            onClick={goBack}
            disabled={submitting}
            className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-[#d9c8ae] bg-white px-4 py-2 text-xs font-bold text-[#0b0b2b] transition hover:border-[#0b0b2b] focus:outline-none focus:ring-2 focus:ring-[#0b0b2b]/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span aria-hidden="true">←</span> Back
          </button>
          <h1 className="break-words text-4xl font-black tracking-tight text-black sm:text-5xl">Tell us about yourself</h1>
          {/* left-aligned on phones: justified text leaves huge gaps between words on narrow screens */}
          <p className="mt-4 text-left text-sm leading-relaxed text-neutral-700 sm:text-justify">
            Answer four quick steps about your personality, education, skills and goals. Our AI studies your
            profile and suggests the careers that fit you best.
          </p>
        </header>

        {/* stepper: on phones only the current step shows its name, so all four steps fit on one line */}
        <ol className="mt-8 flex items-center gap-2 pb-1 text-xs font-bold">
          {steps.map((label, i) => {
            const isActive = i === active
            const isDone = i < 3 && done[i] && !isActive
            return (
              <li key={label} className="flex flex-none items-center gap-2 last:flex-none sm:flex-1">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] ${
                    isActive
                      ? 'border-[#0b0b2b] bg-[#0b0b2b] text-white'
                      : isDone
                      ? 'border-[#0b0b2b] bg-transparent text-[#0b0b2b]'
                      : 'border-[#cdbb9f] bg-transparent text-[#8a7a60]'
                  }`}
                >
                  {isDone ? '✓' : i + 1}
                </span>
                <span
                  className={`whitespace-nowrap ${isActive ? 'inline' : 'hidden sm:inline'} ${
                    isActive || isDone ? 'text-[#0b0b2b]' : 'text-[#8a7a60]'
                  }`}
                >
                  {label}
                </span>
                {i < steps.length - 1 && <span className="hidden h-px flex-1 bg-[#d9c8ae] sm:block" />}
              </li>
            )
          })}
        </ol>

        <div className="mt-8 space-y-4">
          {/* 1 — MBTI */}
          <Card n="1" title="Personality Type (MBTI)">
            <p className="mt-1 text-sm leading-relaxed text-neutral-600">
              Pick the 4-letter type that fits you best. Not sure of yours? Take the free test at{' '}
              <a
                href="https://www.16personalities.com/free-personality-test"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-[#2f80e0] hover:underline"
              >
                16Personalities
              </a>{' '}
              and come back.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {TYPES.map(([code, name]) => {
                const on = mbti === code
                return (
                  <button
                    key={code}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setMbti(code)}
                    className={`rounded-xl border px-2 py-3.5 text-center transition ${
                      on
                        ? 'border-[#0b0b2b] bg-[#0b0b2b] text-white shadow-md'
                        : 'border-[#e0d1ba] bg-white hover:border-[#0b0b2b]/60 hover:bg-[#f7efe2]'
                    }`}
                  >
                    <span className={`block text-sm font-extrabold ${on ? 'text-white' : 'text-black'}`}>{code}</span>
                    <span className={`block text-xs ${on ? 'text-white/70' : 'text-neutral-500'}`}>{name}</span>
                  </button>
                )
              })}
            </div>
          </Card>

          {/* 2 — Education */}
          <Card n="2" title="Academic Background">
            <p className="mt-1 text-sm leading-relaxed text-neutral-600">
              Choose your current or most recent degree program from the list. You can type letters to
              search, but you must pick a program from the list. This helps us find careers that match
              your studies.
            </p>
            <label htmlFor="degree" className="mt-5 block text-xs font-bold text-black">Degree program</label>
            <DegreeSelect value={degree} onChange={setDegree} placeholder={`Select or search, e.g. ${hint}`} />
          </Card>

          {/* 3 — Skills */}
          <Card n="3" title="Skills">
            <p className="mt-1 text-sm leading-relaxed text-neutral-600">
              Tap the skills you really have, in any field. Not listed? Type your own below and tap
              &ldquo;Add skills&rdquo;. Accurate skills give you better matches.
            </p>

            {/* tabs wrap onto a second line instead of being cut off at the edge */}
            <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Skill categories">
              {tabs.map(([k, label]) => {
                const on = filter === k
                return (
                  <button
                    key={k}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => setFilter(k)}
                    className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                      on
                        ? 'border-[#0b0b2b] bg-[#0b0b2b] text-white'
                        : 'border-[#e0d1ba] bg-white text-neutral-700 hover:border-[#0b0b2b]/50'
                    }`}
                  >
                    {k !== 'all' && <span className={`h-2 w-2 rounded-full ${CAT[k].dot} ${on && k === 'soft' ? 'ring-1 ring-white' : ''}`} />}
                    {label}
                  </button>
                )
              })}
            </div>

            {/* bigger skill chips: easier to read and tap */}
            <div className="mt-5 flex flex-wrap gap-3">
              {shownSkills.map((s) => {
                const on = skills.includes(s)
                const c = CAT[KIND[s]]
                return (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleSkill(s)}
                    className={`max-w-full rounded-full border px-5 py-2.5 text-base font-semibold transition ${on ? c.on : `bg-white ${c.off}`}`}
                  >
                    {on && <span className="mr-1.5">✓</span>}
                    {s}
                  </button>
                )
              })}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <button
                type="button"
                onClick={() => setSkillSeed((n) => n + 1)}
                className="font-bold text-[#0b0b2b] hover:underline"
              >
                ↻ Show different skills
              </button>
              {totalSkills > 0 && (
                <>
                  <span className="text-neutral-500">{totalSkills} selected</span>
                  <button type="button" onClick={clearSkills} className="text-neutral-500 hover:text-black hover:underline">
                    Clear
                  </button>
                </>
              )}
            </div>

            <label htmlFor="other" className="mt-6 block text-xs font-bold text-black">
              Add your own skills{' '}
              <span className="font-normal text-neutral-500">(separate several with commas)</span>
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="other"
                value={otherInput}
                maxLength={2000}
                aria-invalid={otherInvalid}
                onChange={(e) => {
                  setOtherInput(e.target.value)
                  if (skillNote.text) setSkillNote({ text: '', ok: true })
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addSkills()
                  }
                }}
                enterKeyHint="done"
                autoComplete="off"
                placeholder="e.g. Cooking, Good Listener, Figma, C++"
                className={`${inputCls} min-w-0 flex-1 ${otherInvalid ? '!border-red-500 !ring-2 !ring-red-500/20' : ''}`}
              />
              <button
                type="button"
                onClick={addSkills}
                disabled={checking}
                className="shrink-0 rounded-xl bg-[#0b0b2b] px-4 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-[#1a1a4a] disabled:cursor-wait disabled:opacity-60 sm:px-5"
              >
                {checking ? 'Checking...' : 'Add skills'}
              </button>
            </div>
            {(otherInvalid || skillNote.text) && (
              <p
                role="alert"
                className={`mt-2 flex items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold ${
                  otherInvalid || !skillNote.ok
                    ? 'border-red-300 bg-red-50 text-red-700'
                    : 'border-[#2f9e62]/40 bg-[#2f9e62]/10 text-[#1d7a49]'
                }`}
              >
                <span aria-hidden="true">{otherInvalid || !skillNote.ok ? '⚠' : '✓'}</span>
                <span>{otherInvalid ? otherParsed.error : skillNote.text}</span>
              </p>
            )}

            {customSkills.length > 0 && (
              <div className="mt-3">
                <p className="mb-2 text-xs font-semibold text-neutral-600">Your added skills</p>
                <div className="flex flex-wrap gap-3">
                  {customSkills.map((s) => (
                    <span
                      key={s}
                      className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#0b0b2b] bg-[#0b0b2b] py-2.5 pl-5 pr-3 text-base font-semibold text-white"
                    >
                      <span>✓</span>
                      <span className="break-all">{s}</span>
                      <button
                        type="button"
                        onClick={() => removeCustom(s)}
                        aria-label={`Remove ${s}`}
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs text-white/80 transition hover:bg-white/20 hover:text-white"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* 4 — Preferences */}
          <Card n="4" title="Career Preferences" optional>
            <p className="mt-1 text-sm leading-relaxed text-neutral-600">
              Tell us what kind of work you enjoy, where you like to work, and your goals. Short, clear
              sentences work best. This is optional, but it makes your matches more personal.
            </p>
            <label htmlFor="pref" className="mt-5 block text-xs font-bold text-black">Your career preferences</label>
            <textarea
              id="pref"
              rows={4}
              maxLength={MAX_PREF}
              value={pref}
              onChange={(e) => {
                setPref(e.target.value)
                if (prefMsg) setPrefMsg('')
              }}
              placeholder="e.g., I enjoy solving problems, helping people, and collaborating with others."
              className={`${inputCls} mt-2 resize-y leading-relaxed`}
            />
            <div className="mt-1 flex items-start justify-between gap-3 text-xs">
              <span className="font-medium text-[#b0252e]">{prefMsg}</span>
              <span className="shrink-0 text-neutral-500">{pref.length} / {MAX_PREF}</span>
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-neutral-600">
                  Need ideas? Tap to add. Tap again to remove.
                </span>
                <button
                  type="button"
                  onClick={() => setPrefSeed((n) => n + 1)}
                  className="shrink-0 text-xs font-bold text-[#0b0b2b] hover:underline"
                >
                  ↻ More ideas
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((t) => {
                  const used = pref.includes(t)
                  return (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={used}
                      title={used ? 'Tap to remove' : 'Tap to add'}
                      onClick={() => togglePref(t)}
                      className={`max-w-full rounded-xl border px-3 py-1.5 text-left text-xs transition ${
                        used
                          ? 'border-[#f2c230] bg-[#f2c230]/30 text-[#7a5a08] hover:bg-[#f2c230]/45'
                          : 'border-[#e0d1ba] bg-white text-neutral-700 hover:border-[#0b0b2b]/60 hover:bg-[#f7efe2]'
                      }`}
                    >
                      {used ? '✓ ' : '+ '}
                      {t}
                    </button>
                  )
                })}
              </div>
            </div>
          </Card>
        </div>

        <p className="mt-6 text-xs leading-relaxed text-neutral-600">
          Your responses will be used to generate personalized career recommendations and will be handled in accordance with the study’s privacy notice.
        </p>

        {submitError && (
          <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
            {submitError}
          </div>
        )}

        <div className="mt-4 flex flex-col gap-4 rounded-3xl border border-[#e6d8c3] bg-[#fbf6ee] p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-extrabold text-black">Ready to find your career match?</p>
            {submitting ? (
              <p className="mt-0.5 text-xs text-neutral-500">
                This can take up to a minute the first time. Please keep this page open.
              </p>
            ) : valid ? (
              <p className="mt-1 text-xs font-semibold text-[#1d7a49]">✓ All required fields are complete.</p>
            ) : (
              <p
                role="alert"
                className="mt-2 inline-flex items-start gap-1.5 rounded-lg border border-red-300 bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-700"
              >
                <span aria-hidden="true">⚠</span>
                <span>Missing: {missing.join(', ')}</span>
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={!valid || submitting || checking}
            className="rounded-full bg-[#0b0b2b] px-8 py-3 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-[#1a1a4a] disabled:cursor-not-allowed disabled:bg-[#0b0b2b]/30"
          >
            {submitting ? 'Analyzing your profile...' : checking ? 'Checking skills...' : 'Start Assessment'}
          </button>
        </div>
      </form>

      {/* build animation: shows while the AI works, finishes when the prediction is ready, then the modal opens */}
      {(submitting || pending) && <BuildingOverlay ready={!!pending} onFinished={showResult} />}

      {/* result modal: opens once the build animation has finished */}
      {result && (
        <PredictionModal
          key={`${result.pred.id}-${round}`}
          pred={result.pred}
          input={result.input}
          busy={selecting}
          error={selectError || redoError}
          onRedo={handleRedo}
          redoing={redoing}
          onClose={closeResult}
          onViewRoadmap={openRoadmap}
          onViewDashboard={closeResult}
        />
      )}
    </main>
  )
}

export default AssesmentTest