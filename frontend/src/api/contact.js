import client from './client'

export const sendContactMessage = async (payload) => {
  const url = `${client.defaults.baseURL}/contact`
  console.log('[contact] POST ->', url)
  console.log('[contact] payload:', { ...payload, message: `${payload.message?.length} chars` })
  console.log('[contact] honeypot value:', JSON.stringify(payload._honey))

  try {
    const data = await client.post('/contact', payload).then((r) => r.data)
    console.log('[contact] response:', data)
    return data
  } catch (err) {
    console.error('[contact] FAILED:', { url, status: err.status, message: err.message })
    throw err
  }
}