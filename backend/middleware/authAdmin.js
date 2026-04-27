import jwt from 'jsonwebtoken'

// admin authentication middleware
const authAdmin = (req, res, next) => {
    const { atoken } = req.headers
    if (!atoken) {
        return res.status(401).json({ success: false, message: 'Not Authorized. Please log in.' })
    }
    try {
        const decoded = jwt.verify(atoken, process.env.JWT_SECRET)
        // Verify the token was issued for the admin role
        if (decoded.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Forbidden. Admin access required.' })
        }
        next()
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Session expired. Please log in again.', code: 'TOKEN_EXPIRED' })
        }
        return res.status(401).json({ success: false, message: 'Invalid token. Please log in again.' })
    }
}

export default authAdmin