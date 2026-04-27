import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import supertest from 'supertest'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import mongoose from 'mongoose'
import 'dotenv/config'

// ─── Build a minimal test app (no rate limiting to avoid flaky tests) ─────────
const createTestApp = async () => {
    const app = express()
    app.use(helmet())
    app.use(cors())
    app.use(express.json())

    // Import routers
    const { default: userRouter }  = await import('../routes/userRoute.js')
    const { default: doctorRouter } = await import('../routes/doctorRoute.js')
    const { default: adminRouter }  = await import('../routes/adminRoute.js')
    const { default: errorHandler } = await import('../middleware/errorHandler.js')

    app.get('/health', (req, res) => res.json({ status: 'ok' }))
    app.use('/api/user', userRouter)
    app.use('/api/doctor', doctorRouter)
    app.use('/api/admin', adminRouter)
    app.use(errorHandler)

    return app
}

let app
let request

beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI)
    app = await createTestApp()
    request = supertest(app)
}, 30000)

afterAll(async () => {
    await mongoose.disconnect()
})

// ─── Health Check ─────────────────────────────────────────────────────────────
describe('GET /health', () => {
    it('returns status ok', async () => {
        const res = await request.get('/health')
        expect(res.status).toBe(200)
        expect(res.body.status).toBe('ok')
    })
})

// ─── Auth — User Registration ─────────────────────────────────────────────────
describe('POST /api/user/register', () => {
    it('rejects missing fields', async () => {
        const res = await request.post('/api/user/register').send({ email: 'test@test.com' })
        expect(res.status).toBe(400)
        expect(res.body.success).toBe(false)
    })

    it('rejects invalid email', async () => {
        const res = await request.post('/api/user/register').send({
            name: 'Test User', email: 'not-an-email', password: 'password123'
        })
        expect(res.status).toBe(400)
        expect(res.body.success).toBe(false)
    })

    it('rejects short password', async () => {
        const res = await request.post('/api/user/register').send({
            name: 'Test User', email: 'test@example.com', password: '123'
        })
        expect(res.status).toBe(400)
        expect(res.body.success).toBe(false)
    })
})

// ─── Auth — User Login ────────────────────────────────────────────────────────
describe('POST /api/user/login', () => {
    it('returns 400 for missing credentials', async () => {
        const res = await request.post('/api/user/login').send({})
        expect(res.status).toBe(400)
        expect(res.body.success).toBe(false)
    })

    it('returns 401 for wrong credentials', async () => {
        const res = await request.post('/api/user/login').send({
            email: 'nonexistent@example.com', password: 'wrongpassword'
        })
        expect(res.status).toBe(401)
        expect(res.body.success).toBe(false)
    })
})

// ─── Auth — Admin Login ───────────────────────────────────────────────────────
describe('POST /api/admin/login', () => {
    it('returns 401 for wrong admin password', async () => {
        const res = await request.post('/api/admin/login').send({
            email: process.env.ADMIN_EMAIL,
            password: 'wrong_password_xyz'
        })
        expect(res.status).toBe(401)
        expect(res.body.success).toBe(false)
    })

    it('returns token for correct admin credentials', async () => {
        const res = await request.post('/api/admin/login').send({
            email: process.env.ADMIN_EMAIL,
            password: process.env.ADMIN_PASSWORD
        })
        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
        expect(res.body.token).toBeDefined()
    })
})

// ─── Protected Routes — No Token ──────────────────────────────────────────────
describe('Protected routes without token', () => {
    it('GET /api/user/appointments returns 401', async () => {
        const res = await request.get('/api/user/appointments')
        expect(res.status).toBe(401)
    })

    it('GET /api/doctor/dashboard returns 401', async () => {
        const res = await request.get('/api/doctor/dashboard')
        expect(res.status).toBe(401)
    })

    it('GET /api/admin/all-doctors returns 401 without token', async () => {
        const res = await request.get('/api/admin/all-doctors')
        expect(res.status).toBe(401)
    })
})

// ─── Protected Routes — Invalid Token ────────────────────────────────────────
describe('Protected routes with invalid token', () => {
    it('GET /api/user/appointments returns 401 for bad token', async () => {
        const res = await request.get('/api/user/appointments').set('token', 'not.a.valid.token')
        expect(res.status).toBe(401)
    })

    it('GET /api/doctor/dashboard returns 401 for bad token', async () => {
        const res = await request.get('/api/doctor/dashboard').set('dtoken', 'garbage')
        expect(res.status).toBe(401)
    })
})

// ─── Public Routes ────────────────────────────────────────────────────────────
describe('Public routes', () => {
    it('GET /api/doctor/list returns doctors array', async () => {
        const res = await request.get('/api/doctor/list')
        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
        expect(Array.isArray(res.body.doctors)).toBe(true)
    })
})
