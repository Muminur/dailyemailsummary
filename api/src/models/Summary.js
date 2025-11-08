import mongoose from 'mongoose'

const ItemSchema = new mongoose.Schema({
  clientName: String,
  problem: String,
  solution: String,
  status: { type: String, enum: ['Resolved','Unresolved','Unknown'], default: 'Unknown' },
  subject: String,
  messageId: String,
  receivedAt: Date,
}, { _id: false })

const SummarySchema = new mongoose.Schema({
  date: { type: String, index: true }, // YYYY-MM-DD (Asia/Dhaka)
  items: [ItemSchema],
}, { timestamps: true })

export const Summary = mongoose.model('Summary', SummarySchema)