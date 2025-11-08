import { Router } from 'express'
import { Summary } from '../models/Summary.js'
import { buildSummaryForDate } from '../cron.js'
import { getDhakaDateFromString } from '../utils/timezone.js'

const router = Router()

// GET /api/summaries?date=YYYY-MM-DD&page=1&pageSize=10
router.get('/', async (req, res) => {
  try {
    const date = getDhakaDateFromString(req.query.date)
    const page = Math.max(1, parseInt(req.query.page || '1', 10))
    const pageSize = Math.max(1, Math.min(100, parseInt(req.query.pageSize || '10', 10)))

    const doc = await Summary.findOne({ date })
    const total = doc?.items?.length || 0
    const start = (page - 1) * pageSize
    const items = (doc?.items || []).slice(start, start + pageSize)

    res.json({ items, total })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message || 'Internal error' })
  }
})

// POST /api/summaries/rebuild?date=YYYY-MM-DD
router.post('/rebuild', async (req, res) => {
  try {
    const date = getDhakaDateFromString(req.query.date)
    console.log(`Rebuilding summary for date: ${date}`)
    const result = await buildSummaryForDate(date)
    console.log(`Rebuilt summary with ${result?.length || 0} items`)
    res.json({ ok: true, date, count: result?.length || 0 })
  } catch (e) {
    console.error('Rebuild error:', e)
    res.status(500).json({ error: e.message || 'Failed to rebuild' })
  }
})

export default router