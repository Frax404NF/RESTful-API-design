import { env, isDev, isTestEnv } from '../env.ts'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import authRoutes from './routes/authRoutes.ts'
import habitRoutes from './routes/habitRoutes.ts'
import userRoutes from './routes/userRoutes.ts'
import tagRoutes from './routes/tagRoutes.ts'
import { APIError, errorHandler, notFound } from './middleware/errorHandler.ts'
import rateLimit from 'express-rate-limit'

// create an express application
const app = express()

app.use(helmet())
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
)

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(
  morgan('dev', {
    skip: () => isTestEnv(),
  })
)

// health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Habit Tracker API',
  });
})

// learn how to implement basic rate limit
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many requests', message: 'Please try again after 15 minutes' }
})

const genericLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: 'Too many requests', message: 'Please try again after 15 minutes' }
})

// Apply rate limiters
app.use('/api', genericLimiter)
app.use('/api/auth', authLimiter)

// Mount routers with base paths
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/habits', habitRoutes)
app.use('/api/tags', tagRoutes)

app.use(notFound)

app.use(errorHandler)

export { app }

export default app