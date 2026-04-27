import jwt from 'jsonwebtoken'

// user authentication middleware
const authUser = (req, res, next) => {
    const { token } = req.headers
    if (!token) {
        return res.status(401).json({ success: false, message: 'Not Authorized. Please log in.' })
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        req.body.userId = decoded.id
        next()
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Session expired. Please log in again.', code: 'TOKEN_EXPIRED' })
        }
        return res.status(401).json({ success: false, message: 'Invalid token. Please log in again.' })
    }
}

export default authUser