import mongoose from 'mongoose'

export async function connectDB() {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI not set')
  mongoose.set('strictQuery', true)
  if (mongoose.connection.readyState === 1) return mongoose.connection
  
  // Add connection options for better reliability
  const options = {
    autoIndex: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4 // Use IPv4, skip trying IPv6
  }
  
  await mongoose.connect(uri, options)
  console.log('Connected to MongoDB')
  
  // Handle connection events
  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err)
  })
  
  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected')
  })
  
  return mongoose.connection
}