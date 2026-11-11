// backend/src/services/pathwise.js
import { Client } from '@gradio/client'

const SPACE = 'CHASM03/PathWiseAi'
const TIMEOUT_MS = 170000 // a first call can be slow; after this the request fails with a clear error

let clientPromise

function getClient() {
  if (!clientPromise) {
    console.log('[pathwise] Connecting to Space...')
    clientPromise = Client.connect(SPACE, {
      hf_token: process.env.HF_TOKEN, // only needed if the Space is private
    })
      .then((c) => {
        console.log('[pathwise] Connected.')
        return c
      })
      .catch((err) => {
        clientPromise = null // allow retry on next request
        throw err
      })
  }
  return clientPromise
}

const withTimeout = (promise, ms, label) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`)), ms)
    ),
  ])

export async function getRecommendation({
  mbti,
  skills,
  education,
  preference = '',
  includeRoadmap = false,
  hours = 8,
  exclude = [], // O*NET codes already shown -> "show me different careers"
}) {
  const t0 = Date.now()
  try {
    const client = await withTimeout(getClient(), 60000, 'Connecting to the Space')

    const result = await withTimeout(
      client.predict('/recommend', {
        mbti,
        skills: Array.isArray(skills) ? skills.join(', ') : skills,
        education,
        preference,
        include_roadmap: includeRoadmap,
        hours,
        exclude: (exclude ?? []).filter(Boolean).join(','),
      }),
      TIMEOUT_MS,
      'Space prediction'
    )

    console.log(`[pathwise] Space answered in ${Math.round((Date.now() - t0) / 1000)}s`)
    return result.data[0]
  } catch (err) {
    clientPromise = null // reconnect fresh next time
    console.error(`[pathwise] Failed after ${Math.round((Date.now() - t0) / 1000)}s:`, err?.message || err)
    throw err
  }
}