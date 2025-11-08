import cron from 'node-cron'
import { DateTime } from 'luxon'
import { Summary } from './models/Summary.js'
import { getDhakaDayRangeISO, fetchMailboxMessages } from './graph.js'
import { parseEmailToRecord } from './parser.js'

export function scheduleDailyJob() {
  const cronTime = process.env.CRON_TIME || '5 0 * * *'
  const tz = process.env.TIMEZONE || 'Asia/Dhaka'
  console.log(`Scheduling daily job at ${cronTime} ${tz}`)
  cron.schedule(cronTime, async () => {
    try {
      const dateYMD = DateTime.now().setZone(tz).toISODate()
      await buildSummaryForDate(dateYMD)
    } catch (e) {
      console.error('Cron job error', e)
    }
  }, { timezone: tz })
}

export async function buildSummaryForDate(dateYMD) {
  const mailbox = process.env.MONITORED_MAILBOX
  if (!mailbox) throw new Error('MONITORED_MAILBOX not set')
  const { startISO, endISO } = getDhakaDayRangeISO(dateYMD)
  const messages = await fetchMailboxMessages({ mailbox, startISO, endISO })
  const items = messages.map(m => ({
    ...parseEmailToRecord({ subject: m.subject, body: m.bodyPreview, from: m.from }),
    subject: m.subject,
    messageId: m.internetMessageId,
    receivedAt: m.receivedDateTime,
  }))
  await Summary.findOneAndUpdate(
    { date: dateYMD },
    { $set: { date: dateYMD, items } },
    { upsert: true }
  )
  return items
}
