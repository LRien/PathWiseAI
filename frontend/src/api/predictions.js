import client from './client'

// Dashboard: { stats, predictions[] } (newest first)
export const listPredictions = () => client.get('/predictions').then((r) => r.data)

// Full results of one prediction: top 3, avoid list, insights, assessment inputs
export const getPrediction = (id) => client.get(`/predictions/${id}`).then((r) => r.data.prediction)

// Most recent prediction (same shape as getPrediction). Throws a 404 error if there are none.
export const getLatestPrediction = () => client.get('/predictions/latest').then((r) => r.data.prediction)

// Roadmap of the selected career: { career, roadmap }. Optional rank (1-3) to override.
export const getRoadmap = (id, rank) =>
  client.get(`/predictions/${id}/roadmap`, { params: rank ? { rank } : {} }).then((r) => r.data)

// Saves the "Select this career" choice
export const selectCareer = (id, career) =>
  client.patch(`/predictions/${id}/select`, { career }).then((r) => r.data)

// Permanently deletes a prediction (and everything saved with it). Resolves to { deleted: true, id }.
export const deletePrediction = (id) => client.delete(`/predictions/${id}`).then((r) => r.data)