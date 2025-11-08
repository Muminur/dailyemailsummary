import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Verify user session
  const session = await getServerSession(req, res, authOptions)
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const base = process.env.API_BASE_URL || 'http://localhost:4000'
  const url = new URL('/api/summaries/rebuild', base)
  
  // Handle query parameters
  Object.entries(req.query || {}).forEach(([k,v]) => url.searchParams.set(k, v))

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body)
    })
    
    if (!resp.ok) {
      throw new Error(`API responded with ${resp.status}`)
    }
    
    const data = await resp.json()
    res.status(resp.status).json(data)
  } catch (error) {
    console.error('API rebuild proxy error:', error)
    res.status(500).json({ error: 'Failed to rebuild summary' })
  }
}