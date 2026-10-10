const PROFILE_KEY = 'careerMatchProfile'
const PRED_KEY = 'careerMatchPredictions'

const DEFAULTS = { name: 'Student', email: '', mbti: '', degree: '' }

export const getProfile = () => {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}') }
  } catch {
    return DEFAULTS
  }
}

export const saveProfile = (profile) => {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
  } catch {
    /* storage unavailable */
  }
}

/* removes saved predictions and the selected career (mock predictions stay) */
export const clearPredictions = () => {
  try {
    localStorage.removeItem(PRED_KEY)
    localStorage.removeItem('selectedCareer')
  } catch {
    /* storage unavailable */
  }
}

export const resetRoadmapProgress = () => {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('roadmapProgress:'))
      .forEach((k) => localStorage.removeItem(k))
  } catch {
    /* storage unavailable */
  }
}

export const exportData = () => {
  const dump = {
    profile: getProfile(),
    predictions: JSON.parse(localStorage.getItem(PRED_KEY) || '[]'),
    roadmapProgress: Object.fromEntries(
      Object.keys(localStorage)
        .filter((k) => k.startsWith('roadmapProgress:'))
        .map((k) => [k, JSON.parse(localStorage.getItem(k) || '[]')])
    ),
  }
  const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'career-match-data.json'
  a.click()
  URL.revokeObjectURL(url)
}