export default async function handler(req, res) {
  const base = process.env.API_BASE_URL || 'http://localhost:4000'
  const url = new URL('/api/summaries', base)
  Object.entries(req.query || {}).forEach(([k,v]) => url.searchParams.set(k, v))

  const resp = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
  const data = await resp.json()
  res.status(resp.status).json(data)
}
