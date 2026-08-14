// JWT 认证中间件
const jwt = require('jsonwebtoken')
require('dotenv').config()

function auth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) {
    return res.json({ code: 401, message: '未登录', data: null })
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'love-diary-secret-key-2024')
    req.userId = decoded.userId
    req.coupleId = decoded.coupleId
    next()
  } catch (e) {
    return res.json({ code: 401, message: '登录已过期，请重新登录', data: null })
  }
}

module.exports = auth
