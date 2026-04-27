// Global error handler — must be registered LAST with app.use()
const errorHandler = (err, req, res, next) => {
    console.error(`[ERROR] ${req.method} ${req.originalUrl} — ${err.message}`)
    if (process.env.NODE_ENV === 'development') console.error(err.stack)

    const status = err.statusCode || 500
    res.status(status).json({
        success: false,
        message: err.message || 'Internal Server Error',
    })
}

export default errorHandler
