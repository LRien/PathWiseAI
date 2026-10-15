import client from './client'
import { getLatestPrediction } from './predictions'

// Sends the assessment form to POST /api/assessments and returns the new prediction's id.
// The prediction can take a while (the model runs on the server), so this request waits up to 2 minutes.
export const submitAssessment = async (form) => {
  const { data } = await client.post(
    '/assessments',
    {
      mbti: form.mbti,
      degreeProgram: form.degree,
      skills: form.skills,
      careerPreference: form.preference,

      // Same values under the names the form uses, plus the split lists.
      // Once you have checked assessments.js, keep only the names it actually reads.
      degree: form.degree,
      preference: form.preference,
      softSkills: form.softSkills,
      fieldSkills: form.fieldSkills,
    },
    { timeout: 120000 }
  )

  // Use the id from the response if there is one, otherwise ask for the newest prediction
  const id = data?.prediction?.id ?? data?.predictionId
  if (id) return id
  return (await getLatestPrediction()).id
}