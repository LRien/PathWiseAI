// backend/src/services/pathwise.js
import { Client } from '@gradio/client'

let clientPromise

function getClient() {
  if (!clientPromise) {
    clientPromise = Client.connect('CHASM03/PathWiseAi', {
      hf_token: process.env.HF_TOKEN, // only needed if the Space is private
    }).catch((err) => {
      clientPromise = null // allow retry on next request
      throw err
    })
  }
  return clientPromise
}

export async function getRecommendation({ mbti, skills, education, preference = '', includeRoadmap = false }) {
  const client = await getClient()
  const result = await client.predict('/recommend', {
    mbti,
    skills: Array.isArray(skills) ? skills.join(', ') : skills,
    education,
    preference,
    include_roadmap: includeRoadmap,
  })
  return result.data[0]
}