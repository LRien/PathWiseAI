import client from './client'

// Dashboard: { stats, predictions[] } (newest first)
export const listPredictions = () => client.get('/predictions').then((r) => r.data)

// Full results of one prediction: top 3, avoid list, insights, assessment inputs.
// Also includes redoCount and maxRedos (for the "show me different careers" button).
export const getPrediction = (id) => client.get(`/predictions/${id}`).then((r) => r.data.prediction)

// Most recent prediction (same shape as getPrediction). Throws a 404 error if there are none.
export const getLatestPrediction = () => client.get('/predictions/latest').then((r) => r.data.prediction)

// Roadmap of the selected career: { career, roadmap }. Optional rank (1-3) to override.
// roadmap.version === 2 -> render roadmap.plan with <RoadmapView />; version 1 -> old columns.
export const getRoadmap = (id, rank) =>
  client.get(`/predictions/${id}/roadmap`, { params: rank ? { rank } : {} }).then((r) => r.data)

// Saves the "Select this career" choice
export const selectCareer = (id, career) =>
  client.patch(`/predictions/${id}/select`, { career }).then((r) => r.data)

// "No, show me different careers": swaps the recommended careers and their roadmaps.
// Resolves to the new prediction (same shape as getPrediction).
// Errors: 409 = no more careers left (message from the Space, current results are unchanged),
//         429 = redo limit reached, 502 = Space unavailable. Read e.response?.data?.message.
// Can take 30-60+ seconds (Space call + new roadmaps), so it has its own long timeout.
export const redoPrediction = (id) =>
  client.post(`/predictions/${id}/redo`, null, { timeout: 120000 }).then((r) => r.data.prediction)

// Permanently deletes a prediction (and everything saved with it). Resolves to { deleted: true, id }.
export const deletePrediction = (id) => client.delete(`/predictions/${id}`).then((r) => r.data)