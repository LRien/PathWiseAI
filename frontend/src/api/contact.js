import client from './client'

// Returns the response body (res.data) and throws an Error on failure.
// The error message is the backend's own message (e.g. rate limit, validation).

export const sendContactMessage = ({ name, email, subject, message, _honey }) =>
  client.post('/contact', { name, email, subject, message, _honey }).then((r) => r.data)