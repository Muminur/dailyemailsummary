import 'dotenv/config'
import express from 'express'
import morgan from 'morgan'
import cors from 'cors'
import { connectDB } from './lib/db.js'
import summariesRouter from './routes/summaries.js'
import { scheduleDailyJob } from './cron.js'

const app = express()
app.use(cors())
app.use(express.json({ limit: '1mb' }))
app.use(morgan('dev'))

app.get('/health', (req,res)=>res.json({ ok: true }))
app.use('/api/summaries', summariesRouter)

const port = process.env.PORT || 4000

connectDB().then(()=>{
  app.listen(port, ()=>{
    console.log(`API running on :${port}`)
    // Start cron only in production or when explicitly desired
    if (process.env.NODE_ENV === 'production') {
      try {
        scheduleDailyJob()
        console.log('Daily cron job scheduled successfully')
      } catch (error) {
        console.error('Failed to schedule daily job:', error)
      }
    }
  })
}).catch(err => {
  console.error('Failed to connect to database:', err)
  process.exit(1)
})