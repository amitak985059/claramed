import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import mongoose from 'mongoose'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import jwt from 'jsonwebtoken'
import 'dotenv/config'
import connectDB from "./config/mongodb.js"
import connectCloudinary from "./config/cloudinary.js"
import userRouter from "./routes/userRoute.js"
import doctorRouter from "./routes/doctorRoute.js"
import adminRouter from "./routes/adminRoute.js"
import errorHandler from "./middleware/errorHandler.js"
import messageModel from './models/messageModel.js'
import { getAnalytics } from './controllers/analyticsController.js'
import authAdmin from './middleware/authAdmin.js'

// ─── App & HTTP server ────────────────────────────────────────────────────────
const app = express()
const httpServer = createServer(app)
const port = process.env.PORT || 4000

// Trust proxy (required for express-rate-limit on Render/cloud platforms)
app.set('trust proxy', 1)

connectDB()
connectCloudinary()

// ─── Security headers ─────────────────────────────────────────────────────────
app.use(helmet())

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:5174')
  .split(',')
  .map(o => o.trim())

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`))
    }
  },
  credentials: true
}))

// ─── Rate limiting ────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again in 15 minutes.' }
})

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many registration attempts. Please try again later.' }
})

// ─── Body parser ──────────────────────────────────────────────────────────────
app.use(express.json())

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  })
})

// ─── API routes ───────────────────────────────────────────────────────────────
app.use("/api/user/login", authLimiter)
app.use("/api/user/register", registerLimiter)
app.use("/api/admin/login", authLimiter)
app.use("/api/doctor/login", authLimiter)

app.use("/api/user", userRouter)
app.use("/api/admin", adminRouter)
app.use("/api/doctor", doctorRouter)

// ─── Analytics (admin only) ───────────────────────────────────────────────────
app.get("/api/admin/analytics", authAdmin, getAnalytics)

// ─── Chat history (REST) ──────────────────────────────────────────────────────
app.get("/api/chat/:appointmentId", async (req, res) => {
  try {
    const messages = await messageModel
      .find({ appointmentId: req.params.appointmentId })
      .sort({ createdAt: 1 })
      .limit(100)
      .lean()
    res.json({ success: true, messages })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

app.get("/", (req, res) => res.send("API Working full flegit 100"))

// ─── Global error handler ─────────────────────────────────────────────────────
app.use(errorHandler)

// ─── Socket.io — real-time chat ───────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
})

// ─── Socket.io JWT authentication middleware ──────────────────────────────────
// Clients must pass their JWT in socket.handshake.auth.token
io.use((socket, next) => {
  const token = socket.handshake.auth?.token
  if (!token) {
    return next(new Error('Authentication required: no token provided'))
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    // Attach verified identity to socket — never trust client-supplied userId/role
    socket.data.userId = decoded.id
    socket.data.role   = decoded.role   // 'user' | 'doctor'
    next()
  } catch (err) {
    next(new Error('Authentication failed: invalid or expired token'))
  }
})

// Track which socket is in which room
const onlineUsers = new Map()   // socketId → { userId, role, name }

io.on('connection', (socket) => {
  // Join an appointment chat room
  // Use server-verified identity from socket.data — ignore any userId/role sent by client
  socket.on('join_room', ({ appointmentId, name }) => {
    const { userId, role } = socket.data
    socket.join(appointmentId)
    onlineUsers.set(socket.id, { userId, role, name, appointmentId })

    // Notify room that someone joined
    socket.to(appointmentId).emit('user_joined', { name, role })
  })

  // Handle incoming message — use server-verified senderId & senderRole
  socket.on('send_message', async ({ appointmentId, senderName, message }) => {
    if (!message?.trim()) return
    const { userId: senderId, role: senderRole } = socket.data

    try {
      const saved = await messageModel.create({
        appointmentId,
        senderId,
        senderRole,
        senderName,
        message: message.trim().slice(0, 2000)
      })

      // Broadcast to everyone in the room (including sender)
      io.to(appointmentId).emit('receive_message', saved)
    } catch (err) {
      console.error('[Socket] Message save error:', err.message)
    }
  })

  // Typing indicator
  socket.on('typing', ({ appointmentId, name }) => {
    socket.to(appointmentId).emit('typing', { name })
  })

  socket.on('stop_typing', ({ appointmentId }) => {
    socket.to(appointmentId).emit('stop_typing')
  })

  socket.on('disconnect', () => {
    const user = onlineUsers.get(socket.id)
    if (user) {
      socket.to(user.appointmentId).emit('user_left', { name: user.name })
      onlineUsers.delete(socket.id)
    }
  })
})

httpServer.listen(port, () => console.log(`Server started on PORT:${port}`))