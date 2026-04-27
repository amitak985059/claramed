import jwt from 'jsonwebtoken'

// doctor authentication middleware
const authDoctor = (req, res, next) => {
    const { dtoken } = req.headers
    if (!dtoken) {
        return res.status(401).json({ success: false, message: 'Not Authorized. Please log in.' })
    }
    try {
        const decoded = jwt.verify(dtoken, process.env.JWT_SECRET)
        req.body.docId = decoded.id
        next()
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Session expired. Please log in again.', code: 'TOKEN_EXPIRED' })
        }
        return res.status(401).json({ success: false, message: 'Invalid token. Please log in again.' })
    }
}

export default authDoctor