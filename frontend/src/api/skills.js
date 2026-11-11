export async function validateSkills(skills) {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/skills/validate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
    body: JSON.stringify({ skills }),
  })
  if (!res.ok) throw new Error('validate failed')
  return (await res.json()).results
}